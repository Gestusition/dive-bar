import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { voxelGeometry } from './voxels';
import type { HandPose } from './hands';

// The arms and hands staff work with. An arm is two bones, shoulder to elbow and elbow to
// wrist; a hand is one mesh whose fingers are moved between poses by morph targets, so a
// grip closes smoothly and each hand is still a single draw call.
//
// A hand's own frame: the wrist is at the origin, the fingers run down -y, the palm faces
// +z and the thumb is on one side of x. Something held in a closed hand runs along x.

export const upperArm = 0.37,
  forearm = 0.35;
export const armWidth = { upper: 0.135, fore: 0.11 };
/** How far an arm may stretch to stay on what it holds, as a share of its length. */
export const armStretch = 1.22;

const along = new THREE.Vector3(),
  side = new THREE.Vector3();
/**
 * The elbow of a two-bone arm. It sits on the side of the shoulder-to-wrist line that
 * `pole` points to. Returns how much the bones must stretch to reach (1 when they don't).
 */
export function solveElbow(
  shoulder: THREE.Vector3,
  wrist: THREE.Vector3,
  pole: THREE.Vector3,
  elbow: THREE.Vector3,
  a = upperArm,
  b = forearm,
) {
  along.subVectors(wrist, shoulder);
  const distance = Math.max(along.length(), 1e-4);
  along.divideScalar(distance);
  const stretch = Math.max(1, distance / ((a + b) * 0.998));
  const u = a * stretch,
    v = b * stretch;
  const shortest = Math.abs(u - v) + 1e-4;
  const d = Math.max(distance, shortest);
  const toElbow = (u * u - v * v + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, u * u - toElbow * toElbow));
  side.copy(pole).addScaledVector(along, -pole.dot(along));
  if (side.lengthSq() < 1e-8) side.set(1, 0, 0).addScaledVector(along, -along.x);
  side.normalize();
  elbow.copy(shoulder).addScaledVector(along, toElbow).addScaledVector(side, height);
  return stretch;
}

const hangingDown = new THREE.Vector3(0, -1, 0);
const palm = { width: 0.17, length: 0.13, thick: 0.058 };
const fingerWidth = 0.039,
  fingerThick = 0.038;
/** Index to little finger: each one's length, split over its three bones. */
const fingerLengths = [0.125, 0.138, 0.128, 0.1];
const bones = [0.46, 0.3, 0.24];
const thumbBase = [0.085, -0.042, 0.018] as const;
const thumbBones = [0.062, 0.056];
type FingerShape = { curl: [number, number, number]; splay?: number; shift?: number };
type PoseShape = {
  fingers: [FingerShape, FingerShape, FingerShape, FingerShape];
  /** Where the tip of the thumb goes, x measured towards the thumb's own side. */
  thumb: [number, number, number];
  /** The point the hand holds, x measured towards the thumb's own side. */
  grip: [number, number, number];
};
const curled = (a: number, b: number, c: number): FingerShape => ({ curl: [a, b, c] });
const same = (f: FingerShape): PoseShape['fingers'] => [f, f, f, f];
/**
 * Fingers closed round a bar of this radius lying across the palm: each bone turns just
 * enough to stay on it. The bar's centre is `gripY` down the palm.
 */
const gripY = 0.082;
function wrap(radius: number): PoseShape {
  const r = radius + fingerThick / 2;
  const centreZ = palm.thick / 2 + radius;
  const fingers = fingerLengths.map((length) => {
    const parts = bones.map((b) => b * length);
    const start = (palm.length - gripY) / r;
    return {
      curl: [
        Math.min(1.5, start + parts[0] / (2 * r)),
        Math.min(1.5, (parts[0] + parts[1]) / (2 * r)),
        Math.min(1.5, (parts[1] + parts[2]) / (2 * r)),
      ],
    } as FingerShape;
  }) as PoseShape['fingers'];
  // The thumb comes round the other way, as far as it reaches.
  const [bx, by, bz] = thumbBase;
  let tip: [number, number, number] = [0.06, by, bz + 0.1];
  for (let a = 0; a < Math.PI; a += 0.05) {
    const p: [number, number, number] = [
      0.045,
      -gripY + Math.sin(a) * r,
      centreZ - Math.cos(a) * r,
    ];
    if (Math.hypot(p[0] - bx, p[1] - by, p[2] - bz) <= thumbBones[0] + thumbBones[1] - 0.004)
      tip = p;
  }
  return { fingers, thumb: tip, grip: [0, -gripY, centreZ] };
}
export const poseShapes: Record<HandPose, PoseShape> = {
  relaxed: {
    fingers: same(curled(0.35, 0.55, 0.4)),
    thumb: [0.075, -0.13, 0.06],
    grip: [0, -0.15, 0.05],
  },
  flat: {
    fingers: same(curled(0.08, 0.1, 0.08)),
    thumb: [0.13, -0.12, 0.03],
    grip: [0, -0.1, palm.thick / 2],
  },
  neck: wrap(0.03),
  bottle: wrap(0.09),
  vessel: wrap(0.175),
  pinch: {
    fingers: [
      curled(0.62, 0.72, 0.62),
      curled(0.85, 1.05, 0.8),
      curled(1.25, 1.35, 1),
      curled(1.35, 1.4, 1),
    ],
    thumb: [0.022, -0.183, 0.082],
    grip: [0.022, -0.2, 0.075],
  },
  // The jigger's waist between the first two fingers, its big cup above the palm.
  fork: {
    fingers: [
      { curl: [0.12, 0.3, 0.25], splay: 0.13, shift: 0.008 },
      { curl: [0.12, 0.3, 0.25], splay: -0.13, shift: -0.008 },
      curled(1.1, 1.3, 0.9),
      curled(1.2, 1.35, 1),
    ],
    thumb: [0.075, -0.15, 0.085],
    grip: [0.022, -0.165, 0.02],
  },
};
export const poseNames = Object.keys(poseShapes) as HandPose[];

/** A bone: a box whose top sits on `from` and which runs along `along`. */
function bone(w: number, d: number, from: THREE.Vector3, along: THREE.Vector3, length: number) {
  const g = new THREE.BoxGeometry(w, length, d);
  g.translate(0, -length / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(hangingDown, along));
  g.translate(from.x, from.y, from.z);
  return g;
}
/** Every part of a hand in one pose. `thumbSide` is -1 or 1, the sign of x the thumb is on. */
function handInPose(name: HandPose, thumbSide: number) {
  const shape = poseShapes[name];
  const parts: THREE.BufferGeometry[] = [];
  const palmBox = new THREE.BoxGeometry(palm.width, palm.length, palm.thick);
  palmBox.translate(0, -palm.length / 2, 0);
  parts.push(palmBox);
  fingerLengths.forEach((length, i) => {
    const f = shape.fingers[i];
    const x = thumbSide * (0.0635 - i * 0.0423 + (f.shift ?? 0));
    const at = new THREE.Vector3(x, -palm.length, 0);
    let angle = 0;
    bones.forEach((share, b) => {
      angle += f.curl[b];
      const along = new THREE.Vector3(
        thumbSide * (f.splay ?? 0),
        -Math.cos(angle),
        Math.sin(angle),
      ).normalize();
      const piece = length * share;
      parts.push(bone(fingerWidth, fingerThick, at, along, piece + 0.004));
      at.addScaledVector(along, piece);
    });
  });
  // The thumb has two bones, bending out on its way to where its tip goes.
  const base = new THREE.Vector3(thumbSide * thumbBase[0], thumbBase[1], thumbBase[2]);
  const tip = new THREE.Vector3(thumbSide * shape.thumb[0], shape.thumb[1], shape.thumb[2]);
  const knuckle = new THREE.Vector3();
  solveElbow(
    base,
    tip,
    new THREE.Vector3(thumbSide, 0.3, -0.2),
    knuckle,
    thumbBones[0],
    thumbBones[1],
  );
  const first = new THREE.Vector3().subVectors(knuckle, base);
  const second = new THREE.Vector3().subVectors(tip, knuckle);
  parts.push(
    bone(0.044, 0.044, base, first.clone().normalize(), first.length() + 0.004),
    bone(0.04, 0.04, knuckle, second.clone().normalize(), second.length()),
  );
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return merged;
}
/** One hand as a single geometry, its morph targets being the poses in `poseNames`. */
export function handGeometry(skin: string, thumbSide: number) {
  const base = handInPose('relaxed', thumbSide);
  const position = base.attributes.position,
    normal = base.attributes.normal;
  const color = new THREE.Color(skin);
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  base.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const morphPosition: THREE.BufferAttribute[] = [];
  const morphNormal: THREE.BufferAttribute[] = [];
  for (const name of poseNames) {
    const shaped = handInPose(name, thumbSide);
    const dp = new Float32Array(position.count * 3);
    const dn = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count * 3; i++) {
      dp[i] = shaped.attributes.position.array[i] - position.array[i];
      dn[i] = shaped.attributes.normal.array[i] - normal.array[i];
    }
    morphPosition.push(new THREE.BufferAttribute(dp, 3));
    morphNormal.push(new THREE.BufferAttribute(dn, 3));
    shaped.dispose();
  }
  base.morphAttributes.position = morphPosition;
  base.morphAttributes.normal = morphNormal;
  base.morphTargetsRelative = true;
  return base;
}
/** Where a pose holds things, in the hand's own frame. */
export function gripPoint(pose: HandPose, thumbSide: number, out: THREE.Vector3) {
  const [x, y, z] = poseShapes[pose].grip;
  return out.set(thumbSide * x, y, z);
}

/** A sleeve down to the elbow, with a joint so the bend never shows a gap. */
export function upperArmGeometry(shirt: string) {
  const { upper } = armWidth;
  return voxelGeometry([
    [0, -upperArm / 2, 0, upper, upperArm, upper, shirt],
    [0, -upperArm, 0, upper * 0.98, upper * 0.98, upper * 0.98, shirt],
  ]);
}
/** A bare forearm out of a rolled sleeve, narrowing to the wrist. */
export function forearmGeometry(shirt: string, skin: string) {
  const { fore } = armWidth;
  return voxelGeometry([
    [0, -0.045, 0, fore + 0.026, 0.09, fore + 0.026, shirt],
    [0, -0.09 - (forearm - 0.09) * 0.3, 0, fore, (forearm - 0.09) * 0.6, fore, skin],
    [0, -0.09 - (forearm - 0.09) * 0.8, 0, fore * 0.88, (forearm - 0.09) * 0.42, fore * 0.88, skin],
  ]);
}

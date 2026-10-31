import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { handTurn } from './hands';
import {
  armStretch,
  forearm,
  gripPoint,
  handGeometry,
  poseNames,
  solveElbow,
  upperArm,
} from './staffRig';

const shoulder = new THREE.Vector3(0.34, 1, 0);
const pole = new THREE.Vector3(0.5, -1, -0.8);

describe('a staff arm', () => {
  it('keeps both bones their own length wherever the wrist is in reach', () => {
    for (const wrist of [
      new THREE.Vector3(0.2, 0.7, 0.5),
      new THREE.Vector3(-0.1, 1.2, 0.45),
      new THREE.Vector3(0.5, 0.5, 0.1),
    ]) {
      const elbow = new THREE.Vector3();
      expect(solveElbow(shoulder, wrist, pole, elbow)).toBe(1);
      expect(elbow.distanceTo(shoulder)).toBeCloseTo(upperArm, 5);
      expect(elbow.distanceTo(wrist)).toBeCloseTo(forearm, 5);
    }
  });
  it('bends the elbow out to the side it is told, never through the body', () => {
    const elbow = new THREE.Vector3();
    solveElbow(shoulder, new THREE.Vector3(0.1, 1, 0.5), pole, elbow);
    const line = new THREE.Vector3(0.1, 1, 0.5).sub(shoulder).normalize();
    const offset = elbow.clone().sub(shoulder);
    offset.addScaledVector(line, -offset.dot(line));
    expect(offset.dot(pole)).toBeGreaterThan(0);
  });
  it('stretches rather than letting go of what is held just out of reach', () => {
    const elbow = new THREE.Vector3();
    const far = (upperArm + forearm) * 1.1;
    const wrist = shoulder.clone().add(new THREE.Vector3(0, 0, far));
    const stretch = solveElbow(shoulder, wrist, pole, elbow);
    expect(stretch).toBeGreaterThan(1);
    expect(stretch).toBeLessThan(armStretch);
    // Straight out along the line to the wrist, its bones in their proportions.
    expect(elbow.distanceTo(shoulder) / elbow.distanceTo(wrist)).toBeCloseTo(upperArm / forearm, 4);
  });
  it('copes with the wrist on the shoulder', () => {
    const elbow = new THREE.Vector3(NaN, NaN, NaN);
    solveElbow(shoulder, shoulder.clone(), pole, elbow);
    expect(Number.isFinite(elbow.x + elbow.y + elbow.z)).toBe(true);
  });
});

describe('a staff hand', () => {
  it('has every pose as a morph of the same shape, so that a grip closes smoothly', () => {
    const geometry = handGeometry('#e9b592', 1);
    const vertices = geometry.attributes.position.count;
    const morphs = geometry.morphAttributes.position as THREE.BufferAttribute[];
    expect(morphs).toHaveLength(poseNames.length);
    expect(geometry.morphAttributes.normal).toHaveLength(poseNames.length);
    for (const morph of morphs) expect(morph.count).toBe(vertices);
    // Each pose really moves the fingers, apart from the one the shape is built in.
    poseNames.forEach((name, i) => {
      const moved = Math.max(...Array.from(morphs[i].array, Math.abs));
      if (name === 'relaxed') expect(moved).toBe(0);
      else expect(moved).toBeGreaterThan(0.01);
    });
  });
  it('mirrors between the two hands, with the thumb on the other side', () => {
    const extent = (g: THREE.BufferGeometry) => {
      g.computeBoundingBox();
      return g.boundingBox!;
    };
    const left = extent(handGeometry('#e9b592', -1));
    const right = extent(handGeometry('#e9b592', 1));
    expect(left.max.x).toBeCloseTo(-right.min.x, 5);
    expect(left.min.y).toBeCloseTo(right.min.y, 5);
  });
  it('closes round a wider thing with its palm further from the middle of it', () => {
    const at = (pose: 'neck' | 'bottle' | 'vessel') => gripPoint(pose, 1, new THREE.Vector3()).z;
    expect(at('neck')).toBeLessThan(at('bottle'));
    expect(at('bottle')).toBeLessThan(at('vessel'));
  });
  it('turns to point its fingers and face its palm the way it is told', () => {
    const turn = handTurn([0, 0, 1], [1, 0, 0], new THREE.Quaternion());
    const fingers = new THREE.Vector3(0, -1, 0).applyQuaternion(turn);
    const palm = new THREE.Vector3(0, 0, 1).applyQuaternion(turn);
    expect(fingers.distanceTo(new THREE.Vector3(0, 0, 1))).toBeCloseTo(0, 5);
    expect(palm.distanceTo(new THREE.Vector3(1, 0, 0))).toBeCloseTo(0, 5);
  });
});

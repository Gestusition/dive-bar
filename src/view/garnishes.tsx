import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { barReflections, toolMaterials } from './barTools';

// What goes on the glass, each as the real thing: cut fruit with its segments showing, a
// cherry on a bent stem, a twist of peel, sprigs of mint with toothed leaves.

const faces = new Map<string, THREE.Texture>();
/** The cut face of a citrus slice: pith, then segments of pulp parted by thin membranes. */
function citrusFace(rind: string, flesh: string) {
  const key = rind + flesh;
  let texture = faces.get(key);
  if (texture) return texture;
  const size = 512,
    mid = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!;
  c.fillStyle = rind;
  c.fillRect(0, 0, size, size);
  c.fillStyle = '#fbf3df';
  c.beginPath();
  c.arc(mid, mid, mid * 0.93, 0, Math.PI * 2);
  c.fill();
  const segments = 10;
  for (let i = 0; i < segments; i++) {
    const from = (i / segments) * Math.PI * 2 + 0.05,
      to = ((i + 1) / segments) * Math.PI * 2 - 0.05;
    c.save();
    c.beginPath();
    c.moveTo(
      mid + Math.cos((from + to) / 2) * mid * 0.1,
      mid + Math.sin((from + to) / 2) * mid * 0.1,
    );
    c.arc(mid, mid, mid * 0.83, from, to);
    c.closePath();
    c.clip();
    const flush = c.createRadialGradient(mid, mid, mid * 0.1, mid, mid, mid * 0.83);
    flush.addColorStop(0, flesh);
    flush.addColorStop(1, rind);
    c.globalAlpha = 1;
    c.fillStyle = flesh;
    c.fillRect(0, 0, size, size);
    c.globalAlpha = 0.28;
    c.fillStyle = flush;
    c.fillRect(0, 0, size, size);
    // The little sacs of juice, running out from the middle.
    c.globalAlpha = 0.34;
    for (let n = 0; n < 46; n++) {
      const a = from + ((n * 0.618) % 1) * (to - from);
      const r = mid * (0.2 + ((n * 0.381) % 1) * 0.62);
      c.strokeStyle = n % 2 ? '#ffffff' : rind;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(mid + Math.cos(a) * r, mid + Math.sin(a) * r);
      c.lineTo(mid + Math.cos(a) * (r + mid * 0.1), mid + Math.sin(a) * (r + mid * 0.1));
      c.stroke();
    }
    c.restore();
  }
  c.globalAlpha = 1;
  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  faces.set(key, texture);
  return texture;
}
/** A slice of citrus, lying flat, with its rind round the outside. */
export function CitrusWheel({ rind, flesh }: { rind: string; flesh: string }) {
  const face = citrusFace(rind, flesh);
  const envMap = barReflections();
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.082, 0.082, 0.02, 56, 1, true]} />
        <meshStandardMaterial color={rind} roughness={0.42} envMap={envMap} envMapIntensity={0.6} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, side * 0.01, 0]} rotation={[(-side * Math.PI) / 2, 0, 0]}>
          <circleGeometry args={[0.082, 56]} />
          <meshStandardMaterial map={face} roughness={0.28} envMap={envMap} envMapIntensity={0.7} />
        </mesh>
      ))}
    </group>
  );
}
const cherryShape = [
  [0, -0.036],
  [0.016, -0.034],
  [0.03, -0.022],
  [0.037, 0],
  [0.033, 0.02],
  [0.02, 0.031],
  [0.007, 0.029],
  [0, 0.022],
].map(([r, y]) => new THREE.Vector2(r, y));
const stem = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.022, 0),
  new THREE.Vector3(0.006, 0.055, 0.002),
  new THREE.Vector3(0.02, 0.09, 0.006),
  new THREE.Vector3(0.042, 0.118, 0.008),
]);
/** A maraschino cherry: a dimple at the top, deep gloss, and its long bent stem. */
export function Cherry() {
  const curve = useMemo(() => new THREE.SplineCurve(cherryShape), []);
  const points = useMemo(() => curve.getPoints(40), [curve]);
  return (
    <>
      <mesh castShadow>
        <latheGeometry args={[points, 40]} />
        <meshStandardMaterial
          color="#8e1020"
          emissive="#3a0208"
          roughness={0.09}
          envMap={barReflections()}
          envMapIntensity={1.5}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[stem, 20, 0.0032, 8, false]} />
        <meshStandardMaterial color="#6b5a24" roughness={0.65} />
      </mesh>
    </>
  );
}
/** A twist of peel: a strip of rind wound round on itself, pale on its inner side. */
export function Zest() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.19, 0.036, 48, 3);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / 0.19 + 0.5;
      const across = p.getY(i);
      const a = u * Math.PI * 3.2;
      const taper = 0.6 + Math.sin(u * Math.PI) * 0.4;
      const r = 0.018 + across * 0.25 * taper;
      p.setXYZ(i, (u - 0.5) * 0.15 + across * 0.3 * taper, Math.cos(a) * r, Math.sin(a) * r);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color="#e8791a"
          roughness={0.48}
          side={THREE.FrontSide}
          envMap={barReflections()}
          envMapIntensity={0.6}
        />
      </mesh>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#f6dfb4" roughness={0.8} side={THREE.BackSide} />
      </mesh>
    </>
  );
}
/** A mint leaf from its stalk end, pointed and toothed, with a fold down the rib. */
function leafGeometry(length: number) {
  const shape = new THREE.Shape();
  const teeth = 7;
  const width = (t: number) => Math.sin(Math.PI * t ** 0.8) * length * 0.32;
  shape.moveTo(0, 0);
  for (let i = 1; i <= teeth * 2; i++) {
    const t = i / (teeth * 2);
    const w = width(t) * (i % 2 ? 1 : 0.86);
    shape.lineTo(w, t * length);
  }
  for (let i = teeth * 2 - 1; i >= 0; i--) {
    const t = i / (teeth * 2);
    const w = width(t) * (i % 2 ? 1 : 0.86);
    shape.lineTo(-w, t * length);
  }
  const g = new THREE.ShapeGeometry(shape, 1);
  // Enough points to bend it, from the middle out to each tooth.
  const flat = g.toNonIndexed();
  const p = flat.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    p.setZ(i, Math.abs(x) * 0.5 - (y * y * 0.9) / length);
  }
  flat.computeVertexNormals();
  g.dispose();
  return flat;
}
const mintLeaf = {
  big: null as THREE.BufferGeometry | null,
  small: null as THREE.BufferGeometry | null,
};
/** A sprig of mint: a stalk with pairs of leaves, smaller towards the crown. */
export function Mint() {
  mintLeaf.big ??= leafGeometry(0.075);
  mintLeaf.small ??= leafGeometry(0.052);
  const leaves: [number, number, number, boolean][] = [
    [0.02, 0, 1.0, true],
    [0.02, Math.PI, 1.0, true],
    [0.04, Math.PI / 2, 0.85, true],
    [0.04, -Math.PI / 2, 0.85, true],
    [0.062, 0.6, 0.55, false],
    [0.062, 0.6 + Math.PI, 0.55, false],
    [0.075, 2.1, 0.25, false],
    [0.075, 2.1 + Math.PI, 0.25, false],
  ];
  return (
    <>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.0028, 0.004, 0.09, 8]} />
        <meshStandardMaterial color="#5f8f3f" roughness={0.6} />
      </mesh>
      {leaves.map(([y, turn, droop, big], i) => (
        <group key={i} position={[0, y, 0]} rotation={[0, turn, 0]}>
          <mesh
            geometry={big ? mintLeaf.big! : mintLeaf.small!}
            rotation={[droop, 0, 0]}
            castShadow
          >
            <meshStandardMaterial
              color={i % 3 ? '#3f8f3e' : '#4fa24a'}
              roughness={0.55}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
const celerySection = (() => {
  // A stalk is a ribbed crescent in section, not a square.
  const s = new THREE.Shape();
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);
    const r = 0.024 + Math.sin(a * 7) * 0.0016;
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r;
    if (i) s.lineTo(x, y);
    else s.moveTo(x, y);
  }
  s.quadraticCurveTo(0, 0.011, 0.024, 0);
  return s;
})();
/** A stick of celery standing in the drink, its leaves above the rim. */
export function Celery({ length }: { length: number }) {
  const stalk = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(celerySection, {
      depth: length,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 12,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [length]);
  useEffect(() => () => stalk.dispose(), [stalk]);
  return (
    <>
      <mesh geometry={stalk} castShadow>
        <meshStandardMaterial
          color="#9ac763"
          roughness={0.42}
          envMap={barReflections()}
          envMapIntensity={0.5}
        />
      </mesh>
      <group position={[0, length, 0]}>
        {[0, 1.2, 2.5, 3.9, 5.1].map((turn, i) => (
          <group key={i} rotation={[0, turn, 0]}>
            <Mint />
          </group>
        ))}
      </group>
    </>
  );
}
/** Half a rim of coarse salt, as grains that stuck where the glass was dipped. */
export function SaltRim({ radius }: { radius: number }) {
  const grains = useMemo(() => {
    const count = 260;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#fbfbf6', roughness: 0.55 }),
      count,
    );
    const place = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      // A fixed scatter: the same drink looks the same whenever it is drawn again.
      const golden = (i * 0.618034) % 1,
        other = (i * 0.754877) % 1,
        third = (i * 0.56984) % 1;
      const a = golden * Math.PI;
      const r = radius + (other - 0.5) * 0.018;
      place.position.set(Math.cos(a) * r, (third - 0.72) * 0.03, Math.sin(a) * r);
      place.rotation.set(golden * 6, other * 6, third * 6);
      place.scale.setScalar(0.0045 + third * 0.0045);
      place.updateMatrix();
      mesh.setMatrixAt(i, place.matrix);
    }
    return mesh;
  }, [radius]);
  useEffect(
    () => () => {
      grains.geometry.dispose();
      (grains.material as THREE.Material).dispose();
      grains.dispose();
    },
    [grains],
  );
  return <primitive object={grains} />;
}
/** One garnish on its own, as it is held on the way to the glass. */
export function GarnishPiece({ id }: { id: string }) {
  switch (id) {
    case 'cocktail_cherry':
      return <Cherry />;
    case 'orange_slice':
      return <CitrusWheel rind="#ef8e20" flesh="#f7a83e" />;
    case 'lime_slice':
      return <CitrusWheel rind="#5f9f2c" flesh="#bfdc72" />;
    case 'lemon_slice':
      return <CitrusWheel rind="#e8c52c" flesh="#f6e47e" />;
    case 'orange_zest':
      return <Zest />;
    case 'half_salt_rim':
      return (
        <mesh>
          <sphereGeometry args={[0.02, 16, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
      );
    case 'mint_sprig':
      return <Mint />;
    default:
      return (
        <group rotation={[0, 0, 0.3]} position={[0, -0.08, 0]}>
          <Celery length={0.2} />
        </group>
      );
  }
}
/** A steel tray of cut garnish at the end of the mat. */
export function GarnishTray() {
  const m = toolMaterials();
  return (
    <group>
      <mesh material={m.brushed} position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.36, 0.04, 0.26]} />
      </mesh>
      <group position={[-0.09, 0.05, -0.05]} rotation={[0.2, 0, 0.1]} scale={0.62}>
        <GarnishPiece id="orange_slice" />
      </group>
      <group position={[0.02, 0.052, 0.055]} rotation={[-0.15, 0, -0.1]} scale={0.62}>
        <GarnishPiece id="lime_slice" />
      </group>
      <group position={[0.095, 0.05, -0.05]} rotation={[0.1, 0, 0.2]} scale={0.62}>
        <GarnishPiece id="lemon_slice" />
      </group>
      {[
        [-0.12, 0.06],
        [-0.08, 0.085],
        [-0.05, 0.05],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.07, z]} rotation={[0, i * 2, 0]} scale={0.7}>
          <Cherry />
        </group>
      ))}
    </group>
  );
}

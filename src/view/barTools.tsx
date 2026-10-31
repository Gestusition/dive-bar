import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useFrame } from '@react-three/fiber';
import {
  lathePoints,
  liquidMaterial,
  showLiquid,
  smoothProfile,
  volumeSamples,
  type LiquidBody,
  type Profile,
} from './liquid';

// The tools of the bar, as a bartender keeps them on the mat. Each stands at its own
// origin; DrinkStage moves them and says where a hand holds them.

let reflections: THREE.Texture | null = null;
/**
 * A room for polished steel and glass to reflect: a pale ceiling with a row of lamps, walls
 * that go down to dark wood, and bright windows and shelves round them for long highlights.
 */
export function barReflections() {
  if (reflections) return reflections;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext('2d')!;
  const wall = c.createLinearGradient(0, 0, 0, 512);
  wall.addColorStop(0, '#d9cfc0');
  wall.addColorStop(0.3, '#efe5d4');
  wall.addColorStop(0.5, '#a89a86');
  wall.addColorStop(0.7, '#655749');
  wall.addColorStop(1, '#3d322b');
  c.fillStyle = wall;
  c.fillRect(0, 0, 1024, 512);
  for (let x = 0; x < 1024; x += 128) {
    c.fillStyle = x % 256 ? 'rgba(255,250,240,0.55)' : 'rgba(40,32,28,0.42)';
    c.fillRect(x + 24, 0, 52, 512);
  }
  // Windows, and lamps above them, as hard bright shapes for the sharpest reflections.
  c.fillStyle = '#ffffff';
  for (const x of [90, 346, 602, 858]) c.fillRect(x, 120, 70, 110);
  c.fillStyle = '#fff2cf';
  for (let x = 30; x < 1024; x += 170) c.fillRect(x, 60, 34, 18);
  reflections = new THREE.CanvasTexture(canvas);
  reflections.mapping = THREE.EquirectangularReflectionMapping;
  reflections.colorSpace = THREE.SRGBColorSpace;
  return reflections;
}
type Materials = Record<'steel' | 'brushed' | 'brass' | 'wood' | 'rubber', THREE.Material>;
let shared: Materials | null = null;
/** One set of materials for every tool, so they are compiled and drawn alike. */
export function toolMaterials() {
  if (shared) return shared;
  const envMap = barReflections();
  const metal = (color: string, roughness: number) =>
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.95,
      roughness,
      envMap,
      envMapIntensity: 1.25,
      side: THREE.DoubleSide,
    });
  shared = {
    steel: metal('#e6eaec', 0.2),
    brushed: metal('#d3d8da', 0.42),
    brass: metal('#d9ab62', 0.3),
    wood: new THREE.MeshStandardMaterial({ color: '#a8743f', roughness: 0.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#2b2d2c', roughness: 0.75 }),
  };
  return shared;
}
const outline = (points: Profile, steps = 6) => lathePoints(smoothProfile(points, steps));

/**
 * The inside of a container as one closed mesh, cut off at the level of what is in it; see
 * liquid.ts. It belongs to a LiquidBody, which is stepped here each frame, wherever whatever
 * holds it has been moved to by then.
 */
export function LiquidVolume({ inner, body }: { inner: Profile; body: LiquidBody }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(() => liquidMaterial(barReflections()), []);
  const geometry = useMemo(() => new THREE.LatheGeometry(lathePoints(inner), 56), [inner]);
  useEffect(() => {
    body.samples = volumeSamples(inner);
    return () => geometry.dispose();
  }, [body, inner, geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    m.updateWorldMatrix(true, false);
    if (!body.samples) body.samples = volumeSamples(inner);
    body.step(m.matrixWorld, Math.min(delta, 0.05));
    m.visible = body.fraction > 0.003;
    showLiquid(material, body);
  });
  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={2} />;
}

/** A clear cube of ice, its corners worn round. All cubes share one shape. */
export const iceCube = new RoundedBoxGeometry(0.088, 0.088, 0.088, 4, 0.016);
export const sugarCube = new RoundedBoxGeometry(0.06, 0.05, 0.06, 2, 0.006);

/**
 * A two-sided bar measure, the way it is held: its origin at the narrow waist. The big
 * cup is above with what is being measured in it, the small one below.
 */
export const jiggerSize = { top: 0.128, topRadius: 0.072, bottom: -0.09 };
const jiggerShape = outline([
  [0.054, jiggerSize.bottom],
  [0.058, jiggerSize.bottom + 0.004],
  [0.056, jiggerSize.bottom + 0.012],
  [0.024, -0.016],
  [0.019, 0],
  [0.024, 0.016],
  [jiggerSize.topRadius - 0.004, jiggerSize.top - 0.008],
  [jiggerSize.topRadius - 0.001, jiggerSize.top - 0.002],
  [jiggerSize.topRadius, jiggerSize.top],
]);
/** The inside of the jigger's big cup, closed so that it can hold a liquid. */
const jiggerInside: Profile = [
  [0, 0.016],
  [0.014, 0.016],
  [0.03, 0.04],
  [0.05, 0.08],
  [jiggerSize.topRadius - 0.006, jiggerSize.top - 0.004],
  [0, jiggerSize.top - 0.004],
];
export function Jigger({ body }: { body: LiquidBody }) {
  const m = toolMaterials();
  return (
    <group>
      <mesh material={m.steel} castShadow>
        <latheGeometry args={[jiggerShape, 64]} />
      </mesh>
      <LiquidVolume inner={jiggerInside} body={body} />
    </group>
  );
}

/** A hooded ice scoop: the trough runs out along +x from the handle, along -x. */
export const scoopHandle = 0.15;
export function Scoop({ cubesRef }: { cubesRef: React.Ref<THREE.Group> }) {
  const m = toolMaterials();
  return (
    <group>
      <mesh material={m.brushed} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.078, 0.078, 0.22, 40, 1, true, Math.PI, Math.PI]} />
      </mesh>
      <mesh material={m.brushed} position={[-0.11, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.078, 40, Math.PI, Math.PI]} />
      </mesh>
      <mesh
        material={m.rubber}
        position={[-0.11 - scoopHandle / 2, 0.012, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.02, 0.022, scoopHandle, 24]} />
      </mesh>
      <group ref={cubesRef}>
        {(
          [
            [0.06, -0.02, 0.012],
            [-0.02, -0.018, -0.018],
            [0.015, 0.03, 0.01],
          ] as const
        ).map((p, i) => (
          <mesh key={i} geometry={iceCube} position={p} rotation={[i, i * 2, 0]} scale={0.8}>
            <meshStandardMaterial color="#eaf8fb" transparent opacity={0.85} roughness={0.12} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** A bar spoon: small bowl at the origin, a long twisted shaft, a weighted teardrop end. */
export const spoonLength = 0.66;
let spoonShape: THREE.BufferGeometry | null = null;
class Twist extends THREE.Curve<THREE.Vector3> {
  constructor(
    private from: number,
    private to: number,
    private radius: number,
    private turns: number,
  ) {
    super();
  }
  getPoint(t: number, out = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return out.set(
      Math.cos(a) * this.radius,
      this.from + (this.to - this.from) * t,
      Math.sin(a) * this.radius,
    );
  }
}
function spoonGeometry() {
  if (spoonShape) return spoonShape;
  const parts: THREE.BufferGeometry[] = [];
  const shaft = new THREE.CylinderGeometry(0.0072, 0.0072, spoonLength - 0.04, 12);
  shaft.translate(0, (spoonLength - 0.04) / 2 + 0.03, 0);
  parts.push(shaft);
  // The twist of the shaft: a wire wound round it for most of its length.
  parts.push(
    new THREE.TubeGeometry(new Twist(0.14, spoonLength - 0.05, 0.0078, 17), 220, 0.0034, 5),
  );
  const bowl = new THREE.SphereGeometry(0.036, 24, 14);
  bowl.scale(1, 0.32, 1.35);
  bowl.rotateX(-0.25);
  bowl.translate(0, 0.012, 0);
  parts.push(bowl);
  const end = new THREE.SphereGeometry(0.021, 20, 16);
  end.scale(1, 1.6, 1);
  end.translate(0, spoonLength, 0);
  parts.push(end);
  spoonShape = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  parts.forEach((p) => p.dispose());
  return spoonShape;
}
export function BarSpoon() {
  return <mesh geometry={spoonGeometry()} material={toolMaterials().steel} castShadow />;
}

/** A wooden muddler, its broad face at the origin; a fist closes round its handle. */
export const muddlerLength = 0.56;
const muddlerShape = outline([
  [0, 0],
  [0.05, 0],
  [0.055, 0.02],
  [0.05, 0.05],
  [0.03, 0.16],
  [0.027, muddlerLength - 0.14],
  [0.036, muddlerLength - 0.05],
  [0.03, muddlerLength - 0.012],
  [0, muddlerLength],
]);
export function Muddler() {
  return (
    <mesh material={toolMaterials().wood} castShadow>
      <latheGeometry args={[muddlerShape, 48]} />
    </mesh>
  );
}

/** A spring bent round into a ring. */
class Spring extends THREE.Curve<THREE.Vector3> {
  constructor(
    private ring: number,
    private coil: number,
    private loops: number,
  ) {
    super();
  }
  getPoint(t: number, out = new THREE.Vector3()) {
    const a = t * Math.PI * 2,
      b = a * this.loops;
    const r = this.ring + Math.cos(b) * this.coil;
    return out.set(Math.cos(a) * r, Math.sin(b) * this.coil, Math.sin(a) * r);
  }
}
/**
 * A Hawthorne strainer sitting on a rim of this radius, the handle out along -x and the
 * coil that catches the ice underneath. Its origin is the middle of the plate.
 */
export function Strainer({ radius }: { radius: number }) {
  const m = toolMaterials();
  const holes = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const [r, n] of [
      [0.42, 8],
      [0.72, 14],
    ] as const)
      for (let i = 0; i < n; i++) {
        const hole = new THREE.CircleGeometry(0.0095, 12);
        const a = (i / n) * Math.PI * 2;
        hole.rotateX(-Math.PI / 2);
        hole.translate(Math.cos(a) * r * radius, 0.0065, Math.sin(a) * r * radius);
        parts.push(hole);
      }
    const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
    parts.forEach((p) => p.dispose());
    return merged;
  }, [radius]);
  const coil = useMemo(
    () => new THREE.TubeGeometry(new Spring(radius * 0.84, 0.016, 34), 460, 0.003, 5, true),
    [radius],
  );
  return (
    <group>
      <mesh material={m.steel} castShadow>
        <cylinderGeometry args={[radius * 1.02, radius * 1.02, 0.012, 56]} />
      </mesh>
      <mesh geometry={holes}>
        <meshBasicMaterial color="#3a3531" />
      </mesh>
      <mesh geometry={coil} material={m.brushed} position={[0, -0.02, 0]} />
      <mesh material={m.steel} position={[-radius - 0.075, 0.004, 0]}>
        <boxGeometry args={[0.17, 0.012, 0.05]} />
      </mesh>
    </group>
  );
}

/**
 * The shaking tin, standing on its open end to go over a vessel of this radius. Its
 * material goes white with frost as the drink inside gets cold.
 */
export const tinHeight = 0.36;
export function ShakerTin({
  radius,
  materialRef,
}: {
  radius: number;
  materialRef: React.Ref<THREE.MeshStandardMaterial>;
}) {
  const envMap = barReflections();
  const shape = useMemo(
    () =>
      outline([
        [radius * 1.14, 0],
        [radius * 1.16, 0.012],
        [radius * 1.13, 0.03],
        [radius * 0.84, tinHeight - 0.03],
        [radius * 0.8, tinHeight - 0.008],
        [radius * 0.74, tinHeight],
        [0, tinHeight],
      ]),
    [radius],
  );
  return (
    <mesh castShadow>
      <latheGeometry args={[shape, 84]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#d3d9dd"
        metalness={0.95}
        roughness={0.24}
        envMap={envMap}
        envMapIntensity={1.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** A steel speed pourer in a bottle's neck, its spout leaning out at the origin's level. */
export const pourerLength = 0.085;
export function Pourer({ collar, y }: { collar: string; y: number }) {
  const m = toolMaterials();
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.03, 32]} />
        <meshStandardMaterial color={collar} roughness={0.5} />
      </mesh>
      <mesh material={m.steel} position={[0.006, 0.058, 0]} rotation={[0, 0, -0.14]}>
        <cylinderGeometry args={[0.009, 0.015, 0.075, 24]} />
      </mesh>
    </group>
  );
}

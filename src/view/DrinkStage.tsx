import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { ingredientColors, ingredients } from '../game/content';
import { type Prep } from '../game/engine';
import { reachFor } from './hands';

// The drink itself, on the counter mat: the tin or mixing glass filling up bottle by
// bottle, ice dropping in, the shake, the stir, then the strained drink in its glass
// with every garnish on it. It follows the preparation as it happens.
type Profile = [number, number][]; // [radius, height] from the bottom up
type GlassId = Prep['glass'];
const glassShapes: Record<GlassId, { outer: Profile; floor: number; capacity: number }> = {
  cocktail_glass: {
    outer: [
      [0.13, 0],
      [0.13, 0.012],
      [0.025, 0.03],
      [0.02, 0.2],
      [0.07, 0.215],
      [0.17, 0.27],
      [0.2, 0.33],
    ],
    floor: 0.205,
    capacity: 105,
  },
  old_fashioned_glass: {
    outer: [
      [0.17, 0],
      [0.175, 0.3],
    ],
    floor: 0.035,
    capacity: 170,
  },
  highball: {
    outer: [
      [0.12, 0],
      [0.128, 0.5],
    ],
    floor: 0.03,
    capacity: 300,
  },
  mug: {
    outer: [
      [0.15, 0],
      [0.158, 0.33],
    ],
    floor: 0.03,
    capacity: 250,
  },
  hurricane: {
    outer: [
      [0.1, 0],
      [0.1, 0.012],
      [0.03, 0.03],
      [0.03, 0.1],
      [0.13, 0.18],
      [0.1, 0.31],
      [0.15, 0.5],
    ],
    floor: 0.1,
    capacity: 220,
  },
};
const vessels: Record<
  'shaker' | 'mixing_glass',
  { outer: Profile; floor: number; capacity: number }
> = {
  shaker: {
    outer: [
      [0.15, 0],
      [0.19, 0.46],
    ],
    floor: 0.03,
    capacity: 450,
  },
  mixing_glass: {
    outer: [
      [0.17, 0],
      [0.185, 0.48],
    ],
    floor: 0.045,
    capacity: 450,
  },
};
const top = (p: Profile) => p[p.length - 1];
function radiusAt(p: Profile, y: number) {
  for (let i = 1; i < p.length; i++) {
    const [r0, y0] = p[i - 1],
      [r1, y1] = p[i];
    if (y <= y1) return y1 === y0 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return top(p)[0];
}
/** The solid of liquid between two heights inside a glass. */
function band(p: Profile, from: number, to: number) {
  const inner = 0.9;
  const points = [new THREE.Vector2(0, from), new THREE.Vector2(radiusAt(p, from) * inner, from)];
  for (const [r, y] of p) if (y > from && y < to) points.push(new THREE.Vector2(r * inner, y));
  points.push(new THREE.Vector2(radiusAt(p, to) * inner, to), new THREE.Vector2(0, to));
  return points;
}
const shell = (p: Profile) => [
  new THREE.Vector2(0, 0),
  ...p.map(([r, y]) => new THREE.Vector2(r, y)),
];
// Water barely tints a drink; syrups, juices and spirits give it its colour.
const clear = new Set(['sparkling_water', 'plain_water']);
const mix = (layers: { id?: string; color: string; amount: number }[]) => {
  const weight = (l: { id?: string; amount: number }) =>
    l.amount * (clear.has(l.id ?? '') ? 0.03 : 1);
  const total = layers.reduce((n, l) => n + weight(l), 0) || 1;
  const c = new THREE.Color(0, 0, 0);
  for (const l of layers) c.add(new THREE.Color(l.color).multiplyScalar(weight(l) / total));
  return '#' + c.getHexString();
};
/** How high a fill of this much stands in a container, ice lifting it a little. */
function fillLevel(
  shape: { outer: Profile; floor: number; capacity: number },
  total: number,
  ice: boolean,
) {
  const [, rimY] = top(shape.outer);
  const fill = Math.min(0.94, total / shape.capacity + (ice && total ? 0.12 : 0));
  return shape.floor + fill * (rimY - shape.floor);
}
function liquidLayers(p: Prep) {
  // What is still being poured shows straight away, as it leaves the bottle.
  const poured = { ...p.amounts };
  if (p.measure) poured[p.measure.id] = (poured[p.measure.id] ?? 0) + p.measure.quantity;
  return Object.entries(poured)
    .map(([id, q]) => {
      const unit = ingredients.find((i) => i.id === id)?.unit;
      return {
        id,
        color: ingredientColors[id] ?? '#d6a35a',
        amount: unit === 'ml' ? q : unit === 'dash' ? q * 0.8 : 0,
      };
    })
    .filter((l) => l.amount > 0);
}

/** The drink is drawn life-size on the counter mat, the size of the bartender's hands. */
export const stageScale = 1;
/**
 * An empty glass of the same shape and size as the one a drink is made in, for the
 * glasses waiting at the sink and the one being washed. It stands on its base.
 */
export function EmptyGlass({
  glass,
  dirty = false,
  scale = stageScale,
}: {
  glass: GlassId;
  dirty?: boolean;
  scale?: number;
}) {
  const outline = useMemo(() => shell(glassShapes[glass].outer), [glass]);
  return (
    <group scale={scale}>
      <mesh renderOrder={2}>
        <latheGeometry args={[outline, 28]} />
        <meshStandardMaterial
          color={dirty ? '#c9d2c2' : '#dff0ee'}
          transparent
          opacity={dirty ? 0.55 : 0.3}
          roughness={dirty ? 0.7 : 0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {glass === 'mug' && (
        <mesh position={[0.2, 0.17, 0]}>
          <torusGeometry args={[0.07, 0.018, 8, 16]} />
          <meshStandardMaterial color="#dff0ee" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}
/** Width and height of an empty glass as drawn, in room units. */
export function glassSize(glass: GlassId, scale = stageScale) {
  const outer = glassShapes[glass].outer;
  return {
    radius: Math.max(...outer.map(([r]) => r)) * scale,
    rim: top(outer)[0] * scale,
    height: top(outer)[1] * scale,
  };
}

/** Glass, liquid and ice for one container. */
function Container({
  shape,
  layers,
  blended,
  ice,
  chilled,
  liquidRef,
  iceRef,
}: {
  shape: { outer: Profile; floor: number; capacity: number };
  layers: { id?: string; color: string; amount: number }[];
  blended: boolean;
  ice: boolean;
  chilled: boolean;
  liquidRef?: React.Ref<THREE.Group>;
  iceRef?: React.Ref<THREE.Group>;
}) {
  const [rimR] = top(shape.outer);
  const total = layers.reduce((n, l) => n + l.amount, 0);
  const level = fillLevel(shape, total, ice);
  const parts = useMemo(() => {
    if (!total) return [];
    const list = blended ? [{ color: mix(layers), amount: total }] : layers;
    let from = shape.floor;
    return list.map((l) => {
      const to = from + (l.amount / total) * (level - shape.floor);
      const part = { points: band(shape.outer, from, to), color: l.color };
      from = to;
      return part;
    });
  }, [layers, blended, total, level, shape]);
  const glass = useMemo(() => shell(shape.outer), [shape]);
  const cubes = useMemo(() => {
    const r = Math.min(rimR, radiusAt(shape.outer, shape.floor + 0.05)) * 0.45;
    return [0, 1, 2, 3].map((i) => ({
      position: [
        Math.cos(i * 2.1) * r,
        shape.floor + 0.045 + (i % 2) * 0.07,
        Math.sin(i * 2.1) * r,
      ] as [number, number, number],
      rotation: [i * 0.7, i * 1.3, i * 0.4] as [number, number, number],
    }));
  }, [rimR, shape]);
  return (
    <group>
      <mesh renderOrder={2}>
        <latheGeometry args={[glass, 28]} />
        <meshStandardMaterial
          color={chilled ? '#f2fbff' : '#dff0ee'}
          transparent
          opacity={chilled ? 0.38 : 0.16}
          roughness={chilled ? 0.6 : 0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <group ref={liquidRef}>
        {parts.map((part, i) => (
          <mesh key={i + part.color}>
            <latheGeometry args={[part.points, 24]} />
            <meshStandardMaterial
              color={part.color}
              emissive={part.color}
              emissiveIntensity={0.18}
              roughness={0.25}
              transparent
              opacity={0.92}
            />
          </mesh>
        ))}
      </group>
      {ice && (
        <group ref={iceRef}>
          {cubes.map((cube, i) => (
            <mesh key={i} position={cube.position} rotation={cube.rotation}>
              <boxGeometry args={[0.085, 0.085, 0.085]} />
              <meshStandardMaterial color="#e8f7fb" transparent opacity={0.75} roughness={0.1} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** A citrus wheel: rind round the outside, paler flesh on both faces. */
function CitrusWheel({ rind, flesh }: { rind: string; flesh: string }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.016, 18]} />
        <meshStandardMaterial color={rind} roughness={0.5} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.066, 0.066, 0.019, 18]} />
        <meshStandardMaterial color={flesh} roughness={0.6} />
      </mesh>
    </group>
  );
}
/**
 * The garnishes on the glass. Up to ten of one can be added for the score, but a glass
 * only has room for a few, so past that the count on the card tells the rest.
 */
const drawnCitrus = 3,
  drawnGarnish = 3;
function Garnishes({ p, glass, level }: { p: Prep; glass: GlassId; level: number }) {
  const [rimR, rimY] = top(glassShapes[glass].outer);
  const items: React.ReactNode[] = [];
  const count = (id: string) => Math.min(p.garnish[id] ?? 0, drawnGarnish);
  for (let i = 0; i < count('cocktail_cherry'); i++)
    items.push(
      <group key={'cherry' + i} position={[-0.06 + i * 0.07, level + 0.035, 0.03 - (i % 2) * 0.05]}>
        <mesh>
          <sphereGeometry args={[0.036, 12, 10]} />
          <meshStandardMaterial color="#b3243b" roughness={0.3} />
        </mesh>
        <mesh position={[0.012, 0.06, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.004, 0.004, 0.08, 4]} />
          <meshStandardMaterial color="#5a3a1c" />
        </mesh>
      </group>,
    );
  // Citrus wheels sit cut onto the rim, each fruit round its own stretch of the back.
  (
    [
      ['orange_slice', '#f39a2b', '#fbcb7d', -0.55],
      ['lime_slice', '#7fb636', '#cfe58f', -1.55],
      ['lemon_slice', '#e8c52c', '#f8ec9b', -2.55],
    ] as const
  ).forEach(([id, rind, flesh, around]) => {
    const wheels = Math.min(p.garnish[id] ?? 0, drawnCitrus);
    for (let i = 0; i < wheels; i++) {
      const angle = around - i * 0.34;
      items.push(
        <group
          key={id + i}
          position={[Math.cos(angle) * rimR, rimY + 0.01, Math.sin(angle) * rimR]}
          rotation={[0, -angle, Math.PI / 2]}
        >
          <CitrusWheel rind={rind} flesh={flesh} />
        </group>,
      );
    }
  });
  for (let i = 0; i < count('orange_zest'); i++)
    items.push(
      <mesh
        key={'zest' + i}
        position={[rimR * 0.62, rimY + 0.006, 0.05 - i * 0.07]}
        rotation={[0.25, 0.7 - i * 0.5, 0.18]}
      >
        <boxGeometry args={[0.14, 0.014, 0.032]} />
        <meshStandardMaterial color="#f08a1c" />
      </mesh>,
    );
  if (p.garnish['half_salt_rim'])
    items.push(
      <mesh key="salt" position={[0, rimY + 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[rimR, 0.016, 8, 28, Math.PI]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.25}
          roughness={1}
        />
      </mesh>,
    );
  for (let i = 0; i < count('mint_sprig'); i++)
    items.push(
      <group key={'mint' + i} position={[0.05 - i * 0.05, level + 0.04, -0.04 + (i % 2) * 0.03]}>
        {[0, 1, 2, 3].map((j) => (
          <mesh
            key={j}
            position={[Math.cos(j * 1.7) * 0.03, 0.02 + j * 0.022, Math.sin(j * 1.7) * 0.03]}
            rotation={[0.5, j * 1.7, 0.35]}
          >
            <boxGeometry args={[0.075, 0.01, 0.04]} />
            <meshStandardMaterial color={j % 2 ? '#3f9b4a' : '#57b35f'} />
          </mesh>
        ))}
      </group>,
    );
  for (let i = 0; i < count('celery_stick'); i++) {
    const length = rimY + 0.14;
    items.push(
      // Standing in the glass, leaning on the rim, with its leaves above it.
      <group
        key={'celery' + i}
        position={[0.02 + i * 0.04, glassShapes[glass].floor, -0.02 - i * 0.04]}
        rotation={[0, 0, -0.22 - i * 0.08]}
      >
        <mesh position={[0, length / 2, 0]}>
          <boxGeometry args={[0.03, length, 0.03]} />
          <meshStandardMaterial color="#8fc25a" />
        </mesh>
        <mesh position={[0, length + 0.02, 0]} rotation={[0.3, 0.4, 0.2]}>
          <boxGeometry args={[0.07, 0.05, 0.05]} />
          <meshStandardMaterial color="#5f9c3d" />
        </mesh>
      </group>,
    );
  }
  return <>{items}</>;
}

/**
 * On the working mat, on the staff side of the counter, out to the bartender's left so
 * their hands work beside their face rather than in front of it. A separate serving
 * glass stands in front of them.
 */
const stagePosition: [number, number, number] = [-0.3, 1.27, -2.22];
const workX = -0.3,
  servingX = 0.3;
/** How long each hand movement at the counter lasts, in milliseconds. */
const pourTime = 1250,
  scoopTime = 750,
  garnishTime = 600;
/** How far behind an object the hand holds it, so the bartender's hand never hides it. */
const gripBehind = 0.075;
const smooth = (from: number, to: number, x: number) => THREE.MathUtils.smoothstep(x, from, to);

/** A two-cup bar measure. */
function Jigger() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.055, 0.015, 0.1, 16, 1, true]} />
        <meshStandardMaterial
          color="#c9cfd4"
          metalness={0.7}
          roughness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.035, 0]}>
        <cylinderGeometry args={[0.015, 0.045, 0.07, 16, 1, true]} />
        <meshStandardMaterial
          color="#c9cfd4"
          metalness={0.7}
          roughness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
/** A small ice scoop, heaped with cubes. */
function Scoop() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.16, 16, 1, true, 0, Math.PI]} />
        <meshStandardMaterial
          color="#c9cfd4"
          metalness={0.7}
          roughness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0.13, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
        <meshStandardMaterial color="#3c4547" />
      </mesh>
      {[-0.04, 0, 0.04].map((x) => (
        <mesh key={x} position={[x, 0.01, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.04]} />
          <meshStandardMaterial color="#e8f7fb" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

type BottleLook = {
  /** The outline from the base up to the tip it pours from. */
  profile: Profile;
  /** Where the paper label sits: its bottom and top, on a straight part of the body. */
  label: [number, number] | null;
  labelColor: string;
  cap: string;
  /** A carton-style jug with a handle, rather than a bottle. */
  handle?: boolean;
  /** Pale glass with the drink showing through only at the bottom, such as a jug of juice. */
  pale?: boolean;
};
const spiritShape: Profile = [
  [0.09, 0],
  [0.095, 0.02],
  [0.095, 0.25],
  [0.085, 0.29],
  [0.032, 0.34],
  [0.03, 0.47],
];
const shapes: Record<string, Partial<BottleLook>> = {
  // Clear, tall spirits.
  vodka: {
    profile: [
      [0.075, 0],
      [0.08, 0.31],
      [0.03, 0.38],
      [0.028, 0.51],
    ],
    label: [0.1, 0.24],
    labelColor: '#dfeaf0',
  },
  lime_vodka: {
    profile: [
      [0.075, 0],
      [0.08, 0.31],
      [0.03, 0.38],
      [0.028, 0.51],
    ],
    label: [0.1, 0.24],
    labelColor: '#d9efc2',
  },
  gin: {
    profile: [
      [0.088, 0],
      [0.088, 0.26],
      [0.04, 0.31],
      [0.03, 0.34],
      [0.03, 0.45],
    ],
    label: [0.07, 0.2],
    labelColor: '#f0e6c8',
  },
  // A tapering agave bottle.
  tequila_100_agave: {
    profile: [
      [0.105, 0],
      [0.1, 0.03],
      [0.08, 0.25],
      [0.032, 0.3],
      [0.03, 0.44],
    ],
    label: [0.07, 0.17],
    labelColor: '#c9543c',
    cap: '#2c2a2a',
  },
  // Round-shouldered rums.
  white_rum: {
    profile: [
      [0.092, 0],
      [0.092, 0.22],
      [0.07, 0.29],
      [0.03, 0.33],
      [0.028, 0.44],
    ],
    label: [0.06, 0.18],
    labelColor: '#f4efe2',
  },
  dark_rum: {
    profile: [
      [0.092, 0],
      [0.092, 0.22],
      [0.07, 0.29],
      [0.03, 0.33],
      [0.028, 0.44],
    ],
    label: [0.06, 0.18],
    labelColor: '#e2b15d',
  },
  overproof_rum: {
    profile: [
      [0.08, 0],
      [0.08, 0.2],
      [0.03, 0.27],
      [0.028, 0.4],
    ],
    label: [0.05, 0.17],
    labelColor: '#d9493c',
  },
  // Wide flasks.
  brandy: {
    profile: [
      [0.07, 0],
      [0.115, 0.07],
      [0.118, 0.17],
      [0.06, 0.26],
      [0.03, 0.3],
      [0.028, 0.41],
    ],
    label: [0.09, 0.15],
    labelColor: '#efe0b8',
  },
  cognac: {
    profile: [
      [0.07, 0],
      [0.115, 0.07],
      [0.118, 0.17],
      [0.06, 0.26],
      [0.03, 0.3],
      [0.028, 0.41],
    ],
    label: [0.09, 0.15],
    labelColor: '#2d2926',
    cap: '#c9995d',
  },
  rye_whiskey: { label: [0.05, 0.2], labelColor: '#efe0b8', cap: '#2c2a2a' },
  bourbon: { label: [0.07, 0.22], labelColor: '#2d2926', cap: '#8a2f2a' },
};
const bottleLooks: Record<string, BottleLook> = {
  spirit: { profile: spiritShape, label: [0.06, 0.21], labelColor: '#efe0b8', cap: '#5a3a2c' },
  // A wine-shaped bottle with sloping shoulders.
  vermouth: {
    profile: [
      [0.085, 0],
      [0.085, 0.24],
      [0.05, 0.31],
      [0.03, 0.37],
      [0.028, 0.5],
    ],
    label: [0.05, 0.19],
    labelColor: '#f4efe2',
    cap: '#c9995d',
  },
  // A round flask with a long thin neck.
  liqueur: {
    profile: [
      [0.05, 0],
      [0.115, 0.04],
      [0.128, 0.12],
      [0.1, 0.2],
      [0.036, 0.25],
      [0.028, 0.38],
    ],
    label: null,
    labelColor: '#fff',
    cap: '#5a3a2c',
  },
  // A small dasher in an oversized paper wrapper.
  bitters: {
    profile: [
      [0.055, 0],
      [0.055, 0.16],
      [0.032, 0.2],
      [0.02, 0.25],
    ],
    label: [0.015, 0.16],
    labelColor: '#f7f1df',
    cap: '#e8d6b0',
  },
  // A jug with a handle, pale so it reads as glass.
  juice: {
    profile: [
      [0.085, 0],
      [0.09, 0.24],
      [0.075, 0.28],
      [0.062, 0.33],
    ],
    label: null,
    labelColor: '#fff',
    cap: '#d8e6e2',
    handle: true,
    pale: true,
  },
  water: {
    profile: [
      [0.085, 0],
      [0.09, 0.24],
      [0.075, 0.28],
      [0.062, 0.33],
    ],
    label: null,
    labelColor: '#fff',
    cap: '#d8e6e2',
    handle: true,
    pale: true,
  },
  // A soda can.
  mixer: {
    profile: [
      [0.066, 0],
      [0.075, 0.025],
      [0.075, 0.24],
      [0.06, 0.27],
    ],
    label: [0.1, 0.17],
    labelColor: '#f4efe2',
    cap: '#c9cfd4',
  },
  // A shaker or small sauce bottle.
  seasoning: {
    profile: [
      [0.06, 0],
      [0.065, 0.16],
      [0.032, 0.21],
      [0.03, 0.26],
    ],
    label: [0.03, 0.13],
    labelColor: '#f4efe2',
    cap: '#cfd3dc',
  },
  // A squat syrup bottle with a brass pourer.
  sweetener: {
    profile: [
      [0.08, 0],
      [0.085, 0.18],
      [0.05, 0.24],
      [0.024, 0.3],
      [0.02, 0.38],
    ],
    label: [0.04, 0.15],
    labelColor: '#f4efe2',
    cap: '#c9995d',
  },
};
function bottleLook(id: string): BottleLook {
  const kind = ingredients.find((i) => i.id === id)?.kind ?? 'spirit';
  return { ...(bottleLooks[kind] ?? bottleLooks.spirit), ...shapes[id] };
}
const bottleLength = (look: BottleLook) => top(look.profile)[1];
/** One bottle, standing with its pouring tip at the origin so it tips about that point. */
function Bottle({ id }: { id: string }) {
  const look = useMemo(() => bottleLook(id), [id]);
  const length = bottleLength(look);
  const outline = useMemo(() => shell(look.profile), [look]);
  const color = ingredientColors[id] ?? '#d6a35a';
  const label = look.label;
  const labelR = label && radiusAt(look.profile, (label[0] + label[1]) / 2) + 0.003;
  const [tipR] = top(look.profile);
  return (
    <group position={[0, -length, 0]}>
      <mesh castShadow>
        <latheGeometry args={[outline, 20]} />
        <meshStandardMaterial
          color={look.pale ? '#dcecea' : color}
          roughness={0.22}
          transparent={look.pale}
          opacity={look.pale ? 0.55 : 1}
        />
      </mesh>
      {look.pale && (
        // What is in the jug, up to the shoulder.
        <mesh>
          <latheGeometry args={[band(look.profile, 0.012, 0.22), 18]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
      )}
      {label && labelR && (
        <mesh position={[0, (label[0] + label[1]) / 2, 0]}>
          <cylinderGeometry args={[labelR, labelR, label[1] - label[0], 20, 1, true]} />
          <meshStandardMaterial color={look.labelColor} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, length - 0.02, 0]}>
        <cylinderGeometry args={[tipR + 0.004, tipR + 0.004, 0.05, 12]} />
        <meshStandardMaterial color={look.cap} roughness={0.4} metalness={0.25} />
      </mesh>
      {look.handle && (
        <mesh position={[-0.095, 0.17, 0]}>
          <torusGeometry args={[0.055, 0.012, 8, 14]} />
          <meshStandardMaterial color="#dcecea" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}
/** A thin stream of what is being poured, stretched between two points each frame. */
function Stream({ color, streamRef }: { color: string; streamRef: React.Ref<THREE.Mesh> }) {
  return (
    <mesh ref={streamRef} visible={false}>
      <cylinderGeometry args={[0.012, 0.009, 1, 8]} />
      <meshStandardMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}
function stretchStream(
  mesh: THREE.Mesh | null,
  x: number,
  fromY: number,
  toY: number,
  on: boolean,
) {
  if (!mesh) return;
  mesh.visible = on && fromY > toY;
  if (!mesh.visible) return;
  mesh.position.set(x, (fromY + toY) / 2, 0);
  mesh.scale.y = fromY - toY;
}

export default function DrinkStage() {
  const selected = useGame((s) => s.selected);
  // Only while you are making it; a half-made drink doesn't sit on the bar all night.
  const atCounter = useGame((s) => s.panel === 'station' || s.panel === 'recipe');
  const p = useGame((s) =>
    s.selected === -1
      ? s.game.practice
      : s.game.guests.find((g) => g.id === s.selected && g.status === 'ordered')?.prep,
  );
  const vesselRef = useRef<THREE.Group>(null);
  const spoonRef = useRef<THREE.Group>(null);
  const muddlerRef = useRef<THREE.Group>(null);
  const capRef = useRef<THREE.Group>(null);
  const bottleRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const liquidRef = useRef<THREE.Group>(null);
  const iceRef = useRef<THREE.Group>(null);
  const workRef = useRef<THREE.Group>(null);
  const glassRef = useRef<THREE.Group>(null);
  const jiggerRef = useRef<THREE.Group>(null);
  const jiggerStreamRef = useRef<THREE.Mesh>(null);
  const scoopRef = useRef<THREE.Group>(null);
  // The vessel in work and the serving glass, set each render, for the hands to find.
  const dims = useRef<{
    radius: number;
    top: number;
    rimR: number;
    rimY: number;
    level: number;
    inGlass: boolean;
  } | null>(null);
  // When ice and garnish last went in, so a hand can be seen putting them there.
  const moments = useRef({ ice: false, iceAt: -Infinity, garnish: 0, garnishAt: -Infinity });
  const hand = useMemo(() => ({ left: new THREE.Vector3(), right: new THREE.Vector3() }), []);
  const shown = useRef({ volume: 0, rise: 1 });
  // The game state is copied on every clock tick, so go by what is actually in the drink:
  // rebuilding the liquid's geometry four times a second was a stutter of its own.
  const contents = p && JSON.stringify([p.amounts, p.measure]);
  const layers = useMemo(
    () => (contents ? liquidLayers(p!) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contents],
  );
  const total = layers.reduce((n, l) => n + l.amount, 0);
  const pouringId = useGame((s) => s.pouring?.id ?? '');
  const pouringColor = ingredientColors[pouringId] ?? '#d6a35a';
  const look = useMemo(() => bottleLook(pouringId), [pouringId]);
  const bottleSize = useMemo(
    () => ({
      length: bottleLength(look),
      radius: Math.max(...look.profile.map(([r]) => r)),
    }),
    [look],
  );
  useFrame(({ clock }, delta) => {
    const s = useGame.getState();
    const t = clock.elapsedTime;
    const still = s.game.settings.reducedMotion;
    const m = still ? null : s.mixing;
    const d = dims.current;
    if (vesselRef.current) {
      // Whatever the drink is being made in is lifted off the counter, closed with the
      // tin and shaken hard in both hands in front of the shoulder, then set back down.
      const v = vesselRef.current;
      const target = m === 'shake' ? 1 : 0;
      const lift =
        (v.userData.lift ?? 0) + (target - (v.userData.lift ?? 0)) * (1 - Math.exp(-delta * 12));
      v.userData.lift = still ? 0 : lift;
      const beat = Math.sin(t * 17);
      const shaking = m === 'shake' ? lift : 0;
      v.position.set(
        0.08 * lift + beat * 0.07 * shaking,
        0.36 * lift + beat * 0.1 * shaking,
        -0.1 * lift,
      );
      v.rotation.z = Math.sin(t * 17 + 0.6) * 0.42 * shaking + 0.25 * lift;
    }
    if (capRef.current) capRef.current.visible = m === 'shake';
    if (spoonRef.current) {
      spoonRef.current.visible = m === 'stir';
      if (d) {
        const orbit = d.radius * 0.45;
        spoonRef.current.position.set(Math.cos(t * 7) * orbit, 0, Math.sin(t * 7) * orbit);
      }
    }
    if (muddlerRef.current) {
      muddlerRef.current.visible = m === 'muddle';
      muddlerRef.current.position.y = Math.abs(Math.sin(t * 9)) * 0.1;
    }
    const now = performance.now();
    // A bottle tips over the vessel. Held down it keeps pouring; a measured pour of a
    // spirit, juice or syrup goes into the jigger first, which is then tipped in.
    const pour = s.pouring;
    const since = pour ? now - pour.at : Infinity;
    const holding = !!pour?.holding && !still;
    const pouring = !still && (holding || since < pourTime);
    const measured =
      !holding &&
      s.game.settings.pourStyle === 'marked' &&
      ingredients.find((i) => i.id === pour?.id)?.unit === 'ml';
    // How far through the movement: a held pour stays in the middle of it.
    const phase = holding ? Math.min(0.5, since / pourTime) : Math.min(1, since / pourTime);
    const rim = d?.top ?? 0;
    const level = d?.level ?? 0;
    const jiggerX = 0.12,
      jiggerY = rim + 0.08;
    const bottleTips = measured
      ? smooth(0, 0.14, phase) * (1 - smooth(0.46, 0.58, phase))
      : smooth(0, 0.16, phase) * (1 - smooth(0.82, 1, phase));
    if (bottleRef.current) {
      const b = bottleRef.current;
      b.visible = pouring;
      // The tip of the bottle comes in over the vessel from the left.
      const tipX = measured ? jiggerX - 0.03 : -0.02;
      const tipY = measured ? jiggerY + 0.13 : rim + 0.11;
      b.position.set(tipX - (1 - bottleTips) * 0.22, tipY + (1 - bottleTips) * 0.08, 0);
      b.rotation.z = -(0.75 + bottleTips * 1.3);
    }
    const jiggerTips = measured ? smooth(0.56, 0.68, phase) * (1 - smooth(0.9, 1, phase)) : 0;
    if (jiggerRef.current) {
      jiggerRef.current.visible = pouring && measured;
      jiggerRef.current.position.set(jiggerX, jiggerY, 0);
      jiggerRef.current.rotation.z = jiggerTips * 1.9;
    }
    stretchStream(
      jiggerStreamRef.current,
      jiggerX - 0.03,
      jiggerY + 0.13,
      jiggerY + 0.08,
      pouring && measured && phase > 0.14 && phase < 0.48,
    );
    stretchStream(
      streamRef.current,
      measured ? jiggerX - 0.07 : -0.02,
      measured ? jiggerY + 0.03 : rim + 0.11,
      level,
      pouring && (measured ? phase > 0.62 && phase < 0.92 : phase > 0.12 && phase < 0.86),
    );
    // A scoop of ice goes in when ice is added; a hand sets each garnish on the glass.
    const moment = moments.current;
    if (p && p.ice !== moment.ice) {
      if (p.ice) moment.iceAt = now;
      moment.ice = p.ice;
    }
    const garnishes = p ? Object.values(p.garnish).reduce((n, c) => n + c, 0) : 0;
    if (garnishes > moment.garnish) moment.garnishAt = now;
    moment.garnish = garnishes;
    const scooped = (now - moment.iceAt) / scoopTime;
    const scooping = !still && scooped < 1;
    if (scoopRef.current) {
      scoopRef.current.visible = scooping;
      scoopRef.current.position.set(0.14, rim + 0.12, 0);
      scoopRef.current.rotation.z = smooth(0.15, 0.55, scooped) * 1.25;
    }
    // The cubes fall out of the scoop.
    if (iceRef.current) {
      iceRef.current.visible = !scooping || scooped > 0.4;
      iceRef.current.position.y = scooping
        ? Math.max(0, 1 - (scooped - 0.4) / 0.3) * (rim * 0.8)
        : 0;
    }
    const garnishing = !still && now - moment.garnishAt < garnishTime;
    // The bartender's hands follow the work, holding things from behind so that what
    // they hold is seen in full: both on the tin for the shake, one steadying the vessel
    // and the other on the spoon, muddler, bottle, scoop or garnish.
    const work = workRef.current;
    if (work && d) {
      const holder = vesselRef.current ?? work;
      const side = (x: number, out: THREE.Vector3) =>
        holder.localToWorld(out.set(x * (d.radius + 0.05), d.top * 0.5, -0.05));
      let left: THREE.Vector3 | null = null,
        right: THREE.Vector3 | null = null;
      if (m === 'shake') {
        left = side(-1, hand.left);
        right = side(1, hand.right);
      } else if (m === 'stir' && spoonRef.current) {
        left = spoonRef.current.localToWorld(
          hand.left.set(0, Math.max(0.45, d.top + 0.1), -gripBehind * 0.6),
        );
        right = side(1, hand.right);
      } else if (m === 'muddle' && muddlerRef.current) {
        left = muddlerRef.current.localToWorld(
          hand.left.set(0, Math.max(0.38, d.top + 0.06), -0.08),
        );
        right = side(1, hand.right);
      } else if (pouring && bottleRef.current) {
        // The outer hand holds the bottle by its body; the other holds the jigger over
        // the vessel, or steadies the vessel itself.
        bottleRef.current.updateMatrixWorld();
        left = bottleRef.current.localToWorld(hand.left.set(0, -bottleSize.length * 0.58, 0));
        left.z -= bottleSize.radius + gripBehind;
        right = measured
          ? jiggerRef
              .current!.localToWorld(hand.right.set(0.02, -0.02, 0))
              .setZ(jiggerRef.current!.getWorldPosition(hand.right).z - gripBehind)
          : side(1, hand.right);
      } else if (scooping && scoopRef.current) {
        left = side(-1, hand.left);
        scoopRef.current.updateMatrixWorld();
        right = scoopRef.current.localToWorld(hand.right.set(0.2, 0.02, 0));
        right.z -= gripBehind;
      } else if (garnishing && glassRef.current) {
        // The nearer hand: the left for a drink built where it is served.
        const target = d.inGlass ? hand.left : hand.right;
        glassRef.current.localToWorld(target.set(d.rimR * 0.5, d.rimY + 0.06, -gripBehind));
        if (d.inGlass) left = target;
        else right = target;
      }
      if (left || right) reachFor('bartender', t, left, right);
    }
    // The liquid rises to its new level rather than jumping there.
    if (shown.current.volume !== total) {
      shown.current.rise =
        total > 0 && shown.current.volume < total ? shown.current.volume / total : 1;
      shown.current.volume = total;
    }
    shown.current.rise = still ? 1 : THREE.MathUtils.damp(shown.current.rise, 1, 10, delta);
    if (liquidRef.current) liquidRef.current.scale.y = Math.max(0.02, shown.current.rise);
  });
  if (!p || selected === null || !atCounter) {
    dims.current = null;
    return null;
  }
  const inGlass = p.tool === 'build_glass' || p.tool === 'old_fashioned_glass';
  const servingGlass =
    inGlass && p.tool === 'old_fashioned_glass' ? 'old_fashioned_glass' : p.glass;
  const glassShape = glassShapes[servingGlass];
  const vesselShape = inGlass ? glassShape : vessels[p.tool as 'shaker' | 'mixing_glass'];
  const strained = !inGlass && p.technique !== 'none' && p.mix >= 0.7;
  const blended = p.technique !== 'none' && p.mix > 0;
  const glassLevel = (() => {
    const [, rimY] = top(glassShape.outer);
    const contents = inGlass ? total : strained ? total * 1.15 : 0;
    const fill = Math.min(
      0.94,
      contents / glassShape.capacity +
        (p.ice && contents && servingGlass !== 'cocktail_glass' ? 0.12 : 0),
    );
    return contents ? glassShape.floor + fill * (rimY - glassShape.floor) : glassShape.floor;
  })();
  const vesselTop = top(vesselShape.outer)[1];
  const vesselRadius = Math.max(...vesselShape.outer.map(([r]) => r));
  dims.current = {
    radius: vesselRadius,
    top: vesselTop,
    rimR: top(glassShape.outer)[0],
    rimY: top(glassShape.outer)[1],
    level: inGlass ? glassLevel : fillLevel(vesselShape, strained ? 0 : total, p.ice),
    inGlass,
  };
  const spoonLength = Math.max(0.5, vesselTop + 0.18);
  const muddlerLength = Math.max(0.42, vesselTop + 0.14);
  return (
    <group position={stagePosition} scale={stageScale}>
      <group position={[workX, 0, 0]} ref={workRef}>
        <group
          ref={(g) => {
            vesselRef.current = g;
            if (inGlass) glassRef.current = g;
          }}
        >
          <Container
            shape={vesselShape}
            layers={!inGlass && strained ? [] : layers}
            blended={blended}
            ice={p.ice && (inGlass || !strained)}
            chilled={inGlass && p.chilled}
            liquidRef={liquidRef}
            iceRef={iceRef}
          />
          {inGlass && servingGlass === 'mug' && (
            <mesh position={[0.2, 0.17, 0]}>
              <torusGeometry args={[0.07, 0.018, 8, 16]} />
              <meshStandardMaterial color="#dff0ee" transparent opacity={0.45} />
            </mesh>
          )}
          {inGlass && <Garnishes p={p} glass={servingGlass} level={glassLevel} />}
          {/* The tin goes on for the shake, whatever the drink is being made in. */}
          <group ref={capRef} position={[0, vesselTop - 0.02, 0]} visible={false}>
            <mesh position={[0, 0.15, 0]} castShadow>
              <cylinderGeometry args={[vesselRadius * 0.82, vesselRadius * 1.12, 0.32, 20]} />
              <meshStandardMaterial color="#c9cfd4" metalness={0.7} roughness={0.25} />
            </mesh>
          </group>
        </group>
        <group ref={spoonRef} visible={false}>
          {/* A long bar spoon, standing on the floor of the vessel. */}
          <mesh position={[0, spoonLength / 2 + 0.02, 0]} rotation={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.008, 0.008, spoonLength, 6]} />
            <meshStandardMaterial color="#d3d7da" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
        <group ref={muddlerRef} visible={false}>
          <mesh position={[0, muddlerLength / 2 + 0.04, 0]}>
            <cylinderGeometry args={[0.03, 0.04, muddlerLength, 8]} />
            <meshStandardMaterial color="#b98552" />
          </mesh>
        </group>
        <group ref={bottleRef} visible={false}>
          {pouringId && <Bottle id={pouringId} />}
        </group>
        <group ref={jiggerRef} visible={false}>
          <Jigger />
        </group>
        <group ref={scoopRef} visible={false}>
          <Scoop />
        </group>
        <Stream color={pouringColor} streamRef={streamRef} />
        <Stream color={pouringColor} streamRef={jiggerStreamRef} />
      </group>
      {!inGlass && (
        <group position={[servingX, 0, 0]} ref={glassRef}>
          <Container
            shape={glassShape}
            layers={strained ? layers : []}
            blended
            ice={p.ice && strained && servingGlass !== 'cocktail_glass'}
            chilled={p.chilled}
          />
          {servingGlass === 'mug' && (
            <mesh position={[0.2, 0.17, 0]}>
              <torusGeometry args={[0.07, 0.018, 8, 16]} />
              <meshStandardMaterial color="#dff0ee" transparent opacity={0.45} />
            </mesh>
          )}
          <Garnishes p={p} glass={servingGlass} level={glassLevel} />
        </group>
      )}
    </group>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { ingredientColors, ingredients } from '../game/content';
import { type Prep } from '../game/engine';
import { Celery, GarnishPiece, GarnishTray, SaltRim } from './garnishes';
import { gripFor, type Grip } from './hands';
import {
  Droplets,
  LiquidBody,
  LiquidStream,
  glassMaterial,
  innerProfile,
  lathePoints,
  radiusAt,
  shellOutline,
  smoothProfile,
  uprightLevel,
  type Profile,
} from './liquid';
import {
  BarSpoon,
  Jigger,
  LiquidVolume,
  Muddler,
  Pourer,
  Scoop,
  ShakerTin,
  Strainer,
  barReflections,
  iceCube,
  jiggerSize,
  muddlerLength,
  pourerLength,
  scoopHandle,
  spoonLength,
  toolMaterials,
  sugarCube,
  tinHeight,
} from './barTools';

// The drink itself, on the counter mat: the tin or mixing glass filling up bottle by
// bottle, ice dropping in, the shake, the stir, then the strained drink in its glass
// with every garnish on it. It follows the preparation as it happens.
type GlassId = Prep['glass'];
const glassShapes: Record<
  GlassId,
  {
    outer: Profile;
    floor: number;
    capacity: number;
    /** Cut facets running up the outside of the glass. */
    flutes?: { count: number; depth: number; from: number; to: number };
  }
> = {
  cocktail_glass: {
    outer: [
      [0.125, 0],
      [0.128, 0.005],
      [0.122, 0.011],
      [0.07, 0.017],
      [0.026, 0.03],
      [0.016, 0.07],
      [0.015, 0.14],
      [0.02, 0.185],
      [0.05, 0.215],
      [0.13, 0.262],
      [0.19, 0.31],
      [0.2, 0.335],
    ],
    floor: 0.205,
    capacity: 105,
  },
  old_fashioned_glass: {
    outer: [
      [0.158, 0],
      [0.166, 0.006],
      [0.17, 0.03],
      [0.172, 0.12],
      [0.176, 0.3],
    ],
    floor: 0.05,
    capacity: 170,
    flutes: { count: 28, depth: 0.012, from: 0.012, to: 0.19 },
  },
  highball: {
    outer: [
      [0.112, 0],
      [0.118, 0.005],
      [0.12, 0.03],
      [0.124, 0.25],
      [0.13, 0.5],
    ],
    floor: 0.045,
    capacity: 300,
  },
  mug: {
    outer: [
      [0.142, 0],
      [0.15, 0.006],
      [0.152, 0.03],
      [0.156, 0.18],
      [0.158, 0.33],
    ],
    floor: 0.035,
    capacity: 250,
  },
  hurricane: {
    outer: [
      [0.1, 0],
      [0.102, 0.006],
      [0.096, 0.012],
      [0.05, 0.02],
      [0.024, 0.04],
      [0.022, 0.085],
      [0.05, 0.12],
      [0.118, 0.17],
      [0.128, 0.215],
      [0.1, 0.3],
      [0.1, 0.36],
      [0.135, 0.46],
      [0.15, 0.5],
    ],
    floor: 0.1,
    capacity: 220,
  },
};
const vessels: Record<
  'shaker' | 'mixing_glass',
  {
    outer: Profile;
    floor: number;
    capacity: number;
    flutes?: { count: number; depth: number; from: number; to: number };
  }
> = {
  // The glass half of a Boston shaker: plain, straight, a little thicker at the rim.
  shaker: {
    outer: [
      [0.145, 0],
      [0.152, 0.008],
      [0.156, 0.035],
      [0.18, 0.44],
      [0.19, 0.46],
    ],
    floor: 0.04,
    capacity: 450,
  },
  // A cut-crystal mixing glass, heavy in the base, its facets running up from the foot.
  mixing_glass: {
    outer: [
      [0.162, 0],
      [0.172, 0.008],
      [0.176, 0.05],
      [0.178, 0.25],
      [0.183, 0.46],
      [0.186, 0.48],
    ],
    floor: 0.06,
    capacity: 450,
    flutes: { count: 32, depth: 0.012, from: 0.012, to: 0.34 },
  },
};
const top = (p: Profile) => p[p.length - 1];
type Shape = {
  outer: Profile;
  floor: number;
  capacity: number;
  flutes?: { count: number; depth: number; from: number; to: number };
};
const builtShapes = new Map<object, { outer: Profile; inner: Profile; shell: THREE.Vector2[] }>();
/** A container's curved outline, its closed inside, and its section with thick walls. */
function built(shape: { outer: Profile; floor: number }, wall = 0.011) {
  let b = builtShapes.get(shape);
  if (!b) {
    const outer = smoothProfile(shape.outer, 8);
    b = {
      outer,
      inner: innerProfile(outer, shape.floor, wall + 0.0015),
      shell: lathePoints(shellOutline(outer, shape.floor, wall)),
    };
    builtShapes.set(shape, b);
  }
  return b;
}
// Water barely tints a drink; syrups, juices and spirits give it its colour.
const clear = new Set(['sparkling_water', 'plain_water']);
/** Spirits and waters that are clear in the bottle and glass, whatever colour marks them. */
const clearLiquids: Record<string, string> = {
  vodka: '#e8f2f4',
  gin: '#e6f2ec',
  lime_vodka: '#e4f1dc',
  white_rum: '#efe9d2',
  tequila_100_agave: '#ece2b8',
  plain_water: '#d8edf2',
  sparkling_water: '#e0f0f2',
};
const richer = new THREE.Color();
export function liquidColor(id: string) {
  if (clearLiquids[id]) return clearLiquids[id];
  const hsl = { h: 0, s: 0, l: 0 };
  richer.set(ingredientColors[id] ?? '#d6a35a').getHSL(hsl);
  return '#' + richer.setHSL(hsl.h, Math.min(1, hsl.s * 1.25), hsl.l * 0.92).getHexString();
}
/** How much you can see through it: water hardly tints, a juice hides what is behind it. */
export function liquidOpacity(id: string) {
  if (clearLiquids[id]) return 0.34;
  const kind = ingredients.find((i) => i.id === id)?.kind;
  return kind === 'juice' || kind === 'seasoning' ? 0.97 : kind === 'sweetener' ? 0.92 : 0.8;
}
const mix = (layers: { id?: string; color: string; amount: number }[]) => {
  const weight = (l: { id?: string; amount: number }) =>
    l.amount * (clear.has(l.id ?? '') ? 0.03 : clearLiquids[l.id ?? ''] ? 0.2 : 1);
  const total = layers.reduce((n, l) => n + weight(l), 0) || 1;
  const c = new THREE.Color(0, 0, 0);
  for (const l of layers) c.add(new THREE.Color(l.color).multiplyScalar(weight(l) / total));
  return '#' + c.getHexString();
};
const mixOpacity = (layers: { id: string; amount: number }[]) => {
  const total = layers.reduce((n, l) => n + l.amount, 0) || 1;
  return layers.reduce((n, l) => n + liquidOpacity(l.id) * (l.amount / total), 0) || 0.8;
};
/** The share of a container's inside a drink takes up, ice lifting it a little. */
function fillShare(shape: { capacity: number }, total: number, ice: boolean) {
  return Math.min(0.94, total / shape.capacity + (ice ? 0.12 * Math.min(1, total / 10) : 0));
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
        color: liquidColor(id),
        amount: unit === 'ml' ? q : unit === 'dash' ? q * 0.8 : 0,
      };
    })
    .filter((l) => l.amount > 0);
}

/** The drink is drawn life-size on the counter mat, the size of the bartender's hands. */
export const stageScale = 1;
/**
 * A glass in section, thick walls and all, turned on a fine lathe. It is drawn in two halves
 * so that what is in it lands between its far wall and its near one.
 */
function GlassWall({
  shape,
  chilled = false,
  dirty = false,
  frosted = 0,
}: {
  shape: { outer: Profile; floor: number; flutes?: Shape['flutes'] };
  chilled?: boolean;
  dirty?: boolean;
  /** How far the cold has misted it over, for a mixing glass as it is stirred. */
  frosted?: number;
}) {
  const { shell } = built(shape);
  const [far, near] = useMemo(() => {
    const envMap = barReflections();
    const options = dirty
      ? { tint: '#c4cdbd', clear: 0.4, rough: 0.6, envIntensity: 0.8 }
      : { tint: '#c3d3d2' };
    return [
      glassMaterial(envMap, THREE.BackSide, options),
      glassMaterial(envMap, THREE.FrontSide, options),
    ];
  }, [dirty]);
  const cold = Math.max(chilled ? 1 : 0, frosted);
  useEffect(() => {
    far.userData.uniforms.uFrost.value = cold;
    near.userData.uniforms.uFrost.value = cold;
  }, [far, near, cold]);
  useEffect(
    () => () => {
      far.dispose();
      near.dispose();
    },
    [far, near],
  );
  const geometry = useMemo(() => {
    const flutes = shape.flutes;
    const g = new THREE.LatheGeometry(shell, flutes ? flutes.count * 6 : 80);
    if (flutes) {
      // Cut the outside into facets: only what lies on the outer wall moves in.
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i);
        const r = Math.hypot(x, z);
        if (r < 0.02) continue;
        if (r < radiusAt(built(shape).outer, y) - 0.004) continue;
        const a = Math.atan2(x, z);
        const inRange =
          THREE.MathUtils.smoothstep(y, flutes.from, flutes.from + 0.02) *
          (1 - THREE.MathUtils.smoothstep(y, flutes.to - 0.03, flutes.to));
        const facet = Math.abs(Math.cos((a * flutes.count) / 2));
        const to = r - flutes.depth * inRange * (1 - facet);
        p.setX(i, (x / r) * to);
        p.setZ(i, (z / r) * to);
      }
      g.computeVertexNormals();
    }
    return g;
  }, [shell, shape]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh geometry={geometry} material={far} renderOrder={1} />
      <mesh geometry={geometry} material={near} renderOrder={3} />
    </group>
  );
}
/** The handle of a beer mug, in the same glass. */
function MugHandle() {
  const material = useMemo(
    () => glassMaterial(barReflections(), THREE.FrontSide, { clear: 0.16, tint: '#c3d3d2' }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={[0.17, 0.17, 0]} material={material} renderOrder={3}>
      <torusGeometry args={[0.085, 0.02, 16, 48]} />
    </mesh>
  );
}
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
  return (
    <group scale={scale}>
      <GlassWall shape={glassShapes[glass]} dirty={dirty} />
      {glass === 'mug' && <MugHandle />}
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
  body,
  ice,
  chilled,
  frosted = 0,
  iceRef,
}: {
  shape: Shape;
  body: LiquidBody;
  ice: boolean;
  chilled: boolean;
  frosted?: number;
  iceRef?: React.Ref<THREE.Group>;
}) {
  const [rimR, rimY] = top(shape.outer);
  const { inner } = built(shape);
  // A tall vessel takes a proper scoop of ice; the cubes stack up from the floor.
  const cubes = useMemo(() => {
    const count = rimY > 0.4 ? 7 : 4;
    const r = Math.min(rimR, radiusAt(shape.outer, shape.floor + 0.05)) * 0.5;
    return Array.from({ length: count }, (_, i) => ({
      home: new THREE.Vector3(
        Math.cos(i * 2.4) * r,
        shape.floor + 0.05 + Math.floor(i / 3) * 0.085 + (i % 3) * 0.012,
        Math.sin(i * 2.4) * r,
      ),
      rotation: [i * 0.7, i * 1.3, i * 0.4] as [number, number, number],
    }));
  }, [rimR, rimY, shape]);
  return (
    <group>
      <GlassWall shape={shape} chilled={chilled} frosted={frosted} />
      <LiquidVolume inner={inner} body={body} />
      {ice && (
        <group ref={iceRef}>
          {cubes.map((cube, i) => (
            <mesh
              key={i}
              geometry={iceCube}
              position={cube.home}
              rotation={cube.rotation}
              userData={{ home: cube.home }}
              renderOrder={1}
            >
              <meshStandardMaterial
                color="#eaf8fb"
                transparent
                opacity={0.8}
                roughness={0.06}
                envMap={barReflections()}
                envMapIntensity={1.6}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

const garnishIds = [
  'cocktail_cherry',
  'orange_slice',
  'lime_slice',
  'lemon_slice',
  'orange_zest',
  'half_salt_rim',
  'mint_sprig',
  'celery_stick',
];
/**
 * The garnishes on the glass. Up to ten of one can be added for the score, but a glass
 * only has room for a few, so past that the count on the card tells the rest. Each is
 * named for its kind and number, so the one still in the hand can stay off the glass.
 */
const drawnCitrus = 3,
  drawnGarnish = 3;
function Garnishes({ p, glass, level }: { p: Prep; glass: GlassId; level: number }) {
  const [rimR, rimY] = top(glassShapes[glass].outer);
  const items: React.ReactNode[] = [];
  const count = (id: string) => Math.min(p.garnish[id] ?? 0, drawnGarnish);
  for (let i = 0; i < count('cocktail_cherry'); i++)
    items.push(
      <group
        key={'cherry' + i}
        name={'cocktail_cherry' + i}
        position={[-0.06 + i * 0.07, level + 0.035, 0.03 - (i % 2) * 0.05]}
      >
        <GarnishPiece id="cocktail_cherry" />
      </group>,
    );
  // Citrus wheels sit cut onto the rim, each fruit round its own stretch of the back.
  (
    [
      ['orange_slice', -0.55],
      ['lime_slice', -1.55],
      ['lemon_slice', -2.55],
    ] as const
  ).forEach(([id, around]) => {
    const wheels = Math.min(p.garnish[id] ?? 0, drawnCitrus);
    for (let i = 0; i < wheels; i++) {
      const angle = around - i * 0.34;
      items.push(
        <group
          key={id + i}
          name={id + i}
          position={[Math.cos(angle) * rimR, rimY + 0.022, Math.sin(angle) * rimR]}
          rotation={[Math.PI / 2 - 0.22, 0, -angle + Math.PI / 2, 'YXZ']}
        >
          <GarnishPiece id={id} />
        </group>,
      );
    }
  });
  for (let i = 0; i < count('orange_zest'); i++)
    items.push(
      <group
        key={'zest' + i}
        name={'orange_zest' + i}
        position={[rimR * 0.62, rimY + 0.006, 0.05 - i * 0.07]}
        rotation={[0.25, 0.7 - i * 0.5, 0.18]}
      >
        <GarnishPiece id="orange_zest" />
      </group>,
    );
  if (p.garnish['half_salt_rim'])
    items.push(
      <group key="salt" name="half_salt_rim0" position={[0, rimY, 0]}>
        <SaltRim radius={rimR} />
      </group>,
    );
  for (let i = 0; i < count('mint_sprig'); i++)
    items.push(
      <group
        key={'mint' + i}
        name={'mint_sprig' + i}
        position={[0.05 - i * 0.05, level + 0.04, -0.04 + (i % 2) * 0.03]}
      >
        <GarnishPiece id="mint_sprig" />
      </group>,
    );
  for (let i = 0; i < count('celery_stick'); i++) {
    const length = rimY + 0.14;
    items.push(
      // Standing in the glass, leaning on the rim, with its leaves above it.
      <group
        key={'celery' + i}
        name={'celery_stick' + i}
        position={[0.02 + i * 0.04, glassShapes[glass].floor, -0.02 - i * 0.04]}
        rotation={[0, 0, -0.22 - i * 0.08]}
      >
        <Celery length={length} />
      </group>,
    );
  }
  return <>{items}</>;
}

/**
 * The working mat, on the staff side of the counter. The vessel stands to the
 * bartender's right of centre with the serving glass on the other side, so both hands
 * work in front of the chest, under the chin rather than across the face. The tools
 * wait on the mat in the order a bartender sets them out. Positions from the vessel.
 */
const stagePosition: [number, number, number] = [0, 1.27, -2.22];
const workX = -0.34,
  servingX = 0.62;
/** The tin stands on its open end on the mat ([x, z]); the rest as [x, y, z]. */
const tinPark: [number, number] = [-0.46, 0.02];
const jiggerPark: [number, number, number] = [0.26, jiggerSize.bottom * -1 + 0.012, 0.24];
const strainerPark: [number, number, number] = [0.53, 0.02, -0.06];
const spoonPark: [number, number, number] = [1.18, 0.024, 0.32];
const muddlerPark: [number, number, number] = [0.02, 0.05, 0.32];
const trayAt: [number, number, number] = [1.33, 0, 0.13];
/** Out of sight under the counter's edge: the bottle rail and the ice well. */
const railBottle: [number, number, number] = [-0.42, -0.22, -0.46];
const railScoop: [number, number, number] = [-0.55, -0.24, -0.46];
/**
 * Where the base of the vessel is carried to for the shake, and how far it leans: across
 * the chest and up past the shoulder, so that both hands stay under the chin.
 */
const shakeHome: [number, number, number] = [0.22, 0.14, -0.05],
  shakeLean = 0.95;
/** How long each movement at the counter lasts, in milliseconds. */
const pourTime = 1250,
  measuredTime = 1750,
  pieceTime = 1000,
  dashBeat = 240,
  dashTime = (n: number) => 660 + n * dashBeat,
  scoopTime = 1050,
  garnishTime = 900,
  setDownTime = 500,
  chillTime = 1500,
  strainTime = 1900;
/** How far the vessel is tipped to pour out through the strainer. */
const strainPourTilt = 1.22;
/** When a pinched sugar cube is let go, through its movement. */
const pieceDrop = 0.5;
/** A shake takes about three strokes a second, the tin held for the time it takes to go on. */
const shakeRate = 20,
  sealTime = 0.55;
/** About a turn of the spoon a second; a press of the muddler about every two thirds. */
const stirRate = 7.5,
  muddleRate = 9,
  muddleSeconds = 1.5;
const smooth = (from: number, to: number, x: number) => THREE.MathUtils.smoothstep(x, from, to);
const newGrip = (): Grip => ({
  node: new THREE.Object3D(),
  point: [0, 0, 0],
  fingers: [0, 0, 1],
  palm: [1, 0, 0],
  pose: 'relaxed',
  key: '',
});
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
  /** A steel speed pourer in the neck, as a working bottle has. */
  pourer?: boolean;
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
const speedPoured = new Set(['spirit', 'vermouth', 'liqueur', 'sweetener']);
export function bottleLook(id: string): BottleLook {
  const kind = ingredients.find((i) => i.id === id)?.kind ?? 'spirit';
  return {
    ...(bottleLooks[kind] ?? bottleLooks.spirit),
    ...shapes[id],
    pourer: speedPoured.has(kind),
  };
}
export const bottleLength = (look: BottleLook) => top(look.profile)[1];
const spoutLength = (look: BottleLook) => (look.pourer ? pourerLength : 0);
const labels = new Map<string, THREE.Texture>();
/** A printed paper label for a bottle: its name, set between ruled lines. */
function labelTexture(id: string, paper: string) {
  let texture = labels.get(id);
  if (texture) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  paintLabel(canvas.getContext('2d')!, 0, 0, 640, 400, id, paper);
  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  labels.set(id, texture);
  return texture;
}
/** Draw one label, in a rectangle of a canvas: the shelf shares one canvas between them. */
export function paintLabel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  id: string,
  paper: string,
) {
  const dark = new THREE.Color(paper).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4;
  const ink = dark ? '#f1e4c4' : '#2e241d';
  c.fillStyle = paper;
  c.fillRect(x, y, w, h);
  c.strokeStyle = ink;
  c.lineWidth = h * 0.012;
  c.strokeRect(x + w * 0.035, y + h * 0.055, w * 0.93, h * 0.89);
  c.lineWidth = h * 0.004;
  c.strokeRect(x + w * 0.05, y + h * 0.08, w * 0.9, h * 0.84);
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const words = (ingredients.find((i) => i.id === id)?.name ?? id).replace('100% ', '').split(' ');
  const size = h * (words.length > 2 ? 0.17 : 0.21);
  c.font = `700 ${size}px Georgia, 'Times New Roman', serif`;
  words.slice(0, 3).forEach((word, i) => {
    const line = (i - (Math.min(words.length, 3) - 1) / 2) * size * 1.14;
    c.fillText(word.toUpperCase(), x + w / 2, y + h * 0.46 + line, w * 0.84);
  });
  c.font = `italic ${h * 0.062}px Georgia, 'Times New Roman', serif`;
  c.fillText('Dive Bar house pour', x + w / 2, y + h * 0.84, w * 0.8);
}
/** One bottle, standing with its pouring tip at the origin so it tips about that point. */
function Bottle({ id, body }: { id: string; body: LiquidBody }) {
  const look = useMemo(() => bottleLook(id), [id]);
  const kind = ingredients.find((i) => i.id === id)?.kind;
  const length = bottleLength(look);
  const m = toolMaterials();
  const parts = useMemo(() => {
    const outer = smoothProfile(look.profile, 9);
    const floor = 0.018;
    return {
      inner: innerProfile(outer, floor, 0.008),
      shell: new THREE.LatheGeometry(lathePoints(shellOutline(outer, floor, 0.0065)), 72),
      solid: new THREE.LatheGeometry(lathePoints([[0, 0], ...outer, [0, length]]), 72),
      // The label follows the curve of the bottle, round the side you are looking at.
      label:
        look.label &&
        new THREE.LatheGeometry(
          lathePoints(
            outer
              .filter(([, y]) => y >= look.label![0] && y <= look.label![1])
              .map(([r, y]) => [r + 0.0022, y] as [number, number]),
          ),
          48,
          kind === 'mixer' ? 0 : -1.25,
          kind === 'mixer' ? Math.PI * 2 : 2.5,
        ),
    };
  }, [look, kind, length]);
  useEffect(
    () => () => {
      parts.shell.dispose();
      parts.solid.dispose();
      parts.label?.dispose();
    },
    [parts],
  );
  const [far, near] = useMemo(() => {
    const envMap = barReflections();
    return [
      glassMaterial(envMap, THREE.BackSide, { tint: '#c3d3d2', clear: 0.07 }),
      glassMaterial(envMap, THREE.FrontSide, { tint: '#c3d3d2', clear: 0.07 }),
    ];
  }, []);
  useEffect(
    () => () => {
      far.dispose();
      near.dispose();
    },
    [far, near],
  );
  const [tipR] = top(look.profile);
  return (
    <group position={[0, -length - spoutLength(look), 0]}>
      {kind === 'mixer' ? (
        // A can: nothing to see through.
        <mesh geometry={parts.solid} material={m.brushed} castShadow />
      ) : (
        <>
          <mesh geometry={parts.shell} material={far} renderOrder={1} />
          <LiquidVolume inner={parts.inner} body={body} />
          <mesh geometry={parts.shell} material={near} renderOrder={3} castShadow />
        </>
      )}
      {parts.label && (
        <mesh geometry={parts.label} renderOrder={4}>
          <meshStandardMaterial
            map={labelTexture(id, look.labelColor)}
            roughness={0.72}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {look.pourer ? (
        <Pourer collar={look.cap} y={length} />
      ) : (
        <mesh position={[0, length - 0.018, 0]}>
          <cylinderGeometry args={[tipR + 0.004, tipR + 0.004, 0.046, 32]} />
          <meshStandardMaterial color={look.cap} roughness={0.4} metalness={0.25} />
        </mesh>
      )}
      {look.handle && (
        <mesh position={[-0.098, 0.17, 0]} material={near} renderOrder={3}>
          <torusGeometry args={[0.058, 0.013, 14, 40]} />
        </mesh>
      )}
    </group>
  );
}
/** The few cubes swirled round a glass to chill it, before they are tipped out. */
function ChillIce({ glass, iceRef }: { glass: GlassId; iceRef: React.Ref<THREE.Group> }) {
  const { floor } = glassShapes[glass];
  return (
    <group ref={iceRef} position={[0, floor + 0.04, 0]} visible={false}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          geometry={iceCube}
          position={[Math.cos(i * 2.1) * 0.05, i * 0.012, Math.sin(i * 2.1) * 0.05]}
          rotation={[i, i * 1.4, 0]}
          scale={0.7}
        >
          <meshStandardMaterial color="#eaf8fb" transparent opacity={0.85} roughness={0.12} />
        </mesh>
      ))}
    </group>
  );
}
/** A stream of what is being poured; see LiquidStream, which shapes it every frame. */
function Stream({
  stream,
  color,
  opacity,
  streamRef,
}: {
  stream: LiquidStream;
  color: string;
  opacity: number;
  streamRef: React.Ref<THREE.Mesh>;
}) {
  return (
    <mesh
      ref={streamRef}
      geometry={stream.geometry}
      visible={false}
      frustumCulled={false}
      renderOrder={2}
    >
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.18}
        roughness={0.06}
        envMap={barReflections()}
        envMapIntensity={1.5}
        transparent
        opacity={Math.max(0.6, opacity)}
      />
    </mesh>
  );
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
  const workRef = useRef<THREE.Group>(null);
  const vesselRef = useRef<THREE.Group>(null);
  const servingRef = useRef<THREE.Group>(null);
  const tinRef = useRef<THREE.Group>(null);
  const tinMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const spoonRef = useRef<THREE.Group>(null);
  const muddlerRef = useRef<THREE.Group>(null);
  const strainerRef = useRef<THREE.Group>(null);
  const bottleRef = useRef<THREE.Group>(null);
  const jiggerRef = useRef<THREE.Group>(null);
  const scoopRef = useRef<THREE.Group>(null);
  const scoopCubes = useRef<THREE.Group>(null);
  const carryRef = useRef<THREE.Group>(null);
  const cubeRef = useRef<THREE.Group>(null);
  const servedIceRef = useRef<THREE.Group>(null);
  const trayRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const jiggerStreamRef = useRef<THREE.Mesh>(null);
  const strainStreamRef = useRef<THREE.Mesh>(null);
  const iceRef = useRef<THREE.Group>(null);
  const sugarRef = useRef<THREE.Group>(null);
  const chillIceRef = useRef<THREE.Group>(null);
  const garnishesRef = useRef<THREE.Group>(null);
  // The vessel in work and the serving glass, set each render, for the hands to find.
  const dims = useRef<{
    radius: number;
    top: number;
    rimR: number;
    rimY: number;
    floor: number;
    vesselShape: Shape;
    glassShape: Shape;
    glassIce: boolean;
    inGlass: boolean;
    stem: boolean;
  } | null>(null);
  // When each thing last happened, so that a hand can be seen doing it.
  const moments = useRef({
    ice: false,
    iceAt: -Infinity,
    garnish: {} as Record<string, number>,
    garnishId: '',
    garnishAt: -Infinity,
    chilled: false,
    chillAt: -Infinity,
    tool: '',
    toolAt: -Infinity,
    glass: '',
    glassAt: -Infinity,
    strained: false,
    strainAt: -Infinity,
    fillFrom: 0,
    muddled: 0,
    dropsDue: 0,
  });
  const motion = useRef({
    shake: 0,
    stir: 0,
    muddle: 0,
    tip: 0,
    raise: 0,
    turned: 0,
    dropFloor: 0,
  });
  // What has really landed in the vessel so far, which trails what the game has counted.
  const shown = useRef({ volume: 0, target: 0, rate: 60 });
  const bodies = useMemo(
    () => ({
      vessel: new LiquidBody(),
      served: new LiquidBody(),
      bottle: new LiquidBody(),
      jigger: new LiquidBody(),
    }),
    [],
  );
  const streams = useMemo(
    () => ({ bottle: new LiquidStream(), jigger: new LiquidStream(), strain: new LiquidStream() }),
    [],
  );
  const drops = useMemo(() => new Droplets(), []);
  const scratch = useMemo(
    () => ({
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      c: new THREE.Vector3(),
      color: new THREE.Color(),
    }),
    [],
  );
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
  const pouringColor = liquidColor(pouringId);
  const pouringOpacity = liquidOpacity(pouringId);
  const look = useMemo(() => bottleLook(pouringId), [pouringId]);
  const bottleSize = useMemo(
    () => ({
      length: bottleLength(look) + spoutLength(look),
      radius: Math.max(...look.profile.map(([r]) => r)),
    }),
    [look],
  );
  const drinkColor = useMemo(() => mix(layers), [layers]);
  const drinkOpacity = useMemo(() => mixOpacity(layers), [layers]);
  const grips = useMemo(() => ({ left: newGrip(), right: newGrip() }), []);
  useFrame(({ clock }, delta) => {
    const work = workRef.current;
    const vessel = vesselRef.current;
    const d = dims.current;
    if (!work || !vessel || !d || !p) return;
    const s = useGame.getState();
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const still = s.game.settings.reducedMotion;
    const m = still ? null : s.mixing;
    const now = performance.now();
    const go = motion.current;
    const moment = moments.current;
    const serving = servingRef.current ?? vessel;
    const glassX = d.inGlass ? 0 : servingX - workX;
    // Note what has just changed, for the hands to do it. Nothing plays on the first look.
    const firstLook = moment.tool === '';
    if (p.tool !== moment.tool) {
      if (!firstLook) moment.toolAt = now;
      moment.tool = p.tool;
    }
    if (p.glass !== moment.glass) {
      if (!firstLook) moment.glassAt = now;
      moment.glass = p.glass;
    }
    if (p.ice !== moment.ice) {
      if (p.ice && !firstLook) moment.iceAt = now;
      moment.ice = p.ice;
    }
    if (p.chilled !== moment.chilled) {
      if (p.chilled && !firstLook) moment.chillAt = now;
      moment.chilled = p.chilled;
    }
    for (const [id, count] of Object.entries(p.garnish)) {
      if (count > (moment.garnish[id] ?? 0) && !firstLook) {
        moment.garnishId = id;
        moment.garnishAt = now;
      }
    }
    moment.garnish = p.garnish;
    // The drink goes through the strainer once the mixing is over: on to the garnish.
    const wantStrained = !d.inGlass && s.benchStep === 'garnish' && !m && total > 0;
    if (wantStrained !== moment.strained) {
      moment.strained = wantStrained;
      moment.strainAt = wantStrained && !firstLook ? now : -Infinity;
    }

    // What the bottle hand is doing, from the kind of pour under way.
    const pour = s.pouring;
    const since = pour ? now - pour.at : Infinity;
    const holding = !!pour?.holding && !still;
    const unit = ingredients.find((i) => i.id === pour?.id)?.unit;
    const kind: 'free' | 'measured' | 'dash' | 'piece' | null = !pour
      ? null
      : s.game.settings.pourStyle !== 'marked' || holding
        ? 'free'
        : unit === 'ml'
          ? 'measured'
          : unit === 'piece'
            ? 'piece'
            : 'dash';
    const dashes = Math.min(4, Math.max(1, Math.round(pour?.quantity ?? 1)));
    const lasts =
      kind === 'measured'
        ? measuredTime
        : kind === 'dash'
          ? dashTime(dashes)
          : kind === 'piece'
            ? pieceTime
            : pourTime;
    const pouring = !still && !!kind && (holding || since < lasts);
    // How far through the movement: a held pour stays in the middle of it.
    const phase = holding ? Math.min(0.5, since / lasts) : Math.min(1, since / lasts);

    // The set-up on the mat: a new vessel or glass comes up from under the counter.
    const toolIn = still ? 1 : Math.min(1, (now - moment.toolAt) / setDownTime);
    const glassIn = still ? 1 : Math.min(1, (now - moment.glassAt) / setDownTime);
    const strainT = still ? 1 : Math.min(1, (now - moment.strainAt) / strainTime);
    const straining = !still && moment.strained && strainT < 1;
    const chillT = still ? 1 : Math.min(1, (now - moment.chillAt) / chillTime);
    const chilling = !still && chillT < 1;
    const scooped = still ? 1 : Math.min(1, (now - moment.iceAt) / scoopTime);
    const scooping = !still && scooped < 1;
    const garnishT = still ? 1 : Math.min(1, (now - moment.garnishAt) / garnishTime);
    const garnishing = !still && garnishT < 1 && !!moment.garnishId;

    // Shake: the tin goes on, then the whole thing comes up by the shoulder.
    go.shake = still
      ? 0
      : THREE.MathUtils.clamp(go.shake + (m === 'shake' ? dt : -dt) / sealTime, 0, 1);
    const sealed = smooth(0, 0.4, go.shake);
    const up = smooth(0.35, 1, go.shake);
    const beat = Math.sin(t * shakeRate);
    const piston = (Math.abs(beat) ** 0.6 * Math.sign(beat) * 0.5 + 0.5) * 2 - 1;
    const shaking = m === 'shake' ? up : 0;
    const shakeTilt = shakeLean * up;
    const axisX = -Math.sin(shakeTilt),
      axisY = Math.cos(shakeTilt);
    // Pouring out through the strainer: over the serving glass, tipped from the lip.
    const carry = straining ? smooth(0.1, 0.3, strainT) * (1 - smooth(0.88, 1, strainT)) : 0;
    const strainTilt = straining
      ? strainPourTilt * smooth(0.2, 0.38, strainT) * (1 - smooth(0.78, 0.9, strainT))
      : 0;
    // Chilling the glass: cubes in, swirled round in the hand, and tipped out.
    const lifted = chilling ? smooth(0, 0.14, chillT) * (1 - smooth(0.88, 1, chillT)) : 0;
    const swirl = chilling ? smooth(0.2, 0.3, chillT) * (1 - smooth(0.68, 0.76, chillT)) : 0;
    const dump = chilling ? smooth(0.72, 0.82, chillT) * (1 - smooth(0.86, 0.95, chillT)) : 0;
    const swirlX = Math.cos(t * 13) * 0.035 * swirl,
      swirlZ = Math.sin(t * 13) * 0.035 * swirl;
    if (servingRef.current) {
      const g = servingRef.current;
      g.position.set(
        servingX + swirlX,
        lifted * 0.16 + (glassIn - 1) * 0.72,
        swirlZ + (glassIn - 1) * 0.42,
      );
      g.rotation.z = -dump * 1.5;
      g.rotation.x = Math.sin(t * 13) * 0.08 * swirl;
    }
    {
      let x = shakeHome[0] * up,
        y = shakeHome[1] * up,
        z = shakeHome[2] * up;
      x += axisX * piston * 0.075 * shaking + Math.cos(t * shakeRate * 0.5) * 0.012 * shaking;
      y += axisY * piston * 0.075 * shaking;
      if (carry > 0) {
        const lipX = d.radius * 0.96,
          lipY = d.top;
        const c = Math.cos(strainTilt),
          sn = Math.sin(strainTilt);
        const atX = glassX - 0.03 - (lipX * c + lipY * sn);
        const atY = d.rimY + 0.07 - (-lipX * sn + lipY * c);
        x = atX * carry;
        y = Math.max(0, atY) * carry;
      }
      y += (toolIn - 1) * 0.72;
      z += (toolIn - 1) * 0.42;
      if (d.inGlass) {
        x += swirlX;
        y += lifted * 0.16;
        z += swirlZ;
      }
      vessel.position.set(x, y, z);
      vessel.rotation.z = shakeTilt - strainTilt - (d.inGlass ? dump * 1.5 : 0);
    }
    const tin = tinRef.current;
    if (tin) {
      // Off the mat and down over the vessel, a little crooked until it is knocked home.
      const on = scratch.a
        .set(0, d.top - 0.03, 0)
        .applyEuler(vessel.rotation)
        .add(vessel.position);
      tin.position.set(
        tinPark[0] + (on.x - tinPark[0]) * sealed,
        on.y * sealed + Math.sin(sealed * Math.PI) * 0.34,
        tinPark[1] + (on.z - tinPark[1]) * sealed,
      );
      tin.rotation.z = vessel.rotation.z * sealed + Math.sin(sealed * Math.PI) * 0.3;
    }
    if (tinMaterial.current) {
      // The tin frosts over as the shake goes on, and clears again when it is put down.
      const frost = shaking * THREE.MathUtils.clamp(0.25 + p.mix * 0.75, 0, 1);
      tinMaterial.current.roughness = 0.24 + frost * 0.34;
      tinMaterial.current.metalness = 0.95 - frost * 0.2;
    }
    if (iceRef.current) {
      // The cubes fall from the scoop one after another, and rattle in the shake.
      iceRef.current.children.forEach((cube, i) => {
        const home = cube.userData.home as THREE.Vector3 | undefined;
        if (!home) return;
        const fall = scooping
          ? 1 - THREE.MathUtils.clamp((scooped - 0.42 - i * 0.05) / 0.16, 0, 1)
          : 0;
        const rattle = shaking ? Math.sin(t * shakeRate * 1.7 + i * 2.1) * 0.03 : 0;
        // Ice floats: anything under the surface rises to it, and bobs when it is stirred up.
        const surface = bodies.vessel.level - stagePosition[1] - vessel.position.y;
        const afloat =
          !shaking && Math.abs(vessel.rotation.z) < 0.15 && bodies.vessel.fraction > 0.02
            ? Math.max(0, Math.min(surface - 0.05 - home.y, 0.24)) *
                Math.min(1, (surface - d.floor) / 0.12) +
              Math.sin(t * 3 + i * 1.9) * 0.006 * (0.4 + bodies.vessel.agitation * 2)
            : 0;
        cube.position.set(
          home.x + rattle * 0.8 + (strainTilt / strainPourTilt) * 0.05,
          home.y + fall * fall * (d.top + 0.3) + rattle + Math.max(0, afloat),
          home.z - rattle * 0.5,
        );
        cube.visible = !scooping || fall < 1;
      });
    }

    // Stir: the spoon's bowl runs round the wall, the shaft leaning on the turn of the
    // fingers while the top hardly moves. The ice goes round with it.
    go.stir = still ? 0 : THREE.MathUtils.clamp(go.stir + (m === 'stir' ? dt : -dt) / 0.28, 0, 1);
    const spoon = spoonRef.current;
    if (spoon) {
      const inGlassNow = smooth(0, 1, go.stir);
      const turn = t * stirRate;
      const orbit = d.radius * 0.62 * inGlassNow;
      const lean = Math.atan2(orbit * 0.72, spoonLength);
      spoon.position.set(
        spoonPark[0] * (1 - inGlassNow) + Math.cos(turn) * orbit,
        spoonPark[1] * (1 - inGlassNow) + d.floor * inGlassNow,
        spoonPark[2] * (1 - inGlassNow) + Math.sin(turn) * orbit,
      );
      spoon.rotation.set(
        -lean * Math.sin(turn),
        0,
        lean * Math.cos(turn) + (Math.PI / 2) * (1 - inGlassNow),
      );
    }
    if (iceRef.current && m === 'stir') iceRef.current.rotation.y = t * stirRate * 0.6;
    else if (iceRef.current) iceRef.current.rotation.y *= Math.exp(-dt * 3);
    // Muddle: press and give a quarter turn; it is never a beating.
    go.muddle = still
      ? 0
      : THREE.MathUtils.clamp(go.muddle + (m === 'muddle' ? dt : -dt) / 0.28, 0, 1);
    const muddler = muddlerRef.current;
    if (muddler) {
      const inGlassNow = smooth(0, 1, go.muddle);
      const press = Math.sin(t * muddleRate);
      const pressed = Math.max(0, press);
      if (m === 'muddle') {
        go.turned += dt * muddleRate * 0.25;
        moment.muddled += dt;
      }
      muddler.position.set(
        muddlerPark[0] * (1 - inGlassNow),
        muddlerPark[1] * (1 - inGlassNow) + inGlassNow * (d.floor + 0.012 + pressed * 0.07),
        muddlerPark[2] * (1 - inGlassNow),
      );
      muddler.rotation.set(0, go.turned, (Math.PI / 2) * (1 - inGlassNow));
    }
    if (sugarRef.current) {
      const left = p.dissolved ? 0 : Math.max(0.2, 1 - moment.muddled / muddleSeconds);
      const dropped = kind !== 'piece' || !pouring || phase > pieceDrop + 0.14;
      sugarRef.current.visible = dropped && !p.dissolved;
      sugarRef.current.scale.setScalar(left);
    }

    const pinched = cubeRef.current;
    if (pinched) {
      const carrying = pouring && kind === 'piece';
      pinched.visible = carrying;
      if (carrying) {
        const r = smooth(0, 0.34, phase) * (1 - smooth(pieceDrop + 0.14, 1, phase));
        pinched.position.set(
          railBottle[0] + (-0.02 - railBottle[0]) * r,
          railBottle[1] + (d.top + 0.1 - railBottle[1]) * r,
          railBottle[2] * (1 - r),
        );
        const fallen = THREE.MathUtils.clamp((phase - pieceDrop) / 0.14, 0, 1);
        const cube = pinched.children[0];
        cube.position.y = -fallen * fallen * (d.top + 0.1 - d.floor);
        cube.visible = fallen < 1;
      }
    }
    // The bottle: up from the rail beside the knees, tipped over from the wrist.
    // Its small cup down in the mouth of the vessel, so any spill still goes in the drink.
    const jiggerAtX = 0.02,
      jiggerAtY = d.top + 0.005,
      jiggerAtZ = 0.05;
    const tipTo = kind === 'measured' ? jiggerAtY + jiggerSize.top + 0.07 : d.top + 0.1;
    const tipX = kind === 'measured' ? jiggerAtX - 0.075 : -0.09;
    let raiseTo = 0,
      tipToward = 0,
      dashKick = 0;
    if (pouring) {
      if (kind === 'measured') {
        raiseTo = smooth(0, 0.13, phase) * (1 - smooth(0.54, 0.68, phase));
        tipToward = smooth(0.13, 0.21, phase) * (1 - smooth(0.46, 0.54, phase));
      } else if (kind === 'free') {
        raiseTo = smooth(0, 0.14, phase) * (1 - smooth(0.9, 1, phase));
        tipToward = smooth(0.14, 0.24, phase) * (1 - smooth(0.84, 0.92, phase));
      } else if (kind === 'dash') {
        const ms = phase * lasts;
        raiseTo = smooth(0, 220, ms) * (1 - smooth(lasts - 220, lasts, ms));
        tipToward = smooth(180, 300, ms) * (1 - smooth(lasts - 330, lasts - 200, ms));
        if (ms > 300 && ms < lasts - 330) {
          // One sharp flick of the wrist for each dash.
          const flick = ((ms - 300) % dashBeat) / dashBeat;
          dashKick = Math.sin(flick * Math.PI) ** 2;
        }
      }
    }
    go.raise = still ? 0 : THREE.MathUtils.damp(go.raise, raiseTo, 24, dt);
    go.tip = still ? 0 : THREE.MathUtils.damp(go.tip, tipToward, 30, dt);
    const bottle = bottleRef.current;
    const bottleShown = pouring && kind !== 'piece' && (go.raise > 0.01 || raiseTo > 0);
    if (bottle) {
      bottle.visible = bottleShown;
      const r = go.raise,
        tip = go.tip;
      const dash = kind === 'dash';
      const readyX = tipX - 0.2,
        readyY = tipTo + 0.14;
      bottle.position.set(
        railBottle[0] + (readyX + (tipX - readyX) * tip - railBottle[0]) * r,
        railBottle[1] + (readyY + (tipTo - readyY) * tip - railBottle[1]) * r,
        railBottle[2] + ((kind === 'measured' ? jiggerAtZ : 0) - railBottle[2]) * r,
      );
      bottle.rotation.z = -(r * 0.55 + tip * (dash ? 2.2 + dashKick * 0.32 : 1.5));
    }
    // The jigger: taken up from the mat in the other hand, held level at the rim while it
    // fills, then rolled over from the wrist so it empties into the vessel.
    const measured = pouring && kind === 'measured';
    const jiggerUp = measured ? smooth(0, 0.13, phase) * (1 - smooth(0.9, 1, phase)) : 0;
    const jiggerFilled = measured ? smooth(0.2, 0.46, phase) * (1 - smooth(0.62, 0.82, phase)) : 0;
    const jiggerRoll = measured ? smooth(0.56, 0.66, phase) * (1 - smooth(0.84, 0.92, phase)) : 0;
    const jigger = jiggerRef.current;
    if (jigger) {
      jigger.position.set(
        jiggerPark[0] + (jiggerAtX - jiggerPark[0]) * jiggerUp,
        jiggerPark[1] + (jiggerAtY - jiggerPark[1]) * jiggerUp,
        jiggerPark[2] + (jiggerAtZ - jiggerPark[2]) * jiggerUp,
      );
      jigger.rotation.z = jiggerRoll * 1.85;
    }
    // Real streams: each leaves its lip along the way the container points and falls under
    // gravity. A bottle only runs once the liquid in it has actually reached the spout.
    const stageY = stagePosition[1],
      roomX = stagePosition[0] + workX,
      roomZ = stagePosition[2];
    const vesselTop = bodies.vessel.level - stageY;
    const across = !moment.strained ? 0 : still ? 1 : smooth(0.38, 0.82, strainT);
    let landing: THREE.Vector3 | null = null;
    let landed: LiquidBody | null = null;
    let force = 0;
    if (streamRef.current && bottle) {
      const running =
        pouring &&
        go.tip > 0.5 &&
        bodies.bottle.level > bottle.position.y + stageY &&
        (kind === 'measured' ? phase < 0.47 : kind === 'free' ? phase < 0.86 : false);
      const flicked = kind === 'dash' && pouring && dashKick > 0.55;
      const on = running || flicked;
      streamRef.current.visible = on;
      if (on) {
        const angle = bottle.rotation.z;
        const into =
          kind === 'measured' ? jiggerAtY + jiggerSize.top * (0.2 + 0.6 * jiggerFilled) : vesselTop;
        streams.bottle.update(
          bottle.position,
          scratch.b.set(-Math.sin(angle), Math.cos(angle), 0),
          0.7,
          into,
          flicked ? 0.005 : 0.0145,
          t,
        );
        landing = streams.bottle.landing;
        landed = kind === 'measured' ? bodies.jigger : bodies.vessel;
        force = flicked ? 0.3 : 0.8;
      }
    }
    if (jiggerStreamRef.current && jigger) {
      const on = measured && jiggerRoll > 0.82 && jiggerFilled > 0.01;
      jiggerStreamRef.current.visible = on;
      if (on) {
        const lip = scratch.a.set(-jiggerSize.topRadius, jiggerSize.top, 0);
        lip.applyEuler(jigger.rotation).add(jigger.position);
        streams.jigger.update(lip, scratch.b.set(-0.8, -0.6, 0), 0.4, vesselTop, 0.019, t);
        landing = streams.jigger.landing;
        landed = bodies.vessel;
        force = 1;
      }
    }
    if (strainStreamRef.current) {
      const on = straining && strainT > 0.36 && strainT < 0.84;
      strainStreamRef.current.visible = on;
      if (on) {
        const lip = scratch.a.set(d.radius * 0.96, d.top + 0.01, 0);
        lip.applyEuler(vessel.rotation).add(vessel.position);
        streams.strain.update(
          lip,
          scratch.b.set(0.75, -0.65, 0),
          0.42,
          bodies.served.level - stageY,
          0.017,
          t,
        );
        landing = streams.strain.landing;
        landed = bodies.served;
        force = 0.9;
      }
    }
    // Where a stream lands the surface rings, and a few drops jump back out of it.
    const dropMaterial = drops.mesh.material as THREE.MeshStandardMaterial;
    if (landing && landed) {
      landed.splash(landing.x + roomX, landing.z + roomZ, force);
      moment.dropsDue += dt * 26 * force;
      dropMaterial.color.copy(landed.color);
      drops.wall.x = landed === bodies.served ? glassX : 0;
      drops.wall.z = 0;
      drops.wall.radius =
        landed === bodies.jigger
          ? jiggerSize.topRadius * 0.8
          : landed === bodies.served
            ? d.rimR * 0.82
            : d.radius * 0.72;
      if (landed === bodies.jigger) drops.wall.x = jiggerAtX;
      for (; moment.dropsDue >= 1; moment.dropsDue--) drops.throw(landing, 1.15, 0.42, 0.0085);
      go.dropFloor = landing.y;
    }
    drops.step(dt, go.dropFloor);
    const strainer = strainerRef.current;
    if (strainer) {
      const on = straining ? smooth(0, 0.12, strainT) * (1 - smooth(0.9, 1, strainT)) : 0;
      const seat = scratch.a
        .set(0, d.top + 0.008, 0)
        .applyEuler(vessel.rotation)
        .add(vessel.position);
      strainer.position.set(
        strainerPark[0] + (seat.x - strainerPark[0]) * on,
        strainerPark[1] + (seat.y - strainerPark[1]) * on + Math.sin(on * Math.PI) * 0.12,
        strainerPark[2] + (seat.z - strainerPark[2]) * on,
      );
      strainer.rotation.set(0, (1 - on) * 2.4, vessel.rotation.z * on);
    }
    // The liquid rises as it lands, however much the game has counted already. What goes
    // on in a vessel fills it from the jigger at the end of a measured pour.
    const sh = shown.current;
    if (still || total < sh.volume - 0.001) sh.volume = sh.target = total;
    else if (total > sh.target) {
      sh.rate = Math.max(45, (total - sh.volume) / (kind === 'measured' ? 0.34 : 0.22));
      sh.target = total;
      moment.fillFrom = kind === 'measured' && pouring ? now + measuredTime * 0.62 - since : now;
    }
    if (now >= moment.fillFrom) sh.volume = Math.min(sh.target, sh.volume + sh.rate * dt);
    const remaining = sh.volume * (1 - across);
    bodies.vessel.fraction = fillShare(d.vesselShape, remaining, p.ice);
    bodies.served.fraction = d.inGlass
      ? 0
      : fillShare(d.glassShape, sh.volume * 1.15, d.glassIce) * across;
    bodies.jigger.fraction = jiggerFilled * 0.9;
    // A bottle shows how much is left of it behind the bar.
    const stock = pour ? (s.game.inventory[pour.id] ?? 500) : 500;
    bodies.bottle.fraction = THREE.MathUtils.clamp(0.16 + stock / 1100, 0.16, 0.82);
    // What is poured in tints the drink as it mixes, rather than all at once.
    const blend = 1 - Math.exp(-dt * 4);
    scratch.color.set(drinkColor);
    for (const body of [bodies.vessel, bodies.served]) {
      if (body.fraction < 0.004) body.color.copy(scratch.color);
      else body.color.lerp(scratch.color, blend);
      body.opacity = drinkOpacity;
      body.still = still;
    }
    bodies.bottle.color.set(pouringColor);
    bodies.bottle.opacity = Math.min(0.9, pouringOpacity + 0.12);
    bodies.jigger.color.set(pouringColor);
    bodies.jigger.opacity = 1;
    bodies.bottle.still = bodies.jigger.still = still;
    // A shake leaves a head of foam, which follows the drink into the glass.
    const foam = p.technique === 'shake' ? Math.min(1, p.mix) * 0.85 : 0;
    bodies.vessel.foam = foam;
    bodies.served.foam = foam * 0.8;
    // The hard movements of the mixing throw the surface about; a stir turns it.
    if (m === 'shake' && !still) bodies.vessel.agitation = 1;
    if (m === 'stir' && !still) {
      bodies.vessel.agitation = Math.max(bodies.vessel.agitation, 0.28);
      bodies.vessel.push(Math.cos(t * stirRate) * 0.11, Math.sin(t * stirRate) * 0.11);
    }
    if (servedIceRef.current) servedIceRef.current.visible = across > 0.02;
    // A scoop of ice from the well under the counter, tipped in over the far side.
    const scoop = scoopRef.current;
    if (scoop) {
      scoop.visible = scooping;
      if (scooping) {
        const r = smooth(0, 0.3, scooped) * (1 - smooth(0.8, 1, scooped));
        scoop.position.set(
          railScoop[0] + (-d.radius - 0.17 - railScoop[0]) * r,
          railScoop[1] + (d.top + 0.17 - railScoop[1]) * r,
          railScoop[2] * (1 - r),
        );
        scoop.rotation.z = -smooth(0.32, 0.5, scooped) * (1 - smooth(0.68, 0.84, scooped)) * 1.05;
      }
    }
    if (scoopCubes.current) scoopCubes.current.visible = scooped < 0.46;
    if (chillIceRef.current) {
      chillIceRef.current.visible = chilling && chillT > 0.14 && chillT < 0.8;
      chillIceRef.current.rotation.y = t * 7;
    }
    // A garnish taken from the tray in a pinch, carried over and set on the glass.
    const carried = carryRef.current;
    if (carried) {
      carried.visible = garnishing && garnishT < 0.74;
      if (garnishing) {
        const rise = smooth(0.12, 0.62, garnishT);
        const from = scratch.a.set(trayAt[0], trayAt[1], trayAt[2]);
        const to = scratch.b.set(glassX, d.rimY + 0.03, 0.01);
        carried.position.lerpVectors(from, to, rise);
        carried.position.y += Math.sin(rise * Math.PI) * 0.26;
        carried.children.forEach((c) => {
          c.visible = c.name === moment.garnishId;
        });
      }
    }
    if (garnishesRef.current) {
      // The new one is on the glass only once the hand has put it there.
      const newest = moment.garnishId + ((p.garnish[moment.garnishId] ?? 1) - 1);
      for (const child of garnishesRef.current.children)
        child.visible = !(garnishing && garnishT < 0.72 && child.name === newest);
    }

    // Now the hands, which are on whatever moved above. Each grip says what it holds, so
    // a hand goes to the next thing rather than jumping there.
    let left: Grip | null = null,
      right: Grip | null = null,
      bob = 0;
    const steady = (
      grip: Grip,
      side: number,
      node: THREE.Object3D,
      height: number,
      stem: boolean,
    ) => {
      grip.node = node;
      grip.point = [0, height, 0];
      grip.fingers = [side ? -0.3 : 0.3, 0, 0.95];
      grip.palm = [side ? -1 : 1, 0, 0];
      grip.pose = stem ? 'neck' : 'vessel';
      grip.key = node === serving && !d.inGlass ? 'glass' : 'vessel';
      return grip;
    };
    if (go.shake > 0.02) {
      // One hand under the vessel, the other flat on the end of the tin.
      left = grips.left;
      left.node = tin ?? vessel;
      left.point = [0, tinHeight, 0];
      left.fingers = [0.35, 0, 0.93];
      left.palm = [0, -1, 0];
      left.pose = 'flat';
      left.key = 'tin';
      right = steady(grips.right, 1, vessel, Math.min(0.2, d.top * 0.45), false);
      right.key = 'shake';
      bob = -0.016 * Math.abs(piston) * shaking;
    } else if (go.stir > 0.02 && spoon) {
      left = grips.left;
      left.node = spoon;
      left.point = [0, spoonLength * 0.72, 0];
      left.fingers = [0.35, -0.3, 0.88];
      left.palm = [1, 0, -0.25];
      left.pose = 'pinch';
      left.key = 'spoon';
      right = steady(grips.right, 1, vessel, Math.min(0.13, d.top * 0.4), false);
    } else if (go.muddle > 0.02 && muddler) {
      left = grips.left;
      left.node = muddler;
      left.point = [0, muddlerLength * 0.8, 0];
      left.fingers = [0.1, 0, 1];
      left.palm = [1, 0, 0];
      left.pose = 'neck';
      left.key = 'muddler';
      right = steady(grips.right, 1, vessel, Math.min(0.13, d.top * 0.4), false);
    } else if (pouring && kind === 'piece') {
      // A sugar cube in a pinch, let go over the rim.
      const pinch = cubeRef.current;
      if (pinch) {
        left = grips.left;
        left.node = pinch;
        left.point = [0, 0, 0];
        left.fingers = [0.35, -0.5, 0.8];
        left.palm = [1, -0.2, -0.3];
        left.pose = 'pinch';
        left.key = 'cube';
      }
      right = steady(grips.right, 1, vessel, Math.min(0.13, d.top * 0.4), false);
    } else if (pouring && bottle) {
      if (go.raise > 0.01) {
        left = grips.left;
        left.node = bottle;
        left.point = [0, -bottleSize.length * 0.62, 0];
        left.fingers = [0, 0, 1];
        left.palm = [1, 0, 0];
        left.pose = 'bottle';
        left.key = 'bottle';
      }
      if (kind === 'measured' && jigger) {
        right = grips.right;
        right.node = jigger;
        right.point = [0, 0, 0];
        right.fingers = [-0.25, 0, 0.97];
        right.palm = [0, 1, 0];
        right.pose = 'fork';
        right.key = 'jigger';
      } else right = steady(grips.right, 1, vessel, Math.min(0.13, d.top * 0.4), false);
    } else if (scooping && scoop) {
      right = steady(grips.right, 1, vessel, Math.min(0.13, d.top * 0.4), false);
      left = grips.left;
      left.node = scoop;
      left.point = [-0.11 - scoopHandle * 0.55, 0.012, 0];
      left.fingers = [0, -0.25, 0.97];
      left.palm = [0, 0.97, 0.25];
      left.pose = 'neck';
      left.key = 'scoop';
    } else if (straining) {
      left = steady(grips.left, 0, vessel, d.top * 0.45, false);
      left.fingers = [1, 0, 0.1];
      left.palm = [0, 0, 1];
      left.key = 'pouring-out';
      if (!d.stem) right = steady(grips.right, 1, serving, d.rimY * 0.4, false);
    } else if (chilling) {
      right = steady(grips.right, 1, serving, d.stem ? 0.09 : d.rimY * 0.4, d.stem);
    } else if (garnishing && carried) {
      right = grips.right;
      right.node = carried;
      right.point = [0, 0.012, 0];
      right.fingers = [-0.45, -0.55, 0.7];
      right.palm = [-0.8, -0.1, -0.5];
      right.pose = 'pinch';
      right.key = 'garnish';
    } else if (glassIn < 1) {
      right = steady(grips.right, 1, serving, d.stem ? 0.09 : d.rimY * 0.4, d.stem);
    } else if (toolIn < 1) {
      left = steady(grips.left, 0, vessel, d.top * 0.4, false);
    }
    if (left || right) gripFor('bartender', t, left, right, bob);
  }, -0.5);
  if (!p || selected === null || !atCounter) {
    dims.current = null;
    return null;
  }
  const inGlass = p.tool === 'build_glass' || p.tool === 'old_fashioned_glass';
  const servingGlass =
    inGlass && p.tool === 'old_fashioned_glass' ? 'old_fashioned_glass' : p.glass;
  const glassShape = glassShapes[servingGlass];
  const vesselShape = inGlass ? glassShape : vessels[p.tool as 'shaker' | 'mixing_glass'];
  const glassIce = p.ice && servingGlass !== 'cocktail_glass';
  const glassLevel = uprightLevel(
    built(glassShape).inner,
    fillShare(glassShape, inGlass ? total : total * 1.15, glassIce),
  );
  const vesselTop = top(vesselShape.outer)[1];
  const vesselRadius = Math.max(...vesselShape.outer.map(([r]) => r));
  dims.current = {
    radius: vesselRadius,
    top: vesselTop,
    rimR: top(glassShape.outer)[0],
    rimY: top(glassShape.outer)[1],
    floor: vesselShape.floor,
    vesselShape,
    glassShape,
    glassIce,
    inGlass,
    stem: servingGlass === 'cocktail_glass' || servingGlass === 'hurricane',
  };
  const sugar = !p.dissolved ? Math.min(3, Math.round(p.amounts['sugar_cube'] ?? 0)) : 0;
  return (
    <group position={stagePosition} scale={stageScale}>
      <group position={[workX, 0, 0]} ref={workRef}>
        <group ref={vesselRef}>
          <Container
            shape={vesselShape}
            body={bodies.vessel}
            ice={p.ice}
            chilled={inGlass && p.chilled}
            frosted={!inGlass && p.technique === 'stir' ? Math.min(1, p.mix) : 0}
            iceRef={iceRef}
          />
          {sugar > 0 && (
            <group ref={sugarRef} position={[0, vesselShape.floor + 0.03, 0]}>
              {Array.from({ length: sugar }, (_, i) => (
                <mesh
                  key={i}
                  geometry={sugarCube}
                  position={[(i - (sugar - 1) / 2) * 0.07, 0, (i % 2) * 0.03]}
                  rotation={[0, i * 0.9, 0]}
                >
                  <meshStandardMaterial color="#fbf6ea" roughness={0.9} />
                </mesh>
              ))}
            </group>
          )}
          {inGlass && servingGlass === 'mug' && <MugHandle />}
          {inGlass && <ChillIce glass={servingGlass} iceRef={chillIceRef} />}
          {inGlass && (
            <group ref={garnishesRef}>
              <Garnishes p={p} glass={servingGlass} level={glassLevel} />
            </group>
          )}
        </group>
        {/* The tin goes on for the shake, whatever the drink is being made in. */}
        <group ref={tinRef} position={[tinPark[0], 0, tinPark[1]]}>
          <ShakerTin radius={vesselRadius} materialRef={tinMaterial} />
        </group>
        {!inGlass && (
          <group ref={strainerRef} position={strainerPark}>
            <Strainer radius={top(vesselShape.outer)[0]} />
          </group>
        )}
        <group ref={spoonRef} position={spoonPark} rotation={[0, 0, Math.PI / 2]}>
          <BarSpoon />
        </group>
        <group ref={muddlerRef} position={muddlerPark} rotation={[0, 0, Math.PI / 2]}>
          <Muddler />
        </group>
        <group ref={bottleRef} visible={false}>
          {pouringId && <Bottle id={pouringId} body={bodies.bottle} />}
        </group>
        <group ref={jiggerRef} position={jiggerPark}>
          <Jigger body={bodies.jigger} />
        </group>
        <group ref={scoopRef} visible={false}>
          <Scoop cubesRef={scoopCubes} />
        </group>
        <group ref={cubeRef} visible={false}>
          <mesh geometry={sugarCube}>
            <meshStandardMaterial color="#fbf6ea" roughness={0.9} />
          </mesh>
        </group>
        <group ref={carryRef} visible={false}>
          {garnishIds.map((id) => (
            <group key={id} name={id} visible={false}>
              <GarnishPiece id={id} />
            </group>
          ))}
        </group>
        <group ref={trayRef} position={trayAt}>
          <GarnishTray />
        </group>
        <Stream
          stream={streams.bottle}
          color={pouringColor}
          opacity={pouringOpacity}
          streamRef={streamRef}
        />
        <Stream
          stream={streams.jigger}
          color={pouringColor}
          opacity={pouringOpacity}
          streamRef={jiggerStreamRef}
        />
        <Stream
          stream={streams.strain}
          color={drinkColor}
          opacity={drinkOpacity}
          streamRef={strainStreamRef}
        />
        <primitive object={drops.mesh} />
      </group>
      {!inGlass && (
        <group position={[servingX, 0, 0]} ref={servingRef}>
          <Container
            shape={glassShape}
            body={bodies.served}
            ice={glassIce}
            chilled={p.chilled}
            iceRef={servedIceRef}
          />
          {servingGlass === 'mug' && <MugHandle />}
          <group ref={garnishesRef}>
            <Garnishes p={p} glass={servingGlass} level={glassLevel} />
          </group>
          <ChillIce glass={servingGlass} iceRef={chillIceRef} />
        </group>
      )}
    </group>
  );
}

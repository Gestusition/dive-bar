import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { ingredientColors, ingredients } from '../game/content';
import { volume, type Prep } from '../game/engine';
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
      [0.2, 0.6],
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
function liquidLayers(p: Prep) {
  return Object.entries(p.amounts)
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
}: {
  shape: { outer: Profile; floor: number; capacity: number };
  layers: { id?: string; color: string; amount: number }[];
  blended: boolean;
  ice: boolean;
  chilled: boolean;
  liquidRef?: React.Ref<THREE.Group>;
}) {
  const [rimR, rimY] = top(shape.outer);
  const total = layers.reduce((n, l) => n + l.amount, 0);
  // Ice lifts the level a little, as it does in a real glass.
  const fill = Math.min(0.94, total / shape.capacity + (ice && total ? 0.12 : 0));
  const level = shape.floor + fill * (rimY - shape.floor);
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
      {ice &&
        cubes.map((cube, i) => (
          <mesh key={i} position={cube.position} rotation={cube.rotation}>
            <boxGeometry args={[0.085, 0.085, 0.085]} />
            <meshStandardMaterial color="#e8f7fb" transparent opacity={0.75} roughness={0.1} />
          </mesh>
        ))}
    </group>
  );
}

function Garnishes({ p, glass, level }: { p: Prep; glass: GlassId; level: number }) {
  const [rimR, rimY] = top(glassShapes[glass].outer);
  const items: React.ReactNode[] = [];
  const count = (id: string) => p.garnish[id] ?? 0;
  for (let i = 0; i < count('cocktail_cherry'); i++)
    items.push(
      <group key={'cherry' + i} position={[-0.05 + i * 0.075, level + 0.03, 0.03]}>
        <mesh>
          <sphereGeometry args={[0.036, 12, 10]} />
          <meshStandardMaterial color="#b3243b" roughness={0.3} />
        </mesh>
        <mesh position={[0.01, 0.06, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.004, 0.004, 0.08, 4]} />
          <meshStandardMaterial color="#5a3a1c" />
        </mesh>
      </group>,
    );
  // Citrus wheels sit cut onto the rim.
  (
    [
      ['orange_slice', '#f39a2b'],
      ['lime_slice', '#8cc63f'],
      ['lemon_slice', '#f4d23c'],
    ] as const
  ).forEach(([id, color], k) => {
    for (let i = 0; i < count(id); i++) {
      // Round the back of the rim, so they never hide the drink from the front.
      const angle = -0.35 - k * 0.55 - i * 0.3;
      items.push(
        <mesh
          key={id + i}
          position={[Math.cos(angle) * rimR, rimY - 0.01, Math.sin(angle) * rimR]}
          rotation={[0, Math.PI / 2 - angle, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.075, 0.075, 0.016, 16]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>,
      );
    }
  });
  for (let i = 0; i < count('orange_zest'); i++)
    items.push(
      <mesh
        key={'zest' + i}
        position={[rimR * 0.7, rimY + 0.01, -0.03 - i * 0.05]}
        rotation={[0.3, 0.6, 0.2]}
      >
        <boxGeometry args={[0.16, 0.018, 0.035]} />
        <meshStandardMaterial color="#f08a1c" />
      </mesh>,
    );
  if (count('half_salt_rim'))
    items.push(
      <mesh key="salt" position={[0, rimY + 0.006, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[rimR, 0.024, 8, 28, Math.PI]} />
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
      <group key={'mint' + i} position={[0.03 - i * 0.06, level + 0.04, -0.02]}>
        {[0, 1, 2].map((j) => (
          <mesh
            key={j}
            position={[Math.cos(j * 2.1) * 0.03, j * 0.02, Math.sin(j * 2.1) * 0.03]}
            rotation={[0.4, j, 0.3]}
          >
            <boxGeometry args={[0.06, 0.012, 0.035]} />
            <meshStandardMaterial color="#3f9b4a" />
          </mesh>
        ))}
      </group>,
    );
  for (let i = 0; i < count('celery_stick'); i++)
    items.push(
      <mesh key={'celery' + i} position={[0.05 + i * 0.04, rimY * 0.7, 0]} rotation={[0, 0, 0.22]}>
        <boxGeometry args={[0.035, rimY * 1.1, 0.035]} />
        <meshStandardMaterial color="#8fc25a" />
      </mesh>,
    );
  return <>{items}</>;
}

/**
 * On the working mat, on the staff side of the counter, a little to the bartender's
 * left so their hands work beside them rather than in front of their face.
 */
const stagePosition: [number, number, number] = [-0.3, 1.27, -2.2];
/** The bottle is held low on the outer side of the vessel and tipped in towards it. */
const bottleOffset = (vesselTop: number): [number, number, number] => [-0.3, vesselTop + 0.3, 0];
/** How long each hand movement at the counter lasts, in milliseconds. */
const pourTime = 750,
  scoopTime = 650,
  garnishTime = 600;

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
  const workRef = useRef<THREE.Group>(null);
  const glassRef = useRef<THREE.Group>(null);
  const jiggerRef = useRef<THREE.Group>(null);
  const jiggerStreamRef = useRef<THREE.Mesh>(null);
  const scoopRef = useRef<THREE.Group>(null);
  // The vessel in work and the serving glass, set each render, for the hands to find.
  const dims = useRef<{ radius: number; top: number; rimR: number; rimY: number } | null>(null);
  // When ice and garnish last went in, so a hand can be seen putting them there.
  const moments = useRef({ ice: false, iceAt: -Infinity, garnish: 0, garnishAt: -Infinity });
  const hand = useMemo(() => ({ left: new THREE.Vector3(), right: new THREE.Vector3() }), []);
  const shown = useRef({ volume: 0, rise: 1 });
  const layers = useMemo(() => (p ? liquidLayers(p) : []), [p]);
  const total = p ? volume(p) : 0;
  const pouringColor = useGame((s) => ingredientColors[s.pouring?.id ?? ''] ?? '#d6a35a');
  useFrame(({ clock }, delta) => {
    const s = useGame.getState();
    const t = clock.elapsedTime;
    const still = s.game.settings.reducedMotion;
    const m = still ? null : s.mixing;
    if (vesselRef.current) {
      // The tin is lifted off the counter and shaken at chest height, close to the
      // bartender, then set back down.
      const v = vesselRef.current;
      const target = m === 'shake' ? 1 : 0;
      const lift =
        (v.userData.lift ?? 0) + (target - (v.userData.lift ?? 0)) * (1 - Math.exp(-delta * 10));
      v.userData.lift = still ? 0 : lift;
      v.position.set(
        0.3 * lift,
        lift * (0.32 + (m === 'shake' ? Math.abs(Math.sin(t * 18)) * 0.06 : 0)),
        -0.42 * lift,
      );
      v.rotation.z = m === 'shake' ? Math.sin(t * 18) * 0.3 : 0;
    }
    if (capRef.current) capRef.current.visible = m === 'shake';
    if (spoonRef.current) {
      spoonRef.current.visible = m === 'stir';
      spoonRef.current.position.set(Math.cos(t * 7) * 0.06, 0.2, Math.sin(t * 7) * 0.06);
    }
    if (muddlerRef.current) {
      muddlerRef.current.visible = m === 'muddle';
      muddlerRef.current.position.y = 0.2 + Math.abs(Math.sin(t * 9)) * 0.12;
    }
    const now = performance.now();
    // A bottle tips over the tin for a moment after each pour. A measured pour of a
    // spirit, juice or syrup goes into the jigger first, which is then tipped in.
    const since = s.pouring ? now - s.pouring.at : Infinity;
    const pouring = !still && since < pourTime;
    const measured =
      s.game.settings.pourStyle === 'marked' &&
      ingredients.find((i) => i.id === s.pouring?.id)?.unit === 'ml';
    const phase = Math.min(1, since / pourTime);
    if (bottleRef.current) {
      bottleRef.current.visible = pouring;
      bottleRef.current.rotation.z = -(1.9 + Math.sin(phase * Math.PI) * 0.35);
    }
    const tipping = measured && phase > 0.6;
    if (jiggerRef.current) {
      jiggerRef.current.visible = pouring && measured;
      jiggerRef.current.rotation.z = tipping ? ((phase - 0.6) / 0.4) * 2.2 : 0;
    }
    if (jiggerStreamRef.current)
      jiggerStreamRef.current.visible = pouring && measured && since > 120 && phase < 0.6;
    if (streamRef.current)
      streamRef.current.visible =
        pouring && (measured ? tipping && phase < 0.95 : since > 120 && since < 650);
    // A scoop of ice goes in when ice is added; a hand sets each garnish on the glass.
    const moment = moments.current;
    if (p && p.ice !== moment.ice) {
      if (p.ice) moment.iceAt = now;
      moment.ice = p.ice;
    }
    const garnishes = p ? Object.values(p.garnish).reduce((n, c) => n + c, 0) : 0;
    if (garnishes > moment.garnish) moment.garnishAt = now;
    moment.garnish = garnishes;
    const scooping = !still && now - moment.iceAt < scoopTime;
    if (scoopRef.current) {
      scoopRef.current.visible = scooping;
      scoopRef.current.rotation.z = -Math.min(1, (now - moment.iceAt) / scoopTime) * 1.3;
    }
    const garnishing = !still && now - moment.garnishAt < garnishTime;
    // The bartender's hands follow the work: both on the tin for the shake, one on the
    // glass and one on the spoon, muddler, bottle, scoop or garnish.
    const work = workRef.current,
      d = dims.current;
    if (work && d) {
      const holder = vesselRef.current ?? work;
      const side = (x: number, out: THREE.Vector3) =>
        holder.localToWorld(out.set(x * (d.radius + 0.03), d.top * 0.45, 0));
      let left: THREE.Vector3 | null = null,
        right: THREE.Vector3 | null = null;
      if (m === 'shake') {
        left = side(-1, hand.left);
        right = side(1, hand.right);
      } else if (m === 'stir' && spoonRef.current) {
        left = side(-1, hand.left);
        right = spoonRef.current.localToWorld(hand.right.set(0, 0.58, 0));
      } else if (m === 'muddle' && muddlerRef.current) {
        left = side(-1, hand.left);
        right = muddlerRef.current.localToWorld(hand.right.set(0, 0.47, 0));
      } else if (pouring && bottleRef.current) {
        // The outer hand tips the bottle; the other holds the jigger over the tin, or
        // steadies the tin itself.
        left = bottleRef.current.localToWorld(hand.left.set(0, 0.1, 0));
        right =
          measured && jiggerRef.current
            ? jiggerRef.current.localToWorld(hand.right.set(0.03, 0, 0))
            : side(1, hand.right);
      } else if (scooping && scoopRef.current) {
        left = side(-1, hand.left);
        right = scoopRef.current.localToWorld(hand.right.set(0.19, 0.02, 0));
      } else if (garnishing && glassRef.current) {
        right = glassRef.current.localToWorld(hand.right.set(d.rimR * 0.6, d.rimY + 0.03, 0));
      }
      if (left || right) reachFor('bartender', t, left, right);
    }
    // The liquid rises to its new level rather than jumping there.
    if (shown.current.volume !== total) {
      shown.current.rise =
        total > 0 && shown.current.volume < total ? shown.current.volume / total : 1;
      shown.current.volume = total;
    }
    shown.current.rise = still ? 1 : THREE.MathUtils.damp(shown.current.rise, 1, 6, delta);
    if (liquidRef.current) liquidRef.current.scale.y = Math.max(0.02, shown.current.rise);
  });
  if (!p || selected === null || !atCounter) {
    dims.current = null;
    return null;
  }
  const inGlass = p.tool === 'build_glass' || p.tool === 'old_fashioned_glass';
  const vesselShape = inGlass
    ? glassShapes[p.tool === 'old_fashioned_glass' ? 'old_fashioned_glass' : p.glass]
    : vessels[p.tool as 'shaker' | 'mixing_glass'];
  const strained = !inGlass && p.technique !== 'none' && p.mix >= 0.7;
  const blended = p.technique !== 'none' && p.mix > 0;
  const servingGlass =
    inGlass && p.tool === 'old_fashioned_glass' ? 'old_fashioned_glass' : p.glass;
  const glassShape = glassShapes[servingGlass];
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
  dims.current = {
    radius: Math.max(...vesselShape.outer.map(([r]) => r)),
    top: vesselTop,
    rimR: top(glassShape.outer)[0],
    rimY: top(glassShape.outer)[1],
  };
  // The jigger, the scoop and their streams sit over the vessel being worked.
  const overVessel = (
    <>
      <group ref={jiggerRef} position={[0, vesselTop + 0.08, 0]} visible={false}>
        <Jigger />
      </group>
      <mesh ref={jiggerStreamRef} position={[0.01, vesselTop + 0.19, 0]} visible={false}>
        <cylinderGeometry args={[0.01, 0.01, 0.05, 6]} />
        <meshStandardMaterial color={pouringColor} transparent opacity={0.85} />
      </mesh>
      <group ref={scoopRef} position={[0.02, vesselTop + 0.12, 0]} visible={false}>
        <Scoop />
      </group>
    </>
  );
  return (
    <group position={stagePosition} scale={stageScale}>
      {!inGlass && (
        <group position={[-0.3, 0, 0]} ref={workRef}>
          {overVessel}
          <group ref={vesselRef}>
            <Container
              shape={vesselShape}
              layers={strained ? [] : layers}
              blended={blended}
              ice={p.ice}
              chilled={false}
              liquidRef={liquidRef}
            />
            {/* The tin goes on for the shake. */}
            <group ref={capRef} position={[0, vesselTop - 0.02, 0]} visible={false}>
              <mesh position={[0, 0.17, 0]}>
                <cylinderGeometry args={[0.16, 0.215, 0.36, 20]} />
                <meshStandardMaterial color="#c9cfd4" metalness={0.7} roughness={0.25} />
              </mesh>
            </group>
          </group>
          <group ref={spoonRef} visible={false}>
            <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0.12]}>
              <cylinderGeometry args={[0.008, 0.008, 0.7, 6]} />
              <meshStandardMaterial color="#d3d7da" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
          <group ref={muddlerRef} visible={false}>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.03, 0.04, 0.55, 8]} />
              <meshStandardMaterial color="#b98552" />
            </mesh>
          </group>
          <group ref={bottleRef} position={bottleOffset(vesselTop)} visible={false}>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.3, 12]} />
              <meshStandardMaterial color={pouringColor} transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, 0.33, 0]}>
              <cylinderGeometry args={[0.025, 0.04, 0.14, 10]} />
              <meshStandardMaterial color={pouringColor} transparent opacity={0.85} />
            </mesh>
          </group>
          <mesh ref={streamRef} position={[0, vesselTop * 0.75 + 0.15, 0]} visible={false}>
            <cylinderGeometry args={[0.012, 0.012, vesselTop * 0.7 + 0.25, 6]} />
            <meshStandardMaterial color={pouringColor} transparent opacity={0.85} />
          </mesh>
        </group>
      )}
      <group
        position={[inGlass ? 0 : 0.3, 0, 0]}
        ref={(g) => {
          glassRef.current = g;
          if (inGlass) workRef.current = g;
        }}
      >
        {inGlass && overVessel}
        <Container
          shape={glassShape}
          layers={inGlass ? layers : strained ? layers : []}
          blended={inGlass ? blended : true}
          ice={p.ice && (inGlass || (strained && servingGlass !== 'cocktail_glass'))}
          chilled={p.chilled}
          liquidRef={inGlass ? liquidRef : undefined}
        />
        {servingGlass === 'mug' && (
          <mesh position={[0.2, 0.17, 0]}>
            <torusGeometry args={[0.07, 0.018, 8, 16]} />
            <meshStandardMaterial color="#dff0ee" transparent opacity={0.45} />
          </mesh>
        )}
        <Garnishes p={p} glass={servingGlass} level={glassLevel} />
        {inGlass && (
          <>
            <group ref={spoonRef} visible={false}>
              <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0.12]}>
                <cylinderGeometry args={[0.008, 0.008, 0.7, 6]} />
                <meshStandardMaterial color="#d3d7da" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
            <group ref={muddlerRef} visible={false}>
              <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.03, 0.04, 0.55, 8]} />
                <meshStandardMaterial color="#b98552" />
              </mesh>
            </group>
            <group
              ref={bottleRef}
              position={bottleOffset(top(glassShape.outer)[1])}
              visible={false}
            >
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 0.3, 12]} />
                <meshStandardMaterial color={pouringColor} transparent opacity={0.85} />
              </mesh>
              <mesh position={[0, 0.33, 0]}>
                <cylinderGeometry args={[0.025, 0.04, 0.14, 10]} />
                <meshStandardMaterial color={pouringColor} transparent opacity={0.85} />
              </mesh>
            </group>
          </>
        )}
      </group>
    </group>
  );
}

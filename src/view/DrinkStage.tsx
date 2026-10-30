import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { ingredientColors, ingredients } from '../game/content';
import { volume, type Prep } from '../game/engine';

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

/** How much larger than life the drink is drawn on the counter mat. */
export const stageScale = 1.7;
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
      const v = vesselRef.current;
      v.position.y = m === 'shake' ? Math.abs(Math.sin(t * 18)) * 0.07 : 0;
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
    // A bottle tips over the tin for a moment after each pour.
    const since = s.pouring ? performance.now() - s.pouring.at : Infinity;
    const pouring = !still && since < 750;
    if (bottleRef.current) {
      bottleRef.current.visible = pouring;
      bottleRef.current.rotation.z = 1.9 + Math.sin(Math.min(1, since / 750) * Math.PI) * 0.35;
    }
    if (streamRef.current) streamRef.current.visible = pouring && since > 120 && since < 650;
    // The liquid rises to its new level rather than jumping there.
    if (shown.current.volume !== total) {
      shown.current.rise =
        total > 0 && shown.current.volume < total ? shown.current.volume / total : 1;
      shown.current.volume = total;
    }
    shown.current.rise = still ? 1 : THREE.MathUtils.damp(shown.current.rise, 1, 6, delta);
    if (liquidRef.current) liquidRef.current.scale.y = Math.max(0.02, shown.current.rise);
  });
  if (!p || selected === null || !atCounter) return null;
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
  return (
    <group position={[-0.1, 1.27, -1.55]} scale={stageScale}>
      {!inGlass && (
        <group position={[-0.3, 0, 0]}>
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
          <group ref={bottleRef} position={[0.2, vesselTop + 0.42, 0]} visible={false}>
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
      <group position={[inGlass ? 0 : 0.3, 0, 0]}>
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
              position={[0.2, top(glassShape.outer)[1] + 0.42, 0]}
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

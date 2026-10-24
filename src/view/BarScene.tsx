import { Suspense, useMemo, useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGame } from '../game/store';
import { volume, type Guest } from '../game/engine';
import { advanceWalk, bartenderHome, guestPosition, walkingSpeed } from '../game/navigation';
type Part = [number, number, number, number, number, number, string];
const oak = '#805137',
  dark = '#50352e',
  brass = '#c9995d',
  cream = '#ead7ac',
  teal = '#478f83';
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.87 });
function geometry(parts: Part[]) {
  const geometries = parts.map(([x, y, z, w, h, d, color]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    const c = new THREE.Color(color);
    const values = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) {
      values[i] = c.r;
      values[i + 1] = c.g;
      values[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(values, 3));
    return g;
  });
  const merged = mergeGeometries(geometries)!;
  geometries.forEach((g) => g.dispose());
  return merged;
}
function roomParts() {
  const p: Part[] = [];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, c: string) =>
    p.push([x, y, z, w, h, d, c]);
  box(0, -0.22, 0.4, 11.8, 0.35, 10.4, dark);
  for (let x = 0; x < 12; x++)
    for (let z = 0; z < 10; z++)
      box(
        x - 0.5 - 5,
        0.005,
        z - 4,
        0.96,
        0.12,
        0.96,
        ['#ab7851', '#b48359', '#a16d49', '#ba8b62'][(x * 7 + z * 3) % 4],
      );
  box(0, 1.6, -4.55, 11.8, 3.4, 0.25, '#6b463b');
  box(-5.8, 1.55, 0.3, 0.25, 3.3, 9.7, '#744b3c');
  for (let i = 0; i < 12; i++) box(i - 5.5, 0.7, -4.37, 0.05, 1.55, 0.1, brass);
  box(0, 0.12, -4.32, 11.5, 0.18, 0.18, dark);
  box(0, 3.15, -4.3, 11.5, 0.15, 0.2, dark);
  // Framed windows and their little glowing sill lamps.
  for (const x of [-3.9, 3.9]) {
    box(x, 2, -4.33, 1.65, 1.65, 0.16, dark);
    box(x, 2, -4.2, 1.4, 1.4, 0.1, '#294c59');
    box(x, 2, -4.1, 0.06, 1.4, 0.05, cream);
    box(x, 2, -4.1, 1.4, 0.06, 0.05, cream);
    box(x, 1.15, -4.1, 1.9, 0.12, 0.5, brass);
  }
  // Bottle shelves: one merged mesh rather than a mesh for every voxel.
  for (const y of [1.5, 2.25]) {
    box(0, y, -4.05, 5.1, 0.13, 0.66, dark);
    for (let i = 0; i < 13; i++) {
      const x = -2.3 + i * 0.38;
      const c = ['#497c69', '#7b4437', '#c9944a', '#466a62', '#9c594c'][i % 5];
      box(x, y + 0.23, -4.01, 0.18, 0.34, 0.2, c);
      box(x, y + 0.44, -4.01, 0.085, 0.12, 0.09, c);
      box(x, y + 0.26, -3.9, 0.18, 0.13, 0.025, cream);
      box(x, y + 0.52, -4.01, 0.09, 0.05, 0.1, brass);
    }
  }
  // Counter: panelling, brass foot rail, drawers, POS and working mat.
  box(0, 0.56, -1.8, 7.6, 1.1, 1.05, oak);
  box(0, 1.15, -1.8, 8, 0.2, 1.35, '#ddaf77');
  box(0, 1.05, -1.11, 7.8, 0.12, 0.08, brass);
  box(0, 0.35, -1.08, 7.3, 0.06, 0.07, brass);
  for (let x = -3; x <= 3; x++) {
    box(x, 0.66, -1.24, 0.82, 0.74, 0.08, '#714832');
    box(x, 0.66, -1.18, 0.64, 0.56, 0.03, '#86573a');
  }
  box(-0.1, 1.26, -1.7, 2, 0.025, 0.9, '#28473f');
  box(3, 1.38, -1.7, 0.55, 0.3, 0.45, '#3c4547');
  box(3, 1.58, -1.8, 0.55, 0.14, 0.28, '#98c8ac');
  box(-2.4, 1.32, -1.7, 0.58, 0.12, 0.6, '#617d7a');
  box(-2.4, 1.38, -1.7, 0.4, 0.05, 0.4, '#bdc9bc');
  // Two tables and low cushioned chairs.
  for (const [x, z] of [
    [-2.7, 2],
    [2.25, 2.25],
  ]) {
    box(x, 0.78, z, 1.75, 0.15, 1.45, '#d3a36c');
    box(x, 0.36, z, 0.23, 0.75, 0.23, dark);
    box(x, 0.08, z, 1, 0.12, 0.8, dark);
    box(x, 1, z, 0.12, 0.3, 0.12, teal);
    box(x, 1.17, z, 0.22, 0.12, 0.22, '#7da071');
    box(x, 1.25, z, 0.12, 0.14, 0.12, '#668f60');
    box(x + 0.4, 0.89, z - 0.3, 0.32, 0.03, 0.25, cream);
    for (const offset of [-0.98, 0.98]) {
      box(x, 0.45, z + offset, 0.8, 0.16, 0.7, dark);
      box(x, 0.56, z + offset, 0.7, 0.13, 0.61, '#a9555b');
      for (const dx of [-0.27, 0.27]) box(x + dx, 0.2, z + offset, 0.09, 0.42, 0.5, dark);
      if (offset > 0) box(x, 0.88, z + offset + 0.26, 0.8, 0.7, 0.1, dark);
    }
  }
  for (const x of [-1.2, 1.2]) {
    box(x, 0.7, -0.25, 0.7, 0.18, 0.7, '#b26061');
    box(x, 0.35, -0.25, 0.16, 0.7, 0.16, dark);
    box(x, 0.08, -0.25, 0.62, 0.08, 0.62, brass);
  }
  // Jukebox, rug and a leafy plant.
  box(-4.8, 0.65, -1.3, 0.8, 1.3, 0.75, '#883f4b');
  box(-4.8, 0.89, -0.9, 0.58, 0.64, 0.05, cream);
  box(-4.8, 0.91, -0.86, 0.42, 0.4, 0.05, '#5f9b92');
  for (let i = 0; i < 5; i++) box(-4.8, 0.2 + i * 0.07, -0.9, 0.55, 0.03, 0.04, brass);
  box(0, 0.09, 2.3, 1.9, 0.018, 3.3, '#9b5650');
  for (let x = -0.8; x < 1; x += 0.4) box(x, 0.11, 2.3, 0.06, 0.01, 3, '#d5a169');
  box(4.65, 0.3, -3.3, 0.7, 0.6, 0.7, '#bb7658');
  box(4.65, 0.8, -3.3, 0.1, 0.6, 0.1, '#627650');
  for (let i = 0; i < 7; i++)
    box(
      4.65 + Math.sin(i * 2) * 0.28,
      1 + i * 0.1,
      -3.3 + Math.cos(i * 2) * 0.25,
      0.45,
      0.16,
      0.38,
      ['#63835c', '#8da16a', '#506e52'][i % 3],
    );
  // Amber lights, framed menu and coat hooks.
  for (const x of [-4.8, -2.4, 0, 2.4, 4.8]) {
    box(x, 2.85, -4.08, 0.2, 0.32, 0.18, brass);
    box(x, 2.85, -3.96, 0.12, 0.2, 0.1, '#ffe2a3');
  }
  box(-5.58, 1.7, 1.4, 0.15, 1.3, 1, dark);
  box(-5.47, 1.7, 1.4, 0.04, 1.1, 0.8, '#ddc594');
  return p;
}
const shirts = ['#669f8e', '#b97876', '#d2a054', '#8088a8', '#986d98', '#d6bd8b'];
function personParts(id: string, bartender = false): Part[] {
  const index = [...id].reduce((n, c) => n + c.charCodeAt(0), 0);
  const skin = ['#e9b592', '#b97857', '#db9e78', '#f0c7a1'][index % 4],
    hair = ['#403029', '#a85e39', '#d2a265', '#674143'][index % 4],
    shirt = bartender ? cream : shirts[index % shirts.length];
  return [
    [0, 0.56, 0, 0.5, 0.48, 0.3, shirt],
    [0, 0.3, 0, 0.46, 0.16, 0.31, '#3c4546'],
    [-0.14, 0.14, 0, 0.18, 0.28, 0.21, '#424957'],
    [0.14, 0.14, 0, 0.18, 0.28, 0.21, '#424957'],
    [-0.14, 0.035, 0.045, 0.24, 0.09, 0.32, dark],
    [0.14, 0.035, 0.045, 0.24, 0.09, 0.32, dark],
    [-0.34, 0.56, 0, 0.16, 0.42, 0.22, shirt],
    [0.34, 0.56, 0, 0.16, 0.42, 0.22, shirt],
    [-0.34, 0.31, 0.02, 0.15, 0.13, 0.19, skin],
    [0.34, 0.31, 0.02, 0.15, 0.13, 0.19, skin],
    [0, 1, 0, 0.6, 0.58, 0.48, skin],
    [-0.33, 1, 0, 0.09, 0.16, 0.17, skin],
    [0.33, 1, 0, 0.09, 0.16, 0.17, skin],
    [0, 1.3, -0.02, 0.65, 0.14, 0.53, hair],
    [0, 1.14, -0.22, 0.64, 0.26, 0.12, hair],
    [-0.24, 1.18, 0.2, 0.14, 0.16, 0.12, hair],
    [-0.13, 1.04, 0.248, 0.055, 0.07, 0.035, '#352b2b'],
    [0.13, 1.04, 0.248, 0.055, 0.07, 0.035, '#352b2b'],
    [0, 0.89, 0.25, 0.13, 0.035, 0.025, '#a85d51'],
    [-0.21, 0.95, 0.245, 0.08, 0.04, 0.02, '#d68d79'],
    [0.21, 0.95, 0.245, 0.08, 0.04, 0.02, '#d68d79'],
    ...(bartender
      ? [
          [0, 0.5, 0.17, 0.33, 0.5, 0.035, teal] as Part,
          [0, 0.7, 0.18, 0.09, 0.09, 0.03, brass] as Part,
        ]
      : []),
  ];
}
function Person({ guest }: { guest: Guest }) {
  const ref = useRef<THREE.Group>(null);
  const body = useMemo(() => geometry(personParts(guest.customerId)), [guest.customerId]);
  const selected = useGame((s) => s.selected === guest.id);
  const setSelected = useGame((s) => s.select);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const target = new THREE.Vector3(...guestPosition(guest));
    if (useGame.getState().game.settings.reducedMotion) ref.current.position.copy(target);
    else ref.current.position.lerp(target, 1 - Math.exp(-delta * 4));
    const moving = ref.current.position.distanceTo(target) > 0.05;
    ref.current.rotation.z = moving
      ? Math.sin(clock.elapsedTime * 9) * 0.045
      : Math.sin(clock.elapsedTime * 1.5 + guest.id) * 0.009;
    if (
      !useGame.getState().game.settings.reducedMotion &&
      guest.status === 'drinking' &&
      guest.seat >= 2 &&
      guest.id % 3 === 0 &&
      guest.remaining > 17
    ) {
      const t = (20 - guest.remaining) / 3;
      ref.current.rotation.z = Math.sin(t * Math.PI) * 0.4;
    }
  });
  const ready = ['waiting', 'ready', 'ordered', 'pay'].includes(guest.status);
  return (
    <group ref={ref} position={guestPosition(guest)}>
      <mesh
        geometry={body}
        material={material}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelected(guest.id);
        }}
      />
      <Html position={[0, 1.75, 0]} center zIndexRange={[5, 0]}>
        <button
          className={'guest-bubble ' + (selected ? 'selected ' : '') + (ready ? 'attention' : '')}
          onClick={() => setSelected(guest.id)}
          aria-label={'Select ' + guest.name}
        >
          <span>
            {guest.status === 'waiting'
              ? '👋'
              : guest.status === 'reading'
                ? '···'
                : guest.status === 'ready'
                  ? '✎'
                  : guest.status === 'ordered'
                    ? '🍸'
                    : guest.status === 'pay'
                      ? '$'
                      : '♡'}
          </span>
          <small>{guest.name}</small>
        </button>
      </Html>
    </group>
  );
}
function Bartender() {
  const ref = useRef<THREE.Group>(null);
  const body = useMemo(() => geometry(personParts('bartender', true)), []);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const s = useGame.getState();
    const current = ref.current.position;
    const next = s.game.settings.reducedMotion
      ? s.bartenderPosition
      : advanceWalk([current.x, current.z], s.bartenderPosition, delta * walkingSpeed);
    const moving = Math.hypot(next[0] - current.x, next[1] - current.z) > 0.001;
    if (moving) {
      const angle = Math.atan2(next[0] - current.x, next[1] - current.z);
      const difference = Math.atan2(
        Math.sin(angle - ref.current.rotation.y),
        Math.cos(angle - ref.current.rotation.y),
      );
      ref.current.rotation.y += difference * (1 - Math.exp(-delta * 12));
    }
    current.set(next[0], 0.08, next[1]);
    ref.current.rotation.z =
      moving && !s.game.settings.reducedMotion ? Math.sin(clock.elapsedTime * 10) * 0.04 : 0;
  });
  return (
    <group ref={ref} position={[bartenderHome[0], 0.08, bartenderHome[1]]}>
      <mesh geometry={body} material={material} scale={[1, 1.2, 1]} castShadow />
    </group>
  );
}
function Camera() {
  const { camera, size } = useThree();
  const panel = useGame((s) => s.panel);
  useFrame((_, dt) => {
    const station = panel === 'station';
    camera.position.lerp(
      new THREE.Vector3(station ? 6 : 11, station ? 8 : 13, station ? 9 : 16),
      useGame.getState().game.settings.reducedMotion ? 1 : 1 - Math.exp(-dt * 4),
    );
    const target = new THREE.Vector3(0, station ? 1 : 0.7, station ? -1.7 : 0.3);
    camera.lookAt(target);
    if (camera instanceof THREE.OrthographicCamera) {
      const zoom = Math.min(
        size.width / (station ? 6.3 : 16.5),
        size.height / (station ? 5.4 : 13),
      );
      camera.zoom = useGame.getState().game.settings.reducedMotion
        ? zoom
        : THREE.MathUtils.damp(camera.zoom, zoom, 4, dt);
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
function PreparationDisplay() {
  const selected = useGame((s) => s.selected);
  const p = useGame((s) =>
    s.selected === -1 ? s.game.practice : s.game.guests.find((g) => g.id === selected)?.prep,
  );
  if (!p) return null;
  const fill = Math.min(0.4, volume(p) / 200);
  return (
    <group position={[0.15, 1.28, -1.7]}>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.54, 8]} />
        <meshStandardMaterial color="#c5d9cb" transparent opacity={0.45} />
      </mesh>
      {fill > 0 && (
        <mesh position={[0, fill / 2, 0]}>
          <cylinderGeometry args={[0.18, 0.14, fill, 8]} />
          <meshStandardMaterial
            color={
              p.amounts.sweet_red_vermouth
                ? '#a7524b'
                : p.amounts.fresh_lime_juice
                  ? '#cbd895'
                  : '#c78b49'
            }
          />
        </mesh>
      )}
      {p.ice &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * 0.09, 0.25 + i * 0.03, 0]} rotation={[0.2, i, 0.3]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
            <meshStandardMaterial color="#d0e9df" transparent opacity={0.8} />
          </mesh>
        ))}
      {p.garnish.cocktail_cherry > 0 && (
        <mesh position={[0.13, 0.52, 0]}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color="#b54556" />
        </mesh>
      )}
    </group>
  );
}

function Sign({ lit }: { lit: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 180;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#493830';
    c.fillRect(0, 0, 768, 180);
    c.strokeStyle = '#91b9a3';
    c.lineWidth = 5;
    c.strokeRect(6, 6, 756, 168);
    c.textAlign = 'center';
    c.fillStyle = lit ? '#a8e3c9' : '#aea28b';
    c.font = '500 76px Fredoka, sans-serif';
    c.fillText('DIVE BAR', 384, 98);
    c.fillStyle = '#e6cda1';
    c.font = '20px sans-serif';
    c.fillText('GOOD DRINKS · BETTER STORIES', 384, 145);
    return new THREE.CanvasTexture(canvas);
  }, [lit]);
  return (
    <mesh position={[0, 2.93, -4.12]}>
      <planeGeometry args={[3.7, 0.87]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
function Room() {
  const theme = useGame((s) => s.game.settings.theme);
  const room = useMemo(() => {
    const parts = roomParts();
    if (theme !== 'amber')
      for (const part of parts) {
        if (['#6b463b', '#744b3c'].includes(part[6]))
          part[6] = theme === 'mint' ? '#466557' : '#74434f';
        if (part[6] === '#9b5650') part[6] = theme === 'mint' ? '#668879' : '#aa6c7b';
      }
    return geometry(parts);
  }, [theme]);
  const helper = useMemo(() => geometry(personParts('helper')), []);
  const game = useGame((s) => s.game);
  const setPanel = useGame((s) => s.setPanel);
  return (
    <>
      <Camera />
      <color attach="background" args={['#29232c']} />
      <fog attach="fog" args={['#29232c', 25, 55]} />
      <ambientLight intensity={1.1} color="#ffe6c0" />
      <hemisphereLight args={['#ead9bd', '#60473f', 1.3]} />
      <directionalLight
        position={[3, 10, 5]}
        intensity={1.8}
        color="#ffddae"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <mesh geometry={room} material={material} receiveShadow castShadow />
      <Sign lit={game.upgrades.neon} />
      <Html position={[0, 1.7, -1.5]} center zIndexRange={[4, 0]}>
        <button
          className="station-label"
          onClick={() => {
            if (useGame.getState().selected === null) useGame.getState().select(-1);
            setPanel('station');
          }}
        >
          THE COUNTER <span>↗</span>
        </button>
      </Html>
      <Bartender />
      {game.guests.map((g) => (
        <Person guest={g} key={g.id} />
      ))}
      <PreparationDisplay />
      {game.mess > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, 1.262, -1.5]}>
          <circleGeometry args={[0.15 + game.mess * 0.03, 12]} />
          <meshBasicMaterial color="#96573b" transparent opacity={0.6} />
        </mesh>
      )}
      {game.upgrades.plant && (
        <group position={[4.7, 0, 3.9]}>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.6]} />
            <meshStandardMaterial color="#bc7960" />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[0.8, 0.65, 0.7]} />
            <meshStandardMaterial color="#7c9a65" />
          </mesh>
        </group>
      )}
      {game.upgrades.barback && (
        <group position={[3.9, 0, -2.8]}>
          <mesh geometry={helper} material={material} />
        </group>
      )}
      <ContactShadows
        position={[0, -0.13, 0]}
        opacity={0.24}
        scale={18}
        blur={2.5}
        far={4}
        resolution={256}
        frames={1}
      />
    </>
  );
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="graphics-error">
        <h2>The lights won’t turn on.</h2>
        <p>
          This game needs WebGL 2. Try an up-to-date browser with hardware acceleration enabled.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function BarScene() {
  const reduced = useGame((s) => s.game.settings.reducedMotion);
  return (
    <SceneBoundary>
      <Canvas
        frameloop={reduced ? 'demand' : 'always'}
        orthographic
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [11, 13, 16], zoom: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Room />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}

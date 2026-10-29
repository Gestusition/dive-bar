import { Suspense, useCallback, useMemo, useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGame } from '../game/store';
import type { Guest } from '../game/engine';
import { hostHome } from '../game/host';
import { cleanupInfo } from '../game/cleanup';
import {
  advanceWalk,
  bartenderHome,
  entrance,
  guestPosition,
  guestPath,
  guestSpeed,
  roomEdge,
  seatFacing,
  setDoorX,
  stepAlong,
  tables,
  walkingSpeed,
  walkAvoidingPeople,
  type FloorPoint,
} from '../game/navigation';
import { binPosition, binRadius, cornerPlantParts, floorPlantParts } from '../game/room-layout';
import { money } from '../game/content';
import DrinkStage from './DrinkStage';
import { CocktailArt, CoinArt, HeartArt } from '../ui/art';
import { GuestActions, patience } from '../ui/GuestActions';
type Part = [number, number, number, number, number, number, string];
type OverlayElements = {
  guests: Map<number, HTMLElement>;
};
type SceneRefs = {
  elements: { current: OverlayElements };
  guestGroups: { current: Map<number, THREE.Group> };
};
type StaffRefs = { current: Partial<Record<'host' | 'bartender', THREE.Group | null>> };
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
// The left wall (with the front door) and the right wall, drawn around x=0
// and moved to the edges of the screen every frame.
const wallColor = '#744b3c';
function leftWallParts(): Part[] {
  const p: Part[] = [];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, c: string) =>
    p.push([x, y, z, w, h, d, c]);
  // The door is hinged on the front jamb and swung into the room so the
  // straight-on camera sees it and it never stands in the guests' way.
  box(0, 1.55, 0.675, 0.25, 3.3, 10.45, wallColor);
  box(0, 1.55, 12, 0.25, 3.3, 9.8, wallColor);
  box(0, 2.85, 6.5, 0.25, 0.7, 1.2, wallColor);
  box(0, 2.4, 6.5, 0.4, 0.2, 1.4, dark);
  for (const z of [5.9, 7.1]) box(0, 1.2, z, 0.4, 2.4, 0.14, dark);
  box(0.5, 1.12, 7.02, 1, 2.2, 0.09, '#5a3a2c');
  box(0.5, 1.6, 7.08, 0.62, 0.62, 0.03, '#f3c56a');
  box(0.5, 1.6, 7.1, 0.04, 0.62, 0.02, dark);
  box(0.5, 1.6, 7.1, 0.62, 0.04, 0.02, dark);
  box(0.5, 0.55, 7.08, 0.7, 0.62, 0.03, '#6e4733');
  box(0.88, 1.08, 7.1, 0.09, 0.09, 0.07, brass);
  box(0.75, 0.075, 6.5, 0.95, 0.02, 1.1, '#3f6b5e');
  for (const dz of [-0.35, 0, 0.35]) box(0.75, 0.09, 6.5 + dz, 0.8, 0.01, 0.07, cream);
  // Covers everything beyond the wall, with the street showing in the doorway.
  box(-8, 1.65, 0.6, 16, 3.3, 10.6, wallColor);
  box(-8, 1.65, 12.05, 16, 3.3, 9.9, wallColor);
  box(-8, -0.04, 6.5, 16, 0.1, 1.2, '#4c4540');
  return p;
}
function rightWallParts(): Part[] {
  return [
    [0, 1.55, 6.2, 0.25, 3.3, 21.8, wallColor],
    [8, 1.65, 6.2, 16, 3.3, 21.8, wallColor],
  ];
}
function SideWalls() {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const leftGeometry = useMemo(() => geometry(leftWallParts()), []);
  const rightGeometry = useMemo(() => geometry(rightWallParts()), []);
  const { camera, size } = useThree();
  useFrame(() => {
    const edge = roomEdge(size.width / camera.zoom / 2);
    if (left.current) left.current.position.x = -edge;
    if (right.current) right.current.position.x = edge;
    setDoorX(-edge);
  });
  return (
    <>
      <group ref={left}>
        <mesh geometry={leftGeometry} material={material} receiveShadow castShadow />
        <DoorDecor />
      </group>
      <group ref={right}>
        <mesh geometry={rightGeometry} material={material} receiveShadow castShadow />
      </group>
    </>
  );
}
function roomParts() {
  const p: Part[] = [];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, c: string) =>
    p.push([x, y, z, w, h, d, c]);
  // The floor and back wall run well past the side walls, which follow the
  // screen edges (see SideWalls), so however wide the screen is the camera
  // only ever sees the bar.
  box(0, -0.22, 6.4, 31.8, 0.35, 22.4, dark);
  for (let x = 0; x < 32; x++)
    for (let z = 0; z < 22; z++)
      box(
        x - 15.5,
        0.005,
        z - 4,
        0.96,
        0.12,
        0.96,
        ['#ab7851', '#b48359', '#a16d49', '#ba8b62'][(x * 7 + z * 3) % 4],
      );
  box(0, 7.6, -4.55, 31.8, 15.4, 0.25, '#6b463b');
  for (let i = 0; i < 32; i++) box(i - 15.5, 0.7, -4.37, 0.05, 1.55, 0.1, brass);
  box(0, 0.12, -4.32, 31.5, 0.18, 0.18, dark);
  box(0, 3.15, -4.3, 31.5, 0.15, 0.2, dark);
  // Framed windows and their little glowing sill lamps.
  for (const x of [-3.9, 3.9]) {
    box(x, 2, -4.33, 1.65, 1.65, 0.16, dark);
    box(x, 2, -4.2, 1.4, 1.4, 0.1, '#294c59');
    box(x, 2, -4.1, 0.06, 1.4, 0.05, cream);
    box(x, 2, -4.1, 1.4, 0.06, 0.05, cream);
    box(x, 1.15, -4.1, 1.9, 0.12, 0.5, brass);
  }
  // Bottle shelves: one merged mesh rather than a mesh for every voxel.
  // Low enough that the top row of bottles stays under the sign.
  for (const y of [1.45, 2.12]) {
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
  for (const [x, z] of tables) {
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
      box(x, 0.88, z + offset + Math.sign(offset) * 0.26, 0.8, 0.7, 0.1, dark);
    }
  }
  for (const x of [-1.2, 1.2]) {
    box(x, 0.7, -0.25, 0.7, 0.18, 0.7, '#b26061');
    box(x, 0.35, -0.25, 0.16, 0.7, 0.16, dark);
    box(x, 0.08, -0.25, 0.62, 0.08, 0.62, brass);
  }
  // Jukebox (plinth, body and a stepped crown), rug and a leafy plant.
  box(-6.4, 0.06, -1.3, 0.86, 0.12, 0.8, dark);
  box(-6.4, 0.66, -1.3, 0.8, 1.1, 0.75, '#883f4b');
  box(-6.4, 1.27, -1.3, 0.66, 0.12, 0.7, '#883f4b');
  box(-6.4, 1.37, -1.3, 0.44, 0.08, 0.64, '#883f4b');
  box(-6.4, 0.89, -0.9, 0.58, 0.64, 0.05, cream);
  box(-6.4, 0.91, -0.86, 0.42, 0.4, 0.05, '#5f9b92');
  for (let i = 0; i < 5; i++) box(-6.4, 0.2 + i * 0.07, -0.9, 0.55, 0.03, 0.04, brass);
  box(0, 0.09, 2.3, 1.9, 0.018, 3.3, '#9b5650');
  for (let x = -0.8; x < 1; x += 0.4) box(x, 0.11, 2.3, 0.06, 0.01, 3, '#d5a169');
  p.push(...cornerPlantParts);
  // Amber lights, framed menu and coat hooks.
  // Kept clear of the sign, the shelves and the window frames.
  for (const x of [-12, -9.6, -7.4, -5.25, -2.75, 2.75, 5.25, 7.4, 9.6, 12]) {
    box(x, 2.85, -4.36, 0.2, 0.32, 0.1, brass);
    box(x, 2.85, -4.29, 0.12, 0.2, 0.05, '#ffe2a3');
  }
  // Framed menu between the left window and the shelves.
  box(-6.2, 2.25, -4.38, 1, 1.3, 0.1, dark);
  box(-6.2, 2.25, -4.31, 0.8, 1.1, 0.04, '#ddc594');
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
function Person({
  guest,
  guestGroups,
  staff,
}: {
  guest: Guest;
  guestGroups: SceneRefs['guestGroups'];
  staff: StaffRefs;
}) {
  const ref = useRef<THREE.Group>(null);
  const setGroup = useCallback(
    (group: THREE.Group | null) => {
      if (group) guestGroups.current.set(guest.id, group);
      else guestGroups.current.delete(guest.id);
    },
    [guest.id, guestGroups],
  );
  const body = useMemo(() => geometry(personParts(guest.customerId)), [guest.customerId]);
  const setSelected = useGame((s) => s.select);
  // Where the guest is standing on the floor. New guests start in the doorway.
  const floor = useRef<FloorPoint>(
    guest.status === 'waiting'
      ? [entrance[0], entrance[2]]
      : [guestPosition(guest)[0], guestPosition(guest)[2]],
  );
  const path = useRef<{ to: string; points: FloorPoint[] }>({ to: '', points: [] });
  const step = useRef<FloorPoint>([0, 0]);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const state = useGame.getState();
    if (state.title || state.paused || !['floor', 'station'].includes(state.panel)) return;
    const [tx, ty, tz] = guestPosition(guest);
    const host = staff.current.host;
    const people: FloorPoint[] = host ? [[host.position.x, host.position.z]] : [];
    if (useGame.getState().game.settings.reducedMotion && !people.length) floor.current = [tx, tz];
    else {
      // Plan a new route only when the destination changes.
      const key =
        tx + ',' + tz + ':' + people.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(';');
      if (path.current.to !== key)
        path.current = { to: key, points: guestPath(floor.current, [tx, tz], people) };
      const next = people.length
        ? walkAvoidingPeople(
            floor.current,
            [tx, tz],
            guestSpeed * Math.min(delta, 0.1),
            people,
            path.current.points,
          )
        : stepAlong(floor.current, path.current.points, guestSpeed * Math.min(delta, 0.1));
      step.current = [next.position[0] - floor.current[0], next.position[1] - floor.current[1]];
      floor.current = next.position;
      path.current.points = next.path;
      if ('blocked' in next && next.blocked) path.current.to = '';
    }
    const moving = Math.hypot(floor.current[0] - tx, floor.current[1] - tz) > 0.001;
    ref.current.position.set(floor.current[0], moving ? 0 : ty, floor.current[1]);
    // Walk facing where they are going; sit facing the table or the counter.
    const seated = !moving && !['waiting', 'leaving'].includes(guest.status);
    const facing =
      moving && Math.hypot(...step.current) > 1e-6
        ? Math.atan2(step.current[0], step.current[1])
        : seated
          ? seatFacing(guest.seat)
          : 0;
    const turn = Math.atan2(
      Math.sin(facing - ref.current.rotation.y),
      Math.cos(facing - ref.current.rotation.y),
    );
    ref.current.rotation.y += turn * (1 - Math.exp(-Math.min(delta, 0.1) * 10));
    ref.current.rotation.z = state.game.settings.reducedMotion
      ? 0
      : moving
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
  return (
    <group
      ref={(group) => {
        ref.current = group;
        setGroup(group);
      }}
      position={[floor.current[0], 0, floor.current[1]]}
    >
      <mesh
        geometry={body}
        material={material}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelected(guest.id);
        }}
      />
    </group>
  );
}
function Bartender({ staff }: { staff: StaffRefs }) {
  const ref = useRef<THREE.Group>(null);
  const body = useMemo(() => geometry(personParts('bartender', true)), []);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const s = useGame.getState();
    if (s.title || s.paused || !['floor', 'station'].includes(s.panel)) return;
    const current = ref.current.position;
    const atCleanupStation =
      s.cleanupJob?.actor === 'bartender' && ['working', 'emptying'].includes(s.cleanupJob.stage);
    const next =
      s.game.settings.reducedMotion || atCleanupStation
        ? s.bartenderPosition
        : s.cleanupJob?.actor === 'bartender'
          ? stepAlong(
              [current.x, current.z],
              guestPath([current.x, current.z], s.bartenderPosition),
              delta * walkingSpeed,
            ).position
          : advanceWalk([current.x, current.z], s.bartenderPosition, delta * walkingSpeed);
    const moving = Math.hypot(next[0] - current.x, next[1] - current.z) > 0.001;
    {
      // Standing still, turn back to face the room.
      const angle =
        moving && !atCleanupStation ? Math.atan2(next[0] - current.x, next[1] - current.z) : 0;
      const difference = Math.atan2(
        Math.sin(angle - ref.current.rotation.y),
        Math.cos(angle - ref.current.rotation.y),
      );
      ref.current.rotation.y += difference * (1 - Math.exp(-delta * 12));
    }
    current.set(next[0], 0.08, next[1]);
    ref.current.rotation.z =
      moving && !s.game.settings.reducedMotion ? Math.sin(clock.elapsedTime * 10) * 0.04 : 0;
    if (
      s.cleanupJob?.actor === 'bartender' &&
      s.cleanupJob.stage === 'working' &&
      !s.paused &&
      !s.game.settings.reducedMotion
    )
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 8) * 0.07;
  });
  return (
    <group
      ref={(group) => {
        ref.current = group;
        staff.current.bartender = group;
      }}
      position={[bartenderHome[0], 0.08, bartenderHome[1]]}
    >
      <mesh geometry={body} material={material} scale={[1, 1.2, 1]} castShadow />
    </group>
  );
}
function Camera() {
  const { camera, size } = useThree();
  const panel = useGame((s) => s.panel);
  useFrame((_, dt) => {
    const station = panel === 'station';
    const reduced = useGame.getState().game.settings.reducedMotion;
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    // A straight-on view that always fits the room's width and everything
    // from the bar sign down to the front door. The side walls follow the
    // screen edges, so nothing outside the bar is ever on screen. The side
    // drawer slides over the scene; the camera never moves for it.
    // At the counter, close in on the drink being made.
    const zoom = station
      ? Math.min(size.width / 3.9, size.height / 3.2)
      : Math.min(size.width / 15.8, size.height / 10.3);
    // The drawer is already eased, so follow it closely; ease the bigger jump
    // to and from the counter more gently.
    camera.zoom = reduced ? zoom : THREE.MathUtils.damp(camera.zoom, zoom, station ? 4 : 16, dt);
    // Pin the top of the view just above the bar sign, so any spare height
    // goes to the floor rather than to empty wall.
    const up = 0.781,
      back = 0.625;
    const top = up * 3.3 + back * 4.4 + 0.5;
    const centre = top - size.height / camera.zoom / 2;
    const target = station
      ? new THREE.Vector3(-0.1, 1.55, -1.55)
      : new THREE.Vector3(0, 1, (up - centre) / back);
    const position = station
      ? target.clone().add(new THREE.Vector3(0, 6, 9.2))
      : target.clone().add(new THREE.Vector3(0, 13, 16.25));
    camera.position.lerp(position, reduced ? 1 : 1 - Math.exp(-dt * (station ? 4 : 16)));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  });
  return null;
}
function Sign({ lit }: { lit: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 162;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#493830';
    c.fillRect(0, 0, 768, 162);
    c.strokeStyle = '#91b9a3';
    c.lineWidth = 5;
    c.strokeRect(6, 6, 756, 150);
    c.textAlign = 'center';
    c.fillStyle = lit ? '#a8e3c9' : '#aea28b';
    c.font = '400 84px "Caveat Brush", sans-serif';
    c.fillText('DIVE BAR', 384, 90);
    c.fillStyle = '#e6cda1';
    c.font = '20px sans-serif';
    c.fillText('GOOD DRINKS · BETTER STORIES', 384, 134);
    return new THREE.CanvasTexture(canvas);
  }, [lit]);
  return (
    <mesh position={[0, 3.12, -4.12]}>
      <planeGeometry args={[3.7, 0.78]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
const glow = (color: string) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
);
/** The hired host walks inside the room, independently of the side walls. */
function Host({ staff, guestGroups }: { staff: StaffRefs; guestGroups: SceneRefs['guestGroups'] }) {
  const ref = useRef<THREE.Group>(null);
  const body = useMemo(() => geometry(personParts('host')), []);
  const floor = useRef<FloorPoint>([...hostHome]);
  const path = useRef<{ to: string; points: FloorPoint[] }>({ to: '', points: [] });
  useFrame(({ clock }, delta) => {
    const state = useGame.getState();
    if (!ref.current || state.title || state.paused || !['floor', 'station'].includes(state.panel))
      return;
    const target = state.hostPosition;
    const people: FloorPoint[] = [...guestGroups.current.values()].map((g) => [
      g.position.x,
      g.position.z,
    ]);
    const key =
      target.join(',') + ':' + people.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(';');
    if (path.current.to !== key)
      path.current = { to: key, points: guestPath(floor.current, target, people) };
    const before = floor.current;
    const walk = people.length
      ? walkAvoidingPeople(
          before,
          target,
          guestSpeed * Math.min(delta, 0.1),
          people,
          path.current.points,
        )
      : stepAlong(before, path.current.points, guestSpeed * Math.min(delta, 0.1));
    const atCleanupStation =
      state.cleanupJob?.actor === 'host' &&
      ['working', 'emptying'].includes(state.cleanupJob.stage);
    floor.current =
      (state.game.settings.reducedMotion && !people.length) ||
      (atCleanupStation &&
        !people.some((p) => Math.hypot(p[0] - target[0], p[1] - target[1]) < 0.9))
        ? [...target]
        : walk.position;
    path.current.points = walk.path;
    if ('blocked' in walk && walk.blocked) path.current.to = '';
    const dx = floor.current[0] - before[0],
      dz = floor.current[1] - before[1];
    const moving = Math.hypot(dx, dz) > 1e-6;
    ref.current.position.set(floor.current[0], 0, floor.current[1]);
    if (moving) ref.current.rotation.y = Math.atan2(dx, dz);
    if (atCleanupStation) ref.current.rotation.y = 0;
    ref.current.rotation.z =
      moving && !state.game.settings.reducedMotion ? Math.sin(clock.elapsedTime * 9) * 0.045 : 0;
    if (
      state.cleanupJob?.actor === 'host' &&
      state.cleanupJob.stage === 'working' &&
      !state.game.settings.reducedMotion
    )
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 8) * 0.07;
  });
  return (
    <group
      ref={(group) => {
        ref.current = group;
        staff.current.host = group;
      }}
      position={[hostHome[0], 0, hostHome[1]]}
    >
      <mesh geometry={body} material={material} scale={[1, 1.2, 1]} castShadow />
    </group>
  );
}
/** Physical tools make each maintenance job visible in the room. */
function CleanupProps({ staff }: { staff: StaffRefs }) {
  const job = useGame((s) => s.cleanupJob);
  const dirty = useGame((s) => s.game.dirtyGlasses);
  const trash = useGame((s) => s.game.trash);
  const tool = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!tool.current || !job) return;
    const state = useGame.getState();
    if (!state.paused && !state.title && ['floor', 'station'].includes(state.panel))
      elapsed.current += delta;
    const t = state.game.settings.reducedMotion ? 0 : elapsed.current;
    if (job.kind === 'trash') {
      const position = job.actor === 'host' ? state.hostPosition : state.bartenderPosition;
      const actor = staff.current[job.actor];
      tool.current.position.set(
        (actor?.position.x ?? position[0]) + 0.45,
        0.5,
        actor?.position.z ?? position[1],
      );
    } else {
      const [x] = cleanupInfo[job.kind].position;
      tool.current.position.set(
        x + (job.kind === 'wipe' ? Math.sin(t * 7) * 0.75 : Math.sin(t * 5) * 0.12),
        1.34,
        -1.65,
      );
      tool.current.rotation.z = job.kind === 'wash' ? Math.sin(t * 6) * 0.25 : 0;
    }
  });
  const working = job?.stage === 'working';
  return (
    <>
      <group position={[-2.6, 1.28, -1.7]}>
        <mesh>
          <boxGeometry args={[0.9, 0.12, 0.65]} />
          <meshStandardMaterial color="#819a98" />
        </mesh>
        <mesh position={[0, 0.065, 0]}>
          <boxGeometry args={[0.68, 0.025, 0.45]} />
          <meshStandardMaterial color={working && job.kind === 'wash' ? '#a7e7ec' : '#435d63'} />
        </mesh>
        <mesh position={[0, 0.3, -0.27]}>
          <boxGeometry args={[0.06, 0.5, 0.06]} />
          <meshStandardMaterial color="#c1d4cf" />
        </mesh>
        {working && job.kind === 'wash' && (
          <mesh position={[0, 0.22, -0.12]}>
            <cylinderGeometry args={[0.025, 0.035, 0.3, 8]} />
            <meshStandardMaterial color="#a5e6ef" transparent opacity={0.7} />
          </mesh>
        )}
        {dirty > 0 && (
          <mesh position={[0.5, 0.14, 0]}>
            <cylinderGeometry args={[0.12, 0.1, 0.25, 8]} />
            <meshStandardMaterial color="#9da995" />
          </mesh>
        )}
      </group>
      <group position={[binPosition[0], 0.4, binPosition[1]]}>
        <mesh>
          <cylinderGeometry args={[binRadius - 0.03, 0.24, 0.8, 10]} />
          <meshStandardMaterial color="#476c62" />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[binRadius, binRadius, 0.06, 10]} />
          <meshStandardMaterial color={trash > 0 ? '#423d3e' : '#8da79a'} />
        </mesh>
      </group>
      {job && (working || job.stage === 'carrying' || job.stage === 'emptying') && (
        <group ref={tool}>
          {job.kind !== 'trash' && (
            <>
              <mesh position={[0.08, 0.12, -0.08]}>
                <boxGeometry args={[0.19, 0.13, 0.2]} />
                <meshStandardMaterial color="#db9e78" />
              </mesh>
              <mesh position={[0.08, 0.14, -0.3]}>
                <boxGeometry args={[0.2, 0.16, 0.3]} />
                <meshStandardMaterial color={job.actor === 'host' ? '#d2a054' : cream} />
              </mesh>
            </>
          )}
          {job.kind === 'wipe' ? (
            <mesh>
              <boxGeometry args={[0.38, 0.08, 0.28]} />
              <meshStandardMaterial color="#f6d26f" />
            </mesh>
          ) : job.kind === 'trash' ? (
            <>
              <mesh>
                <sphereGeometry args={[0.3, 8, 6]} />
                <meshStandardMaterial color="#353f43" />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[0.12, 0.13, 0.1]} />
                <meshStandardMaterial color="#353f43" />
              </mesh>
            </>
          ) : (
            <>
              <mesh>
                <cylinderGeometry args={[0.13, 0.1, 0.3, 10]} />
                <meshStandardMaterial color="#d7f2ed" transparent opacity={0.8} />
              </mesh>
              {[-0.2, 0, 0.2].map((x) => (
                <mesh key={x} position={[x, 0.2 + Math.abs(x), 0.1]}>
                  <sphereGeometry args={[0.06, 8, 6]} />
                  <meshStandardMaterial color="#eefcfa" />
                </mesh>
              ))}
            </>
          )}
        </group>
      )}
    </>
  );
}
/** String lights attached to the responsive front door once bought. */
function DoorDecor() {
  const lights = useGame((s) => s.game.upgrades.doorLights);
  const bulbs = useMemo(() => {
    const list: [number, number, string][] = [];
    const colors = ['#ffd36b', '#ff7a85', '#7fe3d4', '#ffd36b', '#b8a4ff'];
    let n = 0;
    // Seen edge-on, a string up the back jamb would land on top of the one
    // over the lintel, so the string runs over the lintel and down the front
    // jamb only.
    for (let z = 5.72; z <= 7.28; z += 0.26)
      list.push([z, 2.55 - Math.sin(((z - 5.72) / 1.56) * Math.PI) * 0.12, colors[n++ % 5]]);
    for (let y = 2.2; y > 0.6; y -= 0.3) list.push([7.28, y, colors[n++ % 5]]);
    return list;
  }, []);
  return (
    <>
      {lights &&
        bulbs.map(([z, y, color], i) => (
          <mesh key={i} position={[0.22, y, z]}>
            <sphereGeometry args={[0.055, 8, 6]} />
            {glow(color)}
          </mesh>
        ))}
    </>
  );
}
/** Decor bought from the shop, placed around the room. */
function Decor() {
  const jukebox = useGame((s) => s.game.upgrades.jukebox);
  const candles = useGame((s) => s.game.upgrades.counterDecor);
  const art = useGame((s) => s.game.upgrades.wallArt);
  const flame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!flame.current || useGame.getState().game.settings.reducedMotion) return;
    flame.current.children.forEach((c, i) => {
      c.scale.y = 1 + Math.sin(clock.elapsedTime * 11 + i * 2) * 0.18;
    });
  });
  return (
    <>
      {jukebox && (
        <group position={[-6.4, 0, -0.9]}>
          {/* Glowing tubes up the front corners and along the crown, set
              against the cabinet front rather than floating off it. */}
          {[-0.34, 0.34].map((x, i) => (
            <mesh key={x} position={[x, 0.67, 0]}>
              <boxGeometry args={[0.06, 1.06, 0.07]} />
              {glow(i ? '#7fe3d4' : '#ff7a85')}
            </mesh>
          ))}
          <mesh position={[0, 1.24, -0.03]}>
            <boxGeometry args={[0.74, 0.06, 0.06]} />
            {glow('#ffd36b')}
          </mesh>
        </group>
      )}
      {candles && (
        <group>
          <group ref={flame}>
            {[-3.5, 1.75].map((x) => (
              <mesh key={x} position={[x, 1.6, -1.45]}>
                <coneGeometry args={[0.05, 0.13, 8]} />
                {glow('#ffc54d')}
              </mesh>
            ))}
          </group>
          {[-3.5, 1.75].map((x) => (
            <mesh key={x} position={[x, 1.39, -1.45]} castShadow>
              <cylinderGeometry args={[0.08, 0.09, 0.26, 12]} />
              <meshStandardMaterial color="#fbf0dc" />
            </mesh>
          ))}
          <mesh position={[2.35, 1.42, -1.5]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.32, 12]} />
            <meshStandardMaterial color="#5fb3a6" />
          </mesh>
          {(
            [
              [2.27, '#e04f5f'],
              [2.43, '#f6b545'],
              [2.35, '#ef7d8c'],
            ] as const
          ).map(([x, c], i) => (
            <mesh key={i} position={[x, 1.66 + (i % 2) * 0.08, -1.5 + (i - 1) * 0.07]}>
              <sphereGeometry args={[0.075, 8, 6]} />
              <meshStandardMaterial color={c} />
            </mesh>
          ))}
        </group>
      )}
      {art && (
        <group>
          <mesh position={[6.3, 2.05, -4.36]}>
            <boxGeometry args={[1.15, 0.95, 0.08]} />
            <meshStandardMaterial color="#f6b545" />
          </mesh>
          <mesh position={[6.3, 2.05, -4.3]}>
            <boxGeometry args={[0.95, 0.75, 0.03]} />
            <meshStandardMaterial color="#7cc6e0" />
          </mesh>
          <mesh position={[6.3, 1.86, -4.27]}>
            <boxGeometry args={[0.95, 0.36, 0.03]} />
            <meshStandardMaterial color="#3fae9c" />
          </mesh>
          <mesh position={[6.55, 2.2, -4.26]}>
            <boxGeometry args={[0.16, 0.16, 0.02]} />
            <meshStandardMaterial color="#fbf3e4" />
          </mesh>
          <mesh position={[-7.2, 2.0, -4.36]}>
            <boxGeometry args={[0.62, 0.62, 0.08]} />
            <meshStandardMaterial color="#e04f5f" />
          </mesh>
          <mesh position={[-7.2, 2.0, -4.3]}>
            <boxGeometry args={[0.46, 0.46, 0.03]} />
            <meshStandardMaterial color="#fbf3e4" />
          </mesh>
          <mesh position={[-7.2, 2.0, -4.27]}>
            <boxGeometry args={[0.24, 0.24, 0.02]} />
            <meshStandardMaterial color="#f6b545" />
          </mesh>
        </group>
      )}
    </>
  );
}
function Room({ guestGroups }: { guestGroups: SceneRefs['guestGroups'] }) {
  const staff = useRef<StaffRefs['current']>({});
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
  const game = useGame((s) => s.game);
  const floorPlant = useMemo(() => geometry(floorPlantParts), []);
  return (
    <>
      <Camera />
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
      <SideWalls />
      <Bartender staff={staff} />
      <CleanupProps staff={staff} />
      {game.upgrades.barback && <Host staff={staff} guestGroups={guestGroups} />}
      {game.guests.map((g) => (
        <Person guest={g} guestGroups={guestGroups} staff={staff} key={g.id} />
      ))}
      <DrinkStage />
      <Decor />
      {game.mess > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, 1.262, -1.5]}>
          <circleGeometry args={[0.15 + game.mess * 0.03, 12]} />
          <meshBasicMaterial color="#96573b" transparent opacity={0.6} />
        </mesh>
      )}
      {game.upgrades.plant && (
        <group position={[7.2, 0, 4.6]}>
          <mesh geometry={floorPlant} material={material} castShadow receiveShadow />
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

function SceneProjector({ elements, guestGroups }: SceneRefs) {
  const { camera, size } = useThree();
  const projected = useMemo(() => new THREE.Vector3(), []);
  // Guest cards are drawn at the interface scale, which follows the screen height.
  const scale = useMemo(
    () =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--drawer-scale')) ||
      1,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.height],
  );
  useFrame(() => {
    const place = (element: HTMLElement | null, position: THREE.Vector3) => {
      if (!element) return;
      position.project(camera);
      const x = (position.x * 0.5 + 0.5) * size.width;
      const y = (-position.y * 0.5 + 0.5) * size.height;
      element.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
      element.style.visibility = position.z < -1 || position.z > 1 ? 'hidden' : 'visible';
      element.style.zIndex = String(Math.round((1 - position.z) * 1000));
      // Keep the guest's action card on screen near the edges of the scene.
      const half = 130 * scale;
      const nudge = x < half ? half - x : x > size.width - half ? size.width - half - x : 0;
      // The card is zoomed, so its own offsets are in unscaled pixels.
      element.style.setProperty('--nudge', nudge / scale + 'px');
      // Open the card on the side with room for it, and slide it to stay on screen
      // when neither side has enough (short phones).
      const card = element.querySelector<HTMLElement>('.guest-card');
      const tall = (card?.offsetHeight ?? 200) * scale;
      const above = y - 134 * scale - tall;
      const below = size.height - (y + 30 * scale + tall);
      const under = above < 8 && below > above;
      const shift = under ? Math.min(0, below - 8) : Math.max(0, 8 - above);
      element.dataset.below = String(under);
      element.style.setProperty('--lift', shift / scale + 'px');
    };

    for (const [id, element] of elements.current.guests) {
      const group = guestGroups.current.get(id);
      if (group) place(element, group.getWorldPosition(projected));
    }
  });
  return null;
}

function SceneLabels({ elements }: { elements: SceneRefs['elements'] }) {
  const guests = useGame((s) => s.game.guests);
  const selected = useGame((s) => s.selected);
  const setPanel = useGame((s) => s.setPanel);
  const select = useGame((s) => s.select);

  const present = guests.filter((g) => g.status !== 'leaving');
  return (
    <div className="scene-overlay">
      <button
        className="station-label"
        onClick={() => {
          if (useGame.getState().selected === null) useGame.getState().select(-1);
          setPanel('station');
        }}
      >
        <CocktailArt size={22} /> Counter
      </button>
      {guests.map((guest) => {
        const isSelected = selected === guest.id;
        const ready = ['waiting', 'ready', 'ordered', 'pay'].includes(guest.status);
        const open =
          guest.status !== 'leaving' && (isSelected || (present.length === 1 && selected === null));
        const left = patience(guest);
        return (
          <div
            key={guest.id}
            ref={(element) => {
              if (element) elements.current.guests.set(guest.id, element);
              else elements.current.guests.delete(guest.id);
            }}
            className={
              'guest-anchor ' +
              (isSelected ? 'selected ' : '') +
              (ready ? 'attention ' : '') +
              (left !== null && left < 0.3 ? 'hurry' : '')
            }
          >
            {open && <GuestActions guest={guest} />}
            {guest.paid && guest.status === 'leaving' && (
              <span className={'tip-float ' + (guest.tip ? '' : 'none')} aria-hidden="true">
                {guest.tip ? '+' + money(guest.tip) + ' tip' : 'No tip'}
              </span>
            )}
            <button
              className={'guest-bubble ' + guest.status}
              onClick={() => select(isSelected ? null : guest.id)}
              aria-label={'Select ' + guest.name}
            >
              {left !== null && (
                <svg className="patience-ring" viewBox="0 0 60 60" aria-hidden="true">
                  <circle
                    cx="30"
                    cy="30"
                    r="26"
                    pathLength="100"
                    strokeDasharray={left * 100 + ' 100'}
                  />
                </svg>
              )}
              <span className="bubble-face">
                {guest.status === 'waiting' ? (
                  <b>!</b>
                ) : guest.status === 'reading' ? (
                  <b className="dots">···</b>
                ) : guest.status === 'ready' ? (
                  <b>?</b>
                ) : guest.status === 'ordered' ? (
                  <CocktailArt size={30} />
                ) : guest.status === 'pay' ? (
                  <CoinArt size={30} />
                ) : (
                  <HeartArt size={26} />
                )}
              </span>
              <small>{guest.name}</small>
            </button>
          </div>
        );
      })}
    </div>
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
  const elements = useRef<OverlayElements>({ guests: new Map() });
  const guestGroups = useRef(new Map<number, THREE.Group>());
  const sceneRefs = { elements, guestGroups };
  return (
    <>
      <SceneBoundary>
        <Canvas
          frameloop={reduced ? 'demand' : 'always'}
          orthographic
          shadows="percentage"
          dpr={[1, 1.5]}
          resize={{ debounce: 0 }}
          camera={{ position: [0, 14, 17], zoom: 45, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <Room guestGroups={guestGroups} />
            <SceneProjector {...sceneRefs} />
          </Suspense>
        </Canvas>
      </SceneBoundary>
      <SceneLabels elements={elements} />
    </>
  );
}

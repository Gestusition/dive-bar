import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { decorShown, mood, type Prep } from '../game/engine';
import { hostHome } from '../game/host';
import { cleanupInfo, cleanupTarget } from '../game/cleanup';
import {
  bartenderHome,
  counterSeats,
  guestPosition,
  guestSpeed,
  newAgent,
  outsideDoor,
  pastDoor,
  roomEdge,
  seatFacing,
  seats,
  serviceSpot,
  setDoorX,
  stepCrowd,
  tables,
  walkingSpeed,
  type Agent,
  type FloorPoint,
} from '../game/navigation';
import {
  binPosition,
  binRadius,
  cornerPlantParts,
  floorPlantParts,
  floorPlantPosition,
} from '../game/room-layout';
import { money, roster } from '../game/content';
import { brass, cream, dark, personModel, shoulders, standingParts, teal } from '../game/person';
import { handTurn, reachFor, reaches, type Actor, type HandPose } from './hands';
import {
  armStretch,
  forearm,
  forearmGeometry,
  gripPoint,
  handGeometry,
  poseNames,
  solveElbow,
  upperArm,
  upperArmGeometry,
} from './staffRig';
import BackBar from './backBar';
import DrinkStage, { EmptyGlass, glassSize } from './DrinkStage';
import { portraitImage } from './portraitRender';
import { voxelGeometry, voxelMaterial } from './voxels';
import { BrokenHeartArt, CocktailArt, CoinArt, HeartArt } from '../ui/art';
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
// Everyone on the floor, staff included. Each member adds themselves while they are in
// the scene; the Crowd below moves them all together, once a frame, before they draw.
const crowd: Agent[] = [];
function useCrowdMember(agent: Agent) {
  useEffect(() => {
    crowd.push(agent);
    return () => {
      crowd.splice(crowd.indexOf(agent), 1);
    };
  }, [agent]);
}
const setGoal = (agent: Agent, [x, z]: FloorPoint) => {
  agent.goal[0] = x;
  agent.goal[1] = z;
};
const walkingAbout = (s: ReturnType<typeof useGame.getState>) =>
  !s.title && !s.paused && ['floor', 'station'].includes(s.panel);
/** Steps the crowd before anyone reads their position this frame. */
function Crowd() {
  useFrame((_, delta) => {
    const s = useGame.getState();
    if (!walkingAbout(s)) return;
    if (s.game.settings.reducedMotion)
      for (const a of crowd) {
        a.position[0] = a.goal[0];
        a.position[1] = a.goal[1];
        a.path = [];
        a.plannedFor = [...a.goal];
      }
    else stepCrowd(crowd, Math.min(delta, 0.1));
  }, -1);
  return null;
}
const oak = '#805137';
const material = voxelMaterial;
const geometry = voxelGeometry;
// Every character keeps one body for the whole game: building it again for each
// arriving guest would stall a frame and leave the old one on the graphics card.
const bodies = new Map<string, THREE.BufferGeometry>();
function personBody(id: string) {
  let body = bodies.get(id);
  if (!body) {
    bodies.set(id, (body = geometry(standingParts(personModel(id, id === 'bartender')))));
  }
  return body;
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
  // Wall battens carry the floor's seams up the wall, so they stay clear of anything
  // standing in the middle of a board.
  for (let x = -15; x <= 15; x++) box(x, 0.7, -4.37, 0.05, 1.55, 0.1, brass);
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
  // Bottle shelves, low enough that the top row of bottles stays under the sign; the
  // bottles on them are in backBar.tsx.
  for (const y of [1.45, 2.12]) {
    box(0, y, -4.05, 5.1, 0.13, 0.66, dark);
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
  // The working mat and the ice well sit on the staff side, in reach from behind the bar.
  box(0.05, 1.26, -2.15, 2.5, 0.025, 0.64, '#28473f');
  for (let z = -2.41; z < -1.87; z += 0.06) box(0.05, 1.274, z, 2.42, 0.006, 0.028, '#335a50');
  box(3, 1.38, -1.7, 0.55, 0.3, 0.45, '#3c4547');
  box(3, 1.58, -1.8, 0.55, 0.14, 0.28, '#98c8ac');
  box(-1.55, 1.32, -1.6, 0.58, 0.12, 0.6, '#617d7a');
  box(-1.55, 1.38, -1.6, 0.4, 0.05, 0.4, '#bdc9bc');
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
/**
 * The way to face while walking. Someone held up or edging round another person keeps
 * facing the way they were going rather than spinning round and back.
 */
function walkingFacing(current: number, [dx, dz]: FloorPoint, speed: number, delta: number) {
  return Math.hypot(dx, dz) < speed * 0.35 * Math.min(delta, 0.1) ? current : Math.atan2(dx, dz);
}
/** How far from a stop, or from their chair, a guest starts to ease their pace. */
const easeDistance = 1.1;
/** Slowest pace on the last step into a chair, as a share of walking speed. */
const slowestPace = 0.26;
/** How far from their seat a guest starts to rise onto it. */
const seatRise = 0.8;
/** Nobody spins round faster than this, in radians a second. */
const fastestTurn = 7;
function turnTowards(current: number, facing: number, delta: number, rate: number) {
  const turn = Math.atan2(Math.sin(facing - current), Math.cos(facing - current));
  const dt = Math.min(delta, 0.1);
  const most = fastestTurn * dt;
  return current + THREE.MathUtils.clamp(turn * (1 - Math.exp(-dt * rate)), -most, most);
}
function Person({ id, guestGroups }: { id: number; guestGroups: SceneRefs['guestGroups'] }) {
  const ref = useRef<THREE.Group>(null);
  const setGroup = useCallback(
    (group: THREE.Group | null) => {
      if (group) guestGroups.current.set(id, group);
      else guestGroups.current.delete(id);
    },
    [id, guestGroups],
  );
  const setSelected = useGame((s) => s.select);
  // Where the guest is standing on the floor. New guests come in from outside the door,
  // the second of a party a step behind the first.
  const [agent] = useState(() => {
    const guest = useGame.getState().game.guests.find((g) => g.id === id);
    const place = guest && guestPosition(guest);
    return newAgent(
      !guest || !place || guest.status === 'waiting'
        ? outsideDoor(guest?.lead === false ? 1 : 0)
        : [place[0], place[2]],
      guestSpeed,
    );
  });
  useCrowdMember(agent);
  const [body] = useState(() =>
    personBody(useGame.getState().game.guests.find((g) => g.id === id)?.customerId ?? String(id)),
  );
  const last = useRef<FloorPoint>([...agent.position]);
  const swaying = useRef(0);
  // Only where they first appear: the frame loop moves them after that. A position that
  // changed here would put everyone back on the floor, seated or not, each time a guest
  // came or went and the scene was drawn again.
  const [startsAt] = useState((): [number, number, number] => [
    agent.position[0],
    0,
    agent.position[1],
  ]);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const state = useGame.getState();
    if (!walkingAbout(state)) return;
    const guest = state.game.guests.find((g) => g.id === id);
    if (!guest) return;
    const [tx, , tz] = guestPosition(guest);
    const leaving = guest.status === 'leaving';
    // Leaving, they walk on through the door and out of sight, keeping clear of anyone
    // coming in until they are out of view.
    if (leaving && pastDoor(agent.position)) agent.gone = true;
    setGoal(agent, leaving ? outsideDoor() : [tx, tz]);
    // Someone held up on the way out hurries, so nobody vanishes in the middle of the room.
    if (leaving && !agent.gone) {
      let left = 0,
        from = agent.position;
      for (const p of agent.path) {
        left += Math.hypot(p[0] - from[0], p[1] - from[1]);
        from = p;
      }
      agent.speed = Math.min(
        guestSpeed * 1.8,
        Math.max(guestSpeed, left / Math.max(guest.remaining - 0.3, 0.1)),
      );
    }
    const [x, z] = agent.position;
    const step: FloorPoint = [x - last.current[0], z - last.current[1]];
    last.current = [x, z];
    const left = agent.gone ? Infinity : Math.hypot(x - tx, z - tz);
    const moving = left > 0.001;
    // Slow down on the last steps to a stop, and set off gently from a chair, so nobody
    // pulls up dead or leaps out of their seat at full walking speed.
    const chair = seats[guest.seat];
    const chairAway = chair && Math.hypot(x - chair[0], z - chair[2]);
    const nearest = Math.min(left, chairAway ?? Infinity);
    agent.pace = agent.gone
      ? 1
      : slowestPace + (1 - slowestPace) * THREE.MathUtils.smoothstep(nearest, 0, easeDistance);
    // Rise onto the seat over the last steps in, and ease back down on getting up,
    // instead of jumping between the floor and the seat in a single frame.
    const seatHeight = chair?.[1] ?? 0;
    const height =
      seatHeight * THREE.MathUtils.smoothstep(1 - (chairAway ?? Infinity) / seatRise, 0, 1);
    ref.current.position.set(
      x,
      state.game.settings.reducedMotion
        ? height
        : height + (ref.current.position.y - height) * Math.exp(-Math.min(delta, 0.1) * 12),
      z,
    );
    // Walk facing where they are going; sit facing the table or the counter.
    const seated = !moving && !['waiting', 'leaving'].includes(guest.status);
    // Along the gap between a chair's back and the table they keep facing the table, or
    // they would have their arms through it, and sidestep into their seat.
    const inGap =
      !!chair &&
      !counterSeats.includes(guest.seat) &&
      Math.hypot(x - chair[0], z - chair[2]) < 1.3 &&
      Math.abs(z - chair[2]) < 0.3;
    const facing =
      seated || inGap
        ? seatFacing(guest.seat)
        : moving
          ? walkingFacing(ref.current.rotation.y, step, agent.speed, delta)
          : 0;
    ref.current.rotation.y = turnTowards(ref.current.rotation.y, facing, delta, inGap ? 7 : 10);
    // The walking sway fades in and out rather than stopping dead on the last step.
    swaying.current +=
      (Number(moving) - swaying.current) * (1 - Math.exp(-Math.min(delta, 0.1) * 7));
    ref.current.rotation.z = state.game.settings.reducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 9) * 0.045 * swaying.current +
        Math.sin(clock.elapsedTime * 1.5 + guest.id) * 0.009 * (1 - swaying.current);
    if (
      !state.game.settings.reducedMotion &&
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
      position={startsAt}
    >
      <mesh
        geometry={body}
        material={material}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelected(id);
        }}
      />
    </group>
  );
}
/** Staff are drawn a little taller than guests. */
const staffHeight = 1.2;
const staffShoulders = shoulders.map(([x, y, z]) => new THREE.Vector3(x, y * staffHeight, z)) as [
  THREE.Vector3,
  THREE.Vector3,
];
/** Where the head turns from: the top of the neck. */
const neckY = 0.78 * staffHeight;
const staffParts = new Map<
  string,
  {
    body: THREE.BufferGeometry;
    head: THREE.BufferGeometry;
    upper: THREE.BufferGeometry;
    fore: THREE.BufferGeometry;
    hands: [THREE.BufferGeometry, THREE.BufferGeometry];
  }
>();
function staffGeometry(id: string) {
  let parts = staffParts.get(id);
  if (!parts) {
    const model = personModel(id, id === 'bartender');
    // Shoulders the arms turn in, so that no gap opens over a raised arm.
    const body = geometry([
      ...model.body,
      [-0.3, 0.73, 0, 0.2, 0.16, 0.25, model.shirt],
      [0.3, 0.73, 0, 0.2, 0.16, 0.25, model.shirt],
      [0, 0.82, 0, 0.2, 0.1, 0.2, model.skin],
    ]);
    body.scale(1, staffHeight, 1);
    const head = geometry(model.head);
    head.scale(1, staffHeight, 1);
    head.translate(0, -neckY, 0);
    parts = {
      body,
      head,
      upper: upperArmGeometry(model.shirt),
      fore: forearmGeometry(model.shirt, model.skin),
      hands: [handGeometry(model.skin, -1), handGeometry(model.skin, 1)],
    };
    staffParts.set(id, parts);
  }
  return parts;
}
const hanging = new THREE.Vector3(0, -1, 0);
/** Behind the counter (towards the back wall from here) the floor is raised boards. */
const behindBar = -2.5,
  boardHeight = 0.68;
/** From the wrist to the elbow's way out: out from the body, down and back. */
const elbowPole = (side: number, out: THREE.Vector3) => out.set(side ? 0.5 : -0.5, -1, -0.8);
/** Arms at rest: bent a little, the hands by the hips with their palms turned in. */
const restWrists = [new THREE.Vector3(-0.37, 0.4, 0.05), new THREE.Vector3(0.37, 0.4, 0.05)];
/** Hanging at rest an arm is drawn a little shorter than one reaching out to work. */
const restArm = 0.78;
const restTurns = [
  handTurn([0, -1, 0.1], [1, 0, 0], new THREE.Quaternion()),
  handTurn([0, -1, 0.1], [-1, 0, 0], new THREE.Quaternion()),
];
/**
 * A member of staff whose arms reach for whatever they are working with (see
 * hands.ts). When it is out of reach they step up to the counter and lean in, and
 * when nothing needs their hands the arms come back to rest. They look at the work.
 */
function StaffFigure({ id, actor }: { id: string; actor: Actor }) {
  const { body, head, upper, fore, hands } = staffGeometry(id);
  const root = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const uppers = useRef<(THREE.Group | null)[]>([]);
  const fores = useRef<(THREE.Group | null)[]>([]);
  const handRefs = useRef<(THREE.Mesh | null)[]>([]);
  const scratch = useMemo(
    () => ({
      goal: new THREE.Vector3(),
      aim: new THREE.Vector3(),
      wrist: new THREE.Vector3(),
      grip: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      pole: new THREE.Vector3(),
      bone: new THREE.Vector3(),
      look: new THREE.Vector3(),
      turn: new THREE.Quaternion(),
      undo: new THREE.Quaternion(),
      spare: new THREE.Quaternion(),
    }),
    [],
  );
  const held = useMemo(
    () =>
      [0, 1].map((side) => ({
        wrist: restWrists[side].clone(),
        turn: restTurns[side].clone(),
        // How far the hand still has to travel to what it has just gone for.
        away: new THREE.Vector3(),
        awayTurn: new THREE.Quaternion(),
        key: 'rest',
      })),
    [],
  );
  const motion = useRef({
    last: null as THREE.Vector3 | null,
    walk: 0,
    raised: 0,
    length: restArm,
  });
  useFrame(({ clock }, delta) => {
    const figure = root.current;
    if (!figure?.parent) return;
    const reach = reaches[actor];
    const dt = Math.min(delta, 0.1);
    // Written this frame or the one before, however long frames take on this device.
    const fresh = clock.elapsedTime - reach.at <= Math.max(0.2, delta * 2.5);
    const goals = [0, 1].map((side) => (fresh && reach.use[side] ? reach.hands[side] : null));
    const ease = 1 - Math.exp(-dt * 12);
    // How far forward the work is, in the character's own frame (they face +z).
    let ahead = 0,
      aside = 0,
      count = 0;
    for (const g of goals)
      if (g) {
        figure.parent.worldToLocal(scratch.goal.copy(g.at));
        ahead += scratch.goal.z;
        aside += scratch.goal.x;
        count++;
      }
    ahead = count ? ahead / count : 0;
    aside = count ? aside / count : 0;
    // Only work in front of them and within a step is theirs to reach for; walking
    // past the counter, they keep their arms at their sides.
    const working = count > 0 && ahead > 0 && ahead < 1.4 && Math.abs(aside) < 1.3;
    const step = working ? THREE.MathUtils.clamp(ahead - 0.41, 0, 0.26) : 0;
    const lean = working ? THREE.MathUtils.clamp((ahead - step - 0.3) * 0.2, 0, 0.05) : 0;
    // Turn towards the work, so both hands get to it without crossing in front of the face.
    const turn = working ? THREE.MathUtils.clamp(Math.atan2(aside, ahead) * 0.2, -0.08, 0.08) : 0;
    // Behind the bar, staff stand on the raised boards there, so the counter comes to
    // their waist and their hands reach the work on it.
    const m = motion.current;
    figure.parent.getWorldPosition(scratch.goal);
    const moved = m.last ? m.last.distanceTo(scratch.goal) : 0;
    if (m.last) m.last.copy(scratch.goal);
    else m.last = scratch.goal.clone();
    const raised = scratch.goal.z < behindBar ? boardHeight : 0;
    m.raised += (raised - m.raised) * ease;
    figure.position.y = m.raised + (working ? reach.bob : 0);
    figure.position.z += (step - figure.position.z) * ease;
    figure.rotation.x += (lean - figure.rotation.x) * ease;
    figure.rotation.y += (turn - figure.rotation.y) * ease;
    figure.updateMatrixWorld();
    // Walking swings the arms, one forward as the other goes back.
    m.walk += (Number(!working && moved > 0.0005) - m.walk) * (1 - Math.exp(-dt * 8));
    const swing = Math.sin(clock.elapsedTime * 10) * 0.13 * m.walk;
    m.length += ((working ? 1 : restArm) - m.length) * ease;
    figure.getWorldQuaternion(scratch.undo).invert();
    scratch.look.set(0, 0, 0);
    let looks = 0;
    held.forEach((hand, side) => {
      const goal = working ? goals[side] : null;
      const thumb = side ? 1 : -1;
      const { wrist, turn: grip } = scratch;
      let pose: HandPose = 'relaxed';
      let key = 'rest';
      if (goal) {
        figure.worldToLocal(scratch.aim.copy(goal.at));
        scratch.look.add(scratch.aim);
        looks++;
        pose = goal.pose;
        key = goal.key;
        if (goal.fixedTurn) grip.copy(scratch.undo).multiply(goal.turn);
        else {
          // Reaching with no particular grip: on along the line of the arm, palm down.
          const a = scratch.bone.copy(scratch.aim).sub(staffShoulders[side]).normalize();
          handTurn([a.x, a.y, a.z], [0, -1, 0.1], grip);
        }
        wrist.copy(scratch.aim).sub(gripPoint(pose, thumb, scratch.grip).applyQuaternion(grip));
      } else {
        wrist.copy(restWrists[side]);
        wrist.z += side ? -swing : swing;
        grip.copy(restTurns[side]);
      }
      if (hand.key !== key) {
        hand.key = key;
        hand.away.subVectors(hand.wrist, wrist);
        hand.awayTurn.copy(grip).invert().multiply(hand.turn);
      }
      const travel = Math.exp(-dt * (goal ? 13 : 8));
      hand.away.multiplyScalar(travel);
      hand.awayTurn.slerp(scratch.spare.identity(), 1 - travel);
      hand.wrist.addVectors(wrist, hand.away);
      hand.turn.copy(grip).multiply(hand.awayTurn);
      // Two bones from the shoulder to the wrist, the elbow out from the body.
      const stretch =
        m.length *
        Math.min(
          armStretch,
          solveElbow(
            staffShoulders[side],
            hand.wrist,
            elbowPole(side, scratch.pole),
            scratch.elbow,
            upperArm * m.length,
            forearm * m.length,
          ),
        );
      const up = uppers.current[side],
        lower = fores.current[side],
        palm = handRefs.current[side];
      if (up) {
        scratch.bone.subVectors(scratch.elbow, staffShoulders[side]).normalize();
        up.quaternion.setFromUnitVectors(hanging, scratch.bone);
        up.scale.y = stretch;
      }
      if (lower) {
        lower.position.copy(scratch.elbow);
        scratch.bone.subVectors(hand.wrist, scratch.elbow).normalize();
        lower.quaternion.setFromUnitVectors(hanging, scratch.bone);
        lower.scale.y = stretch;
      }
      if (palm) {
        palm.position.copy(hand.wrist);
        palm.quaternion.copy(hand.turn);
        const shape = palm.morphTargetInfluences;
        if (shape) {
          const closing = 1 - Math.exp(-dt * 16);
          poseNames.forEach((name, i) => {
            shape[i] += (Number(name === pose) - shape[i]) * closing;
          });
        }
      }
    });
    // The head follows the hands, turning more than it nods: the camera is above them.
    const face = headRef.current;
    if (face) {
      let yaw = 0,
        nod = 0;
      if (looks) {
        scratch.look.divideScalar(looks);
        yaw = THREE.MathUtils.clamp(Math.atan2(scratch.look.x, scratch.look.z) * 0.25, -0.12, 0.12);
        nod = THREE.MathUtils.clamp((neckY + 0.2 - scratch.look.y) * 0.2, 0, 0.07);
      }
      face.rotation.y += (yaw - face.rotation.y) * ease;
      face.rotation.x += (nod - face.rotation.x) * ease;
    }
  });
  return (
    <group ref={root}>
      <mesh geometry={body} material={material} castShadow />
      <group ref={headRef} position={[0, neckY, 0]} rotation={[0, 0, 0, 'YXZ']}>
        <mesh geometry={head} material={material} castShadow />
      </group>
      {staffShoulders.map((shoulder, side) => (
        <group key={side}>
          <group
            position={shoulder}
            ref={(g) => {
              uppers.current[side] = g;
            }}
          >
            <mesh geometry={upper} material={material} castShadow />
          </group>
          <group
            ref={(g) => {
              fores.current[side] = g;
            }}
          >
            <mesh geometry={fore} material={material} castShadow />
          </group>
          <mesh
            ref={(m) => {
              handRefs.current[side] = m;
              // The geometry is set after the mesh is made, so it has to look for its poses.
              m?.updateMorphTargets();
            }}
            geometry={hands[side]}
            material={material}
            castShadow
          />
        </group>
      ))}
    </group>
  );
}
function Bartender({ staff }: { staff: StaffRefs }) {
  const ref = useRef<THREE.Group>(null);
  const [agent] = useState(() => newAgent(bartenderHome, walkingSpeed, { firstThrough: true }));
  useCrowdMember(agent);
  const last = useRef<FloorPoint>([...agent.position]);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const s = useGame.getState();
    if (!walkingAbout(s)) return;
    const job = s.cleanupJob?.actor === 'bartender' ? s.cleanupJob : null;
    const atCleanupStation = !!job && ['working', 'emptying'].includes(job.stage);
    // One route to where they are going, round the furniture like everyone else.
    const task = s.tasks[0];
    const guest = task && s.game.guests.find((g) => g.id === task.id);
    const atMat = s.panel === 'station' && !job;
    setGoal(agent, job ? cleanupTarget(job) : atMat || !guest ? bartenderHome : serviceSpot(guest));
    // Making a drink or scrubbing a glass, they stay put and others walk round them.
    agent.anchored = atCleanupStation || (atMat && !agent.path.length);
    const current = ref.current.position;
    const [x, z] = agent.position;
    const dx = x - last.current[0],
      dz = z - last.current[1];
    last.current = [x, z];
    const moving = Math.hypot(dx, dz) > 0.001;
    {
      // Standing still, turn back to face the room.
      const angle = moving && !atCleanupStation ? Math.atan2(dx, dz) : 0;
      const difference = Math.atan2(
        Math.sin(angle - ref.current.rotation.y),
        Math.cos(angle - ref.current.rotation.y),
      );
      ref.current.rotation.y += difference * (1 - Math.exp(-delta * 12));
    }
    current.set(x, 0.08, z);
    ref.current.rotation.z =
      moving && !s.game.settings.reducedMotion ? Math.sin(clock.elapsedTime * 10) * 0.04 : 0;
    if (job?.stage === 'working' && !s.game.settings.reducedMotion)
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
      <StaffFigure id="bartender" actor="bartender" />
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
    // At the counter, close in on the drink being made and the bartender making it.
    const zoom = station
      ? Math.min(size.width / 2.9, size.height / 2.4)
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
      ? new THREE.Vector3(-0.2, 1.6, -2.3)
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
  // Tilted forward to face the camera looking down on the room, so the lettering is
  // not squashed to look stretched sideways.
  return (
    <mesh position={[0, 3.17, -4.05]} rotation={[-Math.atan2(13, 16.25), 0, 0]}>
      <planeGeometry args={[3.7, 0.78]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
const glow = (color: string) => (
  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
);
/** The hired host walks inside the room, independently of the side walls. */
function Host({ staff }: { staff: StaffRefs }) {
  const ref = useRef<THREE.Group>(null);
  const [agent] = useState(() => newAgent(hostHome, guestSpeed));
  useCrowdMember(agent);
  const last = useRef<FloorPoint>([...agent.position]);
  useFrame(({ clock }, delta) => {
    const state = useGame.getState();
    if (!ref.current || !walkingAbout(state)) return;
    // Walk one route to where the host is heading. Chasing the position the clock
    // steps every 250 ms would stop, start and change direction four times a second.
    const job = state.cleanupJob?.actor === 'host' ? state.cleanupJob : null;
    setGoal(agent, job ? cleanupTarget(job) : state.hostTarget);
    const atCleanupStation =
      !!job && ['working', 'emptying'].includes(job.stage) && !agent.path.length;
    agent.anchored = atCleanupStation;
    const [x, z] = agent.position;
    const dx = x - last.current[0],
      dz = z - last.current[1];
    last.current = [x, z];
    const moving = Math.hypot(dx, dz) > 1e-6;
    ref.current.position.set(x, 0, z);
    ref.current.rotation.y = atCleanupStation
      ? 0
      : turnTowards(
          ref.current.rotation.y,
          walkingFacing(ref.current.rotation.y, [dx, dz], agent.speed, delta),
          delta,
          12,
        );
    ref.current.rotation.z =
      moving && !state.game.settings.reducedMotion ? Math.sin(clock.elapsedTime * 9) * 0.045 : 0;
    if (job?.stage === 'working' && !state.game.settings.reducedMotion)
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
      <StaffFigure id="host" actor="host" />
    </group>
  );
}
// The counter top and the floor of the sink's basin, so props stand on them. The sink
// sits on the staff side of the counter, in reach from behind the bar.
const counterTop = 1.25,
  sinkBasinTop = 1.28 + 0.065 + 0.0125;
const sinkX = -2.6,
  sinkZ = -2.13;
// The tap stands at the front of the sink, its spout reaching back over the basin;
// water falls from its tip.
const tapZ = 0.27,
  spoutTip = 0.1,
  spoutZ = sinkZ + spoutTip,
  spoutBottom = 1.28 + 0.72 - 0.025;
/** A glass being washed is tipped away from the washer, its rim under the running tap. */
const washTilt = 0.35;
/** Glasses at the sink are drawn the size they are next to the staff, not the close-up size. */
const sinkScale = 1;
/** Where the counter is wiped: the staff side, in front of whoever wipes it. */
const wipeZ = -2.0;
/** Physical tools make each maintenance job visible in the room, held in real hands. */
function CleanupProps({ staff }: { staff: StaffRefs }) {
  const job = useGame((s) => s.cleanupJob);
  const dirty = useGame((s) => s.game.dirtyGlasses);
  const trash = useGame((s) => s.game.trash);
  // The glasses at the sink are the ones drinks were served in: the latest one served,
  // or a rocks glass before any drink tonight.
  const served = useGame((s) => s.game.guests.findLast((g) => g.served)?.prep.glass);
  const lastGlass = useRef<Prep['glass']>('old_fashioned_glass');
  if (served) lastGlass.current = served;
  const glass = lastGlass.current;
  const { radius, rim, height } = glassSize(glass, sinkScale);
  // Where the glass stands so that its rim sits right under the spout.
  const washZ = spoutZ - height * Math.sin(washTilt);
  const rimY = sinkBasinTop + 0.05 + height * Math.cos(washTilt);
  const tool = useRef<THREE.Group>(null);
  const held = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const points = useMemo(() => ({ left: new THREE.Vector3(), right: new THREE.Vector3() }), []);
  useFrame(({ clock }, delta) => {
    if (!tool.current || !job) return;
    const state = useGame.getState();
    if (!state.paused && !state.title && ['floor', 'station'].includes(state.panel))
      elapsed.current += delta;
    const t = state.game.settings.reducedMotion ? 0 : elapsed.current;
    const { left, right } = points;
    if (job.kind === 'trash') {
      // The bag hangs from the right hand, on the right whichever way they walk.
      const actor = staff.current[job.actor];
      const position = job.actor === 'host' ? state.hostPosition : state.bartenderPosition;
      const turn = actor?.rotation.y ?? 0;
      tool.current.position.set(
        (actor?.position.x ?? position[0]) + Math.cos(turn) * 0.38,
        0.27,
        (actor?.position.z ?? position[1]) - Math.sin(turn) * 0.38,
      );
      tool.current.rotation.y = turn;
    } else if (job.kind === 'wash') {
      // Held over the basin under the running tap and turned round in the hands: one
      // hand steadies it while the other scrubs inside the rim.
      tool.current.position.set(sinkX, sinkBasinTop + 0.05, washZ);
      if (spin.current) spin.current.rotation.y = t * 2.5;
      if (held.current) {
        held.current.updateMatrixWorld();
        held.current.localToWorld(left.set(-(radius + 0.04), height * 0.45, 0));
        held.current.localToWorld(
          right.set(Math.cos(t * 5) * rim * 0.35, height * 0.85, Math.sin(t * 5) * rim * 0.35),
        );
        reachFor(job.actor, clock.elapsedTime, left, right);
      }
    } else {
      // The sponge goes back and forth along the counter under the right hand, the
      // left hand flat on the counter beside it.
      const [x] = cleanupInfo[job.kind].position;
      tool.current.position.set(x + Math.sin(t * 7) * 0.45, counterTop + 0.04, wipeZ);
      tool.current.updateMatrixWorld();
      tool.current.localToWorld(right.set(0, 0.08, 0));
      left.set(x - 0.55, counterTop + 0.05, wipeZ - 0.1);
      reachFor(job.actor, clock.elapsedTime, left, right);
    }
  });
  const working = job?.stage === 'working';
  return (
    <>
      <group position={[sinkX, 1.28, sinkZ]}>
        <mesh>
          <boxGeometry args={[0.9, 0.12, 0.65]} />
          <meshStandardMaterial color="#819a98" />
        </mesh>
        <mesh position={[0, 0.065, 0]}>
          <boxGeometry args={[0.68, 0.025, 0.45]} />
          <meshStandardMaterial color={working && job.kind === 'wash' ? '#a7e7ec' : '#435d63'} />
        </mesh>
        {/* The tap: a pillar at the front of the sink and a spout over the basin. */}
        <mesh position={[0, 0.4, tapZ]}>
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color="#c1d4cf" />
        </mesh>
        <mesh position={[0, 0.72, (tapZ + spoutTip) / 2]}>
          <boxGeometry args={[0.06, 0.05, tapZ - spoutTip + 0.06]} />
          <meshStandardMaterial color="#c1d4cf" />
        </mesh>
      </group>
      {working && job.kind === 'wash' && (
        // Water running from the spout into the glass.
        <mesh position={[sinkX, (spoutBottom + rimY - 0.06) / 2, spoutZ]}>
          <cylinderGeometry args={[0.022, 0.03, spoutBottom - rimY + 0.06, 10]} />
          <meshStandardMaterial color="#a5e6ef" transparent opacity={0.7} />
        </mesh>
      )}
      {dirty > 0 && (
        // Waiting on the counter top beside the sink.
        <group position={[sinkX + 0.45 + radius + 0.04, counterTop, sinkZ]}>
          <EmptyGlass glass={glass} dirty scale={sinkScale} />
        </group>
      )}
      <group position={[binPosition[0], 0.4, binPosition[1]]}>
        <mesh>
          <cylinderGeometry args={[binRadius - 0.03, 0.24, 0.8, 40]} />
          <meshStandardMaterial color="#476c62" />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[binRadius, binRadius, 0.06, 40]} />
          <meshStandardMaterial color={trash > 0 ? '#423d3e' : '#8da79a'} />
        </mesh>
      </group>
      {job && (working || job.stage === 'carrying' || job.stage === 'emptying') && (
        <group ref={tool}>
          {job.kind === 'wipe' ? (
            <mesh>
              <boxGeometry args={[0.3, 0.07, 0.2]} />
              <meshStandardMaterial color="#f6d26f" />
            </mesh>
          ) : job.kind === 'trash' ? (
            <>
              {/* A full bag, gathered at the neck under the hand that carries it. */}
              <mesh scale={[1, 1.15, 0.85]} castShadow>
                <sphereGeometry args={[0.19, 16, 12]} />
                <meshStandardMaterial color="#353f43" roughness={0.45} />
              </mesh>
              <mesh position={[0, 0.235, 0]}>
                <cylinderGeometry args={[0.045, 0.03, 0.09, 8]} />
                <meshStandardMaterial color="#2a3235" />
              </mesh>
            </>
          ) : (
            <group ref={held} rotation={[washTilt, 0, 0]}>
              <group ref={spin}>
                <EmptyGlass glass={glass} scale={sinkScale} />
                {/* Suds round the rim. */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <mesh
                    key={i}
                    position={[
                      Math.cos((i * Math.PI * 2) / 5) * rim * 0.85,
                      height - 0.01,
                      Math.sin((i * Math.PI * 2) / 5) * rim * 0.85,
                    ]}
                  >
                    <sphereGeometry args={[0.035, 12, 8]} />
                    <meshStandardMaterial color="#eefcfa" />
                  </mesh>
                ))}
              </group>
            </group>
          )}
        </group>
      )}
    </>
  );
}
/** String lights attached to the responsive front door once bought. */
// The string runs over the lintel and down the front jamb. Seen edge-on, the
// lintel run lands in line with the jamb, so the bulbs are spaced evenly on
// screen rather than along the string, and a cord joins them up.
const doorString = new THREE.CatmullRomCurve3(
  (
    [
      [2.56, 5.72],
      [2.47, 6.5],
      [2.56, 7.26],
      [2.1, 7.3],
      [1.3, 7.3],
      [0.6, 7.28],
    ] as const
  ).map(([y, z]) => new THREE.Vector3(0.22, y, z)),
);
const doorCord = new THREE.TubeGeometry(doorString, 96, 0.014, 5);
const doorBulbs = (() => {
  // The camera looks down at atan(13 / 16.25); this is how far up the screen a point is.
  const up = (p: THREE.Vector3) => p.y * 0.781 - p.z * 0.625;
  const samples = doorString.getSpacedPoints(400);
  const colors = ['#ffd36b', '#ff7a85', '#7fe3d4', '#ffd36b', '#b8a4ff'];
  const list: [THREE.Vector3, string][] = [];
  let travelled = 0;
  for (let i = 1; i < samples.length; i++) {
    travelled += Math.abs(up(samples[i]) - up(samples[i - 1]));
    if (!list.length || travelled >= 0.2) {
      list.push([samples[list.length ? i : 0], colors[list.length % colors.length]]);
      travelled = 0;
    }
  }
  return list;
})();
function DoorDecor() {
  const lights = useGame((s) => decorShown(s.game, 'doorLights'));
  if (!lights) return null;
  return (
    <>
      <mesh geometry={doorCord}>
        <meshStandardMaterial color="#3b2b25" />
      </mesh>
      {doorBulbs.map(([p, color], i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.055, 8, 6]} />
          {glow(color)}
        </mesh>
      ))}
    </>
  );
}
/** Decor bought from the shop, placed around the room. */
function Decor() {
  const jukebox = useGame((s) => decorShown(s.game, 'jukebox'));
  const candles = useGame((s) => decorShown(s.game, 'counterDecor'));
  const art = useGame((s) => decorShown(s.game, 'wallArt'));
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
/**
 * Compiles every kind of material the bar will ever need while the title screen is up.
 * A shader is otherwise compiled the first time something using it comes on screen, the
 * first dirty glass or the first bottle, and that stalls the frame on any hardware.
 */
function ShaderWarmup() {
  const { gl, camera, scene } = useThree();
  useEffect(() => {
    const stand = new THREE.Scene();
    const box = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    const materials = [false, true].flatMap((transparent) =>
      [THREE.FrontSide, THREE.DoubleSide].flatMap((side) => [
        new THREE.MeshStandardMaterial({ transparent, side }),
        new THREE.MeshBasicMaterial({ transparent, side }),
      ]),
    );
    for (const m of materials) {
      const mesh = new THREE.Mesh(box, m);
      mesh.castShadow = mesh.receiveShadow = true;
      stand.add(mesh);
    }
    // Using the room's own lights, or the compiled shaders would not fit it.
    gl.compile(stand, camera, scene);
    box.dispose();
    materials.forEach((m) => m.dispose());
    // Each character's body and card face likewise, a little at a time, so a guest sitting
    // down and their card opening never has to stop the frame to draw them.
    const left = roster.map((c) => c.id);
    let timer = 0;
    const next = () => {
      const id = left.shift();
      if (!id) return;
      personBody(id);
      portraitImage(id);
      timer = window.setTimeout(next, 30);
    };
    timer = window.setTimeout(next, 200);
    return () => clearTimeout(timer);
  }, [gl, camera, scene]);
  return null;
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
  // Only what this draws: the whole game changes four times a second, and redrawing the
  // scene's React tree that often for nothing is a stutter of its own.
  const guestIds = useGame((s) => s.game.guests.map((g) => g.id).join());
  const barback = useGame((s) => decorShown(s.game, 'barback'));
  const mess = useGame((s) => s.game.mess);
  const neon = useGame((s) => decorShown(s.game, 'neon'));
  const plant = useGame((s) => decorShown(s.game, 'plant'));
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
      <Sign lit={neon} />
      <SideWalls />
      <Crowd />
      <ShaderWarmup />
      <Bartender staff={staff} />
      <CleanupProps staff={staff} />
      {barback && <Host staff={staff} />}
      {guestIds &&
        guestIds
          .split(',')
          .map(Number)
          .map((id) => <Person id={id} guestGroups={guestGroups} key={id} />)}
      <DrinkStage />
      <BackBar />
      <Decor />
      {mess > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, 1.262, -1.5]}>
          <circleGeometry args={[0.15 + mess * 0.03, 12]} />
          <meshBasicMaterial color="#96573b" transparent opacity={0.6} />
        </mesh>
      )}
      {plant && (
        <group position={[floorPlantPosition[0], 0, floorPlantPosition[1]]}>
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
    // Read every card's height before moving any of them. Reading after a move makes
    // the browser lay the page out again for each guest, every frame.
    const heights = new Map<HTMLElement, number>();
    for (const element of elements.current.guests.values())
      heights.set(element, element.querySelector<HTMLElement>('.guest-card')?.offsetHeight ?? 200);
    const anchors: { element: HTMLElement; x: number; y: number; shift: number }[] = [];
    const place = (element: HTMLElement | null, position: THREE.Vector3) => {
      if (!element) return;
      position.project(camera);
      const x = (position.x * 0.5 + 0.5) * size.width;
      const y = (-position.y * 0.5 + 0.5) * size.height;
      element.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
      anchors.push({ element, x, y, shift: 0 });
      element.style.visibility = position.z < -1 || position.z > 1 ? 'hidden' : 'visible';
      element.style.zIndex = String(Math.round((1 - position.z) * 1000));
      // Keep the guest's action card on screen near the edges of the scene.
      const half = 130 * scale;
      const nudge = x < half ? half - x : x > size.width - half ? size.width - half - x : 0;
      // The card is zoomed, so its own offsets are in unscaled pixels.
      element.style.setProperty('--nudge', nudge / scale + 'px');
      // Open the card on the side with room for it, and slide it to stay on screen
      // when neither side has enough (short phones).
      const tall = (heights.get(element) ?? 200) * scale;
      const above = y - 134 * scale - tall;
      const below = size.height - (y + 30 * scale + tall);
      const under = above < 8 && below > above;
      const shift = under ? Math.min(0, below - 8) : Math.max(0, 8 - above);
      element.dataset.below = String(under);
      element.style.setProperty('--lift', shift / scale + 'px');
      // A card in the lower half moves the hints and notices to the top of the
      // scene, so they never cover its buttons.
      const top = under ? y + 30 * scale + shift : y - 134 * scale + shift - tall;
      element.dataset.low = String(top + tall / 2 > size.height / 2);
    };

    for (const [id, element] of elements.current.guests) {
      const group = guestGroups.current.get(id);
      if (group) place(element, group.getWorldPosition(projected));
    }
    // Guests sitting across a table are close together on screen, so their bubbles would
    // cover each other's faces and names: spread them apart along the row.
    const clearance = 62 * scale;
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < anchors.length; i++)
        for (let j = i + 1; j < anchors.length; j++) {
          const a = anchors[i],
            b = anchors[j];
          if (Math.abs(a.y - b.y) > clearance * 1.1) continue;
          const gap = b.x + b.shift - (a.x + a.shift);
          const push = clearance - Math.abs(gap);
          if (push <= 0) continue;
          const side = gap >= 0 ? 0.5 : -0.5;
          a.shift -= push * side;
          b.shift += push * side;
        }
    for (const a of anchors) a.element.style.setProperty('--spread', a.shift / scale + 'px');
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
              className={
                'guest-bubble ' +
                guest.status +
                // A guest who finds the drink only all right shows nothing but their name.
                (['drinking', 'leaving'].includes(guest.status) && mood(guest) === 'neutral'
                  ? ' neutral'
                  : '')
              }
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
                ) : mood(guest) === 'happy' ? (
                  <HeartArt size={26} />
                ) : mood(guest) === 'unhappy' ? (
                  <BrokenHeartArt size={26} />
                ) : null}
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

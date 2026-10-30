import type { Guest } from './engine';
import { binPosition, binRadius } from './room-layout';

export type FloorPoint = [number, number];
export const bartenderHome: FloorPoint = [0, -3.05];
export const walkingSpeed = 7.5;
const sideAisle = 4.6;
const frontAisle = 0.5;
const backEdge = -2.9;
export const seats: [number, number, number][] = [
  [-2.7, 0.18, 2.95],
  [2.25, 0.18, 3.2],
  [-1.2, 0.35, -0.25],
  [1.2, 0.35, -0.25],
  [-6.1, 0.18, 3.35],
  [6.2, 0.18, 3.15],
  // The far chair at each table, facing the room. Pairs sit across from each other.
  [-2.7, 0.18, 1.05],
  [2.25, 0.18, 1.3],
  [-6.1, 0.18, 1.45],
  [6.2, 0.18, 1.25],
];
/** The two stools in front of the counter. */
export const counterSeats = [2, 3];
/** Seats that sit together: across each table, and the two stools side by side. */
export const seatPairs: [number, number][] = [
  [0, 6],
  [1, 7],
  [4, 8],
  [5, 9],
  [2, 3],
];
// The front door sits in the left wall ahead of every table. Guests come in
// there, wait just inside, and leave the same way. The side walls follow the
// screen edges, so the door's x position is updated by the scene.
export const entrance: [number, number, number] = [-7.2, 0, 6.5];
let doorX = -7.8;
/** Where the side walls stand for a view showing `halfWidth` either side of the middle. */
export const roomEdge = (halfWidth: number) => Math.max(7.8, halfWidth - 0.1);
export function setDoorX(x: number) {
  if (Math.abs(x - doorX) < 0.01) return;
  doorX = x;
  entrance[0] = x + 0.6;
  padded = [...fixedPadded, pad([doorX + 0.5, 7.02, 1, 0.09])];
}
const waitingSpot: [number, number, number] = [-4.4, 0, 6.3];
// The second guest of a pair waits beside the first.
const partnerSpot: [number, number, number] = [-3.6, 0, 6.55];
export const guestSpeed = 3.4;
/** Just out of sight beyond the door, where the party in the doorway lines up to come in. */
export const outsideDoor = (place = 0): FloorPoint => [
  entrance[0] - 1.5 - place * 0.9,
  entrance[2],
];
/** Near enough the door to be on the way out, and no longer in anyone's way. */
export const doorReach = 0.9;
export const guestPosition = (
  g: Pick<Guest, 'status' | 'seat'> & { lead?: boolean },
): [number, number, number] =>
  g.status === 'waiting'
    ? g.lead === false
      ? partnerSpot
      : waitingSpot
    : g.status === 'leaving'
      ? entrance
      : (seats[g.seat] ?? waitingSpot);
/** Where the bartender stands to help a guest. Stools are served across the counter. */
export function servicePosition(g: Guest): FloorPoint {
  if (g.status !== 'waiting' && counterSeats.includes(g.seat))
    return [seats[g.seat][0], bartenderHome[1]];
  return [guestPosition(g)[0], g.status === 'waiting' ? 5.4 : frontAisle];
}
// The counter ends at x=±4; 0.6 clearance accommodates the bartender's arms.
// Keep the front crossing between the stools and the table chairs. Both ends of the
// counter are open, and the bartender goes round whichever end is shorter.
const pickAisle = (fromX: number, toX: number) =>
  Math.abs(fromX + sideAisle) + Math.abs(toX + sideAisle) <
  Math.abs(fromX - sideAisle) + Math.abs(toX - sideAisle)
    ? -sideAisle
    : sideAisle;
export function walkingRoute(from: FloorPoint, to: FloorPoint): FloorPoint[] {
  if (Math.hypot(from[0] - to[0], from[1] - to[1]) < 0.00001) return [];
  if (
    (from[0] >= 4.45 && to[0] >= 4.45) ||
    (Math.abs(from[0] - to[0]) < 0.00001 && from[1] >= frontAisle && to[1] >= frontAisle)
  )
    return [to];
  const behind = (p: FloorPoint) => p[1] <= backEdge;
  // Part-way round one end of the counter, between the back and the front.
  const atEnd = (p: FloorPoint) =>
    Math.abs(p[0]) >= 4.45 && !behind(p) && p[1] < frontAisle - 0.00001;
  const points: FloorPoint[] = [];
  if (behind(to)) {
    if (!behind(from)) {
      const aisle = atEnd(from) ? Math.sign(from[0]) * sideAisle : pickAisle(from[0], to[0]);
      if (!atEnd(from)) points.push([from[0], frontAisle], [aisle, frontAisle]);
      points.push([aisle, bartenderHome[1]]);
    }
  } else {
    if (behind(from)) {
      const aisle = pickAisle(from[0], to[0]);
      points.push([aisle, from[1]], [aisle, frontAisle]);
    } else if (atEnd(from)) points.push([Math.sign(from[0]) * sideAisle, frontAisle]);
    else points.push([from[0], frontAisle]);
    points.push([to[0], frontAisle]);
  }
  points.push(to);
  let previous = from;
  return points.filter((point) => {
    const different = Math.hypot(point[0] - previous[0], point[1] - previous[1]) > 0.00001;
    previous = point;
    return different;
  });
}

// Consume distance along complete legs, including large time steps. Never
// interpolate directly across a corner or cut through the counter on retarget.
export function advanceWalk(
  from: FloorPoint,
  to: FloorPoint,
  distance: number,
  route = walkingRoute,
): FloorPoint {
  let position: FloorPoint = [...from];
  for (const point of route(from, to)) {
    const length = Math.hypot(point[0] - position[0], point[1] - position[1]);
    if (length > distance) {
      const t = Math.max(0, distance) / length;
      return [
        position[0] + (point[0] - position[0]) * t,
        position[1] + (point[1] - position[1]) * t,
      ];
    }
    distance -= length;
    position = [...point];
  }
  return position;
}

// ---------- Guest pathfinding ----------
// Guests find the shortest walk around the furniture on a visibility graph
// built from the corners of every obstacle, padded by the guest's radius.
type Rect = [number, number, number, number]; // centre x, centre z, width, depth
export const tables: FloorPoint[] = [
  [-2.7, 2],
  [2.25, 2.25],
  [-6.1, 2.4],
  [6.2, 2.2],
];
export const guestRadius = 0.32;
export const guestObstacles: Rect[] = [
  ...tables.flatMap(([x, z]): Rect[] => [
    [x, z, 1.75, 1.45],
    [x, z - 0.98, 0.8, 0.7],
    [x, z + 1.11, 0.8, 0.96],
  ]),
  [-1.2, -0.25, 0.7, 0.7],
  [1.2, -0.25, 0.7, 0.7],
  [0, -1.8, 8, 1.35],
  [-6.4, -1.3, 0.8, 0.75],
  [binPosition[0], binPosition[1], binRadius * 2, binRadius * 2],
];
// Each seat is reached from a clear spot just in front of it.
const tableZ = new Map(tables.map(([x, z]) => [x, z]));
/** The way a seated guest faces: towards their table, or the counter from a stool. */
export function seatFacing(seat: number) {
  const place = seats[seat];
  if (!place) return 0;
  const table = tableZ.get(place[0]);
  return table !== undefined && place[2] < table ? 0 : Math.PI;
}
export const seatApproach: FloorPoint[] = seats.map(([x, , z]) =>
  tableZ.has(x) ? [x, tableZ.get(x)! + (z > tableZ.get(x)! ? 1.95 : -1.95)] : [x, z + 0.8],
);
const pad = ([x, z, w, d]: Rect): Rect => [x, z, w + guestRadius * 2, d + guestRadius * 2];
const fixedPadded = guestObstacles.map(pad);
// The swung-open door moves with the left wall.
let padded = [...fixedPadded, pad([doorX + 0.5, 7.02, 1, 0.09])];
const inside = ([px, pz]: FloorPoint, [x, z, w, d]: Rect) =>
  Math.abs(px - x) < w / 2 - 1e-9 && Math.abs(pz - z) < d / 2 - 1e-9;
const blocked = (p: FloorPoint) => padded.some((r) => inside(p, r));
// Does the segment pass through the inside of the rectangle? (Liang–Barsky)
// Route planning runs this tens of thousands of times, so it allocates nothing.
const clipRange = [0, 1];
function clip(p: number, q: number) {
  if (Math.abs(p) < 1e-12) return q > 1e-9;
  const t = q / p;
  if (p < 0) clipRange[0] = Math.max(clipRange[0], t);
  else clipRange[1] = Math.min(clipRange[1], t);
  return clipRange[0] < clipRange[1] - 1e-9;
}
function crosses(a: FloorPoint, b: FloorPoint, [x, z, w, d]: Rect) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  clipRange[0] = 0;
  clipRange[1] = 1;
  return (
    clip(-dx, a[0] - (x - w / 2)) &&
    clip(dx, x + w / 2 - a[0]) &&
    clip(-dz, a[1] - (z - d / 2)) &&
    clip(dz, z + d / 2 - a[1])
  );
}
const clear = (a: FloorPoint, b: FloorPoint) => !padded.some((r) => crosses(a, b, r));
let graph: { doorX: number; nodes: FloorPoint[]; visible: Uint8Array } | null = null;
// Corners of every padded obstacle plus the fixed stops, rebuilt when the door moves,
// with which of them see each other past the furniture worked out once.
function graphNodes() {
  if (graph?.doorX === doorX) return graph;
  const room = { minX: doorX + 0.3, maxX: -doorX - 0.3, minZ: -4.2, maxZ: 7.3 };
  const nodes = (
    [
      [entrance[0], entrance[2]],
      [waitingSpot[0], waitingSpot[2]],
      [partnerSpot[0], partnerSpot[2]],
      ...seatApproach,
      ...padded.flatMap(([x, z, w, d]): FloorPoint[] =>
        (
          [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ] as const
        ).map(([sx, sz]): FloorPoint => [x + sx * (w / 2 + 0.06), z + sz * (d / 2 + 0.06)]),
      ),
    ] as FloorPoint[]
  ).filter(
    (p) =>
      !blocked(p) &&
      p[0] >= room.minX &&
      p[0] <= room.maxX &&
      p[1] >= room.minZ &&
      p[1] <= room.maxZ,
  );
  const visible = new Uint8Array(nodes.length * nodes.length);
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      visible[i * nodes.length + j] = visible[j * nodes.length + i] = clear(nodes[i], nodes[j])
        ? 1
        : 0;
  graph = { doorX, nodes, visible };
  return graph;
}
const distance = (a: FloorPoint, b: FloorPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function nearestApproach(p: FloorPoint) {
  return seatApproach.reduce((best, a) => (distance(p, a) < distance(p, best) ? a : best));
}
/** How close two people's middles ever come side by side: their arms just clear. */
export const personClearance = 0.8;
/**
 * One behind the other, their bodies are thinner than they are wide, so they may come
 * closer. It is what lets someone squeeze behind the bar past a bartender at work.
 */
const depthScale = 1.2;
/** How far apart two people are, measured so that `personClearance` is just clear. */
export const personGap = (a: FloorPoint, b: FloorPoint) =>
  Math.hypot(a[0] - b[0], (a[1] - b[1]) * depthScale);
/** The shortest furniture-free walk from one floor point to another. */
export function guestPath(from: FloorPoint, to: FloorPoint): FloorPoint[] {
  if (distance(from, to) < 1e-6) return [];
  // Already part-way into the chair being sat on: carry on rather than step back out,
  // or a route refreshed on the way in would keep a guest from ever sitting down.
  if (blocked(from) && blocked(to) && nearestApproach(from) === nearestApproach(to)) return [to];
  // Between the spot in front of a chair and the chair itself, keep going in: a
  // refreshed route would otherwise walk back out to that spot first.
  if (blocked(to)) {
    const approach = nearestApproach(to);
    if (distance(approach, from) + distance(from, to) < distance(approach, to) + 1e-6) return [to];
  }
  const fixed = graphNodes();
  // A seat sits inside its own chair, so step out to (or in from) the spot in front of it.
  const start = blocked(from) ? nearestApproach(from) : from;
  const end = blocked(to) ? nearestApproach(to) : to;
  const before: FloorPoint[] = start === from ? [] : [start];
  const after: FloorPoint[] = end === to ? [] : [to];
  if (distance(start, end) < 1e-6 || clear(start, end))
    return [...before, ...(distance(start, end) < 1e-6 ? [] : [end]), ...after];
  const count = fixed.nodes.length;
  // Node 0 is the start, node 1 the end, and the rest are the fixed nodes, whose
  // furniture checks between each other are already known.
  const nodes = [start, end, ...fixed.nodes];
  const isClearAt = (i: number, j: number) =>
    i >= 2 && j >= 2 ? fixed.visible[(i - 2) * count + (j - 2)] === 1 : clear(nodes[i], nodes[j]);
  const best = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const done = nodes.map(() => false);
  best[0] = 0;
  for (;;) {
    let i = -1;
    for (let j = 0; j < nodes.length; j++)
      if (!done[j] && best[j] < Infinity && (i < 0 || best[j] < best[i])) i = j;
    if (i < 0 || i === 1) break;
    done[i] = true;
    for (let j = 0; j < nodes.length; j++) {
      if (done[j] || !isClearAt(i, j)) continue;
      const cost = best[i] + distance(nodes[i], nodes[j]);
      if (cost < best[j]) {
        best[j] = cost;
        previous[j] = i;
      }
    }
  }
  // No clear route (should not happen in this room): walk straight rather than freeze.
  if (best[1] === Infinity) return [...before, end, ...after];
  const route: FloorPoint[] = [];
  for (let i = 1; i > 0; i = previous[i]) route.unshift(nodes[i]);
  return [...before, ...route, ...after];
}

// ---------- The crowd ----------
// Everyone on the floor, staff included, is one crowd. A route round the furniture is
// planned only when someone's destination changes; getting past other people is done
// by steering, a few dozen sums per person per frame, so nobody ever has to plan a
// route because of somebody else. That is what keeps it both smooth and collision free.
export interface Agent {
  position: FloorPoint;
  /** Where they are heading now, set by whoever controls them. */
  goal: FloorPoint;
  path: FloorPoint[];
  speed: number;
  /** How routes are found: round the furniture, or the bartender's walk round the bar. */
  route: (from: FloorPoint, to: FloorPoint) => FloorPoint[];
  /** Following a fixed route that is never shortened, such as the walk round the bar. */
  rails: boolean;
  /** Busy at a spot (a sink, the counter), so others walk round instead of asking them to move. */
  anchored: boolean;
  /** Gone through the door: nobody needs to walk round them any more. */
  gone: boolean;
  velocity: FloorPoint;
  /** The velocity they would like, before anyone else is taken into account. */
  want: FloorPoint;
  plannedFor: FloorPoint | null;
  replanIn: number;
  /** Seconds spent unable to move as they want. */
  stuck: number;
  /** Seconds left of squeezing past, the last resort of someone stuck for a long time. */
  squeezing: number;
  /** Seconds left of backing out of a narrow place to let someone through. */
  backing: number;
  /** Who they are backing away from. */
  backingFrom: Agent | null;
}
export const newAgent = (
  position: FloorPoint,
  speed: number,
  options: Partial<Pick<Agent, 'route' | 'rails' | 'goal'>> = {},
): Agent => ({
  position: [...position],
  goal: [...(options.goal ?? position)],
  path: [],
  speed,
  route: options.route ?? guestPath,
  rails: options.rails ?? false,
  anchored: false,
  gone: false,
  velocity: [0, 0],
  want: [0, 0],
  plannedFor: null,
  replanIn: 0,
  stuck: 0,
  squeezing: 0,
  backing: 0,
  backingFrom: null,
});
/** How often a route is looked over: shortened, or planned again after a dodge. */
export const routeCheck = 0.3;
const stuckLimit = 8;
const steerMargin = 0.1;
const clearAhead = 0.12;
const settleDistance = 0.3;
const backOutAfter = 0.6;
const backOutFor = 0.9;
const horizon = 2.5;
const inRoom = ([x, z]: FloorPoint) =>
  x >= doorX + 0.3 && x <= -doorX - 0.3 && z >= -3.85 && z <= 7.3;
const free = (p: FloorPoint) => inRoom(p) && !blocked(p);
const still = (v: FloorPoint) => v[0] * v[0] + v[1] * v[1] < 1e-12;
/** Seated in a chair: the chair is already furniture, so nobody has to walk round them. */
const settled = (a: Agent) =>
  !a.path.length && seats.some(([x, , z]) => distance(a.position, [x, z]) < 1e-3);
const solid = (a: Agent) => !a.gone && !settled(a);
function followRoute(a: Agent, dt: number) {
  a.replanIn -= dt;
  if (!a.plannedFor || distance(a.plannedFor, a.goal) > 1e-6) {
    a.path = a.route(a.position, a.goal);
    a.plannedFor = [...a.goal];
    a.replanIn = routeCheck;
    return;
  }
  if (a.replanIn > 0) return;
  a.replanIn = routeCheck;
  if (!a.path.length) {
    // Stepped aside for someone; go back to the spot once they have passed. Straight
    // back when it is that close: a route could lead the long way round the room.
    if (distance(a.position, a.goal) > 0.01)
      a.path =
        distance(a.position, a.goal) < 1.5 && clear(a.position, a.goal)
          ? [[...a.goal]]
          : a.route(a.position, a.goal);
    return;
  }
  // Pushed off the walk round the bar: pick it up again from wherever they are now.
  if (a.rails && a.stuck > 0.5) {
    a.path = a.route(a.position, a.goal);
    return;
  }
  if (!free(a.position) || blocked(a.path[0])) return;
  if (!clear(a.position, a.path[0])) a.path = a.route(a.position, a.goal);
  else if (!a.rails && a.path.length > 1 && !blocked(a.path[1]) && clear(a.position, a.path[1]))
    a.path.shift();
}
function wantedVelocity(a: Agent, agents: Agent[], dt: number) {
  a.want[0] = a.want[1] = 0;
  while (a.path.length) {
    const d = distance(a.position, a.path[0]);
    // Corners are taken a little wide of the point; a chair and the spot in front of it exactly.
    const tolerance = a.path.length === 1 || blocked(a.path[1]) ? 1e-4 : 0.1;
    if (d > tolerance) break;
    if (a.path.length === 1) a.position = [...a.path[0]];
    a.path.shift();
  }
  if (!a.path.length) return;
  const next = a.path[0];
  const d = distance(a.position, next);
  // Someone standing on the destination: wait just short of it for them to go.
  if (
    a.path.length === 1 &&
    d < personClearance + 0.1 &&
    agents.some(
      (o) => o !== a && solid(o) && still(o.want) && distance(o.position, next) < personClearance,
    )
  )
    return;
  const speed = Math.min(a.speed, d / dt);
  a.want[0] = ((next[0] - a.position[0]) / d) * speed;
  a.want[1] = ((next[1] - a.position[1]) / d) * speed;
}
/** Someone standing about steps aside for a person who cannot get past them. */
function makeWay(a: Agent, agents: Agent[]) {
  if (a.anchored || !solid(a) || !inRoom(a.position)) return;
  // Someone only a step from their spot has nowhere to be, and can step aside again.
  if (!still(a.want) && (a.path.length > 1 || distance(a.position, a.goal) > 1.2)) return;
  for (const o of agents) {
    if (o === a || o.stuck < 0.25 || still(o.want)) continue;
    const dx = a.position[0] - o.position[0],
      dz = a.position[1] - o.position[1];
    const d = Math.hypot(dx, dz);
    const w = Math.hypot(o.want[0], o.want[1]);
    if (d > personClearance + 0.4 || (dx * o.want[0] + dz * o.want[1]) / ((d || 1) * w) < 0.3)
      continue;
    // Stopping short of this person, not going past them: nobody has to move. Otherwise
    // two people with spots side by side would keep nudging each other off them.
    if (o.path.length === 1 && distance(o.position, o.goal) < d) continue;
    // Off the line they are walking, on whichever side of it this person already is.
    const off = (o.want[0] * dz - o.want[1] * dx) / w;
    if (Math.abs(off) > personClearance + 0.05) continue;
    const sx = -o.want[1] / w,
      sz = o.want[0] / w;
    let side = off < 0 ? -1 : 1;
    if (
      !free([a.position[0] + sx * side * 0.3, a.position[1] + sz * side * 0.3]) &&
      free([a.position[0] - sx * side * 0.3, a.position[1] - sz * side * 0.3])
    )
      side = -side;
    a.want[0] = sx * side * a.speed * 0.6;
    a.want[1] = sz * side * a.speed * 0.6;
    return;
  }
}
/**
 * Two people meeting head on where there is room for only one, such as between a stool
 * and a table: dodging cannot help, so one of them backs right out and lets the other
 * through. It is always the same one of the two, or both would back off and come back
 * together for ever. The bartender, the quickest to clear the gap, goes through first.
 */
function backOut(a: Agent, agents: Agent[], dt: number) {
  if (a.backing > 0) {
    a.backing -= dt;
    const o = a.backingFrom;
    if (o && solid(o)) {
      const dx = a.position[0] - o.position[0],
        dz = a.position[1] - o.position[1];
      const d = Math.hypot(dx, dz) || 1;
      a.want[0] = (dx / d) * a.speed * 0.8;
      a.want[1] = (dz / d) * a.speed * 0.8;
    }
    return;
  }
  if (a.stuck < backOutAfter || still(a.want)) return;
  const w = Math.hypot(a.want[0], a.want[1]);
  for (const o of agents) {
    if (o === a || !solid(o) || still(o.want) || o.backing > 0) continue;
    if (personGap(a.position, o.position) > personClearance + 0.35) continue;
    const dx = o.position[0] - a.position[0],
      dz = o.position[1] - a.position[1];
    if ((dx * a.want[0] + dz * a.want[1]) / ((Math.hypot(dx, dz) || 1) * w) < 0.2) continue;
    const first = o.rails !== a.rails ? o.rails : agents.indexOf(o) < agents.indexOf(a);
    if (!first) continue;
    a.backing = backOutFor;
    a.backingFrom = o;
    a.stuck = 0;
    return;
  }
}
// Directions tried relative to the way someone wants to go. A positive turn is the same
// side for both of two people meeting head on, so they pass rather than mirror each other.
const turns = [
  0, 0.25, -0.25, 0.5, -0.5, 0.8, -0.8, 1.15, -1.15, 1.55, -1.55, 2.1, -2.1, 2.7, -2.7,
];
const paces = [1, 0.55, 0.25];
const turnCos = turns.map(Math.cos),
  turnSin = turns.map(Math.sin);
/** Seconds until two people moving at this relative velocity touch, Infinity if never. */
function timeToTouch(px: number, pz: number, rx: number, rz: number, reach: number) {
  const b = rx * px + rz * pz;
  if (b <= 0) return Infinity;
  const c = px * px + pz * pz - reach * reach;
  if (c <= 0) return 0;
  const a = rx * rx + rz * rz;
  const disc = b * b - a * c;
  return disc < 0 ? Infinity : (b - Math.sqrt(disc)) / a;
}
const nearby: Agent[] = [];
const probe: FloorPoint = [0, 0];
/** The best velocity near the one wanted that keeps clear of people and furniture. */
function steer(a: Agent, agents: Agent[], dt: number) {
  const [wx, wz] = a.want;
  if (still(a.want)) {
    a.velocity[0] = a.velocity[1] = 0;
    return;
  }
  // Going into or out of a chair, or along a rail through a chair's space, is a straight
  // line: only people can hold it up.
  // The bartender's walk along the front runs close by the chairs, though, and held up
  // there they must give way like anyone else, or they and a guest would wait for good.
  const startsFree = free(a.position);
  const docking =
    a.gone ||
    ((!startsFree || (a.path.length > 0 && blocked(a.path[0]))) &&
      a.backing <= 0 &&
      !(a.rails && a.stuck > 0.5));
  nearby.length = 0;
  const look = personClearance + (a.speed + guestSpeed) * horizon * 0.5;
  for (const o of agents)
    if (o !== a && solid(o) && distance(a.position, o.position) < look) nearby.push(o);
  // The last step onto a spot that is clear of everyone needs no steering: judged by
  // its speed, that one small step would look like running into whoever stands beside it.
  if (
    a.backing <= 0 &&
    a.path.length === 1 &&
    distance(a.position, a.path[0]) < settleDistance &&
    nearby.every((o) => personGap(a.path[0], o.position) >= personClearance)
  ) {
    a.velocity[0] = wx;
    a.velocity[1] = wz;
    return;
  }
  // Checked a fixed distance ahead, or someone fast could never edge along a wall.
  const wanted = Math.hypot(wx, wz);
  const ahead = (speed: number) => Math.max(dt, clearAhead / Math.max(speed, 1e-6));
  probe[0] = a.position[0] + wx * ahead(wanted);
  probe[1] = a.position[1] + wz * ahead(wanted);
  if (docking || a.squeezing > 0 || (!nearby.length && free(probe))) {
    a.velocity[0] = wx;
    a.velocity[1] = wz;
    return;
  }
  const reach = personClearance + steerMargin;
  const soonestTouch = (cx: number, cz: number) => {
    let soonest = Infinity;
    for (const o of nearby) {
      // Both sides of a meeting take half the avoiding on themselves.
      const shared = !still(o.want) && a.stuck < 0.2;
      const rx = shared ? 2 * cx - a.velocity[0] - o.velocity[0] : cx - o.velocity[0];
      const rz = shared ? 2 * cz - a.velocity[1] - o.velocity[1] : cz - o.velocity[1];
      const px = o.position[0] - a.position[0],
        pz = (o.position[1] - a.position[1]) * depthScale;
      // Already nearer than the margin (a tight spot): only actually touching counts,
      // or two people slipping past each other could never finish doing so.
      const room = px * px + pz * pz < reach * reach ? personClearance + 0.005 : reach;
      const t = timeToTouch(px, pz, rx, rz * depthScale, room);
      if (t < soonest) soonest = t;
    }
    return soonest;
  };
  // Nobody in the way: just go, and forget any dodge. Weighing up alternatives with no
  // reason to could leave someone circling the spot they are trying to reach.
  if (free(probe) && soonestTouch(wx, wz) >= horizon) {
    a.velocity[0] = wx;
    a.velocity[1] = wz;
    return;
  }
  let bestCost = Infinity,
    bx = 0,
    bz = 0;
  const consider = (cx: number, cz: number, base: number) => {
    // The longer someone has been held up, the further from their way they will go.
    let cost =
      base +
      (Math.hypot(cx - wx, cz - wz) * (1 - Math.min(a.stuck, 1) * 0.85) +
        0.3 * Math.hypot(cx - a.velocity[0], cz - a.velocity[1])) /
        a.speed;
    if (cost >= bestCost) return;
    const soonest = soonestTouch(cx, cz);
    if (soonest === 0) cost += 100;
    else if (soonest < horizon) cost += 1.2 / soonest;
    if (cost >= bestCost) return;
    if (cx !== 0 || cz !== 0) {
      const look = ahead(Math.hypot(cx, cz));
      probe[0] = a.position[0] + cx * look;
      probe[1] = a.position[1] + cz * look;
      if (startsFree && !free(probe)) return;
    }
    bestCost = cost;
    bx = cx;
    bz = cz;
  };
  for (let t = 0; t < turns.length; t++) {
    const cx = wx * turnCos[t] - wz * turnSin[t],
      cz = wx * turnSin[t] + wz * turnCos[t];
    for (const pace of paces) consider(cx * pace, cz * pace, turns[t] < 0 ? 0.04 : 0);
  }
  consider(0, 0, 0.15 + a.stuck);
  a.velocity[0] = bx;
  a.velocity[1] = bz;
}
/** Take the step, stopping short of anyone it would bring within reach. */
function move(a: Agent, agents: Agent[], dt: number) {
  const dx = a.velocity[0] * dt,
    dz = a.velocity[1] * dt;
  if (dx === 0 && dz === 0) {
    a.stuck = still(a.want) ? 0 : a.stuck + dt;
    return;
  }
  let share = 1;
  if (a.squeezing <= 0 && !a.gone)
    for (const o of agents) {
      if (o === a || !solid(o)) continue;
      const px = o.position[0] - a.position[0],
        pz = (o.position[1] - a.position[1]) * depthScale;
      const b = dx * px + dz * depthScale * pz;
      // Moving away from someone already too close is always allowed.
      if (b <= 0) continue;
      const c = px * px + pz * pz - personClearance * personClearance;
      if (c <= 0) {
        share = 0;
        break;
      }
      const m = dx * dx + dz * depthScale * (dz * depthScale);
      const disc = b * b - m * c;
      if (disc >= 0) share = Math.min(share, Math.max(0, (b - Math.sqrt(disc)) / m));
    }
  a.position[0] += dx * share;
  a.position[1] += dz * share;
  // Getting nowhere counts however busy it looks: stepping to and fro makes no progress.
  const wanted = Math.hypot(a.want[0], a.want[1]);
  if (((dx * a.want[0] + dz * a.want[1]) * share) / wanted < wanted * dt * 0.3) a.stuck += dt;
  else a.stuck = Math.max(0, a.stuck - dt * 2);
}
/**
 * One frame for the whole crowd. Nothing here depends on the size of a frame, and nobody
 * plans a route unless their destination has changed or a dodge has left them cut off.
 */
export function stepCrowd(agents: Agent[], dt: number) {
  if (dt <= 0) return;
  for (const a of agents) {
    followRoute(a, dt);
    wantedVelocity(a, agents, dt);
  }
  for (const a of agents) makeWay(a, agents);
  for (const a of agents) backOut(a, agents, dt);
  for (const a of agents) {
    if (a.stuck > stuckLimit) {
      // Never left frozen for good: squeeze past as a very last resort.
      a.squeezing = 1;
      a.stuck = 0;
    }
    a.squeezing -= dt;
    steer(a, agents, dt);
    move(a, agents, dt);
  }
}
/** Move along a path, returning the new position and what is left of the path. */
export function stepAlong(
  from: FloorPoint,
  path: FloorPoint[],
  step: number,
): { position: FloorPoint; path: FloorPoint[] } {
  let position: FloorPoint = [...from];
  const rest = [...path];
  while (rest.length) {
    const length = distance(position, rest[0]);
    if (length > step) {
      const t = step / length;
      position = [
        position[0] + (rest[0][0] - position[0]) * t,
        position[1] + (rest[0][1] - position[1]) * t,
      ];
      return { position, path: rest };
    }
    step -= length;
    position = [...rest.shift()!];
  }
  return { position, path: rest };
}

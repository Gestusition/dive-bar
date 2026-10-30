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
}
const waitingSpot: [number, number, number] = [-4.4, 0, 6.3];
// The second guest of a pair waits beside the first.
const partnerSpot: [number, number, number] = [-3.6, 0, 6.55];
export const guestSpeed = 3.4;
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
function crosses(a: FloorPoint, b: FloorPoint, [x, z, w, d]: Rect) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  let t0 = 0,
    t1 = 1;
  for (const [p, q] of [
    [-dx, a[0] - (x - w / 2)],
    [dx, x + w / 2 - a[0]],
    [-dz, a[1] - (z - d / 2)],
    [dz, z + d / 2 - a[1]],
  ]) {
    if (Math.abs(p) < 1e-12) {
      if (q <= 1e-9) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 >= t1 - 1e-9) return false;
    }
  }
  return true;
}
const clear = (a: FloorPoint, b: FloorPoint) => !padded.some((r) => crosses(a, b, r));
let graph: { doorX: number; nodes: FloorPoint[] } | null = null;
// Corners of every padded obstacle plus the fixed stops, rebuilt when the door moves.
function graphNodes() {
  if (graph?.doorX === doorX) return graph.nodes;
  padded = [...fixedPadded, pad([doorX + 0.5, 7.02, 1, 0.09])];
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
  graph = { doorX, nodes };
  return nodes;
}
const distance = (a: FloorPoint, b: FloorPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function nearestApproach(p: FloorPoint) {
  return seatApproach.reduce((best, a) => (distance(p, a) < distance(p, best) ? a : best));
}
/** The shortest furniture-free walk from one floor point to another. */
export const personClearance = 0.9;
export function guestPath(
  from: FloorPoint,
  to: FloorPoint,
  people: FloorPoint[] = [],
  stepAway = true,
): FloorPoint[] {
  if (distance(from, to) < 1e-6) return [];
  // Already part-way into the chair being sat on: carry on rather than step back out,
  // or a route refreshed on the way in would keep a guest from ever sitting down.
  if (blocked(from) && blocked(to) && nearestApproach(from) === nearestApproach(to)) return [to];
  // Between the spot in front of a chair and the chair itself, keep going in: a
  // refreshed route would otherwise walk back out to that spot first.
  if (blocked(to)) {
    const approach = nearestApproach(to);
    if (
      distance(approach, from) + distance(from, to) < distance(approach, to) + 1e-6 &&
      !people.some((p) => distance(to, p) < personClearance - 1e-6)
    )
      return [to];
  }
  // Just clear of someone but inside the square kept free around them, every route
  // would start by crossing that square and none would be found, leaving both people
  // waiting for each other. Step straight away from them first: moving away never
  // brings anyone closer.
  const near =
    stepAway &&
    people.find(
      (p) =>
        distance(from, p) >= personClearance - 1e-6 &&
        inside(from, [p[0], p[1], personClearance * 2, personClearance * 2]),
    );
  if (near) {
    const d = distance(from, near);
    const out: FloorPoint = [
      near[0] + ((from[0] - near[0]) / d) * (personClearance * Math.SQRT2 + 0.1),
      near[1] + ((from[1] - near[1]) / d) * (personClearance * Math.SQRT2 + 0.1),
    ];
    if (!blocked(out) && clear(from, out)) return [out, ...guestPath(out, to, people, false)];
  }
  // A destination is taken only when it is within someone's clearance. One that is
  // merely inside the square kept free around them is still reached, or the host and
  // a guest standing near each other's spots would wait for each other for good.
  const arrival = blocked(to) ? nearestApproach(to) : to;
  if (
    people.some(
      (p) =>
        distance(from, p) >= personClearance - 1e-6 && distance(to, p) < personClearance - 1e-6,
    )
  )
    return [];
  const extra: Rect[] = people
    .filter((p) => distance(from, p) >= personClearance - 1e-6)
    .map(([x, z]): Rect => [x, z, personClearance * 2, personClearance * 2])
    .filter((r) => !inside(to, r) && !inside(arrival, r));
  const isClear = (a: FloorPoint, b: FloorPoint) =>
    clear(a, b) && !extra.some((r) => crosses(a, b, r));
  const network = [
    ...graphNodes(),
    ...extra.flatMap(([x, z, w, d]): FloorPoint[] => [
      [x - w / 2 - 0.06, z - d / 2 - 0.06],
      [x + w / 2 + 0.06, z - d / 2 - 0.06],
      [x - w / 2 - 0.06, z + d / 2 + 0.06],
      [x + w / 2 + 0.06, z + d / 2 + 0.06],
    ]),
  ].filter(
    (p) =>
      !blocked(p) &&
      !extra.some((r) => inside(p, r)) &&
      p[0] >= doorX + 0.3 &&
      p[0] <= -doorX - 0.3 &&
      p[1] >= -4.2 &&
      p[1] <= 7.3,
  );
  // A seat sits inside its own chair, so step out to (or in from) the spot in front of it.
  const start = blocked(from) ? nearestApproach(from) : from;
  const end = blocked(to) ? nearestApproach(to) : to;
  const before: FloorPoint[] = start === from ? [] : [start];
  const after: FloorPoint[] = end === to ? [] : [to];
  if (distance(start, end) < 1e-6 || isClear(start, end))
    return [...before, ...(distance(start, end) < 1e-6 ? [] : [end]), ...after];
  const nodes = [start, end, ...network];
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
      if (done[j] || !isClear(nodes[i], nodes[j])) continue;
      const cost = best[i] + distance(nodes[i], nodes[j]);
      if (cost < best[j]) {
        best[j] = cost;
        previous[j] = i;
      }
    }
  }
  // No clear route (should not happen in this room): walk straight rather than freeze.
  if (best[1] === Infinity) return people.length ? [] : [...before, end, ...after];
  const route: FloorPoint[] = [];
  for (let i = 1; i > 0; i = previous[i]) route.unshift(nodes[i]);
  return [...before, ...route, ...after];
}

/** Replan around live characters and never step through a moving person's body. */
export function walkAvoidingPeople(
  from: FloorPoint,
  to: FloorPoint,
  step: number,
  people: FloorPoint[],
  planned?: FloorPoint[],
): { position: FloorPoint; path: FloorPoint[]; blocked?: boolean } {
  const next = stepAlong(from, planned ?? guestPath(from, to, people), step);
  for (const p of people) {
    const dx = next.position[0] - from[0],
      dz = next.position[1] - from[1];
    const length = dx * dx + dz * dz;
    const t = length
      ? Math.max(0, Math.min(1, ((p[0] - from[0]) * dx + (p[1] - from[1]) * dz) / length))
      : 0;
    const nearest = Math.hypot(from[0] + t * dx - p[0], from[1] + t * dz - p[1]);
    const start = distance(from, p);
    if (
      (start >= personClearance && nearest < personClearance - 1e-6) ||
      (start < personClearance && distance(next.position, p) <= start)
    )
      return { position: [...from], path: [], blocked: true };
  }
  return next;
}
/** A character walking the floor, with the route it is following. */
export interface Walker {
  position: FloorPoint;
  path: FloorPoint[];
  /** The destination the path was planned for. */
  to: FloorPoint | null;
  /** Seconds until the route may be planned again. */
  replanIn: number;
}
export const newWalker = (position: FloorPoint): Walker => ({
  position: [...position],
  path: [],
  to: null,
  replanIn: 0,
});
/** How often a route is refreshed around moving people, and after being blocked. */
export const replanInterval = 0.25;
/** How soon someone who is blocked looks for a way round. */
export const blockedReplan = 0.1;
/**
 * One frame of walking. Planning a route is expensive on phones, so it happens when
 * the destination changes and, while other people are about, at most every
 * `replanInterval` seconds — never on every frame, even when two characters keep
 * getting in each other's way.
 */
export function walkFrame(
  w: Walker,
  to: FloorPoint,
  step: number,
  dt: number,
  people: FloorPoint[] = [],
  plan = guestPath,
): Walker {
  w.replanIn -= dt;
  const moved = !w.to || distance(w.to, to) > 1e-6;
  if (moved || (people.length && w.replanIn <= 0 && distance(w.position, to) > 1e-6)) {
    w.path = plan(w.position, to, people);
    w.to = [...to];
    w.replanIn = replanInterval;
  }
  const next = people.length
    ? walkAvoidingPeople(w.position, to, step, people, w.path)
    : stepAlong(w.position, w.path, step);
  w.position = next.position;
  w.path = next.path;
  // Someone in the way: look for a way round soon, but not on the very next frame.
  if ('blocked' in next && next.blocked) w.replanIn = Math.min(w.replanIn, blockedReplan);
  return w;
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

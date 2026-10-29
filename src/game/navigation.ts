import type { Guest } from './engine';

export type FloorPoint = [number, number];
export const bartenderHome: FloorPoint = [0, -3.05];
export const walkingSpeed = 5;
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
export const guestSpeed = 3.4;
export const guestPosition = (g: Pick<Guest, 'status' | 'seat'>): [number, number, number] =>
  g.status === 'waiting'
    ? waitingSpot
    : g.status === 'leaving'
      ? entrance
      : (seats[g.seat] ?? waitingSpot);
export function servicePosition(g: Guest): FloorPoint {
  return [guestPosition(g)[0], g.status === 'waiting' ? 5.4 : frontAisle];
}
// The counter ends at x=4; 0.6 clearance accommodates the bartender's arms.
// Keep the front crossing between the stools and the table chairs. Only the
// right-hand opening is walkable: the jukebox blocks the left-hand opening.
export function walkingRoute(from: FloorPoint, to: FloorPoint): FloorPoint[] {
  if (Math.hypot(from[0] - to[0], from[1] - to[1]) < 0.00001) return [];
  if (
    (from[0] >= 4.45 && to[0] >= 4.45) ||
    (Math.abs(from[0] - to[0]) < 0.00001 && from[1] >= frontAisle && to[1] >= frontAisle)
  )
    return [to];
  const points: FloorPoint[] = [];
  if (to[1] <= backEdge) {
    if (from[1] > backEdge) {
      if (from[0] < 4.45) points.push([from[0], frontAisle], [sideAisle, frontAisle]);
      else points.push([sideAisle, from[1]]);
      points.push([sideAisle, bartenderHome[1]]);
    }
  } else {
    if (from[1] <= backEdge) points.push([sideAisle, from[1]], [sideAisle, frontAisle]);
    else if (from[0] >= 4.45 && from[1] < frontAisle - 0.00001)
      points.push([sideAisle, frontAisle]);
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
  [-4.8, -1.3, 0.8, 0.75],
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
  tableZ.has(x) ? [x, tableZ.get(x)! + 1.95] : [x, z + 0.8],
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
export function guestPath(from: FloorPoint, to: FloorPoint): FloorPoint[] {
  if (distance(from, to) < 1e-6) return [];
  const network = graphNodes();
  // A seat sits inside its own chair, so step out to (or in from) the spot in front of it.
  const start = blocked(from) ? nearestApproach(from) : from;
  const end = blocked(to) ? nearestApproach(to) : to;
  const before: FloorPoint[] = start === from ? [] : [start];
  const after: FloorPoint[] = end === to ? [] : [to];
  if (distance(start, end) < 1e-6 || clear(start, end))
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
      if (done[j] || !clear(nodes[i], nodes[j])) continue;
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

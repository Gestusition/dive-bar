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
export const guestPosition = (g: Pick<Guest, 'status' | 'seat'>): [number, number, number] =>
  g.status === 'waiting' ? [-4.6, 0, 4.1] : (seats[g.seat] ?? [-4.6, 0, 4.1]);
export function servicePosition(g: Guest): FloorPoint {
  return [guestPosition(g)[0], g.status === 'waiting' ? 3.3 : frontAisle];
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
export function advanceWalk(from: FloorPoint, to: FloorPoint, distance: number): FloorPoint {
  let position: FloorPoint = [...from];
  for (const point of walkingRoute(from, to)) {
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

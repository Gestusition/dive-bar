import { describe, expect, it } from 'vitest';
import { cornerPlantParts } from './room-layout';
import {
  advanceWalk,
  bartenderHome,
  entrance,
  guestObstacles,
  guestPath,
  guestRadius,
  guestSpeed,
  seatApproach,
  seats,
  stepAlong,
  walkingRoute,
  walkingSpeed,
  walkAvoidingPeople,
  personClearance,
  type FloorPoint,
} from './navigation';
import { hostHome } from './host';

const targets: FloorPoint[] = [
  [-4.4, 5.4],
  [-2.7, 0.5],
  [2.25, 0.5],
  [-1.2, 0.5],
  [1.2, 0.5],
];
function clearCounter(p: FloorPoint) {
  // Counter top is 8 x 1.35 at z=-1.8. Include the character's 0.42 arm radius.
  if (!(Math.abs(p[0]) >= 4.42 || p[1] <= -2.895 || p[1] >= -0.705))
    throw new Error(`Bartender intersects the counter at ${p}`);
  // A conservative rotating-body radius covers arms, head and feet. Test
  // every actual plant voxel drawn by the scene, rather than only its pot.
  for (const [x, , z, w, , d] of cornerPlantParts) {
    const dx = Math.max(Math.abs(p[0] - x) - w / 2, 0);
    const dz = Math.max(Math.abs(p[1] - z) - d / 2, 0);
    if (Math.hypot(dx, dz) <= 0.52)
      throw new Error(`Bartender intersects plant voxel ${x},${z} at ${p}`);
  }
}
function walk(from: FloorPoint, to: FloorPoint) {
  let p = from;
  for (let i = 0; i < 3000; i++) {
    const next = advanceWalk(p, to, walkingSpeed / 60);
    clearCounter(next);
    if (Math.hypot(next[0] - p[0], next[1] - p[1]) > walkingSpeed / 60 + 1e-8)
      throw new Error(`Bartender exceeds walking speed from ${p} to ${next}`);
    p = next;
    if (Math.hypot(p[0] - to[0], p[1] - to[1]) < 1e-6) return p;
  }
  throw new Error('Route never arrives');
}
describe('bartender walkway', () => {
  it('keeps the relocated pot and every leaf inside the room', () => {
    for (const [x, , z, w, , d] of cornerPlantParts) {
      expect(x + w / 2).toBeLessThan(5.9);
      expect(z - d / 2).toBeGreaterThan(-4.425);
    }
  });
  it('uses an open counter end on every service trip and return', () => {
    for (const target of targets) {
      const route = walkingRoute(bartenderHome, target);
      expect(route.some(([x, z]) => Math.abs(x) === 4.6 && z === 0.5)).toBe(true);
      expect(walk(bartenderHome, target)).toEqual(target);
      expect(walk(target, bartenderHome)).toEqual(bartenderHome);
    }
  });
  it('handles a changed order in either aisle without cutting across the bar', () => {
    for (const target of targets) {
      let p: FloorPoint = [...bartenderHome];
      for (let i = 0; i < 140; i++) {
        p = advanceWalk(p, target, walkingSpeed / 60);
        clearCounter(p);
        if (i % 10 === 0) {
          walk(p, bartenderHome);
          for (const other of targets) walk(p, other);
        }
      }
    }
  });
  it('uses complete route length rather than distance straight through the counter', () => {
    const target = targets[1];
    const directDistance = Math.hypot(target[0] - bartenderHome[0], target[1] - bartenderHome[1]);
    expect(advanceWalk(bartenderHome, target, directDistance)).not.toEqual(target);
    expect(advanceWalk(bartenderHome, target, 100)).toEqual(target);
  });
  it('stays still at arrival, including the door and the home position', () => {
    for (const p of [...targets, bartenderHome]) expect(advanceWalk(p, p, 5)).toEqual(p);
  });
});

function walkGuest(from: FloorPoint, to: FloorPoint) {
  // A seat lies inside its own chair, right up against its table. Only that
  // table's furniture may be close, and only on the short step between the
  // seat and the spot in front of it.
  const own = guestObstacles.filter(([x, z, w, d]) =>
    [from, to].some(
      (p) => Math.abs(p[0] - x) < w / 2 + guestRadius && Math.abs(p[1] - z) < d / 2 + guestRadius,
    ),
  );
  const ownApproach = seatApproach.filter((a) =>
    [from, to].some((p) => Math.abs(p[0] - a[0]) < 1e-9 && Math.abs(p[1] - a[1]) < 1.5),
  );
  let p = from;
  let path = guestPath(from, to);
  for (let i = 0; i < 5000; i++) {
    ({ position: p, path } = stepAlong(p, path, guestSpeed / 60));
    const nearSeat = ownApproach.some(
      (a) => Math.abs(p[0] - a[0]) < 1e-9 && Math.abs(p[1] - a[1]) < 2.1,
    );
    for (const r of guestObstacles) {
      if (nearSeat && own.includes(r)) continue;
      const [x, z, w, d] = r;
      const dx = Math.max(Math.abs(p[0] - x) - w / 2, 0);
      const dz = Math.max(Math.abs(p[1] - z) - d / 2, 0);
      if (Math.hypot(dx, dz) < guestRadius - 1e-6)
        throw new Error(`Guest intersects furniture ${r} at ${p}`);
    }
    if (Math.hypot(p[0] - to[0], p[1] - to[1]) < 1e-6) return i / 60;
  }
  throw new Error('Guest never arrives');
}
describe('guest walkway', () => {
  it('routes departing guests from every seat around the host without crossing their body', () => {
    const target: FloorPoint = [entrance[0], entrance[2]];
    for (const [x, , z] of seats) {
      let position: FloorPoint = [x, z];
      let arrived = false;
      for (let tick = 0; tick < 1000; tick++) {
        position = walkAvoidingPeople(position, target, guestSpeed / 60, [hostHome]).position;
        expect(
          Math.hypot(position[0] - hostHome[0], position[1] - hostHome[1]),
        ).toBeGreaterThanOrEqual(personClearance - 1e-6);
        if (Math.hypot(position[0] - target[0], position[1] - target[1]) < 1e-6) {
          expect(tick / 60).toBeLessThan(6);
          arrived = true;
          break;
        }
      }
      expect(arrived, `Seat ${x},${z} must still reach the exit`).toBe(true);
    }
  });
  it('waits for an occupied destination to clear instead of crossing a person', () => {
    const from: FloorPoint = [-4, 6.3];
    const to: FloorPoint = [-5.5, 6.3];
    expect(walkAvoidingPeople(from, to, 1, [to]).position).toEqual(from);
    expect(walkAvoidingPeople(from, to, 1, []).position).not.toEqual(from);
  });
  it('keeps a moving host and departing guest apart while both cross the entrance area', () => {
    let host: FloorPoint = [...hostHome];
    let guest: FloorPoint = [-4.4, 6.3];
    const door: FloorPoint = [entrance[0], entrance[2]];
    const hostTarget: FloorPoint = [entrance[0] + 1.2, entrance[2]];
    for (let tick = 0; tick < 600; tick++) {
      host = walkAvoidingPeople(host, hostTarget, guestSpeed / 60, [guest]).position;
      guest = walkAvoidingPeople(guest, door, guestSpeed / 60, [host]).position;
      expect(Math.hypot(host[0] - guest[0], host[1] - guest[1])).toBeGreaterThanOrEqual(
        personClearance - 1e-6,
      );
    }
    expect(host).toEqual(hostTarget);
    expect(guest).toEqual(door);
  });
  const door: FloorPoint = [entrance[0], entrance[2]];
  const chairs = seats.map(([x, , z]): FloorPoint => [x, z]);
  const waiting: FloorPoint = [-4.4, 6.3];
  it('walks in from the door and out again without crossing any table or chair', () => {
    for (const seat of chairs) {
      walkGuest(door, waiting);
      walkGuest(waiting, seat);
      walkGuest(seat, door);
    }
  });
  it('reaches the door from the farthest seat before a leaving guest is removed', () => {
    const longest = Math.max(...chairs.map((seat) => walkGuest(seat, door)));
    expect(longest).toBeLessThan(6);
  });
  it('replans cleanly when a walking guest is sent somewhere else', () => {
    for (const seat of chairs) {
      let p = waiting;
      let path = guestPath(p, seat);
      for (let i = 0; i < 60; i++) ({ position: p, path } = stepAlong(p, path, guestSpeed / 60));
      walkGuest(p, door);
    }
  });
});

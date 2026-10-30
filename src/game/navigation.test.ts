import { describe, expect, it } from 'vitest';
import { binPosition, binRadius, binStandSpot, cornerPlantParts } from './room-layout';
import {
  advanceWalk,
  bartenderHome,
  entrance,
  guestObstacles,
  guestPath,
  guestPosition,
  guestRadius,
  guestSpeed,
  seatApproach,
  seats,
  stepAlong,
  walkingRoute,
  walkingSpeed,
  walkAvoidingPeople,
  walkFrame,
  newWalker,
  personClearance,
  replanInterval,
  blockedReplan,
  type FloorPoint,
} from './navigation';
import { hostDestination, hostHome, type HostVisit } from './host';
import type { Guest } from './engine';

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
  clearBin(p, 0.52);
}
function clearBin(p: FloorPoint, radius: number) {
  if (Math.hypot(p[0] - binPosition[0], p[1] - binPosition[1]) < binRadius + radius - 1e-6)
    throw new Error(`Character intersects the bin at ${p}`);
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
  it('keeps the bin out of the counter-end walkway and lets staff empty it from outside', () => {
    clearBin(binStandSpot, 0.32);
    for (const [x, , z, w, , d] of cornerPlantParts) {
      const dx = Math.max(Math.abs(binPosition[0] - x) - w / 2, 0);
      const dz = Math.max(Math.abs(binPosition[1] - z) - d / 2, 0);
      expect(Math.hypot(dx, dz)).toBeGreaterThan(binRadius);
    }
    for (const start of [bartenderHome, hostHome, ...targets]) {
      // Cleanup walks use the furniture-aware path for both the host and the bartender.
      let p: FloorPoint = [...start];
      let path = guestPath(p, binStandSpot);
      for (let i = 0; i < 5000 && Math.hypot(p[0] - binStandSpot[0], p[1] - binStandSpot[1]); i++) {
        ({ position: p, path } = stepAlong(p, path, guestSpeed / 60));
        clearBin(p, 0.32);
      }
      expect(p).toEqual(binStandSpot);
      // Afterwards the bartender returns behind the counter and to service.
      walk(binStandSpot, bartenderHome);
      for (const target of targets) walk(binStandSpot, target);
    }
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

describe('route planning budget', () => {
  // Planning is the expensive part of walking on a phone. With the host about, it
  // used to run for every guest on almost every frame, so service stuttered from
  // the night the host was hired until the guests went home.
  const counting = () => {
    const plan = (from: FloorPoint, to: FloorPoint, people?: FloorPoint[]) => {
      plan.calls++;
      return guestPath(from, to, people);
    };
    plan.calls = 0;
    return plan;
  };
  it('walks in to a seat around a moving host without planning on every frame', () => {
    const plan = counting();
    const door: FloorPoint = [entrance[0], entrance[2]];
    const seat = seatApproach[1];
    const guest = newWalker(door);
    let frames = 0;
    for (; frames < 60 * 20; frames++) {
      // The host paces across the room the whole time.
      const t = frames / 60;
      const host: FloorPoint = [-5 + 4 * Math.sin(t), 4.6];
      walkFrame(guest, seat, guestSpeed / 60, 1 / 60, [host], plan);
      if (Math.hypot(guest.position[0] - seat[0], guest.position[1] - seat[1]) < 1e-6) break;
    }
    expect(frames, 'the guest still reaches the seat').toBeLessThan(60 * 20);
    expect(plan.calls).toBeLessThanOrEqual(Math.ceil(frames / 60 / replanInterval) + 1);
  });
  it('keeps planning rare while two people stand in each other’s way', () => {
    const plan = counting();
    const guest = newWalker([-4.4, 6.3]);
    const host: FloorPoint = [-5.1, 6.3];
    const door: FloorPoint = [entrance[0], entrance[2]];
    for (let frame = 0; frame < 120; frame++)
      walkFrame(guest, door, guestSpeed / 60, 1 / 60, [host], plan);
    // Every frame would be 120 plans; a blocked walker looks again ten times a second.
    expect(plan.calls).toBeLessThanOrEqual(Math.ceil(2 / blockedReplan) + 1);
    expect(Math.hypot(guest.position[0] - host[0], guest.position[1] - host[1])).toBeGreaterThan(0);
  });
  it('keeps throttled walkers apart on every frame and still gets both where they are going', () => {
    // The scene's real pairing: the host escorts a party in while a guest walks out.
    const door: FloorPoint = [entrance[0], entrance[2]];
    for (const seat of seatApproach) {
      const host = newWalker(hostHome);
      const guest = newWalker(seat);
      const hostTarget: FloorPoint = [seat[0], seat[1]];
      for (let frame = 0; frame < 60 * 20; frame++) {
        walkFrame(host, hostTarget, guestSpeed / 60, 1 / 60, [guest.position]);
        walkFrame(guest, door, guestSpeed / 60, 1 / 60, [host.position]);
        expect(
          Math.hypot(host.position[0] - guest.position[0], host.position[1] - guest.position[1]),
          `seat ${seat} frame ${frame}`,
        ).toBeGreaterThanOrEqual(personClearance - 1e-6);
      }
      expect(guest.position, `guest from ${seat} reaches the door`).toEqual(door);
      expect(host.position, `host reaches ${seat}`).toEqual(hostTarget);
    }
  });
  it('sits every escorted guest in their own seat while the others are taken', () => {
    // As in the scene: the host greets at the door and escorts the party in, routing
    // round everyone seated; the guest routes round the host. Both refresh routes on
    // the way, which once sent a guest stepping back out of the chair they sat in.
    for (let seat = 0; seat < seats.length; seat++) {
      const guest = { id: 1, status: 'waiting', seat: -1, lead: true } as Guest;
      const seated = seats.filter((_, i) => i !== seat).map(([x, , z]): FloorPoint => [x, z]);
      const host = newWalker(hostHome);
      const walker = newWalker([entrance[0], entrance[2]]);
      let visit: HostVisit | null = null;
      let hostTarget: FloorPoint = hostHome;
      let sat = false;
      for (let frame = 0; frame < 60 * 10 && !sat; frame++) {
        if (frame === 120) Object.assign(guest, { status: 'reading', seat });
        // The store moves the host's goal on its 250 ms clock.
        if (frame % 15 === 0)
          ({ visit, target: hostTarget } = hostDestination([guest], visit, host.position));
        const [x, , z] = guestPosition(guest);
        walkFrame(host, hostTarget, guestSpeed / 60, 1 / 60, [walker.position, ...seated]);
        walkFrame(walker, [x, z], guestSpeed / 60, 1 / 60, [host.position]);
        expect(
          Math.hypot(host.position[0] - walker.position[0], host.position[1] - walker.position[1]),
        ).toBeGreaterThanOrEqual(personClearance - 1e-6);
        sat =
          guest.status === 'reading' &&
          Math.hypot(walker.position[0] - x, walker.position[1] - z) < 1e-6;
      }
      expect(sat, `seat ${seat} is reached`).toBe(true);
    }
  });
  it('walks a new guest in from the door without stepping round the greeting host', () => {
    const guest = { id: 1, status: 'waiting', seat: -1, lead: true } as Guest;
    const { target } = hostDestination([guest], null, hostHome);
    const [x, , z] = guestPosition(guest);
    // The host sets off from home to greet them as they come in.
    const host = newWalker(hostHome);
    const walker = newWalker([entrance[0], entrance[2]]);
    for (let frame = 0; frame < 60 * 5; frame++) {
      const before = walker.position;
      walkFrame(host, target, guestSpeed / 60, 1 / 60, [walker.position]);
      walkFrame(walker, [x, z], guestSpeed / 60, 1 / 60, [host.position]);
      // Every step heads on towards the waiting spot; none backs off from the host.
      const toSpot = Math.hypot(x - walker.position[0], z - walker.position[1]);
      expect(toSpot, `frame ${frame}`).toBeLessThanOrEqual(
        Math.hypot(x - before[0], z - before[1]) + 1e-9,
      );
    }
    expect(walker.position).toEqual([x, z]);
  });
  it('keeps a guest walking into their chair when the route is refreshed on the way in', () => {
    for (let seat = 0; seat < seats.length; seat++) {
      const chair: FloorPoint = [seats[seat][0], seats[seat][2]];
      const approach = seatApproach[seat];
      for (const t of [0.1, 0.5, 0.9]) {
        const from: FloorPoint = [
          approach[0] + (chair[0] - approach[0]) * t,
          approach[1] + (chair[1] - approach[1]) * t,
        ];
        expect(guestPath(from, chair), `seat ${seat} at ${t}`).toEqual([chair]);
      }
    }
  });
  it('plans a route round several people well within a frame', () => {
    // Each plan once took around 8 ms with people about, so every walker refreshing
    // its route four times a second made the scene stutter even on fast graphics.
    const door: FloorPoint = [entrance[0], entrance[2]];
    const people: FloorPoint[] = [
      [-2, 5],
      ...seats.slice(0, 4).map(([x, , z]): FloorPoint => [x, z]),
    ];
    const from: FloorPoint = [seats[7][0], seats[7][2]];
    guestPath(from, door, people);
    const times: number[] = [];
    for (let batch = 0; batch < 5; batch++) {
      const start = performance.now();
      for (let i = 0; i < 20; i++) guestPath(from, door, people);
      times.push((performance.now() - start) / 20);
    }
    times.sort((a, b) => a - b);
    expect(times[2], 'median milliseconds per plan').toBeLessThan(2.5);
  });
  it('does not plan at all for someone already where they want to be', () => {
    const plan = counting();
    const seat = seatApproach[0];
    const guest = newWalker(seat);
    guest.to = [...seat];
    for (let frame = 0; frame < 600; frame++)
      walkFrame(guest, seat, guestSpeed / 60, 1 / 60, [[-5 + frame / 100, 4.6]], plan);
    expect(plan.calls).toBe(0);
  });
});

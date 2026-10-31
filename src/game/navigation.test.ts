import { describe, expect, it } from 'vitest';
import { binPosition, binRadius, binStandSpot, cornerPlantParts } from './room-layout';
import {
  advanceWalk,
  bartenderHome,
  counterSeats,
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
  newAgent,
  outsideDoor,
  pastDoor,
  personClearance,
  personGap,
  seatedClearance,
  seatFacing,
  stepCrowd,
  type Agent,
  type FloorPoint,
} from './navigation';
import { escortOffset, hostHome } from './host';

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
  const entries = seatApproach
    .map((a, i): [FloorPoint, FloorPoint] => [a, [seats[i][0], seats[i][2]]])
    .filter(([a, seat]) =>
      [from, to].some(
        (p) =>
          Math.abs(
            Math.hypot(p[0] - a[0], p[1] - a[1]) +
              Math.hypot(p[0] - seat[0], p[1] - seat[1]) -
              Math.hypot(a[0] - seat[0], a[1] - seat[1]),
          ) < 1e-6,
      ),
    );
  let p = from;
  let path = guestPath(from, to);
  for (let i = 0; i < 5000; i++) {
    ({ position: p, path } = stepAlong(p, path, guestSpeed / 60));
    // On the straight line between the spot in front of a chair and the chair itself.
    const nearSeat = entries.some(
      ([a, seat]) =>
        Math.abs(
          Math.hypot(p[0] - a[0], p[1] - a[1]) +
            Math.hypot(p[0] - seat[0], p[1] - seat[1]) -
            Math.hypot(a[0] - seat[0], a[1] - seat[1]),
        ) < 1e-6,
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
});

describe('the crowd', () => {
  const door: FloorPoint = [entrance[0], entrance[2]];
  const chairs = seats.map(([x, , z]): FloorPoint => [x, z]);
  const apart = (agents: Agent[], label: string) => {
    for (let i = 0; i < agents.length; i++)
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i],
          b = agents[j];
        if (a.gone || b.gone) continue;
        // Someone seated is inside their chair's furniture.
        const seated = inChair(a) || inChair(b);
        expect(
          personGap(a.position, b.position),
          `${label}: people ${i} and ${j} at ${a.position} and ${b.position}`,
        ).toBeGreaterThanOrEqual((seated ? seatedClearance : personClearance) - 1e-6);
      }
  };
  // Sitting in a chair, or only just rising from it, with the chair's furniture round them.
  const inChair = (a: Agent) =>
    chairs.some((c) => Math.hypot(a.position[0] - c[0], a.position[1] - c[1]) < 0.3);
  const at = (a: Agent, p: FloorPoint) =>
    Math.hypot(a.position[0] - p[0], a.position[1] - p[1]) < 1e-6;
  const run = (agents: Agent[], seconds: number, label: string, dt = 1 / 60) => {
    for (let t = 0; t < seconds; t += dt) {
      stepCrowd(agents, dt);
      apart(agents, `${label} at ${t.toFixed(2)}s`);
    }
  };
  const bartender = (position: FloorPoint = bartenderHome) =>
    newAgent(position, walkingSpeed, { firstThrough: true });

  it('walks two guests round each other instead of through each other', () => {
    const a = newAgent([-1, 5], guestSpeed, { goal: [3, 5] });
    const b = newAgent([3, 5], guestSpeed, { goal: [-1, 5] });
    run([a, b], 4, 'head on');
    expect(at(a, [3, 5])).toBe(true);
    expect(at(b, [-1, 5])).toBe(true);
  });
  it('passes two people between tables, where there is only just room for both', () => {
    const a = newAgent([-4.4, 4.2], guestSpeed, { goal: [-4.4, 0.4] });
    const b = newAgent([-4.4, 0.4], guestSpeed, { goal: [-4.4, 4.2] });
    run([a, b], 6, 'between tables');
    expect(at(a, [-4.4, 0.4])).toBe(true);
    expect(at(b, [-4.4, 4.2])).toBe(true);
  });
  it('keeps the bartender and the host apart behind the counter, both ways', () => {
    for (const [from, to] of [
      [-3, 3],
      [3, -3],
    ]) {
      const host = newAgent([from, -3.05], guestSpeed, { goal: [to, -3.05] });
      const barkeep = bartender([to, -3.05]);
      barkeep.goal = [from, -3.05];
      run([host, barkeep], 5, 'behind the bar');
      expect(at(host, [to, -3.05])).toBe(true);
      expect(at(barkeep, [from, -3.05])).toBe(true);
    }
  });
  it('walks the host to the sink past a bartender busy at the counter', () => {
    const barkeep = bartender();
    barkeep.anchored = true;
    const host = newAgent([3, -3.05], guestSpeed, { goal: [-2.6, -3.05] });
    run([host, barkeep], 5, 'to the sink');
    expect(at(host, [-2.6, -3.05])).toBe(true);
    expect(at(barkeep, bartenderHome)).toBe(true);
  });
  it('keeps the bartender clear of guests on the walk round the counter', () => {
    const barkeep = bartender();
    barkeep.goal = [-2.7, 0.05];
    const crossing = [
      newAgent([-5.5, 0.2], guestSpeed, { goal: [-0.5, 0.45] }),
      newAgent([0, 0.5], guestSpeed, { goal: [-5, 0.2] }),
      newAgent([4.6, -2], guestSpeed, { goal: [4.6, 3.5] }),
    ];
    run([barkeep, ...crossing], 10, 'round the counter');
    expect(at(barkeep, [-2.7, 0.05])).toBe(true);
  });
  it('waits for an occupied destination to clear instead of walking into a person', () => {
    const standing = newAgent([-5.5, 6.3], guestSpeed);
    const walker = newAgent([-3, 6.3], guestSpeed, { goal: [-5.5, 6.3] });
    run([standing, walker], 3, 'occupied');
    expect(at(walker, [-5.5, 6.3])).toBe(false);
    standing.goal = [-5.5, 4];
    run([standing, walker], 3, 'cleared');
    expect(at(walker, [-5.5, 6.3])).toBe(true);
  });
  it('steps aside for someone who cannot get past, then goes back', () => {
    // Standing in the narrowest gap between two tables.
    const spot: FloorPoint = [-4.4, 2.2];
    const standing = newAgent(spot, guestSpeed);
    const walker = newAgent([-4.4, 4.2], guestSpeed, { goal: [-4.4, 0.4] });
    run([standing, walker], 8, 'narrow gap');
    expect(at(walker, [-4.4, 0.4])).toBe(true);
    expect(at(standing, spot)).toBe(true);
  });
  it('sits a whole party down at once and sees them all out of the door', () => {
    const people = chairs.map((_, i) => newAgent(outsideDoor(i), guestSpeed));
    people.forEach((p, i) => (p.goal = [...chairs[i]]));
    run(people, 24, 'going in');
    people.forEach((p, i) => expect(at(p, chairs[i]), `seat ${i}`).toBe(true));
    for (const p of people) p.goal = outsideDoor();
    // Whoever reaches the door goes out of it and is no longer in anyone's way.
    for (let t = 0; t < 18; t += 1 / 60) {
      stepCrowd(people, 1 / 60);
      apart(people, 'going out');
      for (const p of people) if (pastDoor(p.position)) p.gone = true;
    }
    expect(people.every((p) => p.gone)).toBe(true);
  });
  it.each([7, 101, 2024, 31337])(
    'never lets anyone touch through a long busy night, whatever the frame rate (night %i)',
    (start) => {
      // A small seeded generator: the same night every run.
      let seed = start;
      const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
      const guests = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => newAgent(outsideDoor(i), guestSpeed));
      const host = newAgent(hostHome, guestSpeed);
      const barkeep = bartender();
      const crowd = [...guests, host, barkeep];
      const stops: FloorPoint[] = [
        [-4.4, 5.2],
        hostHome,
        [-2.6, -3.05],
        [1, -3.05],
        [5.95, -2.9],
        // Showing the way from beside each seat, as the host does, not in front of it.
        ...seatApproach.map(([x, z], i): FloorPoint =>
          counterSeats.includes(i)
            ? [x - Math.sign(x) * escortOffset, z]
            : [x, z + (seatFacing(i) === 0 ? -1 : 1) * escortOffset],
        ),
      ];
      const service: FloorPoint[] = [
        bartenderHome,
        [-1.2, -3.05],
        [1.2, -3.05],
        [seats[6][0], seats[6][2] - 1],
        [seats[7][0], seats[7][2] - 1],
        [seats[8][0], seats[8][2] - 1],
      ];
      // Guests come straight in from outside; nobody stands about in the doorway.
      const next = new Map<Agent, number>(
        crowd.map((a) => [a, guests.includes(a) ? 0 : random() * 3]),
      );
      let time = 0,
        arrivals = 0;
      const taken = new Set<number>();
      const seatOf = new Map<Agent, number>();
      for (let frame = 0; time < 240; frame++) {
        const dt = [1 / 144, 1 / 60, 1 / 60, 1 / 30, 1 / 20][frame % 5];
        time += dt;
        for (const a of crowd) {
          if (time < next.get(a)! || a.path.length) continue;
          arrivals++;
          next.set(a, time + 1 + random() * 6);
          if (a === host) a.goal = [...pick(stops)];
          else if (a === barkeep) a.goal = [...pick(service)];
          else if (seatOf.has(a)) {
            taken.delete(seatOf.get(a)!);
            seatOf.delete(a);
            // Everyone has a spot of their own, as they do at the door.
            a.goal = [-6 + guests.indexOf(a) * 1.5, 5.6 + (guests.indexOf(a) % 2) * 0.9];
          } else {
            const open = chairs.map((_, i) => i).filter((i) => !taken.has(i));
            if (!open.length) continue;
            const seat = pick(open);
            taken.add(seat);
            seatOf.set(a, seat);
            a.goal = [...chairs[seat]];
          }
        }
        stepCrowd(crowd, dt);
        apart(crowd, `night at ${time.toFixed(2)}s`);
      }
      expect(arrivals, 'everyone keeps getting where they are going').toBeGreaterThan(150);
    },
    30_000,
  );
  it('walks someone who has gone through the door on out of sight, without stopping', () => {
    const leaving = newAgent(door, guestSpeed);
    const coming = newAgent(outsideDoor(0), guestSpeed, { goal: [-4.4, 6.3] });
    leaving.gone = true;
    leaving.goal = outsideDoor();
    let last = leaving.position[0];
    for (let t = 0; t < 0.4; t += 1 / 60) {
      stepCrowd([leaving, coming], 1 / 60);
      expect(leaving.position[0], 'never turning back in the doorway').toBeLessThan(last);
      last = leaving.position[0];
    }
    run([leaving, coming], 1, 'through the door');
    expect(at(leaving, outsideDoor())).toBe(true);
  });
  it('lets the bartender through a gap with room for one, the guest backing out', () => {
    // Between a stool and the corner of a table, on the bartender's walk along the front.
    const barkeep = bartender([0.2, 0.5]);
    barkeep.goal = [-2.7, 0.05];
    const guest = newAgent([-3.4, 0.2], guestSpeed, { goal: [-0.2, 0.62] });
    run([barkeep, guest], 6, 'in the gap');
    expect(at(barkeep, [-2.7, 0.05])).toBe(true);
    expect(at(guest, [-0.2, 0.62])).toBe(true);
  });
  it('works a whole night without a host: the bartender seats, serves and cleans up', () => {
    const barkeep = bartender();
    const lead = newAgent(outsideDoor(0), guestSpeed, { goal: [-4.4, 6.3] });
    const partner = newAgent(outsideDoor(1), guestSpeed, { goal: [-3.35, 6.55] });
    const later = newAgent(outsideDoor(2), guestSpeed, { goal: chairs[2] });
    const crowd = [barkeep, lead, partner, later];
    const stage = (seconds: number, label: string) => run(crowd, seconds, label);
    // Come in, and the bartender walks round the counter to greet them at the door.
    barkeep.goal = [-4.4, 5.3];
    stage(8, 'greeting');
    expect(at(lead, [-4.4, 6.3])).toBe(true);
    expect(at(partner, [-3.35, 6.55])).toBe(true);
    expect(at(barkeep, [-4.4, 5.3])).toBe(true);
    // Having got there, nobody fidgets or nudges anybody off their spot.
    for (let t = 0; t < 3; t += 1 / 60) {
      stepCrowd(crowd, 1 / 60);
      expect(at(lead, [-4.4, 6.3]) && at(partner, [-3.35, 6.55])).toBe(true);
      expect(at(barkeep, [-4.4, 5.3])).toBe(true);
    }
    // Shown to a table: they walk past the bartender, who goes back behind the bar.
    lead.goal = [...chairs[0]];
    partner.goal = [...chairs[6]];
    barkeep.goal = [...bartenderHome];
    stage(7, 'seating');
    expect(at(lead, chairs[0])).toBe(true);
    expect(at(partner, chairs[6])).toBe(true);
    expect(at(later, chairs[2])).toBe(true);
    expect(at(barkeep, bartenderHome)).toBe(true);
    // Takes an order at the table, right in front of the far chair, and comes back.
    barkeep.goal = [-2.7, 0.05];
    stage(3, 'at the table');
    expect(at(barkeep, [-2.7, 0.05])).toBe(true);
    // The guest in that chair gets up past them as they head for the stools.
    partner.goal = [...door];
    barkeep.goal = [-1.2, -3.05];
    stage(5, 'leaving');
    expect(at(barkeep, [-1.2, -3.05])).toBe(true);
    expect(at(partner, door)).toBe(true);
    // Cleaning up goes round the furniture instead of along the service route.
    barkeep.route = guestPath;
    barkeep.plannedFor = null;
    barkeep.goal = [...binStandSpot];
    stage(4, 'to the bin');
    expect(at(barkeep, binStandSpot)).toBe(true);
    barkeep.goal = [entrance[0] + 1.2, entrance[2]];
    stage(5, 'to the door');
    expect(at(barkeep, [entrance[0] + 1.2, entrance[2]])).toBe(true);
  });
  it('stops on the spot without going past it and coming back', () => {
    for (const speed of [guestSpeed, walkingSpeed]) {
      const walker = newAgent([0, 5], speed, { goal: [3, 5] });
      let furthest = 0;
      for (let frame = 0; frame < 180; frame++) {
        stepCrowd([walker], [1 / 60, 1 / 30, 1 / 120][frame % 3]);
        furthest = Math.max(furthest, walker.position[0]);
      }
      expect(furthest).toBeLessThanOrEqual(3 + 1e-9);
      expect(at(walker, [3, 5])).toBe(true);
    }
  });
  it('gets up to speed and slows down gradually, never all in one frame', () => {
    const guest = newAgent([-1, 5], guestSpeed, { goal: [3, 5] });
    let last = 0;
    for (let frame = 0; frame < 120; frame++) {
      const before = guest.position[0];
      stepCrowd([guest], 1 / 60);
      const speed = (guest.position[0] - before) * 60;
      expect(Math.abs(speed - last), `frame ${frame}`).toBeLessThan(guestSpeed * 0.35);
      last = speed;
    }
    expect(at(guest, [3, 5])).toBe(true);
  });
  it('plans a route only when told to go somewhere, not because of other people', () => {
    let plans = 0;
    const route = (from: FloorPoint, to: FloorPoint) => {
      plans++;
      return guestPath(from, to);
    };
    const agents = [0, 1, 2, 3, 4, 5].map((i) =>
      newAgent([-6 + i * 2.4, 5 + (i % 2)], guestSpeed, {
        route,
        goal: [6 - i * 2.4, 5 + ((i + 1) % 2)],
      }),
    );
    for (let frame = 0; frame < 60 * 6; frame++) stepCrowd(agents, 1 / 60);
    // One each to set off; a dodge may rarely cut someone off from where they were going.
    expect(plans).toBeLessThanOrEqual(agents.length * 3);
  });
  it('does not plan at all for someone already where they want to be', () => {
    let plans = 0;
    const seat = seatApproach[0];
    const route = (from: FloorPoint, to: FloorPoint) => {
      plans++;
      return guestPath(from, to);
    };
    const guest = newAgent(seat, guestSpeed, { route });
    const passer = newAgent([-6, 6], guestSpeed, { goal: [4, 6] });
    stepCrowd([guest, passer], 1 / 60);
    plans = 0;
    for (let frame = 0; frame < 600; frame++) stepCrowd([guest, passer], 1 / 60);
    expect(plans).toBe(0);
  });
  it('steps a full room well within a frame', () => {
    const agents = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) =>
      newAgent([-6 + i, 5 + (i % 2)], guestSpeed, { goal: [6 - i, 6 - (i % 2)] }),
    );
    stepCrowd(agents, 1 / 60);
    const times: number[] = [];
    for (let batch = 0; batch < 5; batch++) {
      const start = performance.now();
      for (let i = 0; i < 20; i++) stepCrowd(agents, 1 / 60);
      times.push((performance.now() - start) / 20);
    }
    times.sort((a, b) => a - b);
    expect(times[2], 'median milliseconds per frame').toBeLessThan(1);
  });
});

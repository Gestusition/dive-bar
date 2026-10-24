import { describe, expect, it } from 'vitest';
import { cornerPlantParts } from './room-layout';
import {
  advanceWalk,
  bartenderHome,
  walkingRoute,
  walkingSpeed,
  type FloorPoint,
} from './navigation';

const targets: FloorPoint[] = [
  [-4.6, 3.3],
  [-2.7, 0.5],
  [2.25, 0.5],
  [-1.2, 0.5],
  [1.2, 0.5],
];
function clearCounter(p: FloorPoint) {
  // Counter top is 8 x 1.35 at z=-1.8. Include the character's 0.42 arm radius.
  expect(Math.abs(p[0]) >= 4.42 || p[1] <= -2.895 || p[1] >= -0.705).toBe(true);
  // A conservative rotating-body radius covers arms, head and feet. Test
  // every actual plant voxel drawn by the scene, rather than only its pot.
  for (const [x, , z, w, , d] of cornerPlantParts) {
    const dx = Math.max(Math.abs(p[0] - x) - w / 2, 0);
    const dz = Math.max(Math.abs(p[1] - z) - d / 2, 0);
    expect(Math.hypot(dx, dz)).toBeGreaterThan(0.52);
  }
}
function walk(from: FloorPoint, to: FloorPoint) {
  let p = from;
  for (let i = 0; i < 3000; i++) {
    const next = advanceWalk(p, to, walkingSpeed / 60);
    clearCounter(next);
    expect(Math.hypot(next[0] - p[0], next[1] - p[1])).toBeLessThanOrEqual(
      walkingSpeed / 60 + 1e-8,
    );
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
  it('goes around the right end on every service trip and return', () => {
    for (const target of targets) {
      const route = walkingRoute(bartenderHome, target);
      expect(route.some(([x, z]) => x === 4.6 && z === 0.5)).toBe(true);
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

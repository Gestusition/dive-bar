import { describe, expect, it } from 'vitest';
import { cornerPlantParts, floorPlantParts, floorPlantPosition } from './room-layout';

describe('room layout', () => {
  it('keeps both plants off the floor seams and wall battens', () => {
    // Floorboards meet, and the wall battens stand, at every whole x. A pot or leaf
    // edge on one of those lines makes the line look as if it runs through the plant.
    const floorPlant = floorPlantParts.map(
      ([x, y, z, w, h, d, c]) => [x + floorPlantPosition[0], y, z, w, h, d, c] as const,
    );
    for (const [x, , , w] of [...cornerPlantParts, ...floorPlant]) {
      const left = x - w / 2,
        right = x + w / 2;
      expect(Math.floor(left), `voxel at ${x}`).toBe(Math.floor(right));
      expect(left - Math.floor(left), `voxel at ${x}`).toBeGreaterThan(0.05);
      expect(Math.ceil(right) - right, `voxel at ${x}`).toBeGreaterThan(0.05);
    }
  });
});

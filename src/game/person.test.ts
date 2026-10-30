import { describe, expect, it } from 'vitest';
import { roster } from './content';
import { personModel } from './person';
import { portraitFace } from '../ui/Portrait';

describe('guest portraits', () => {
  it('draw every head part of the model, in its colours, inside the round frame', () => {
    for (const { id } of roster) {
      const { head } = personModel(id);
      const { rects, viewBox } = portraitFace(id);
      // Nothing is drawn that the model does not have, and nothing is left out.
      expect(rects.map((r) => r.color).sort()).toEqual(head.map((p) => p[6]).sort());
      const [x, y, size] = viewBox.split(' ').map(Number);
      const cx = x + size / 2,
        cy = y + size / 2;
      for (const r of rects)
        for (const [px, py] of [
          [r.x, r.y],
          [r.x + r.w, r.y],
          [r.x, r.y + r.h],
          [r.x + r.w, r.y + r.h],
        ])
          expect(Math.hypot(px - cx, py - cy), `${id} corner`).toBeLessThan(size / 2);
    }
  });
  it('paint the parts nearer the front over the ones behind', () => {
    const { rects } = portraitFace('mara');
    const fronts = rects.map((r) => r.front);
    expect(fronts).toEqual([...fronts].sort((a, b) => a - b));
  });
});

import { describe, expect, it } from 'vitest';
import {
  ambience,
  decorIds,
  decorShown,
  newGame,
  pleased,
  reduceGame,
  tipQuality,
  type Game,
} from './engine';
import { validateSave } from './storage';

const owning = (game: Game) => {
  for (const id of decorIds) game.upgrades[id] = true;
  return game;
};

describe('decor on display', () => {
  it('puts owned decor away and back without refunding or selling it', () => {
    let game = owning(newGame());
    const cash = game.cash;
    const full = ambience(game);
    game = reduceGame(game, { type: 'toggleDecor', item: 'jukebox' });
    expect(decorShown(game, 'jukebox')).toBe(false);
    expect(game.upgrades.jukebox).toBe(true);
    expect(game.cash).toBe(cash);
    // Decor that is put away no longer lifts tips.
    expect(ambience(game)).toBeCloseTo(full - 0.02);
    game = reduceGame(game, { type: 'toggleDecor', item: 'jukebox' });
    expect(decorShown(game, 'jukebox')).toBe(true);
    expect(ambience(game)).toBeCloseTo(full);
  });
  it('ignores decor that has not been bought', () => {
    const game = reduceGame(newGame(), { type: 'toggleDecor', item: 'plant' });
    expect(game.decorOff).toEqual([]);
    expect(decorShown(game, 'plant')).toBe(false);
  });
  it('only lets put-away door lights stop drawing guests in sooner', () => {
    const next = (off: boolean) => {
      let game = owning(reduceGame(newGame(), { type: 'open' }));
      if (off) game = reduceGame(game, { type: 'toggleDecor', item: 'doorLights' });
      game.guests = [];
      game.spawnIn = 0;
      game.random = 1;
      return reduceGame(game, { type: 'tick', dt: 0.25 }).spawnIn;
    };
    expect(next(false)).toBeCloseTo(next(true) * 0.85);
  });
  it('keeps put-away decor in a save and loads older saves with all decor out', () => {
    const game = reduceGame(owning(newGame()), { type: 'toggleDecor', item: 'neon' });
    expect(validateSave(JSON.parse(JSON.stringify(game))).decorOff).toEqual(['neon']);
    const { decorOff, ...older } = game;
    expect(decorOff).toEqual(['neon']);
    expect(validateSave(older).decorOff).toEqual([]);
    expect(() => validateSave({ ...game, decorOff: ['barback'] })).toThrow();
    expect(() => validateSave({ ...game, decorOff: ['neon', 'neon'] })).toThrow();
  });
});

describe('pour list setting', () => {
  it('defaults to the recipe list and loads older saves without the setting', () => {
    const game = newGame();
    expect(game.settings.pourList).toBe('recipe');
    const { pourList, ...settings } = game.settings;
    expect(pourList).toBe('recipe');
    expect(validateSave({ ...game, settings }).settings.pourList).toBe('recipe');
    const full = reduceGame(game, { type: 'setting', key: 'pourList', value: 'full' });
    expect(validateSave(full).settings.pourList).toBe('full');
    expect(() =>
      validateSave({ ...game, settings: { ...game.settings, pourList: 'everything' } }),
    ).toThrow();
  });
});

describe('guest mood', () => {
  it('is happy only with a served drink good enough to tip on', () => {
    expect(pleased({ served: true, quality: tipQuality })).toBe(true);
    expect(pleased({ served: true, quality: 100 })).toBe(true);
    expect(pleased({ served: true, quality: tipQuality - 1 })).toBe(false);
    // Leaving without a drink, however the score reads.
    expect(pleased({ served: false, quality: 100 })).toBe(false);
  });
});

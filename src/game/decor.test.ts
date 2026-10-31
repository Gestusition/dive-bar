import { describe, expect, it } from 'vitest';
import {
  ambience,
  decorIds,
  decorShown,
  newGame,
  happyQuality,
  mood,
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
    // Saves before this version (layout 2) had no decor to put away.
    expect(validateSave({ ...older, version: 2 }).decorOff).toEqual([]);
    expect(() => validateSave({ ...game, decorOff: ['piano'] })).toThrow();
    expect(() => validateSave({ ...game, decorOff: ['neon', 'neon'] })).toThrow();
  });
  it('sends the host off duty and back without refunding them or charging again', () => {
    let game = reduceGame(newGame(), { type: 'buy', item: 'barback' });
    const cash = game.cash;
    game = reduceGame(game, { type: 'toggleDecor', item: 'barback' });
    expect(decorShown(game, 'barback')).toBe(false);
    expect(game.upgrades.barback).toBe(true);
    expect(game.cash).toBe(cash);
    expect(validateSave(JSON.parse(JSON.stringify(game))).decorOff).toEqual(['barback']);
    game = reduceGame(game, { type: 'toggleDecor', item: 'barback' });
    expect(decorShown(game, 'barback')).toBe(true);
    expect(game.cash).toBe(cash);
  });
  it('leaves guests at the door for the player while the host is off duty', () => {
    const waited = (off: boolean) => {
      let game = reduceGame(reduceGame(newGame(), { type: 'buy', item: 'barback' }), {
        type: 'open',
      });
      if (off) game = reduceGame(game, { type: 'toggleDecor', item: 'barback' });
      game.spawnIn = 300;
      for (let i = 0; i < 16; i++) game = reduceGame(game, { type: 'tick', dt: 0.25 });
      return game.guests[0].status;
    };
    expect(waited(false)).toBe('reading');
    expect(waited(true)).toBe('waiting');
  });
});

describe('pour list setting', () => {
  it('defaults to the recipe list and loads older saves without the setting', () => {
    const game = newGame();
    expect(game.settings.pourList).toBe('recipe');
    const { pourList, ...settings } = game.settings;
    expect(pourList).toBe('recipe');
    expect(validateSave({ ...game, version: 2, settings }).settings.pourList).toBe('recipe');
    // A save in this version's layout must have it.
    expect(() => validateSave({ ...game, settings })).toThrow();
    const full = reduceGame(game, { type: 'setting', key: 'pourList', value: 'full' });
    expect(validateSave(full).settings.pourList).toBe('full');
    expect(() =>
      validateSave({ ...game, settings: { ...game.settings, pourList: 'everything' } }),
    ).toThrow();
  });
});

describe('guest mood', () => {
  it('is happy with a good drink, neutral with a so-so one and unhappy without a tip', () => {
    expect(mood({ served: true, quality: 100 })).toBe('happy');
    expect(mood({ served: true, quality: happyQuality })).toBe('happy');
    expect(mood({ served: true, quality: happyQuality - 1 })).toBe('neutral');
    expect(mood({ served: true, quality: tipQuality })).toBe('neutral');
    expect(mood({ served: true, quality: tipQuality - 1 })).toBe('unhappy');
    // Leaving without a drink, however the score reads.
    expect(mood({ served: false, quality: 100 })).toBe('unhappy');
  });
});

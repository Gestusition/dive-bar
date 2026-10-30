import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newGame, reduceGame } from './engine';
import { decodeBackup, encodeBackup, migrateSave, NewerSave, validateSave } from './storage';

// Real backups written by released versions with their own code, from a night in
// progress. A release that can no longer load them has broken players' saves.
const releases = ['v0.0.3.2', 'v0.0.3.3'];
const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}.divebar`, import.meta.url), 'utf8');

describe('saves from earlier versions', () => {
  it.each(releases)('loads a backup made by %s with all its progress', async (release) => {
    const game = await decodeBackup(fixture(release));
    expect(game.version).toBe(newGame().version);
    expect(game.phase).toBe('service');
    expect(game.cash).toBe(13234);
    expect(game.upgrades.plant && game.upgrades.jukebox).toBe(true);
    expect(game.settings.theme).toBe('mint');
    expect(game.guests.length).toBeGreaterThan(0);
    // What later versions added starts at its default.
    expect(game.decorOff).toEqual([]);
    expect(game.settings.pourList).toBe('recipe');
    // And it saves again in this version's layout.
    const again = await decodeBackup(await (await encodeBackup(game)).text());
    expect(again).toEqual(game);
  });
  it('keeps settings that test builds of this version already wrote', () => {
    const { version, ...rest } = newGame();
    expect(version).toBe(3);
    const early = { ...rest, version: 2, settings: { ...rest.settings, pourList: 'full' } };
    expect(validateSave({ ...early, decorOff: ['neon'] }).decorOff).toEqual(['neon']);
    expect(validateSave(early).settings.pourList).toBe('full');
  });
});

describe('save versions', () => {
  it('refuses a save from a newer version as newer, not as damaged', async () => {
    expect(() => migrateSave({ ...newGame(), version: newGame().version + 1 })).toThrow(NewerSave);
  });
  it('refuses a save with no version or one with no way forward', () => {
    expect(() => validateSave({ ...newGame(), version: undefined })).toThrow();
    expect(() => validateSave({ ...newGame(), version: 1 })).toThrow();
    expect(() => validateSave({ ...newGame(), version: 2.5 })).toThrow();
  });
  it('raises the version whenever the save layout changes', () => {
    // If this fails, the save gained or lost a field. Raise the version in newGame(),
    // add a step from the old version in storage.ts, then update this layout. Without
    // the step, every player's save from the previous version is refused.
    const keysOf = (o: object) => Object.keys(o).sort().join(' ');
    const game = reduceGame(newGame(), { type: 'open' });
    expect({
      version: game.version,
      game: keysOf(game),
      settings: keysOf(game.settings),
      upgrades: keysOf(game.upgrades),
      stats: keysOf(game.stats),
      closing: keysOf(game.closing),
      guest: keysOf(game.guests[0]),
      prep: keysOf(game.practice),
    }).toEqual(LAYOUT);
  });
});

/** The save layout of version 3. */
const LAYOUT = {
  version: 3,
  game: 'activeMenu cash cleanGlasses closing committed day decorOff dirtyGlasses foodStock guests history ice inventory mess nextId notice phase practice random rapport recentOrders seconds settings spawnIn stats trash upgrades version visitCount wasteHistory',
  settings: 'hints mode music pourList pourStyle reducedMotion sound theme',
  upgrades: 'barback counterDecor doorLights jukebox neon plant wallArt',
  stats: 'cancelled earnings served tips waste',
  closing: 'restock trash wipe',
  guest:
    'charge customerId extraCherry food foodTime foodType group id lead name paid paidAmount patience prep quality recipeId remaining seat served splitAsk status talked tip tipDelta waited',
  prep: 'amounts attempts chilled dissolved garnish glass ice log measure mix technique tool',
};

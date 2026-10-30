import { afterEach, describe, expect, it, vi } from 'vitest';
import { maxRepeatOrders, newGame, reduceGame, type Game } from './engine';
import { recipes } from './content';
import { deviceRandom } from './random';
import { validateSave, encodeBackup, decodeBackup } from './storage';

afterEach(() => vi.restoreAllMocks());

describe('menus, coaching and live randomness', () => {
  it('starts with six unique valid drinks and allows all fourteen without weakening save validation', async () => {
    let game = reduceGame(newGame(), { type: 'start' });
    expect(game.activeMenu).toHaveLength(6);
    expect(new Set(game.activeMenu).size).toBe(6);
    for (const recipe of recipes.filter((r) => !game.activeMenu.includes(r.id)))
      game = reduceGame(game, { type: 'toggleMenu', id: recipe.id });
    expect(game.activeMenu).toHaveLength(14);
    expect(new Set(game.activeMenu)).toEqual(new Set(recipes.map((r) => r.id)));
    expect(validateSave(game).activeMenu).toEqual(game.activeMenu);
    expect(await decodeBackup(await (await encodeBackup(game)).text())).toEqual(game);
    expect(() =>
      validateSave({ ...game, activeMenu: [...game.activeMenu, game.activeMenu[0]] }),
    ).toThrow();
    expect(() => validateSave({ ...game, activeMenu: ['unknown'] })).toThrow();
  });
  it('switches hints off at each new night while keeping the player switch available', () => {
    const game = newGame();
    expect(game.settings.hints).toBe(true);
    let next = reduceGame({ ...game, phase: 'recap' }, { type: 'nextDay' });
    expect(next.day).toBe(2);
    expect(next.settings.hints).toBe(false);
    next = reduceGame(next, { type: 'setting', key: 'hints', value: true });
    expect(next.settings.hints).toBe(true);
    next = reduceGame({ ...next, phase: 'recap' }, { type: 'nextDay' });
    expect(next.settings.hints).toBe(false);
  });
  it('gives every menu slot equal weight without favourite or last-order bias', () => {
    const game = newGame();
    game.activeMenu = recipes.map((r) => r.id);
    const counts = new Map(game.activeMenu.map((id) => [id, 0]));
    for (let bucket = 0; bucket < 14; bucket++) {
      for (let repeat = 0; repeat < 8; repeat++) {
        const source = () => (bucket + 0.5) / 14;
        const first = reduceGame(game, { type: 'open' }, source).guests[0];
        const withHistory = {
          ...game,
          history: { [first.customerId + '|lastOrder']: first.recipeId },
        };
        const guest = reduceGame(withHistory, { type: 'open' }, source).guests[0];
        expect(guest.recipeId).toBe(game.activeMenu[bucket]);
        counts.set(guest.recipeId, counts.get(guest.recipeId)! + 1);
      }
    }
    expect([...counts.values()]).toEqual(Array(14).fill(8));
  });
  it('lets a drink repeat but never more than four guests in a row', () => {
    // A source that always lands on the first menu slot is the worst case for a streak.
    const source = () => 0;
    let game: Game = reduceGame(newGame(), { type: 'open' }, source);
    const orders = [game.guests[0].recipeId];
    while (orders.length < 13) {
      game.guests = [];
      game = reduceGame({ ...game, spawnIn: 0 }, { type: 'tick', dt: 0.25 }, source);
      orders.push(...game.guests.map((g) => g.recipeId));
    }
    const first = game.activeMenu[0];
    expect(maxRepeatOrders).toBe(4);
    expect(orders.slice(0, 4)).toEqual(Array(4).fill(first));
    expect(orders[4]).not.toBe(first);
    let run = 1;
    for (let i = 1; i < orders.length; i++) {
      run = orders[i] === orders[i - 1] ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(maxRepeatOrders);
    }
  });
  it('still repeats freely on a one-drink menu and loads saves made before the streak was kept', () => {
    let game: Game = reduceGame(
      { ...newGame(), activeMenu: ['moscow_mule'], recentOrders: Array(4).fill('moscow_mule') },
      { type: 'open' },
      () => 0,
    );
    expect(game.guests[0].recipeId).toBe('moscow_mule');
    const { recentOrders, ...older } = game;
    expect(recentOrders).toHaveLength(maxRepeatOrders);
    // Saves in layout 2 from before v0.0.3.3 had no streak.
    expect(validateSave({ ...older, version: 2 }).recentOrders).toEqual([]);
    expect(() => validateSave({ ...game, recentOrders: ['unknown'] })).toThrow();
    game = validateSave(game);
    expect(game.recentOrders).toEqual(recentOrders);
  });
  it('uses fresh Web Crypto draws, handles both boundaries and never falls back to Math.random', () => {
    let word = 0;
    const entropy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = word;
      return array;
    });
    const weak = vi.spyOn(Math, 'random');
    expect(deviceRandom()).toBe(0);
    word = 0xffffffff;
    expect(deviceRandom()).toBe(0xffffffff / 0x100000000);
    expect(deviceRandom()).toBeLessThan(1);
    expect(entropy).toHaveBeenCalledTimes(3);
    expect(weak).not.toHaveBeenCalled();
  });
  it('retains deterministic replay when tests explicitly omit the live source', () => {
    expect(reduceGame(newGame(), { type: 'open' })).toEqual(
      reduceGame(newGame(), { type: 'open' }),
    );
  });
});

import { describe, expect, it, vi } from 'vitest';
import { newGame, reduceGame } from './engine';
import { decodeBackup, encodeBackup } from './storage';

function customer() {
  const game = reduceGame(newGame(), { type: 'open' });
  game.guests = [game.guests[0]];
  Object.assign(game.guests[0], { status: 'ordered', seat: 2 });
  game.spawnIn = 300;
  return game;
}
const offer = {
  type: 'guest' as const,
  id: 1,
  operation: 'food' as const,
  foodType: 'toastie' as const,
};

describe('optional snack offers', () => {
  it.each([0, 0.399999])('allows an accepted offer at %s and consumes stock only once', (draw) => {
    const before = customer();
    let game = reduceGame(before, offer, () => draw);
    expect(game.guests[0].food).toBe('warming');
    expect(game.guests[0].charge).toBe(0);
    expect(game.foodStock.toastie).toBe(before.foodStock.toastie - 1);
    const replay = vi.fn(() => 0);
    game = reduceGame(game, offer, replay);
    expect(replay).not.toHaveBeenCalled();
    expect(game.foodStock.toastie).toBe(before.foodStock.toastie - 1);
    for (let i = 0; i < 72; i++) game = reduceGame(game, { type: 'tick', dt: 0.25 });
    expect(game.guests[0].food).toBe('ready');
    game = reduceGame(game, offer);
    expect(game.guests[0].food).toBe('served');
    expect(game.guests[0].charge).toBe(700);
    game = reduceGame(game, offer);
    expect(game.guests[0].charge).toBe(700);
    expect(game.foodStock.toastie).toBe(before.foodStock.toastie - 1);
  });
  it.each([0.4, 0.599999])('asks for the other snack instead at %s', (draw) => {
    const before = customer();
    let game = reduceGame(before, offer, () => draw);
    expect(game.guests[0].food).toBe('warming');
    expect(game.guests[0].foodType).toBe('pretzel');
    expect(game.notice).toContain('instead');
    expect(game.foodStock.toastie).toBe(before.foodStock.toastie);
    expect(game.foodStock.pretzel).toBe(before.foodStock.pretzel - 1);
    for (let i = 0; i < 48; i++) game = reduceGame(game, { type: 'tick', dt: 0.25 });
    game = reduceGame(game, offer);
    expect(game.guests[0].food).toBe('served');
    expect(game.guests[0].charge).toBe(500);
  });
  it('settles for the offered snack when the requested swap is sold out', () => {
    const before = customer();
    before.foodStock.pretzel = 0;
    const game = reduceGame(before, offer, () => 0.5);
    expect(game.guests[0].food).toBe('warming');
    expect(game.guests[0].foodType).toBe('toastie');
    expect(game.foodStock.toastie).toBe(before.foodStock.toastie - 1);
  });
  it.each([0.6, 0.999999])(
    'remembers a refusal at %s without consuming stock or rerolling another snack',
    async (draw) => {
      const before = customer();
      let game = reduceGame(before, offer, () => draw);
      expect(game.guests[0].food).toBe('declined');
      expect(game.foodStock).toEqual(before.foodStock);
      expect(game.guests[0].charge).toBe(0);
      expect(game.notice).toContain('No snack for me');
      const replay = vi.fn(() => 0);
      for (let i = 0; i < 5; i++)
        game = reduceGame(game, { ...offer, foodType: 'pretzel' }, replay);
      expect(replay).not.toHaveBeenCalled();
      expect(game.foodStock).toEqual(before.foodStock);
      expect(game.guests[0].food).toBe('declined');
      game = await decodeBackup(await (await encodeBackup(game)).text());
      game = reduceGame(game, offer, replay);
      expect(game.guests[0].food).toBe('declined');
      expect(replay).not.toHaveBeenCalled();
    },
  );
  it('does not decide or charge an offer when out of stock, busy, at last call or settling up', () => {
    for (const reason of ['stock', 'busy', 'last call', 'pay', 'paid'] as const) {
      const game = customer();
      if (reason === 'stock') game.foodStock.toastie = 0;
      if (reason === 'busy') game.guests.push({ ...game.guests[0], id: 2, food: 'warming' });
      if (reason === 'last call') game.seconds = 360;
      if (reason === 'pay') game.guests[0].status = 'pay';
      if (reason === 'paid') {
        game.guests[0].paid = true;
        game.guests[0].status = 'leaving';
      }
      const source = vi.fn(() => 0);
      const next = reduceGame(game, offer, source);
      expect(source).not.toHaveBeenCalled();
      expect(next.foodStock).toEqual(game.foodStock);
      expect(next.guests[0].food).toBe('none');
      expect(next.guests[0].charge).toBe(0);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { newGame, reduceGame, upgradeInfo } from './engine';
import { hostDestination, hostHome } from './host';
import { guestPath, seatApproach, stepAlong } from './navigation';

describe('hired host', () => {
  it('starts unowned, charges exactly once and leaves washing to the timed worker queue', () => {
    let game = reduceGame(newGame(), { type: 'open' });
    game.spawnIn = 300;
    game.dirtyGlasses = 1;
    for (let i = 0; i < 16; i++) game = reduceGame(game, { type: 'tick', dt: 0.25 });
    expect(game.guests[0].status).toBe('waiting');
    expect(game.dirtyGlasses).toBe(1);
    const cash = game.cash;
    game = reduceGame(game, { type: 'buy', item: 'barback' });
    expect(game.cash).toBe(cash - upgradeInfo.barback.cost);
    game = reduceGame(game, { type: 'buy', item: 'barback' });
    expect(game.cash).toBe(cash - upgradeInfo.barback.cost);
    for (let i = 0; i < 16; i++) game = reduceGame(game, { type: 'tick', dt: 0.25 });
    expect(game.guests[0].status).toBe('reading');
    expect(game.guests[0].seat).toBeGreaterThanOrEqual(0);
    expect(game.dirtyGlasses).toBe(1);
  });

  it('greets a waiting lead, walks to the assigned seat and returns home', () => {
    const game = reduceGame(newGame(), { type: 'open' });
    const guest = game.guests[0];
    let next = hostDestination(game.guests, null, hostHome);
    expect(next.visit).toEqual({ id: guest.id, escorting: false });
    expect(next.target[0]).toBeCloseTo(-5.1);
    expect(next.target[1]).toBeCloseTo(6.3);
    const greeted = stepAlong(hostHome, guestPath(hostHome, next.target), 100).position;
    Object.assign(guest, { status: 'reading', seat: 0 });
    next = hostDestination(game.guests, next.visit, greeted);
    expect(next.visit?.escorting).toBe(true);
    expect(next.target).toEqual(seatApproach[0]);
    const path = guestPath(greeted, next.target);
    const first = stepAlong(greeted, path, 0.1);
    expect(first.position).not.toEqual(greeted);
    expect(first.position).not.toEqual(next.target);
    const arrived = stepAlong(first.position, first.path, 100).position;
    next = hostDestination(game.guests, next.visit, arrived);
    expect(next).toEqual({ visit: null, target: hostHome });
  });

  it('abandons a departing party and never follows a seated guest on initial load', () => {
    const game = reduceGame(newGame(), { type: 'open' });
    game.guests = [game.guests[0]];
    const next = hostDestination(game.guests, null, hostHome);
    game.guests[0].status = 'leaving';
    expect(hostDestination(game.guests, next.visit, hostHome)).toEqual({
      visit: null,
      target: hostHome,
    });
    game.guests[0].status = 'reading';
    expect(hostDestination(game.guests, null, hostHome)).toEqual({ visit: null, target: hostHome });
  });
});

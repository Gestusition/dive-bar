import { describe, expect, it } from 'vitest';
import { newGame, reduceGame, emptyPrep, tipFor } from './engine';
import { ingredients, recipeById, recipes, recipeMethod, roster, stockItems } from './content';
import { quality, quantityBounds } from './quality';
import { validateSave } from './storage';

function ordered() {
  const s = reduceGame(newGame(), { type: 'open' });
  s.guests = [s.guests[0]];
  Object.assign(s.guests[0], {
    customerId: 'mara',
    name: roster.find((r) => r.id === 'mara')!.name,
    recipeId: 'manhattan',
    status: 'ordered',
    group: 0,
    prep: {
      ...emptyPrep(),
      amounts: { rye_whiskey: 50, sweet_red_vermouth: 20, angostura_bitters: 1 },
      tool: 'mixing_glass',
      technique: 'stir',
      mix: 1,
      ice: true,
      chilled: true,
      garnish: { cocktail_cherry: 1 },
      log: ['ice', 'stir'],
    },
  });
  return s;
}

describe('serving measures', () => {
  it.each([41, 59])('accepts the inclusive 18 percent boundary at %s ml', (amount) => {
    const s = ordered();
    s.guests[0].prep.amounts.rye_whiskey = amount;
    expect(quality(s.guests[0].prep, recipeById('manhattan')).invalid).toBe(false);
    expect(reduceGame(s, { type: 'guest', id: 1, operation: 'serve' }).guests[0].served).toBe(true);
  });
  it.each([40.99, 59.01])('blocks %s ml even if the total volume looks plausible', (amount) => {
    const s = ordered();
    s.guests[0].prep.amounts.rye_whiskey = amount;
    const next = reduceGame(s, { type: 'guest', id: 1, operation: 'serve' });
    expect(next.guests[0].served).toBe(false);
    expect(next.cleanGlasses).toBe(s.cleanGlasses);
    expect(next.notice).toContain('outside the serving measure');
  });
  it('preserves one ml minimum allowance and authored dash ranges', () => {
    expect(quantityBounds({ slot: 'small', allowed: ['lime'], quantity: 5, unit: 'ml' })).toEqual({
      low: 4,
      high: 6,
    });
    const dash = recipeById('old_fashioned').ingredients.find((i) =>
      i.allowed.includes('angostura_bitters'),
    )!;
    expect(quantityBounds(dash)).toEqual({ low: 2, high: 3 });
  });
  it('keeps the perfect-score margin stricter than service', () => {
    const s = ordered();
    s.guests[0].prep.amounts.rye_whiskey = 59;
    expect(quality(s.guests[0].prep, recipeById('manhattan')).score).toBeLessThan(100);
  });
});

describe('independent bug hunt regressions', () => {
  it('prepares all fourteen recipes through real reducer actions', () => {
    for (const recipe of recipes) {
      let s = newGame();
      const method = recipeMethod(recipe);
      const act = (operation: Parameters<typeof reduceGame>[1] & { type: 'prep' }) => {
        s = reduceGame(s, operation);
      };
      const prep = (
        operation: 'tool' | 'glass' | 'chill' | 'ice' | 'muddle' | 'shake' | 'stir',
        value?: string,
      ) => act({ type: 'prep', id: -1, operation, value, amount: 1 });
      prep('tool', method.tool);
      prep('glass', method.glass);
      prep('chill');
      const nonSpirits = recipe.ingredients.filter(
        (i) => !i.allowed.some((id) => ingredients.find((b) => b.id === id)?.kind === 'spirit'),
      );
      const spirits = recipe.ingredients.filter((i) => !nonSpirits.includes(i));
      for (const group of [nonSpirits, spirits]) {
        for (const item of group) {
          let left = item.quantity ?? item.gameTarget!.preferred;
          while (left > 0) {
            const amount = Math.min(left, item.unit === 'ml' ? 50 : 1);
            act({
              type: 'prep',
              id: -1,
              operation: 'measure',
              ingredient: item.allowed[0],
              amount,
            });
            act({ type: 'prep', id: -1, operation: 'transfer' });
            left -= amount;
          }
        }
        if (group === nonSpirits && method.dissolve) prep('muddle');
      }
      prep('ice');
      prep(method.technique);
      for (const group of recipe.service.garnish.allOf ?? []) {
        const ingredient = typeof group === 'string' ? group : group.oneOf[0];
        for (let i = 0; i < (method.garnishCounts?.[ingredient] ?? 1); i++)
          act({ type: 'prep', id: -1, operation: 'garnish', ingredient });
      }
      expect(quality(s.practice, recipe), recipe.name).toMatchObject({
        score: 100,
        invalid: false,
      });
      expect(() => validateSave(s), recipe.name).not.toThrow();
    }
  });
  it('uses the same dash volume for vessel capacity and existing contents', () => {
    const s = ordered();
    s.guests[0].prep.amounts = { vodka: 439.1 };
    s.guests[0].prep.measure = { id: 'worcestershire', quantity: 1 };
    const next = reduceGame(s, { type: 'prep', id: 1, operation: 'transfer' });
    expect(next.guests[0].prep.measure).toBeNull();
    expect(next.guests[0].prep.amounts.worcestershire).toBe(1);
  });
  it('keeps an already served snack payable when a dialogue cancels the drink', () => {
    const s = ordered();
    s.guests[0].prep = emptyPrep();
    Object.assign(s.guests[0], { food: 'served', charge: 700, foodType: 'toastie' });
    const next = reduceGame(s, {
      type: 'choice',
      id: 1,
      conversationId: 'cherry_origin',
      nodeId: 'start',
      choiceId: 'start_1',
    });
    expect(next.guests[0].status).toBe('pay');
    expect(reduceGame(next, { type: 'guest', id: 1, operation: 'pay' }).cash).toBe(12700);
  });
  it('does not discard surplus stock when restoring shelves to par', () => {
    const s = newGame();
    s.inventory.rye_whiskey += 100;
    const next = reduceGame(s, { type: 'restock' });
    expect(next.inventory.rye_whiskey).toBe(s.inventory.rye_whiskey);
    expect(next.cash).toBe(s.cash);
  });
  it('charges only the missing fractional quantity when refilling', () => {
    const s = newGame();
    const item = stockItems.find((i) => i.costMinorPerUnit > 1)!;
    s.inventory[item.id] -= 0.1;
    const next = reduceGame(s, { type: 'restock' });
    expect(next.cash).toBe(s.cash - Math.ceil(0.1 * item.costMinorPerUnit));
    expect(() => validateSave(next)).not.toThrow();
  });
  it('rejects fractional snack purchases instead of writing an unloadable save', () => {
    const s = newGame();
    expect(reduceGame(s, { type: 'purchase', items: { snack_toastie: 0.5 } })).toEqual(s);
  });
  it('never rewards a remake-level drink even with rapport and decor', () => {
    const s = ordered();
    Object.assign(s.guests[0], {
      served: true,
      charge: 1400,
      quality: 49,
      waited: 1,
      tipDelta: 0.15,
    });
    expect(tipFor(s, s.guests[0], 0.03)).toBe(0);
  });
  it('settles every member of a party once, respecting their split request', () => {
    const s = ordered();
    Object.assign(s.guests[0], {
      status: 'pay',
      served: true,
      quality: 100,
      charge: 1400,
      group: 1,
      splitAsk: 'split',
    });
    s.guests.push({ ...structuredClone(s.guests[0]), id: 2, lead: false });
    const a = {
      type: 'guest' as const,
      id: 1,
      operation: 'pay' as const,
      split: 'split' as const,
      paymentId: 'party-1',
    };
    const next = reduceGame(s, a);
    expect(next.guests.every((g) => g.paid && g.paidAmount === 1400)).toBe(true);
    expect(next.cash).toBe(14800 + next.stats.tips);
    expect(reduceGame(next, a)).toEqual(next);
  });
});

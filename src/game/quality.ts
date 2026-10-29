import { ingredients, recipeMethod, type Recipe } from './content';
import type { Prep } from './engine';
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
// Service has a wider margin than a perfect taste score. Native dash/piece
// quantities keep their authored ranges instead of fractional allowances.
export const SERVICE_TOLERANCE = 0.18;
export function quantityBounds(i: Recipe['ingredients'][number], fraction = SERVICE_TOLERANCE) {
  const target = i.quantity ?? i.gameTarget!.preferred;
  const tolerance = i.unit === 'ml' ? Math.max(1, target * fraction) : 0;
  return {
    low: (i.gameTarget?.acceptedMin ?? target) - tolerance,
    high: (i.gameTarget?.acceptedMax ?? target) + tolerance,
  };
}
export function quality(p: Prep, r: Recipe, extraCherry = false) {
  const issues: string[] = [];
  let score = 100;
  // Every point lost, so the taste check can say exactly where the score went.
  const notes: { text: string; points: number }[] = [];
  const lose = (points: number, text: string) => {
    if (points <= 0.05) return;
    const same = notes.find((n) => n.text === text);
    if (same) same.points += points;
    else notes.push({ text, points });
  };
  let invalid = false;
  const allowed = new Set(r.ingredients.flatMap((i) => i.allowed));
  const method = recipeMethod(r);
  for (const id of Object.keys(p.amounts))
    if (!allowed.has(id) && p.amounts[id] > 0.01) {
      score -= 20;
      issues.push('Unexpected ' + (ingredients.find((i) => i.id === id)?.name ?? id));
      lose(20, issues[issues.length - 1]);
      if (ingredients.find((i) => i.id === id)?.kind === 'spirit') invalid = true;
    }
  let quantityPenalty = 0,
    targetVol = 0,
    actualVol = 0;
  const targetFractions: number[] = [],
    actualFractions: number[] = [];
  for (const i of r.ingredients) {
    // Tell the player the bottle's name, not the recipe's internal slot id.
    const name = i.allowed
      .map((id) => ingredients.find((j) => j.id === id)?.name ?? id)
      .join(' or ');
    const q = i.allowed.reduce((sum, id) => sum + (p.amounts[id] ?? 0), 0),
      target = i.quantity ?? i.gameTarget!.preferred;
    if (i.allowed.filter((id) => (p.amounts[id] ?? 0) > 0).length > 1) {
      issues.push('Choose one of ' + name);
      invalid = true;
    }
    if (i.optional && q === 0) continue;
    const bounds = quantityBounds(i);
    if (q < bounds.low - 1e-6 || q > bounds.high + 1e-6) {
      invalid = true;
      issues.push(name + ': outside the serving measure');
    }
    const low = i.gameTarget?.acceptedMin ?? target,
      high = i.gameTarget?.acceptedMax ?? target;
    const error = q < low ? low - q : q > high ? q - high : 0;
    const tol = i.unit === 'ml' ? Math.max(1, target * 0.05) : 0;
    const off = (clamp((error - tol) / (target * 0.5), 0, 1) * 20) / r.ingredients.length;
    quantityPenalty += off;
    if (q === 0) {
      score -= 30 / r.ingredients.length;
      issues.push('Missing ' + name);
      lose(30 / r.ingredients.length + off, 'Missing ' + name);
      if (i.allowed.some((id) => ingredients.find((j) => j.id === id)?.kind === 'spirit'))
        invalid = true;
    } else if (error > tol) {
      issues.push(name + ': ' + Number(q.toFixed(1)) + ' / ' + target + ' ' + i.unit);
      lose(off, issues[issues.length - 1]);
    }
    if (i.quantity !== null && (i.unit === 'ml' || i.unit === 'dash')) {
      const scale = i.unit === 'dash' ? 0.8 : 1;
      targetVol += target * scale;
      actualVol += q * scale;
      targetFractions.push(target * scale);
      actualFractions.push(q * scale);
    }
  }
  score -= quantityPenalty;
  for (const [id, q] of Object.entries(p.amounts)) {
    const unit = ingredients.find((i) => i.id === id)?.unit;
    if (!allowed.has(id) && (unit === 'ml' || unit === 'dash')) {
      const extra = q * (unit === 'dash' ? 0.8 : 1);
      actualVol += extra;
      targetFractions.push(0);
      actualFractions.push(extra);
    }
  }
  const yieldFraction = targetVol > 0 ? actualVol / targetVol : 0;
  if (yieldFraction < 0.65 || yieldFraction > 1.35) {
    invalid = true;
    issues.push('Incorrect single-serving size');
  }
  if (actualVol > 0) {
    const distance =
      targetFractions.reduce(
        (sum, q, i) => sum + Math.abs(q / targetVol - actualFractions[i] / actualVol),
        0,
      ) / 2;
    score -= 7.5 * distance + 7.5 * clamp(Math.abs(yieldFraction - 1), 0, 1);
    lose(7.5 * distance, 'Balance between ingredients');
    lose(7.5 * clamp(Math.abs(yieldFraction - 1), 0, 1), 'Total amount in the glass');
  }
  const expectedTool = method.tool;
  const expectedTechnique = method.technique;
  if (
    p.log.length > 0 &&
    (p.log.lastIndexOf('ice') < 0 ||
      p.log.lastIndexOf('ice') > p.log.lastIndexOf(expectedTechnique))
  ) {
    lose(Math.max(10, score - 74), 'Mix with ice, not before adding it');
    score = Math.min(score - 10, 74);
    issues.push('Mix with ice, not before adding it');
  }
  if (p.tool !== expectedTool || p.technique !== expectedTechnique) {
    issues.push('Use ' + expectedTool.replaceAll('_', ' ') + ' and ' + expectedTechnique);
    lose(Math.max(15, score - 74), issues[issues.length - 1]);
    score = Math.min(score - 15, 74);
  } else if (p.mix < 0.7 || p.mix > 1.35) {
    // Too short leaves it warm and harsh; too long waters it down.
    issues.push(p.mix < 0.7 ? 'Mix it a little longer' : 'Mixed too long, a bit watery');
    score -= 6;
    lose(6, issues[issues.length - 1]);
  }
  if (method.dissolve && !p.dissolved) {
    score -= 15;
    issues.push(
      r.id === 'old_fashioned'
        ? 'Dissolve the sugar before adding whiskey'
        : 'Dissolve or muddle the sugar before ' +
            (method.dissolve === 'before_ice' ? 'adding ice' : 'adding the spirit'),
    );
    lose(15, issues[issues.length - 1]);
  }
  if (
    method.dissolve === 'before_spirit' &&
    p.log.includes('ice') &&
    p.log.indexOf('Sugar dissolved before whiskey') > p.log.indexOf('ice')
  ) {
    lose(Math.max(10, score - 74), 'Dissolve sugar before adding ice');
    score = Math.min(score - 10, 74);
    issues.push('Dissolve sugar before adding ice');
  }
  if (!p.ice) {
    score -= 5;
    issues.push('Missing ice');
    lose(5, 'Missing ice');
  }
  if (r.service.glass === 'chilled_cocktail_glass' && !p.chilled) {
    score -= 5;
    issues.push('Chill the serving glass');
    lose(5, 'Chill the serving glass');
  }
  const expectedGlass = method.glass;
  if (p.glass !== expectedGlass) {
    score -= 5;
    issues.push('Wrong serving glass');
    lose(5, 'Wrong serving glass');
  }
  const groups = r.service.garnish.allOf ?? [];
  for (const group of groups) {
    const good =
      typeof group === 'string'
        ? (p.garnish[group] ?? 0) >=
          (method.garnishCounts?.[group] ?? 1) +
            (group === 'cocktail_cherry' && extraCherry ? 1 : 0)
        : group.oneOf.some((id) => (p.garnish[id] ?? 0) > 0);
    if (!good) {
      score -= 5 / groups.length;
      issues.push('Finish the garnish');
      lose(5 / groups.length, 'Finish the garnish');
    }
  }
  if (invalid) score = Math.min(score, 49);
  score = Math.round(clamp(score, 0, 100));
  return {
    score,
    issues: [...new Set(issues)],
    notes: notes
      .map((n) => ({ text: n.text, points: Math.round(n.points) }))
      .filter((n) => n.points > 0)
      .sort((a, b) => b.points - a.points),
    invalid,
    label: score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 55 ? 'Needs work' : 'Remake',
  };
}

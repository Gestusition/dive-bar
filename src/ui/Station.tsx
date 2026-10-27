import './bench.css';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { CocktailArt, GlassArt, IceCubesArt, MuddleArt, ShakerArt, StirArt } from './art';
import {
  ingredients,
  ingredientColors,
  names,
  recipes,
  recipeById,
  recipeMethod,
} from '../game/content';
import { quality, volume, type Action } from '../game/engine';
import { useGame } from '../game/store';

type Step = 'prep' | 'pour' | 'mix' | 'garnish';
const stepOrder: Step[] = ['prep', 'pour', 'mix', 'garnish'];
const stepLabel: Record<Step, string> = {
  prep: 'Prep',
  pour: 'Pour',
  mix: 'Mix',
  garnish: 'Garnish',
};
const tools = [
  { id: 'shaker', name: 'Shaker', art: <ShakerArt size={40} /> },
  { id: 'mixing_glass', name: 'Mixing glass', art: <StirArt size={40} /> },
  { id: 'old_fashioned_glass', name: 'Rocks glass', art: <GlassArt size={40} /> },
  { id: 'build_glass', name: 'Build in glass', art: <CocktailArt size={40} /> },
] as const;
const glasses = [
  ['cocktail_glass', 'Coupe'],
  ['old_fashioned_glass', 'Rocks'],
  ['highball', 'Highball'],
  ['mug', 'Mug'],
  ['hurricane', 'Hurricane'],
] as const;
const garnishes = [
  'cocktail_cherry',
  'orange_slice',
  'orange_zest',
  'half_salt_rim',
  'lime_slice',
  'lemon_slice',
  'mint_sprig',
  'celery_stick',
];
const toolName: Record<string, string> = {
  shaker: 'shaker',
  mixing_glass: 'mixing glass',
  old_fashioned_glass: 'rocks glass',
  build_glass: 'glass',
};
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bench-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function Station() {
  const { game, selected, practiceRecipe, setPracticeRecipe, act, setPanel, paused } = useGame();
  const guest = game.guests.find((g) => g.id === selected);
  const practice = selected === -1 || !guest;
  const id = practice ? -1 : (guest?.id ?? -1);
  const recipe = recipeById(practice ? practiceRecipe : (guest?.recipeId ?? 'margarita'));
  const prep = practice ? game.practice : (guest?.prep ?? game.practice);
  const [step, setStep] = useState<Step>('prep');
  const [showAll, setShowAll] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [inspect, setInspect] = useState(false);
  const [busy, setBusy] = useState<'shake' | 'stir' | 'muddle' | null>(null);
  const [progress, setProgress] = useState(0);
  const pour = useRef<ReturnType<typeof setInterval> | null>(null);
  const assess = quality(prep, recipe, guest?.extraCherry);
  // A new drink starts from the first step.
  useEffect(() => {
    setStep('prep');
    setInspect(false);
  }, [recipe.id, id]);
  const prepAction = useCallback(
    (
      operation: Extract<Action, { type: 'prep' }>['operation'],
      extra: Partial<Extract<Action, { type: 'prep' }>> = {},
    ) => act({ type: 'prep', id, operation, ...extra }),
    [act, id],
  );
  const stopPour = useCallback(() => {
    if (!pour.current) return;
    clearInterval(pour.current);
    pour.current = null;
    // A free pour goes straight from the bottle into the tin.
    prepAction('transfer');
  }, [prepAction]);
  useEffect(() => {
    const stop = () => stopPour();
    window.addEventListener('blur', stop);
    window.addEventListener('pointercancel', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      stopPour();
      window.removeEventListener('blur', stop);
      window.removeEventListener('pointercancel', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [stopPour]);
  useEffect(() => {
    if (paused) stopPour();
  }, [paused, stopPour]);
  useEffect(() => {
    if (!busy) return;
    let elapsed = 0;
    const duration = busy === 'shake' ? 3 : 2;
    const interval = setInterval(() => {
      const s = useGame.getState();
      if (s.paused || s.panel !== 'station') return;
      elapsed += 0.1;
      setProgress(elapsed / duration);
      if (elapsed >= duration) {
        clearInterval(interval);
        s.act({ type: 'prep', id, operation: busy });
        setBusy(null);
        setProgress(0);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [busy, id]);
  const startPour = (bottle: string) => {
    if (pour.current || busy) return;
    const unit = ingredients.find((i) => i.id === bottle)!.unit;
    pour.current = setInterval(() => {
      const s = useGame.getState();
      if (s.paused || s.panel !== 'station') {
        stopPour();
        return;
      }
      s.act({
        type: 'prep',
        id,
        operation: 'measure',
        ingredient: bottle,
        amount: unit === 'ml' ? 2 : 1,
      });
    }, 100);
  };
  const pourMeasured = (bottle: string, amount: number) => {
    prepAction('measure', { ingredient: bottle, amount });
    prepAction('transfer');
  };

  // Every bottle the recipe calls for, plus any other bottle the player opens.
  const rows = [
    ...recipe.ingredients.map((r) => ({
      key: r.slot,
      recipe: true,
      bottle: r.allowed.find((a) => (prep.amounts[a] ?? 0) > 0) ?? r.allowed[0],
      label: r.allowed.map((a) => names[a]).join(' or '),
      target: r.quantity,
      unit: r.unit,
      have: r.allowed.reduce((sum, a) => sum + (prep.amounts[a] ?? 0), 0),
    })),
    ...(showAll
      ? ingredients
          .filter((i) => !recipe.ingredients.some((r) => r.allowed.includes(i.id)))
          .map((i) => ({
            key: i.id,
            recipe: false,
            bottle: i.id,
            label: i.name,
            target: null as number | null,
            unit: i.unit,
            have: prep.amounts[i.id] ?? 0,
          }))
      : []),
  ];
  type Row = (typeof rows)[number];
  const isDone = (r: Row) =>
    r.recipe && (r.target === null ? r.have > 0 : Math.abs(r.have - r.target) < 0.5);
  const nextRow = rows.find((r) => r.recipe && !isDone(r));
  const stepIndex = stepOrder.indexOf(step);
  const method = recipeMethod(recipe).tool;
  const serveLabel =
    method === 'build_glass' || method === 'old_fashioned_glass'
      ? 'Finish & serve'
      : 'Strain & serve';
  const serve = () => {
    stopPour();
    act({ type: 'guest', id, operation: 'serve' });
    if (useGame.getState().game.guests.find((g) => g.id === id)?.served) setPanel('floor');
  };
  const pourRow = (r: Row) => {
    const done = isDone(r);
    const ml = r.unit === 'ml';
    const remaining = r.target === null ? 0 : Math.max(0, r.target - r.have);
    const amount =
      amounts[r.key] ?? (ml ? Math.min(50, Math.max(5, Math.round(remaining / 5) * 5)) : 1);
    const scale = Math.max(r.target ?? 0, r.have, ml ? 10 : 3);
    const free = game.settings.pourStyle === 'free' && ml;
    const step = ml ? 5 : 1;
    return (
      <div
        key={r.key}
        className={'pour-row ' + (done ? 'done ' : '') + (r === nextRow ? 'next' : '')}
        style={{ '--liquid': ingredientColors[r.bottle] } as React.CSSProperties}
      >
        <span className="bottle-art">
          <i />
          <b />
        </span>
        <div className="pour-name">
          <strong>{r.label}</strong>
          <div className="pour-meter">
            <i style={{ width: Math.min(100, (r.have / scale) * 100) + '%' }} />
            {r.target !== null && <b style={{ left: (r.target / scale) * 100 + '%' }} />}
          </div>
          <small>
            {Number(r.have.toFixed(1))} / {r.target ?? (r.recipe ? '2–3' : '–')} {r.unit}
            {!practice && ' · ' + Math.floor(game.inventory[r.bottle] ?? 0) + ' left'}
          </small>
        </div>
        {done ? (
          <span className="pour-check">
            <Check size={15} strokeWidth={4} />
          </span>
        ) : free ? (
          <span />
        ) : (
          <div className="pour-amount">
            <button
              aria-label={'Less ' + r.label}
              onClick={() => setAmounts((a) => ({ ...a, [r.key]: Math.max(step, amount - step) }))}
            >
              −
            </button>
            <output>
              {amount} {r.unit}
            </output>
            <button
              aria-label={'More ' + r.label}
              onClick={() =>
                setAmounts((a) => ({ ...a, [r.key]: Math.min(ml ? 50 : 5, amount + step) }))
              }
            >
              +
            </button>
          </div>
        )}
        {free ? (
          <Button
            size="sm"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              startPour(r.bottle);
            }}
            onPointerUp={stopPour}
            onPointerCancel={stopPour}
            onLostPointerCapture={stopPour}
          >
            Hold to pour
          </Button>
        ) : (
          <Button size="sm" disabled={!!busy} onClick={() => pourMeasured(r.bottle, amount)}>
            Pour
          </Button>
        )}
      </div>
    );
  };

  return (
    <aside className="bench" aria-label="Counter">
      <div className="bench-zoom">
        <div className="bench-top">
          <button
            className="bench-back"
            aria-label="Back to bar"
            title="Back to bar"
            onClick={() => {
              stopPour();
              setPanel('floor');
            }}
          >
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div className="bench-title">
            <h2>{recipe.name}</h2>
            {practice ? (
              <select
                className="bench-select"
                aria-label="Practice recipe"
                value={practiceRecipe}
                onChange={(e) => {
                  setPracticeRecipe(e.target.value);
                  prepAction('discard');
                }}
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Practice · {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <small>
                {guest?.name}’s order{guest?.extraCherry ? ' · extra cherry' : ''}
              </small>
            )}
          </div>
          <button className="bench-recipe" onClick={() => setPanel('recipe')}>
            <BookOpen size={16} strokeWidth={2.5} /> Recipe
          </button>
          <button
            className="bench-back"
            aria-label="Discard preparation"
            title="Start over"
            onClick={() => {
              if (
                volume(prep) === 0 ||
                confirm('Throw this drink away? Used ingredients will not return to stock.')
              ) {
                prepAction('discard');
                setStep('prep');
              }
            }}
          >
            <Trash2 size={18} strokeWidth={2.5} />
          </button>
        </div>

        <nav className="bench-steps" aria-label="Steps">
          {stepOrder.map((s, i) => (
            <button
              key={s}
              className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}
              aria-current={i === stepIndex ? 'step' : undefined}
              onClick={() => setStep(s)}
            >
              <i>{i < stepIndex ? <Check size={12} strokeWidth={4} /> : i + 1}</i>
              {stepLabel[s]}
            </button>
          ))}
        </nav>

        <div className="bench-body">
          {step === 'prep' && (
            <>
              <p className="bench-hint">Pick what you’ll build the drink in, and its glass.</p>
              <Group title="Build in">
                <div className="bench-tiles">
                  {tools.map((t) => (
                    <button
                      key={t.id}
                      className="bench-tile"
                      aria-pressed={prep.tool === t.id}
                      onClick={() => prepAction('tool', { value: t.id })}
                    >
                      {t.art}
                      {t.name}
                    </button>
                  ))}
                </div>
              </Group>
              <Group title="Serve in">
                <div className="bench-tiles">
                  {glasses.map(([value, label]) => (
                    <button
                      key={value}
                      className="bench-tile"
                      aria-pressed={prep.glass === value}
                      onClick={() => prepAction('glass', { value })}
                    >
                      {value === 'cocktail_glass' ? (
                        <CocktailArt size={36} />
                      ) : (
                        <GlassArt size={36} />
                      )}
                      {label}
                    </button>
                  ))}
                  <button
                    className={'bench-tile ' + (prep.chilled ? 'done' : '')}
                    onClick={() => prepAction('chill')}
                  >
                    <IceCubesArt size={36} />
                    {prep.chilled ? 'Chilled' : 'Chill glass'}
                  </button>
                </div>
              </Group>
            </>
          )}

          {step === 'pour' && (
            <>
              <p className="bench-hint">
                In the {toolName[prep.tool] ?? 'glass'}: <b>{Math.round(volume(prep))} ml</b>
              </p>
              {rows.map(pourRow)}
              <button className="bench-more" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Hide other bottles' : 'Another bottle…'}
              </button>
            </>
          )}

          {step === 'mix' && (
            <>
              <p className="bench-hint">Add ice, then mix it the way the recipe asks.</p>
              <div className="bench-tiles">
                <button
                  className={'bench-tile ' + (prep.ice ? 'done' : '')}
                  onClick={() => prepAction('ice')}
                >
                  <IceCubesArt size={44} />
                  {prep.ice ? 'Ice added' : 'Add ice'}
                </button>
                {(
                  [
                    ['muddle', 'Muddle', <MuddleArt key="m" size={44} />, prep.dissolved],
                    ['shake', 'Shake', <ShakerArt key="s" size={44} />, prep.technique === 'shake'],
                    ['stir', 'Stir', <StirArt key="t" size={44} />, prep.technique === 'stir'],
                  ] as const
                ).map(([op, label, art, done]) => (
                  <button
                    key={op}
                    className={'bench-tile ' + (done ? 'done' : '')}
                    disabled={!!busy}
                    onClick={() => setBusy(op)}
                  >
                    {art}
                    {label}
                  </button>
                ))}
              </div>
              {busy && (
                <>
                  <p className="bench-hint">
                    {busy === 'shake' ? 'Shaking…' : busy === 'stir' ? 'Stirring…' : 'Muddling…'}
                  </p>
                  <div className="bench-progress">
                    <i style={{ width: progress * 100 + '%' }} />
                  </div>
                </>
              )}
            </>
          )}

          {step === 'garnish' && (
            <>
              <p className="bench-hint">Finish it off. Tap again to add another.</p>
              <div className="bench-tiles">
                {garnishes.map((key) => (
                  <button
                    key={key}
                    className={'bench-tile ' + (prep.garnish[key] ? 'done' : '')}
                    onClick={() => prepAction('garnish', { ingredient: key })}
                  >
                    <i className={'garnish-dot big ' + key} />
                    {names[key]}
                    {prep.garnish[key] ? <span className="tag">×{prep.garnish[key]}</span> : null}
                  </button>
                ))}
              </div>
            </>
          )}

          {inspect && (
            <div className={'taste-card ' + (assess.score >= 75 ? 'good' : '')}>
              <div>
                <strong>{assess.label}</strong>
                <span>{assess.score}/100</span>
              </div>
              {assess.issues.length ? (
                <ul>
                  {assess.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              ) : (
                <p>Spot on. Ready to serve.</p>
              )}
            </div>
          )}
        </div>

        <div className="bench-foot">
          <Button variant="secondary" size="sm" onClick={() => setInspect((v) => !v)}>
            Taste check
          </Button>
          <span className="bench-score" />
          {step !== 'garnish' ? (
            <Button onClick={() => setStep(stepOrder[stepIndex + 1])}>
              Next: {stepLabel[stepOrder[stepIndex + 1]]} <ArrowRight size={16} />
            </Button>
          ) : practice ? (
            <Button onClick={() => setInspect(true)}>Check my drink</Button>
          ) : (
            <Button disabled={!!busy} onClick={serve}>
              {serveLabel} <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}

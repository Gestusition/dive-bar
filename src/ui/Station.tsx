import './bench.css';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Lightbulb,
  Minus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  BottleArt,
  DrinkArt,
  GarnishArt,
  GlassShapeArt,
  IceCubesArt,
  MuddleArt,
  ShakerArt,
  StirArt,
} from './art';
import {
  ingredients,
  ingredientColors,
  names,
  recipes,
  recipeById,
  recipeMethod,
} from '../game/content';
import { quality, volume, type Action } from '../game/engine';
import { play } from '../game/audio';
import { useGame } from '../game/store';

type Step = 'prep' | 'pour' | 'mix' | 'garnish';
type Motion = 'shake' | 'stir' | 'muddle';
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
  {
    id: 'old_fashioned_glass',
    name: 'Rocks glass',
    art: <GlassShapeArt size={40} shape="rocks" />,
  },
  { id: 'build_glass', name: 'Build in glass', art: <GlassShapeArt size={40} shape="build" /> },
] as const;
const glasses = [
  ['cocktail_glass', 'Coupe', 'coupe'],
  ['old_fashioned_glass', 'Rocks', 'rocks'],
  ['highball', 'Highball', 'highball'],
  ['mug', 'Mug', 'mug'],
  ['hurricane', 'Hurricane', 'hurricane'],
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
const glassName = Object.fromEntries(glasses.map(([id, label]) => [id, label.toLowerCase()]));
// How long each motion takes when done just right, in seconds. Holding past the
// ideal waters the drink down; letting go too soon leaves it under-mixed.
const motionTime: Record<Motion, number> = { shake: 3, stir: 2.5, muddle: 1.5 };
const sweetZone = [0.7, 1.35];
const spirits = new Set(ingredients.filter((i) => i.kind === 'spirit').map((i) => i.id));
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bench-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
function Coach({ children }: { children: ReactNode }) {
  return (
    <p className="bench-coach" role="status">
      <Lightbulb size={16} strokeWidth={2.5} />
      <span>{children}</span>
    </p>
  );
}

export default function Station() {
  const { game, selected, practiceRecipe, setPracticeRecipe, act, setPanel, paused, setMixing } =
    useGame();
  const guest = game.guests.find((g) => g.id === selected);
  const practice = selected === -1 || !guest;
  const id = practice ? -1 : (guest?.id ?? -1);
  const recipe = recipeById(practice ? practiceRecipe : (guest?.recipeId ?? 'margarita'));
  const prep = practice ? game.practice : (guest?.prep ?? game.practice);
  const coach = game.settings.hints;
  const [step, setStep] = useState<Step>('prep');
  const [showAll, setShowAll] = useState(false);
  const [picking, setPicking] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [inspect, setInspect] = useState(false);
  const [busy, setBusy] = useState<Motion | null>(null);
  const [progress, setProgress] = useState(0);
  const pour = useRef<ReturnType<typeof setInterval> | null>(null);
  const tasteCard = useRef<HTMLDivElement>(null);
  // Bring the taste notes into view when they open; on small screens they sit below the fold.
  useEffect(() => {
    if (!inspect) return;
    const reduced = useGame.getState().game.settings.reducedMotion;
    requestAnimationFrame(() =>
      tasteCard.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'nearest',
      }),
    );
  }, [inspect]);
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
  // Shake, stir and muddle happen while the button is held down.
  const held = useRef<{ motion: Motion; elapsed: number } | null>(null);
  const finishMotion = useCallback(() => {
    const h = held.current;
    if (!h) return;
    held.current = null;
    setBusy(null);
    setMixing(null);
    const amount = h.elapsed / motionTime[h.motion];
    setProgress(0);
    if (h.motion === 'muddle') {
      if (amount >= 1) prepAction('muddle');
      return;
    }
    if (amount >= 0.2) prepAction(h.motion, { amount });
  }, [prepAction, setMixing]);
  const startMotion = (motion: Motion) => {
    if (held.current || pour.current) return;
    held.current = { motion, elapsed: 0 };
    setBusy(motion);
    setMixing(motion);
    setProgress(0);
  };
  useEffect(() => {
    if (!busy) return;
    const interval = setInterval(() => {
      const s = useGame.getState();
      const h = held.current;
      if (!h || s.paused || s.panel !== 'station') return;
      h.elapsed += 0.1;
      const share = h.elapsed / motionTime[h.motion];
      setProgress(share);
      if (Math.round(h.elapsed * 10) % 6 === 0) play(h.motion);
      // A muddle is done once the sugar has dissolved; a shake or stir stops at the
      // far end of the meter.
      if ((h.motion === 'muddle' && share >= 1) || share >= 1.7) finishMotion();
    }, 100);
    return () => clearInterval(interval);
  }, [busy, finishMotion]);
  useEffect(() => {
    const stop = () => {
      stopPour();
      finishMotion();
    };
    window.addEventListener('blur', stop);
    window.addEventListener('pointercancel', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      stop();
      window.removeEventListener('blur', stop);
      window.removeEventListener('pointercancel', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [stopPour, finishMotion]);
  useEffect(() => {
    if (paused) {
      stopPour();
      finishMotion();
    }
  }, [paused, stopPour, finishMotion]);
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
    // An old save can still hold a measure in the jigger; tip it in first.
    if (prep.measure) prepAction('transfer');
    const unit = ingredients.find((i) => i.id === bottle)?.unit;
    // The engine measures dashes and pieces one at a time.
    if (unit === 'ml') prepAction('measure', { ingredient: bottle, amount });
    else for (let n = 0; n < amount; n++) prepAction('measure', { ingredient: bottle, amount: 1 });
    prepAction('transfer');
  };
  // What is in the tin, plus what is mid-pour in the jigger.
  const poured = (ids: string[]) =>
    ids.reduce((sum, a) => sum + (prep.amounts[a] ?? 0), 0) +
    (prep.measure && ids.includes(prep.measure.id) ? prep.measure.quantity : 0);

  const recipeTool = recipeMethod(recipe);
  const method = recipeTool.tool;
  const dissolve = 'dissolve' in recipeTool ? recipeTool.dissolve : undefined;
  // Every bottle the recipe calls for, plus any other bottle the player opens. When
  // the sugar has to dissolve before the spirit, the spirit rows come last.
  const recipeRows = recipe.ingredients.map((r) => ({
    key: r.slot,
    recipe: true,
    spirit: r.allowed.some((a) => spirits.has(a)),
    bottle: r.allowed.find((a) => (prep.amounts[a] ?? 0) > 0) ?? r.allowed[0],
    label: r.allowed.map((a) => names[a]).join(' or '),
    target: r.quantity,
    unit: r.unit,
    have: poured(r.allowed),
  }));
  if (dissolve === 'before_spirit') recipeRows.sort((a, b) => Number(a.spirit) - Number(b.spirit));
  const rows = [
    ...recipeRows,
    ...(showAll
      ? ingredients
          // Garnishes are added at the Garnish step, not poured.
          .filter(
            (i) =>
              i.kind !== 'fruit' &&
              !garnishes.includes(i.id) &&
              !recipe.ingredients.some((r) => r.allowed.includes(i.id)),
          )
          .map((i) => ({
            key: i.id,
            recipe: false,
            spirit: spirits.has(i.id),
            bottle: i.id,
            label: i.name,
            target: null as number | null,
            unit: i.unit,
            have: poured([i.id]),
          }))
      : []),
  ];
  type Row = (typeof rows)[number];
  // Close enough to tick: the taste score judges the fine detail.
  const isDone = (r: Row) =>
    r.recipe &&
    (r.target === null ? r.have > 0 : r.have > 0 && Math.abs(r.have - r.target) <= r.target * 0.4);
  const muddleFirst = dissolve === 'before_spirit' && !prep.dissolved;
  const nextRow = rows.find(
    (r) =>
      r.recipe &&
      !isDone(r) &&
      !(muddleFirst && r.spirit && rows.some((x) => x.recipe && !x.spirit && !isDone(x))),
  );
  const stepIndex = stepOrder.indexOf(step);
  // A step is ticked only once it is really done, not just visited.
  const complete: Record<Step, boolean> = {
    prep: prep.tool === recipeTool.tool && prep.glass === recipeTool.glass,
    pour: rows.filter((r) => r.recipe).every(isDone),
    mix:
      prep.ice &&
      prep.technique === recipeTool.technique &&
      prep.mix >= sweetZone[0] &&
      (!dissolve || prep.dissolved),
    garnish:
      Object.values(prep.garnish).some((n) => n > 0) &&
      !assess.issues.includes('Finish the garnish'),
  };
  const serveLabel =
    method === 'build_glass' || method === 'old_fashioned_glass'
      ? 'Finish & serve'
      : 'Strain & serve';
  const serve = () => {
    stopPour();
    act({ type: 'guest', id, operation: 'serve' });
    if (useGame.getState().game.guests.find((g) => g.id === id)?.served) setPanel('floor');
  };
  const needsChill = recipe.service.glass === 'chilled_cocktail_glass';
  const required = (recipe.service.garnish.allOf ?? []).map((g) =>
    typeof g === 'string' ? g : g.oneOf[0],
  );
  const wantGarnish = (key: string) =>
    required.includes(key) &&
    (prep.garnish[key] ?? 0) <
      (recipeTool.garnishCounts?.[key] ?? 1) +
        (key === 'cocktail_cherry' && guest?.extraCherry ? 1 : 0);
  // The coach always points at the one next thing to do.
  const coachLine: Record<Step, ReactNode> = {
    prep:
      prep.tool !== recipeTool.tool ? (
        <>
          Build this one in the <b>{toolName[recipeTool.tool]}</b>.
        </>
      ) : prep.glass !== recipeTool.glass ? (
        <>
          Serve it in a <b>{glassName[recipeTool.glass]}</b> glass.
        </>
      ) : needsChill && !prep.chilled ? (
        <>Chill the glass so the drink stays cold.</>
      ) : (
        <>
          All set. Go on to <b>Pour</b>.
        </>
      ),
    pour:
      muddleFirst && !rows.some((r) => r.recipe && !r.spirit && !isDone(r)) ? (
        <>
          Now <b>hold Muddle</b> to dissolve the sugar, before any spirit goes in.
        </>
      ) : nextRow ? (
        <>
          Pour the <b>{nextRow.label}</b>
          {nextRow.target ? (
            <>
              : {nextRow.target} {nextRow.unit}
            </>
          ) : null}
          .
        </>
      ) : (
        <>
          Everything is in. Go on to <b>Mix</b>.
        </>
      ),
    mix:
      dissolve === 'before_ice' && !prep.dissolved ? (
        <>
          <b>Hold Muddle</b> first to dissolve the sugar, then add ice.
        </>
      ) : !prep.ice ? (
        <>
          Add <b>ice</b> first.
        </>
      ) : prep.technique !== recipeTool.technique || prep.mix < sweetZone[0] ? (
        <>
          <b>Hold {recipeTool.technique === 'shake' ? 'Shake' : 'Stir'}</b> and let go while the bar
          is in the green.
        </>
      ) : (
        <>
          Nicely mixed. Go on to <b>Garnish</b>.
        </>
      ),
    garnish: required.some(wantGarnish) ? (
      <>
        Add the <b>{names[required.find(wantGarnish)!]}</b>.
      </>
    ) : (
      <>
        {required.length ? 'Garnish done.' : 'No garnish needed.'} Tap{' '}
        <b>{practice ? 'Check my drink' : serveLabel}</b>.
      </>
    ),
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
        className={
          'pour-row ' +
          (done ? 'done ' : '') +
          (r === nextRow ? 'next ' : '') +
          (coach && r === nextRow ? 'coach' : '')
        }
        style={{ '--liquid': ingredientColors[r.bottle] } as React.CSSProperties}
      >
        <BottleArt
          size={38}
          kind={ingredients.find((i) => i.id === r.bottle)?.kind ?? 'spirit'}
          color={ingredientColors[r.bottle] ?? '#d6c996'}
        />
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
  /** A tile you press and hold; it fills a meter while you do. */
  const holdTile = (
    motion: Motion,
    label: string,
    art: ReactNode,
    done: boolean,
    hint: boolean,
  ) => (
    <button
      key={motion}
      className={
        'bench-tile hold ' +
        (done ? 'done ' : '') +
        (busy === motion ? 'busy ' : '') +
        (hint ? 'coach' : '')
      }
      disabled={!!busy && busy !== motion}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        startMotion(motion);
      }}
      onPointerUp={finishMotion}
      onPointerCancel={finishMotion}
      onLostPointerCapture={finishMotion}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          startMotion(motion);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') finishMotion();
      }}
    >
      {art}
      {label}
      <small>Hold</small>
    </button>
  );
  const meter = busy && (
    <div className="mix-meter" aria-label="How long you have mixed">
      <div className="bench-progress">
        {busy !== 'muddle' && (
          <span
            className="sweet"
            style={{
              left: (sweetZone[0] / 1.7) * 100 + '%',
              width: ((sweetZone[1] - sweetZone[0]) / 1.7) * 100 + '%',
            }}
          />
        )}
        <i
          className={
            busy !== 'muddle' && progress > sweetZone[1]
              ? 'over'
              : busy === 'muddle' || progress >= sweetZone[0]
                ? 'good'
                : ''
          }
          style={{ width: Math.min(100, (progress / (busy === 'muddle' ? 1 : 1.7)) * 100) + '%' }}
        />
      </div>
      <p className="bench-hint">
        {busy === 'muddle'
          ? 'Muddling… keep holding'
          : progress < sweetZone[0]
            ? (busy === 'shake' ? 'Shaking' : 'Stirring') + '… keep going'
            : progress <= sweetZone[1]
              ? 'Perfect — let go now'
              : 'Too long! It’s getting watery'}
      </p>
    </div>
  );

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
              <button
                className="bench-pick"
                aria-label="Practice recipe"
                aria-expanded={picking}
                onClick={() => setPicking((v) => !v)}
              >
                Practice · change drink <ChevronDown size={14} strokeWidth={3} />
              </button>
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

        {picking && (
          <div className="bench-picker" role="dialog" aria-label="Pick a drink to practise">
            <header>
              <h3>Pick a drink to practise</h3>
              <button className="bench-back" aria-label="Close" onClick={() => setPicking(false)}>
                <X size={18} strokeWidth={3} />
              </button>
            </header>
            <div className="bench-tiles">
              {[...recipes]
                .sort(
                  (a, b) =>
                    Number(game.activeMenu.includes(b.id)) - Number(game.activeMenu.includes(a.id)),
                )
                .map((r) => (
                  <button
                    key={r.id}
                    className="bench-tile"
                    aria-pressed={r.id === practiceRecipe}
                    onClick={() => {
                      setPracticeRecipe(r.id);
                      prepAction('discard');
                      setPicking(false);
                    }}
                  >
                    <DrinkArt size={38} id={r.id} />
                    {r.name}
                    {game.activeMenu.includes(r.id) && <span className="tag">Menu</span>}
                  </button>
                ))}
            </div>
          </div>
        )}
        <nav className="bench-steps" aria-label="Steps">
          {stepOrder.map((s, i) => (
            <button
              key={s}
              className={(complete[s] ? 'done ' : '') + (i === stepIndex ? 'current' : '')}
              aria-current={i === stepIndex ? 'step' : undefined}
              onClick={() => setStep(s)}
            >
              <i>{complete[s] ? <Check size={12} strokeWidth={4} /> : i + 1}</i>
              {stepLabel[s]}
            </button>
          ))}
        </nav>

        <div className="bench-body">
          {coach && <Coach>{coachLine[step]}</Coach>}
          {step === 'prep' && (
            <>
              {!coach && (
                <p className="bench-hint">Pick what you’ll build the drink in, and its glass.</p>
              )}
              <Group title="Build in">
                <div className="bench-tiles">
                  {tools.map((t) => (
                    <button
                      key={t.id}
                      className={
                        'bench-tile ' +
                        (coach && prep.tool !== recipeTool.tool && t.id === recipeTool.tool
                          ? 'coach'
                          : '')
                      }
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
                  {glasses.map(([value, label, shape]) => (
                    <button
                      key={value}
                      className={
                        'bench-tile ' +
                        (coach &&
                        prep.tool === recipeTool.tool &&
                        prep.glass !== recipeTool.glass &&
                        value === recipeTool.glass
                          ? 'coach'
                          : '')
                      }
                      aria-pressed={prep.glass === value}
                      onClick={() => prepAction('glass', { value })}
                    >
                      <GlassShapeArt size={36} shape={shape} />
                      {label}
                    </button>
                  ))}
                  <button
                    className={
                      'bench-tile ' +
                      (prep.chilled ? 'done ' : '') +
                      (coach && complete.prep && needsChill && !prep.chilled ? 'coach' : '')
                    }
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
              {rows.map((r) => (
                <div key={r.key} className="pour-slot">
                  {pourRow(r)}
                  {/* Muddle sits between the sugar and the spirit, where it belongs. */}
                  {dissolve === 'before_spirit' &&
                    r.recipe &&
                    !r.spirit &&
                    !recipeRows.slice(recipeRows.indexOf(r) + 1).some((x) => !x.spirit) && (
                      <div className="pour-muddle">
                        {holdTile(
                          'muddle',
                          prep.dissolved ? 'Sugar dissolved' : 'Muddle the sugar',
                          <MuddleArt size={34} />,
                          prep.dissolved,
                          coach &&
                            muddleFirst &&
                            !rows.some((x) => x.recipe && !x.spirit && !isDone(x)),
                        )}
                      </div>
                    )}
                </div>
              ))}
              {busy === 'muddle' && meter}
              <button className="bench-more" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Hide other bottles' : 'Another bottle…'}
              </button>
            </>
          )}

          {step === 'mix' && (
            <>
              {!coach && (
                <p className="bench-hint">
                  Add ice, then hold to mix. Let go while the bar is green.
                </p>
              )}
              <div className="bench-tiles">
                {dissolve === 'before_ice' &&
                  holdTile(
                    'muddle',
                    'Muddle',
                    <MuddleArt size={44} />,
                    prep.dissolved,
                    coach && !prep.dissolved,
                  )}
                <button
                  className={
                    'bench-tile ' +
                    (prep.ice ? 'done ' : '') +
                    (coach && !prep.ice && (dissolve !== 'before_ice' || prep.dissolved)
                      ? 'coach'
                      : '')
                  }
                  disabled={!!busy}
                  onClick={() => prepAction('ice')}
                >
                  <IceCubesArt size={44} />
                  {prep.ice ? 'Ice added' : 'Add ice'}
                </button>
                {holdTile(
                  'shake',
                  'Shake',
                  <ShakerArt size={44} />,
                  prep.technique === 'shake' && prep.mix >= sweetZone[0],
                  coach && prep.ice && recipeTool.technique === 'shake' && !complete.mix,
                )}
                {holdTile(
                  'stir',
                  'Stir',
                  <StirArt size={44} />,
                  prep.technique === 'stir' && prep.mix >= sweetZone[0],
                  coach && prep.ice && recipeTool.technique === 'stir' && !complete.mix,
                )}
              </div>
              {meter}
            </>
          )}

          {step === 'garnish' && (
            <>
              {!coach && (
                <p className="bench-hint">
                  Finish it off. Tap again to add another, − to take one off.
                </p>
              )}
              <div className="bench-tiles">
                {garnishes.map((key) => (
                  <div key={key} className="garnish-slot">
                    <button
                      className={
                        'bench-tile ' +
                        (prep.garnish[key] ? 'done ' : '') +
                        (coach && wantGarnish(key) && key === required.find(wantGarnish)
                          ? 'coach'
                          : '')
                      }
                      onClick={() => prepAction('garnish', { ingredient: key })}
                    >
                      <GarnishArt size={40} id={key} />
                      {names[key]}
                      {prep.garnish[key] ? <span className="tag">×{prep.garnish[key]}</span> : null}
                    </button>
                    {prep.garnish[key] ? (
                      <button
                        className="garnish-remove"
                        aria-label={'Take off one ' + names[key]}
                        title="Take one off"
                        onClick={() => prepAction('ungarnish', { ingredient: key })}
                      >
                        <Minus size={14} strokeWidth={4} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}

          {inspect && (
            <div ref={tasteCard} className={'taste-card ' + (assess.score >= 75 ? 'good' : '')}>
              <div>
                <strong>{assess.label}</strong>
                <span>{assess.score}/100</span>
              </div>
              {assess.notes.length ? (
                <ul>
                  {assess.notes.map((n) => (
                    <li key={n.text}>
                      <b>−{n.points}</b> {n.text}
                    </li>
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
            <Button
              className={coach && complete[step] ? 'coach' : ''}
              onClick={() => setStep(stepOrder[stepIndex + 1])}
            >
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

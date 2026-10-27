import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Droplets,
  RotateCcw,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
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
export default function Station() {
  const { game, selected, practiceRecipe, setPracticeRecipe, act, setPanel, paused } = useGame();
  const guest = game.guests.find((g) => g.id === selected);
  const practice = selected === -1 || !guest;
  const id = practice ? -1 : (guest?.id ?? -1);
  const recipe = recipeById(practice ? practiceRecipe : (guest?.recipeId ?? 'margarita'));
  const prep = practice ? game.practice : (guest?.prep ?? game.practice);
  const [bottle, setBottle] = useState('tequila_100_agave');
  const [showAll, setShowAll] = useState(false);
  const [amount, setAmount] = useState(50);
  const firstIngredient = recipe.ingredients[0].allowed[0];
  useEffect(() => setBottle(firstIngredient), [firstIngredient]);
  const [inspect, setInspect] = useState(false);
  const [busy, setBusy] = useState<'shake' | 'stir' | 'muddle' | null>(null);
  const [progress, setProgress] = useState(0);
  const pour = useRef<ReturnType<typeof setInterval> | null>(null);
  const [togglePour, setTogglePour] = useState(false);
  const ingredient = ingredients.find((i) => i.id === bottle)!;
  const assess = quality(prep, recipe, guest?.extraCherry);
  const stopPour = useCallback(() => {
    if (pour.current) {
      clearInterval(pour.current);
      pour.current = null;
    }
    setTogglePour(false);
  }, []);
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
  const prepAction = (
    operation: Extract<Action, { type: 'prep' }>['operation'],
    extra: Partial<Extract<Action, { type: 'prep' }>> = {},
  ) => act({ type: 'prep', id, operation, ...extra });
  const startPour = () => {
    if (pour.current || busy) return;
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
        amount: ingredient.unit === 'ml' ? 2 : 1,
      });
    }, 100);
  };
  const steps = recipe.ingredients.map((r) => {
    const have = r.allowed.reduce((sum, a) => sum + (prep.amounts[a] ?? 0), 0);
    const done = r.quantity === null ? have > 0 : Math.abs(have - r.quantity) < 0.5;
    return { ...r, have, done };
  });
  const nextStep = steps.find((s) => !s.done);
  const toolName: Record<string, string> = {
    shaker: 'shaker',
    mixing_glass: 'mixing glass',
    old_fashioned_glass: 'rocks glass',
    build_glass: 'glass',
  };
  return (
    <aside className="station-panel">
      <div className="station-header">
        <button
          className="back-button"
          onClick={() => {
            stopPour();
            setPanel('floor');
          }}
        >
          <ArrowLeft size={18} strokeWidth={3} /> Back to bar
        </button>
        <span className="station-chip">
          {practice ? 'Practice · free stock' : (guest?.name ?? 'Guest') + '’s order'}
        </span>
      </div>
      <div className="station-title">
        <div>
          <h2>{recipe.name}</h2>
          {guest?.extraCherry && <small className="cherry-note">+ one extra cherry</small>}
        </div>
        <button className="recipe-link" onClick={() => setPanel('recipe')}>
          <BookOpen size={16} strokeWidth={2.5} /> Recipe
        </button>
      </div>
      {practice && (
        <select
          className="recipe-select"
          aria-label="Practice recipe"
          value={practiceRecipe}
          onChange={(e) => {
            setPracticeRecipe(e.target.value);
            prepAction('discard');
            setInspect(false);
          }}
        >
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}
      <ul className="recipe-steps" aria-label="Recipe progress">
        {steps.map((s) => (
          <li
            key={s.slot}
            className={(s.done ? 'done ' : '') + (s === nextStep ? 'next' : '')}
            onClick={() => {
              stopPour();
              setBottle(s.allowed[0]);
            }}
          >
            <i>{s.done ? <Check size={13} strokeWidth={3.5} /> : null}</i>
            <span>{s.allowed.map((a) => names[a]).join(' / ')}</span>
            <b>
              {Number(s.have.toFixed(1))}/{s.quantity ?? '2–3'} {s.unit}
            </b>
          </li>
        ))}
      </ul>
      <section className="station-step">
        <h3>
          <span>1</span> Container
        </h3>
        <div className="tool-tabs">
          {(
            [
              { id: 'shaker', name: 'Shaker' },
              { id: 'mixing_glass', name: 'Mixing glass' },
              { id: 'old_fashioned_glass', name: 'Rocks glass' },
              { id: 'build_glass', name: 'Build in glass' },
            ] as const
          ).map((t) => (
            <button
              aria-pressed={prep.tool === t.id}
              key={t.id}
              onClick={() => prepAction('tool', { value: t.id })}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>
      <section className="station-step">
        <h3>
          <span>2</span> Pour
          <button className="link" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Recipe bottles only' : 'All bottles'}
          </button>
        </h3>
        <div className="bottle-grid">
          {ingredients
            .filter((i) => showAll || recipe.ingredients.some((r) => r.allowed.includes(i.id)))
            .map((i) => (
              <button
                className={'bottle-option ' + (bottle === i.id ? 'active' : '')}
                key={i.id}
                onClick={() => {
                  stopPour();
                  setBottle(i.id);
                }}
                aria-pressed={bottle === i.id}
              >
                <span
                  className="bottle-art"
                  style={{ '--liquid': ingredientColors[i.id] } as React.CSSProperties}
                >
                  <i />
                  <b />
                </span>
                <span>
                  {i.name}
                  <small>
                    {practice ? '∞' : Math.floor(game.inventory[i.id] ?? 0)} {i.unit}
                  </small>
                </span>
              </button>
            ))}
        </div>
        <div className="measure-area">
          <div className="jigger-visual" aria-label="Current measured quantity">
            <div
              className="jigger-fill"
              style={{
                height: Math.min(100, ((prep.measure?.quantity ?? 0) / 50) * 100) + '%',
                background: ingredientColors[prep.measure?.id ?? bottle],
              }}
            />
          </div>
          <div className="measure-controls">
            <div className="measure-readout">
              <strong className="measure-value">
                {Number((prep.measure?.quantity ?? 0).toFixed(1))}
                <small>
                  {ingredients.find((i) => i.id === prep.measure?.id)?.unit ?? ingredient.unit}
                </small>
              </strong>
              <span>{prep.measure ? names[prep.measure.id] : 'Jigger is empty'}</span>
            </div>
            {ingredient.unit === 'ml' && (
              <div className="measure-marks">
                {[5, 10, 15, 20, 25, 30, 45, 50].map((n) => (
                  <button key={n} aria-pressed={amount === n} onClick={() => setAmount(n)}>
                    {n}
                  </button>
                ))}
              </div>
            )}
            <div className="measure-buttons">
              {game.settings.pourStyle === 'marked' || ingredient.unit !== 'ml' ? (
                <Button
                  size="sm"
                  disabled={!!busy}
                  onClick={() =>
                    prepAction('measure', {
                      ingredient: bottle,
                      amount: ingredient.unit === 'ml' ? amount : 1,
                    })
                  }
                >
                  Measure {ingredient.unit === 'ml' ? amount + ' ml' : '1 ' + ingredient.unit}
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      startPour();
                    }}
                    onPointerUp={stopPour}
                    onPointerCancel={stopPour}
                    onLostPointerCapture={stopPour}
                  >
                    Hold to pour
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (togglePour) stopPour();
                      else {
                        startPour();
                        setTogglePour(true);
                      }
                    }}
                  >
                    {togglePour ? 'Stop pour' : 'Tap to pour'}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="secondary"
                disabled={!prep.measure || !!busy}
                onClick={() => {
                  stopPour();
                  prepAction('transfer');
                }}
              >
                Transfer <ArrowRight size={14} />
              </Button>
              <button
                className="mini-icon"
                aria-label="Empty jigger"
                title="Empty jigger"
                onClick={() => {
                  stopPour();
                  prepAction('discardMeasure');
                }}
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
        <div className="mixture-line">
          <span>In the {toolName[prep.tool] ?? 'glass'}</span>
          <strong>{Math.round(volume(prep))} ml</strong>
        </div>
        {Object.keys(prep.amounts).length > 0 && (
          <div className="mixture-chips">
            {Object.entries(prep.amounts).map(([key, q]) => (
              <span key={key} style={{ '--liquid': ingredientColors[key] } as React.CSSProperties}>
                {names[key]} <b>{Number(q.toFixed(1))}</b>
              </span>
            ))}
          </div>
        )}
      </section>
      <section className="station-step">
        <h3>
          <span>3</span> Mix
        </h3>
        <div className="craft-actions">
          <button className={prep.ice ? 'done' : ''} onClick={() => prepAction('ice')}>
            <Snowflake size={20} strokeWidth={2.5} />
            {prep.ice ? 'Ice added' : 'Add ice'}
          </button>
          <button
            className={prep.dissolved ? 'done' : ''}
            disabled={!!busy}
            onClick={() => setBusy('muddle')}
          >
            <Droplets size={20} strokeWidth={2.5} />
            Muddle
          </button>
          <button
            className={prep.technique === 'shake' ? 'done' : ''}
            disabled={!!busy}
            onClick={() => setBusy('shake')}
          >
            <Sparkles size={20} strokeWidth={2.5} />
            Shake
          </button>
          <button
            className={prep.technique === 'stir' ? 'done' : ''}
            disabled={!!busy}
            onClick={() => setBusy('stir')}
          >
            <RotateCcw size={20} strokeWidth={2.5} />
            Stir
          </button>
        </div>
        {busy && (
          <div className="technique-progress">
            <span>
              {busy === 'shake' ? 'Shaking…' : busy === 'stir' ? 'Stirring…' : 'Muddling…'}
            </span>
            <div>
              <i style={{ width: progress * 100 + '%' }} />
            </div>
          </div>
        )}
      </section>
      <section className="station-step">
        <h3>
          <span>4</span> Glass &amp; garnish
        </h3>
        <div className="finish-row">
          <div className="segmented">
            {(
              [
                ['cocktail_glass', 'Coupe'],
                ['old_fashioned_glass', 'Rocks'],
                ['highball', 'Highball'],
                ['mug', 'Mug'],
                ['hurricane', 'Hurricane'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={prep.glass === value}
                onClick={() => prepAction('glass', { value })}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className={'chill-button ' + (prep.chilled ? 'done' : '')}
            onClick={() => prepAction('chill')}
          >
            <Snowflake size={15} strokeWidth={2.5} />
            {prep.chilled ? 'Chilled' : 'Chill glass'}
          </button>
        </div>
        <div className="garnish-row">
          {[
            'cocktail_cherry',
            'orange_slice',
            'orange_zest',
            'half_salt_rim',
            'lime_slice',
            'lemon_slice',
            'mint_sprig',
            'celery_stick',
          ].map((key) => (
            <button
              key={key}
              className={prep.garnish[key] ? 'on' : ''}
              onClick={() => prepAction('garnish', { ingredient: key })}
            >
              <i className={'garnish-dot ' + key} />
              {names[key]}
              {prep.garnish[key] ? <b>×{prep.garnish[key]}</b> : null}
            </button>
          ))}
        </div>
      </section>
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
      <div className="station-footer">
        <Button variant="secondary" size="sm" onClick={() => setInspect((v) => !v)}>
          <SlidersHorizontal size={15} />
          Taste check
        </Button>
        <button
          className="mini-icon"
          aria-label="Discard preparation"
          title="Discard preparation"
          onClick={() => {
            if (
              volume(prep) === 0 ||
              confirm('Throw this drink away? Used ingredients will not return to stock.')
            )
              prepAction('discard');
          }}
        >
          <Trash2 size={17} strokeWidth={2.5} />
        </button>
        {practice ? (
          <Button onClick={() => setInspect(true)}>Check my drink</Button>
        ) : (
          <Button
            disabled={!!busy}
            onClick={() => {
              stopPour();
              act({ type: 'guest', id, operation: 'serve' });
              if (useGame.getState().game.guests.find((g) => g.id === id)?.served)
                setPanel('floor');
            }}
          >
            {recipeMethod(recipe).tool === 'build_glass' ||
            recipeMethod(recipe).tool === 'old_fashioned_glass'
              ? 'Finish & serve'
              : 'Strain & serve'}{' '}
            <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </aside>
  );
}

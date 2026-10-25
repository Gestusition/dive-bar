import Station from './Station';
import { IconButton } from './common';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Coins,
  Dices,
  Download,
  Droplets,
  GlassWater,
  Leaf,
  Pause,
  Play,
  Receipt,
  Settings,
  Snowflake,
  Sparkles,
  Trash2,
  Upload,
  Users,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wine,
  X,
} from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { conversations, money, names, prices, recipeById, recipes } from '../game/content';
import { conversationFor, type Guest } from '../game/engine';
import { startClock, useGame, type Panel } from '../game/store';
import { MenuPanel, StockPanel, PosPanel } from './Management';
const BarScene = lazy(() => import('../view/BarScene'));
const statusLabels: Record<Guest['status'], string> = {
  waiting: 'At the door',
  reading: 'Reading the menu',
  ready: 'Ready to order',
  ordered: 'Waiting for a drink',
  drinking: 'Enjoying the moment',
  pay: 'Ready to settle',
  leaving: 'See you next time',
};
function Title() {
  const { loaded, hasSave, start, saveError } = useGame();
  return (
    <main
      className="title-screen"
      style={{
        backgroundImage:
          'url(' + (process.env.NEXT_PUBLIC_BASE_PATH ?? '') + '/assets/bg_title.jpg)',
      }}
    >
      <div className="title-shade" />
      <div className="title-top">
        <span className="brand-mark">
          <Wine size={20} /> A LITTLE NEIGHBOURHOOD ESCAPE
        </span>
        <span className="title-tag">OPEN LATE. STAY A WHILE.</span>
      </div>
      <section className="title-copy">
        <span className="eyebrow">GOOD DRINKS. BETTER STORIES.</span>
        <h1>
          DIVE
          <span>
            BAR<span className="title-dot">.</span>
          </span>
        </h1>
        <p>
          A little measuring.
          <br />A little make-believe.
          <br />A place to call your own.
        </p>
        <Button disabled={!loaded} onClick={() => start()} className="start-button">
          {loaded
            ? hasSave
              ? 'Continue your night'
              : 'Make yourself at home'
            : 'Turning on the lights…'}
          <ArrowRight size={19} />
        </Button>
        {hasSave && (
          <button
            className="text-button"
            onClick={() => {
              if (
                confirm(
                  'Start a fresh bar? Export your current save from Settings first if you want to keep it.',
                )
              )
                start(true);
            }}
          >
            Start a fresh bar
          </button>
        )}
        {saveError && <p className="error-text">{saveError}</p>}
        <div className="title-features">
          <span>
            <GlassWater size={16} /> Real recipes
          </span>
          <span>
            <Users size={16} /> Familiar faces
          </span>
          <span>
            <Sparkles size={16} /> Little white lies
          </span>
        </div>
      </section>
      <footer className="title-footer">
        <span>Best enjoyed at your own pace.</span>
        <span>
          HEADPHONES RECOMMENDED <span className="tiny-dot" /> MOUSE · TOUCH · KEYBOARD
        </span>
      </footer>
    </main>
  );
}
function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="switch-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <Switch.Root
        className="switch"
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
      >
        <Switch.Thumb className="switch-thumb" />
      </Switch.Root>
    </label>
  );
}
function RecipeCard({ id }: { id: string }) {
  const r = recipeById(id);
  return (
    <div className="recipe-card">
      <div className="recipe-heading">
        <span className="drink-icon">
          <Wine />
        </span>
        <div>
          <span className="eyebrow">THE RECIPE BOOK</span>
          <h3>{r.name}</h3>
        </div>
      </div>
      <div className="recipe-ingredients">
        {r.ingredients.map((i) => (
          <div key={i.slot}>
            <span>{i.allowed.map((id) => names[id]).join(' or ')}</span>
            <strong>
              {i.quantity ?? '2–3'} <small>{i.unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="recipe-method">
        <span className="eyebrow">MAKE IT A GOOD ONE</span>
        <p>
          {r.preparation?.notes ??
            (r.id === 'margarita'
              ? 'Chill a cocktail glass. Add tequila, triple sec and lime juice to a shaker with ice. Shake, then strain. A half salt rim is optional.'
              : r.id === 'manhattan'
                ? 'Chill a cocktail glass. Combine rye, sweet vermouth and bitters in a mixing glass with ice. Stir, strain and add a cocktail cherry.'
                : 'Select the rocks glass. Add sugar, bitters and water; muddle until dissolved. Add ice and whiskey, stir gently, then add orange and a cherry.')}
        </p>
        <a href={r.source.url || undefined} target="_blank" rel="noreferrer">
          Reference: {r.source.publisher ?? 'International Bartenders Association'} ↗
        </a>
      </div>
    </div>
  );
}
function SettingsPanel() {
  const { game, act, importSave, saveError } = useGame();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const download = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dive-bar-night-' + game.day + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="field">
        <label>YOUR KIND OF NIGHT</label>
        <div className="segmented">
          {(['chill', 'house', 'rush'] as const).map((mode) => (
            <button
              key={mode}
              aria-pressed={game.settings.mode === mode}
              onClick={() => act({ type: 'setting', key: 'mode', value: mode })}
            >
              {mode === 'house' ? 'House Shift' : mode === 'chill' ? 'Chill' : 'Rush'}
            </button>
          ))}
        </div>
        <p className="muted">Same bar, same stories. Choose how busy it gets.</p>
      </div>
      <SwitchRow
        label="Sound effects"
        description="Glass clinks, soft notes and a little atmosphere."
        checked={game.settings.sound}
        onChange={(v) => act({ type: 'setting', key: 'sound', value: v })}
      />
      <SwitchRow
        label="Reduced motion"
        description="Keep movement and transitions gentle."
        checked={game.settings.reducedMotion}
        onChange={(v) => act({ type: 'setting', key: 'reducedMotion', value: v })}
      />
      <div className="field">
        <label>MEASURING STYLE</label>
        <div className="segmented">
          {(['marked', 'free'] as const).map((value) => (
            <button
              key={value}
              aria-pressed={game.settings.pourStyle === value}
              onClick={() => act({ type: 'setting', key: 'pourStyle', value })}
            >
              {value === 'marked' ? 'Measured pour' : 'Free pour'}
            </button>
          ))}
        </div>
        <p className="muted">
          Choose your own amounts in either style. Free pour has hold and toggle controls.
        </p>
      </div>
      <div className="backup-actions">
        <Button variant="secondary" onClick={download}>
          <Download size={16} /> Export your save
        </Button>
        <Button variant="ghost" onClick={() => input.current?.click()}>
          <Upload size={16} /> Import save
        </Button>
        <input
          hidden
          ref={input}
          type="file"
          accept="application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              importSave(await file.text());
              setError('');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not read that save.');
            }
          }}
        />
      </div>
      <p className="muted">
        Progress saves on this device. Export a copy to take your bar to another one.
      </p>
      {(error || saveError) && (
        <p role="alert" className="error-text">
          {error || saveError}
        </p>
      )}
    </>
  );
}
function DecorPanel() {
  const { game, act } = useGame();
  return (
    <>
      <div className="theme-options">
        {(['amber', 'mint', 'rose'] as const).map((value) => (
          <button
            className={'theme-swatch ' + value}
            aria-pressed={game.settings.theme === value}
            key={value}
            onClick={() => act({ type: 'setting', key: 'theme', value })}
          >
            <span />
            {value === 'amber' ? 'Amber hour' : value === 'mint' ? 'After mint' : 'Cherry dusk'}
          </button>
        ))}
      </div>
      <div className="shop-items">
        {(
          [
            {
              id: 'plant',
              name: 'A little greenery',
              description: 'Something growing in your favourite corner.',
              cost: 1500,
              icon: <Leaf />,
            },
            {
              id: 'neon',
              name: 'The house neon',
              description: 'A soft glow that says you belong here.',
              cost: 2500,
              icon: <Sparkles />,
            },
            {
              id: 'barback',
              name: 'A helping pair of hands',
              description: 'Your barback washes glasses, fills ice and clears trash.',
              cost: 6000,
              icon: <Users />,
            },
          ] as const
        ).map((item) => (
          <div className="shop-item" key={item.id}>
            <span className="shop-icon">{item.icon}</span>
            <div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <Button
                variant="secondary"
                size="sm"
                disabled={game.upgrades[item.id] || game.cash < item.cost}
                onClick={() => act({ type: 'buy', item: item.id })}
              >
                {game.upgrades[item.id] ? (
                  <>
                    <Check size={14} /> Yours
                  </>
                ) : (
                  money(item.cost)
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function DicePanel() {
  const { game, act } = useGame();
  const d = game.dice;
  return (
    <div className="dice-panel">
      <p>
        Five dice. Keep the ones you like, roll the rest once. Highest total wins a house token. No
        money, no pressure.
      </p>
      <div className="dice-row">
        {(d.values.length ? d.values : [1, 2, 3, 4, 5]).map((value, index) => (
          <button
            key={index}
            disabled={d.rolled !== 1}
            aria-label={'Keep die ' + (index + 1)}
            aria-pressed={d.kept[index] ?? false}
            onClick={() => act({ type: 'keepDie', index })}
          >
            <span>{['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][value]}</span>
            <small>{d.kept[index] ? 'KEEP' : ' '}</small>
          </button>
        ))}
      </div>
      <Button
        disabled={d.playedDay === game.day && !!d.result}
        onClick={() => act({ type: 'rollDice' })}
      >
        <Dices size={18} />
        {d.rolled === 1 ? 'Roll the rest' : 'Roll with Len'}
      </Button>
      {d.result && (
        <div className="dice-result">
          <strong>{d.result}</strong>
          <p>
            You: {d.values.reduce((a, b) => a + b, 0)} · Len: {d.opponent}
          </p>
        </div>
      )}
      <small className="muted">One round per night · {game.tokens} house tokens</small>
    </div>
  );
}
function DialoguePanel() {
  const { game, dialogue, selected, choose, continueDialogue } = useGame();
  const c = conversations.find((c) => c.id === dialogue?.id);
  const node = c?.nodes.find((n) => n.id === dialogue?.node);
  const guest = game.guests.find((g) => g.id === selected);
  if (!c || !node || !dialogue) return null;
  return (
    <div className="conversation">
      <div className="conversation-person">
        <span className={'portrait ' + (guest?.customerId ?? 'mara')}>{c.customer[0]}</span>
        <div>
          <span className="eyebrow">A MOMENT AT THE BAR</span>
          <h3>{c.customer}</h3>
        </div>
        <span className="paused-badge">
          <Pause size={12} /> Take your time
        </span>
      </div>
      <blockquote>“{dialogue.reply || node.line}”</blockquote>
      {dialogue.reply ? (
        <Button onClick={continueDialogue}>
          Continue <ArrowRight size={16} />
        </Button>
      ) : (
        <div className="choices">
          {node.choices.map((choice, i) => (
            <button key={choice.id} onClick={() => choose(choice.id)}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {choice.text}
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      )}
      <p className="muted small">Some guests order a story with their drink.</p>
    </div>
  );
}
function GuestCard({ guest }: { guest: Guest }) {
  const { selected, select, enqueue, game, setPanel, talk } = useGame();
  const selectedCard = selected === guest.id;
  const canTalk = !!conversationFor(game, guest);
  return (
    <article className={'customer-card ' + (selectedCard ? 'selected' : '')}>
      <button className="customer-main" onClick={() => select(guest.id)}>
        <span className={'portrait ' + guest.customerId}>{guest.name[0]}</span>
        <span>
          <strong>{guest.name}</strong>
          {game.visitCount[guest.customerId] > 0 && (
            <span className="regular-badge">
              A familiar face · {game.visitCount[guest.customerId]} visits
            </span>
          )}
          <small>{statusLabels[guest.status]}</small>
        </span>
        <span className="customer-state">
          {guest.status === 'pay' ? (
            <Receipt size={18} />
          ) : guest.status === 'ordered' ? (
            <Wine size={18} />
          ) : guest.status === 'ready' ? (
            <BookOpen size={18} />
          ) : (
            <Clock size={17} />
          )}
        </span>
      </button>
      {['ordered', 'drinking', 'pay'].includes(guest.status) && (
        <div className="order-label">
          <Wine size={13} />
          {recipeById(guest.recipeId).name}
          {guest.extraCherry && <span>+ cherry</span>}
        </div>
      )}
      {['ordered', 'ready'].includes(guest.status) && (
        <div className="patience-track">
          <div
            style={{
              width:
                Math.min(100, (guest.remaining / (guest.status === 'ready' ? 75 : 160)) * 100) +
                '%',
            }}
          />
        </div>
      )}
      {(selectedCard || game.guests.length === 1) && (
        <div className="customer-actions">
          {guest.status === 'waiting' && (
            <Button size="sm" onClick={() => enqueue(guest.id, 'seat')}>
              Offer a seat <ArrowRight size={14} />
            </Button>
          )}
          {guest.status === 'reading' && (
            <p className="muted">Give them a moment. A good choice takes time.</p>
          )}
          {guest.status === 'ready' && (
            <Button size="sm" onClick={() => enqueue(guest.id, 'order')}>
              Take order <BookOpen size={14} />
            </Button>
          )}
          {guest.status === 'ordered' && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  select(guest.id);
                  setPanel('station');
                }}
              >
                Make their drink <Wine size={14} />
              </Button>
              {canTalk && (
                <Button size="sm" variant="secondary" onClick={() => talk(guest.id)}>
                  Have a little chat <Sparkles size={14} />
                </Button>
              )}
            </>
          )}
          {guest.status === 'drinking' && (
            <p className="muted">A happy little moment. Their tab stays open.</p>
          )}
          {guest.status === 'pay' && (
            <Button size="sm" onClick={() => enqueue(guest.id, 'pay')}>
              Settle {money(guest.charge - guest.paidAmount)} <Receipt size={14} />
            </Button>
          )}
          {['ordered', 'drinking', 'pay'].includes(guest.status) && guest.food !== 'served' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => enqueue(guest.id, 'food')}
              disabled={guest.food === 'warming'}
            >
              <UtensilsCrossed size={13} />
              {guest.food === 'ready'
                ? 'Serve ' + guest.foodType
                : guest.food === 'warming'
                  ? 'Warming…'
                  : 'Offer a warm pretzel · $5'}
            </Button>
          )}
          {['ordered', 'drinking', 'pay'].includes(guest.status) && guest.food === 'none' && (
            <Button variant="ghost" size="sm" onClick={() => enqueue(guest.id, 'food', 'toastie')}>
              <UtensilsCrossed size={13} />
              Offer a cheese toastie · $7
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
function FloorPanel() {
  const { game, selected, select, setPanel, act } = useGame();
  return (
    <aside className="floor-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">YOUR LITTLE CORNER</span>
          <h2>
            {game.phase === 'opening'
              ? 'Before the first hello'
              : game.phase === 'closing'
                ? 'One last little tidy'
                : game.phase === 'recap'
                  ? 'A night well spent'
                  : 'The usuals & the new faces'}
          </h2>
        </div>
        <span className="number-badge">
          {game.guests.filter((g) => g.status !== 'leaving').length}
        </span>
      </div>
      {game.phase === 'opening' ? (
        <>
          <p className="intro-copy">
            The shelves are full. The lights are warm.
            <br />
            All this place needs is you.
          </p>
          <div className="opening-menu">
            <span className="eyebrow">TONIGHT’S MENU</span>
            {recipes
              .filter((r) => game.activeMenu.includes(r.id))
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    useGame.getState().setPracticeRecipe(r.id);
                    setPanel('recipe');
                  }}
                >
                  <span>{r.name}</span>
                  <span>{money(prices[r.id])}</span>
                </button>
              ))}
          </div>
          <Button variant="ghost" className="wide" onClick={() => setPanel('menu')}>
            Choose tonight’s menu
          </Button>
          <div className="opening-tip">
            <Sparkles size={20} />
            <p>
              Make a drink. Read the room.
              <br />
              Tell a story worth coming back for.
            </p>
          </div>
          <div className="opening-actions">
            <Button className="wide" onClick={() => act({ type: 'open' })}>
              Turn the sign to open <ArrowRight size={17} />
            </Button>
            <Button
              variant="ghost"
              className="wide"
              onClick={() => {
                select(-1);
                setPanel('station');
              }}
            >
              A little practice first
            </Button>
          </div>
        </>
      ) : game.phase === 'recap' ? (
        <>
          <p className="intro-copy">
            The best part of a busy night?
            <br />
            Making the place a little more yours.
          </p>
          <div className="recap-grid">
            <div>
              <strong>{game.stats.served}</strong>
              <span>drinks served</span>
            </div>
            <div>
              <strong>{money(game.stats.earnings)}</strong>
              <span>earned tonight</span>
            </div>
            <div>
              <strong>{money(game.stats.tips)}</strong>
              <span>in little thank-yous</span>
            </div>
            <div>
              <strong>{game.stats.waste}</strong>
              <span>fresh starts</span>
            </div>
          </div>
          <Button className="wide" onClick={() => act({ type: 'nextDay' })}>
            Another night, another story <ArrowRight size={16} />
          </Button>
          <Button variant="secondary" className="wide" onClick={() => setPanel('decor')}>
            <Leaf size={16} /> Make it your own
          </Button>
          <Button variant="ghost" className="wide" onClick={() => setPanel('dice')}>
            <Dices size={16} /> One round with Len?
          </Button>
        </>
      ) : game.phase === 'closing' ? (
        <>
          <p className="intro-copy">A few finishing touches. Tomorrow’s you will thank you.</p>
          <div className="closing-list">
            {(
              [
                { key: 'wipe', label: 'Wipe the counter', icon: <Droplets />, action: 'wipe' },
                { key: 'trash', label: 'Take out the trash', icon: <Trash2 />, action: 'trash' },
                {
                  key: 'restock',
                  label: 'Check & replenish stock',
                  icon: <GlassWater />,
                  action: 'restock',
                },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  item.action === 'restock' ? setPanel('stock') : act({ type: item.action })
                }
              >
                <span>
                  {item.icon}
                  {item.label}
                </span>
                {game.closing[item.key] ? <Check size={18} /> : <ArrowRight size={18} />}
              </button>
            ))}
            <button onClick={() => act({ type: 'wash' })}>
              <span>
                <GlassWater />
                Return clean glasses
              </span>
              {game.dirtyGlasses === 0 ? <Check size={18} /> : <span>{game.dirtyGlasses}</span>}
            </button>
          </div>
          <Button className="wide" onClick={() => act({ type: 'finish' })}>
            Count the till & close <ArrowRight size={16} />
          </Button>
        </>
      ) : (
        <>
          <div className="guest-list">
            {game.guests.length ? (
              game.guests.map((g) => <GuestCard key={g.id} guest={g} />)
            ) : (
              <div className="quiet-state">
                <Wine size={32} />
                <h3>A little breathing room.</h3>
                <p>
                  Wipe the counter, check the ice.
                  <br />
                  Someone will be along soon.
                </p>
              </div>
            )}
          </div>
          <div className="floor-bottom">
            <div className="supply-row">
              <span>
                <Snowflake size={15} />
                {game.ice} ice
              </span>
              <span>
                <GlassWater size={15} />
                {game.cleanGlasses} clean
              </span>
              <span>
                <Droplets size={15} />
                {game.mess} spills
              </span>
            </div>
            <div className="small-actions">
              <button onClick={() => act({ type: 'wipe' })}>
                <Droplets size={15} />
                Wipe
              </button>
              <button onClick={() => act({ type: 'wash' })}>
                <GlassWater size={15} />
                Wash ({game.dirtyGlasses})
              </button>
              <button onClick={() => act({ type: 'refillIce' })}>
                <Snowflake size={15} />
                Ice
              </button>
            </div>
            <Button
              variant="ghost"
              className="wide last-call"
              onClick={() => act({ type: 'finish' })}
            >
              Call last orders
            </Button>
          </div>
        </>
      )}
      {selected !== null && game.phase === 'service' && (
        <span className="sr-only">Selected customer {selected}</span>
      )}
    </aside>
  );
}
export default function App() {
  const {
    game,
    panel,
    title,
    boot,
    paused,
    pause,
    setPanel,
    selected,
    practiceRecipe,
    tasks,
    cancelTasks,
  } = useGame();
  useEffect(() => {
    void boot();
    return startClock();
  }, [boot]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const s = useGame.getState();
        if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;
        if (s.panel !== 'floor' && s.panel !== 'station') return;
        if (s.panel === 'station') s.setPanel('floor');
        else s.pause();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);
  if (title) return <Title />;
  const guest = game.guests.find((g) => g.id === selected);
  const recipeId = selected === -1 ? practiceRecipe : (guest?.recipeId ?? practiceRecipe);
  const phase = game.phase;
  const focusPanel = [
    'recipe',
    'settings',
    'dialogue',
    'pos',
    'decor',
    'dice',
    'help',
    'stock',
    'menu',
  ].includes(panel);
  const dialogTitles: Partial<Record<Panel, string>> = {
    recipe: 'One good drink at a time',
    settings: 'Your bar, your way',
    dialogue: 'A little conversation',
    pos: 'The house tabs',
    decor: 'Make yourself at home',
    dice: 'After-hours House Dice',
    help: 'A good first night',
    stock: 'A little shelf care',
    menu: 'Tonight’s little menu',
  };
  const time = Math.max(0, 420 - game.seconds);
  return (
    <div
      className={
        'game-shell ' +
        game.settings.theme +
        (game.settings.reducedMotion ? ' reduced-motion' : '') +
        (panel === 'station' ? ' station-mode' : '')
      }
    >
      <header className="game-header">
        <button className="wordmark" onClick={() => setPanel('help')}>
          DIVE BAR<span>GOOD DRINKS. BETTER STORIES.</span>
        </button>
        <div className="shift-meta">
          <span className="open-dot" />
          <strong>
            {phase === 'opening'
              ? 'GETTING READY'
              : phase === 'closing'
                ? 'CLOSING TIME'
                : phase === 'recap'
                  ? 'THE GOOD PART'
                  : game.seconds >= 360
                    ? 'LAST ORDERS'
                    : 'NIGHT ' + String(game.day).padStart(2, '0')}
          </strong>
          <span className="clock">
            <Clock size={15} />
            {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
          </span>
        </div>
        <div className="header-actions">
          <span className="cash">
            <Coins size={17} />
            {money(game.cash)}
          </span>
          <IconButton label="Settings" onClick={() => setPanel('settings')}>
            <Settings size={19} />
          </IconButton>
          <IconButton label={paused ? 'Resume' : 'Pause'} onClick={pause}>
            {paused ? <Play size={19} /> : <Pause size={19} />}
          </IconButton>
        </div>
      </header>
      <main className="scene">
        <Suspense
          fallback={
            <div className="scene-loading">
              <Wine size={28} />
              <span>Setting the tables…</span>
            </div>
          }
        >
          <BarScene />
        </Suspense>
        <div className="scene-caption">
          <span className="eyebrow">THE EVENING SHIFT</span>
          <p>
            {phase === 'opening'
              ? 'Every good night starts with a hello.'
              : game.seconds >= 360
                ? 'One last round of goodbyes.'
                : 'A little busy. A little lovely.'}
          </p>
        </div>
        <div className="scene-tools">
          <IconButton label="Recipe book" onClick={() => setPanel('recipe')}>
            <BookOpen size={19} />
          </IconButton>
          <IconButton label="Open tabs" onClick={() => setPanel('pos')}>
            <Receipt size={19} />
          </IconButton>
          <IconButton label="Decorate your bar" onClick={() => setPanel('decor')}>
            <Leaf size={19} />
          </IconButton>
          <IconButton
            label="Sound"
            onClick={() =>
              useGame.getState().act({ type: 'setting', key: 'sound', value: !game.settings.sound })
            }
          >
            {game.settings.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </IconButton>
        </div>
        <div className="scene-hint">
          {tasks.length ? (
            <>
              <span className="walking-dot" />
              On it: {tasks[0].operation} {game.guests.find((g) => g.id === tasks[0].id)?.name}
              <button onClick={cancelTasks} aria-label="Cancel queued tasks">
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <span className="tiny-dot" />
              Tap a familiar face. Make a little connection.
            </>
          )}
        </div>
      </main>
      {panel === 'station' || panel === 'recipe' ? <Station /> : <FloorPanel />}
      <footer className="game-footer">
        <span className="notice-icon">
          <Sparkles size={17} />
        </span>
        <p role="status" aria-live="polite">
          {game.notice}
        </p>
        <span className="footer-night">A LITTLE BAR. A GOOD STORY.</span>
      </footer>
      <Dialog
        open={focusPanel}
        onOpenChange={(open) => {
          if (!open) setPanel(panel === 'recipe' ? 'station' : 'floor');
        }}
        title={dialogTitles[panel] ?? ''}
        description={panel === 'dialogue' ? 'The world can wait. Choose your words.' : undefined}
      >
        {panel === 'settings' ? (
          <SettingsPanel />
        ) : panel === 'recipe' ? (
          <RecipeCard id={recipeId} />
        ) : panel === 'dialogue' ? (
          <DialoguePanel />
        ) : panel === 'decor' ? (
          <DecorPanel />
        ) : panel === 'dice' ? (
          <DicePanel />
        ) : panel === 'pos' ? (
          <PosPanel />
        ) : panel === 'stock' ? (
          <StockPanel />
        ) : panel === 'menu' ? (
          <MenuPanel />
        ) : (
          <div className="help-content">
            <p>Welcome to your little bar. Here’s the rhythm:</p>
            <ol>
              <li>
                <strong>Offer a seat.</strong> Tap a guest, then let them read the menu.
              </li>
              <li>
                <strong>Take the order.</strong> Make their drink at the counter. The recipe book is
                always there.
              </li>
              <li>
                <strong>Measure, mix, finish.</strong> Real ingredients and real proportions.
                Practice has unlimited stock.
              </li>
              <li>
                <strong>Read the room.</strong> A little story can make a guest’s night. A little
                too much story can spoil it.
              </li>
              <li>
                <strong>Settle up.</strong> Give them a moment to enjoy the drink, then take
                payment.
              </li>
              <li>
                <strong>Make it yours.</strong> Close, replenish, decorate. Tomorrow’s regulars are
                tonight’s new faces.
              </li>
            </ol>
            <p className="muted">
              Reading pauses the bar. Escape goes back or pauses. Your progress saves on this
              device.
            </p>
          </div>
        )}
      </Dialog>
      {paused && !focusPanel && (
        <div className="pause-overlay">
          <div>
            <span className="eyebrow">A LITTLE BREATHING ROOM</span>
            <h2>The bar can wait.</h2>
            <p>Your night is safe. Come back when you’re ready.</p>
            <Button onClick={pause}>
              <Play size={17} /> Back to the bar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

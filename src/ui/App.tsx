import Station from './Station';
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronRight, Download, Play, Upload, X } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { conversations, money, names, prices, recipeById, recipes } from '../game/content';
import { startClock, useGame, type Panel } from '../game/store';
import { MenuPanel, StockPanel, PosPanel } from './Management';
import {
  BellArt,
  BookArt,
  BoxArt,
  CalendarArt,
  CocktailArt,
  CoinsArt,
  DiceArt,
  GearArt,
  GlassArt,
  HelpArt,
  IceArt,
  PauseArt,
  PlantArt,
  ReceiptArt,
  SoundArt,
  SpongeArt,
  TrashArt,
} from './art';
const BarScene = lazy(() => import('../view/BarScene'));
const SHIFT = 420;
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
      <section className="title-card">
        <h1 className="neon-sign" aria-label="Dive Bar">
          <span>Dive</span>
          <span className="pink">Bar</span>
        </h1>
        <nav className="title-menu">
          <button disabled={!loaded} onClick={() => start()} className="title-option main">
            {loaded ? (hasSave ? 'Continue' : 'Play') : 'Loading…'}
          </button>
          {hasSave && (
            <button
              className="title-option"
              onClick={() => {
                if (
                  confirm(
                    'Start a new bar? Export your current save from Settings first if you want to keep it.',
                  )
                )
                  start(true);
              }}
            >
              New game
            </button>
          )}
        </nav>
        {saveError && <p className="error-text">{saveError}</p>}
      </section>
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
        <CocktailArt size={56} />
        <h3>{r.name}</h3>
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
        <h4>Method</h4>
        <p>
          {r.preparation?.notes ??
            (r.id === 'margarita'
              ? 'Chill a cocktail glass. Add tequila, triple sec and lime juice to a shaker with ice. Shake, then strain. A half salt rim is optional.'
              : r.id === 'manhattan'
                ? 'Chill a cocktail glass. Combine rye, sweet vermouth and bitters in a mixing glass with ice. Stir, strain and add a cocktail cherry.'
                : 'Select the rocks glass. Add sugar, bitters and water; muddle until dissolved. Add ice and whiskey, stir gently, then add orange and a cherry.')}
        </p>
        <a href={r.source.url || undefined} target="_blank" rel="noreferrer">
          Source: {r.source.publisher ?? 'International Bartenders Association'} ↗
        </a>
      </div>
    </div>
  );
}
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map(([key, label]) => (
        <button key={key} aria-pressed={value === key} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
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
    <div className="settings">
      <div className="field">
        <h4>Difficulty</h4>
        <Segmented
          value={game.settings.mode}
          options={[
            ['chill', 'Chill'],
            ['house', 'Normal'],
            ['rush', 'Rush'],
          ]}
          onChange={(value) => act({ type: 'setting', key: 'mode', value })}
        />
        <p className="hint">How many guests come in each night.</p>
      </div>
      <div className="field">
        <h4>Pouring</h4>
        <Segmented
          value={game.settings.pourStyle}
          options={[
            ['marked', 'Measured pour'],
            ['free', 'Free pour'],
          ]}
          onChange={(value) => act({ type: 'setting', key: 'pourStyle', value })}
        />
        <p className="hint">Free pour lets you hold the button to pour.</p>
      </div>
      <SwitchRow
        label="Sound effects"
        description="Glass clinks and bar ambience."
        checked={game.settings.sound}
        onChange={(v) => act({ type: 'setting', key: 'sound', value: v })}
      />
      <SwitchRow
        label="Reduced motion"
        description="Fewer animations."
        checked={game.settings.reducedMotion}
        onChange={(v) => act({ type: 'setting', key: 'reducedMotion', value: v })}
      />
      <div className="field">
        <h4>Save file</h4>
        <div className="backup-actions">
          <Button variant="secondary" size="sm" onClick={download}>
            <Download size={16} /> Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
            <Upload size={16} /> Import
          </Button>
        </div>
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
        <p className="hint">Progress saves automatically on this device.</p>
      </div>
      {(error || saveError) && (
        <p role="alert" className="error-text">
          {error || saveError}
        </p>
      )}
    </div>
  );
}
const decorItems = [
  {
    id: 'plant',
    name: 'Corner plant',
    description: 'A bit of green for the corner.',
    cost: 1500,
    art: <PlantArt size={52} />,
  },
  {
    id: 'neon',
    name: 'Neon sign',
    description: 'Lights up the sign behind the bar.',
    cost: 2500,
    art: <BellArt size={52} />,
  },
  {
    id: 'barback',
    name: 'Barback',
    description: 'Washes glasses, fills ice and takes out the trash.',
    cost: 6000,
    art: <GlassArt size={52} />,
  },
] as const;
function DecorPanel() {
  const { game, act } = useGame();
  return (
    <>
      <h4>Colour theme</h4>
      <div className="theme-options">
        {(
          [
            ['amber', 'Sunset'],
            ['mint', 'Mint'],
            ['rose', 'Cherry'],
          ] as const
        ).map(([value, label]) => (
          <button
            className={'theme-swatch ' + value}
            aria-pressed={game.settings.theme === value}
            key={value}
            onClick={() => act({ type: 'setting', key: 'theme', value })}
          >
            <span />
            {label}
          </button>
        ))}
      </div>
      <h4>Shop</h4>
      <div className="shop-items">
        {decorItems.map((item) => (
          <div className={'shop-item ' + (game.upgrades[item.id] ? 'owned' : '')} key={item.id}>
            {item.art}
            <div>
              <strong>{item.name}</strong>
              <p>{item.description}</p>
            </div>
            <Button
              variant={game.upgrades[item.id] ? 'secondary' : 'default'}
              size="sm"
              disabled={game.upgrades[item.id] || game.cash < item.cost}
              onClick={() => act({ type: 'buy', item: item.id })}
            >
              {game.upgrades[item.id] ? (
                <>
                  <Check size={14} /> Owned
                </>
              ) : (
                money(item.cost)
              )}
            </Button>
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
        Roll five dice against Len. Tap dice to keep them, then roll the rest once. Highest total
        wins a house token.
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
            <small>{d.kept[index] ? 'Keep' : ' '}</small>
          </button>
        ))}
      </div>
      <Button
        disabled={d.playedDay === game.day && !!d.result}
        onClick={() => act({ type: 'rollDice' })}
      >
        {d.rolled === 1 ? 'Roll the rest' : 'Roll'}
      </Button>
      {d.result && (
        <div className="dice-result">
          <strong>{d.result}</strong>
          <p>
            You {d.values.reduce((a, b) => a + b, 0)} · Len {d.opponent}
          </p>
        </div>
      )}
      <p className="hint">
        One round per night · {game.tokens} {game.tokens === 1 ? 'token' : 'tokens'}
      </p>
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
      <div className="speech">
        <span className={'portrait big ' + (guest?.customerId ?? 'mara')}>{c.customer[0]}</span>
        <blockquote>“{dialogue.reply || node.line}”</blockquote>
      </div>
      {dialogue.reply ? (
        <Button onClick={continueDialogue}>
          Continue <ArrowRight size={16} />
        </Button>
      ) : (
        <div className="choices">
          {node.choices.map((choice) => (
            <button key={choice.id} onClick={() => choose(choice.id)}>
              {choice.text}
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function HelpPanel() {
  const steps: [ReactNode, string, string][] = [
    [<b key="w">!</b>, 'Seat guests', 'Tap a guest at the door, then seat them.'],
    [<b key="q">?</b>, 'Take orders', 'When they’re ready, take their order.'],
    [<CocktailArt key="c" size={30} />, 'Make the drink', 'Follow the recipe at the counter.'],
    [<ReceiptArt key="r" size={30} />, 'Get paid', 'Let them finish, then settle the bill.'],
    [<BellArt key="b" size={30} />, 'Close up', 'Clean, restock and start the next night.'],
  ];
  return (
    <div className="help-content">
      <ol>
        {steps.map(([icon, title, text]) => (
          <li key={title}>
            <span className="help-icon">{icon}</span>
            <span>
              <strong>{title}</strong>
              {text}
            </span>
          </li>
        ))}
      </ol>
      <p className="hint">
        The bar pauses while a window is open. Esc goes back or pauses. Progress saves
        automatically.
      </p>
    </div>
  );
}
function Card({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={'side-panel ' + className}>
      <h2>{title}</h2>
      {children}
    </aside>
  );
}
function OpeningCard() {
  const { game, select, setPanel, act } = useGame();
  return (
    <Card title="Get ready" className="opening">
      <p className="hint">Tonight’s menu — tap a drink to see the recipe.</p>
      <div className="menu-list">
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
              <b>{money(prices[r.id])}</b>
            </button>
          ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setPanel('menu')}>
        Edit menu
      </Button>
      <div className="phase-actions">
        <Button
          variant="secondary"
          onClick={() => {
            select(-1);
            setPanel('station');
          }}
        >
          Practice
        </Button>
        <Button onClick={() => act({ type: 'open' })}>
          Open the bar <ArrowRight size={17} />
        </Button>
      </div>
    </Card>
  );
}
function ClosingCard() {
  const { game, setPanel, act } = useGame();
  const items = [
    {
      key: 'wipe',
      label: 'Wipe counter',
      art: <SpongeArt size={34} />,
      done: game.closing.wipe,
      run: () => act({ type: 'wipe' }),
    },
    {
      key: 'trash',
      label: 'Take out trash',
      art: <TrashArt size={34} />,
      done: game.closing.trash,
      run: () => act({ type: 'trash' }),
    },
    {
      key: 'restock',
      label: 'Restock shelves',
      art: <BoxArt size={34} />,
      done: game.closing.restock,
      run: () => setPanel('stock'),
    },
    {
      key: 'wash',
      label: 'Wash glasses',
      art: <GlassArt size={34} />,
      done: game.dirtyGlasses === 0,
      run: () => act({ type: 'wash' }),
    },
  ];
  return (
    <Card title="Closing time" className="closing">
      <div className="checklist">
        {items.map((item) => (
          <button key={item.key} className={item.done ? 'done' : ''} onClick={item.run}>
            {item.art}
            <span>{item.label}</span>
            <i>{item.done ? <Check size={16} strokeWidth={3} /> : null}</i>
          </button>
        ))}
      </div>
      <Button onClick={() => act({ type: 'finish' })}>
        Close the bar <ArrowRight size={16} />
      </Button>
    </Card>
  );
}
function RecapCard() {
  const { game, setPanel, act } = useGame();
  const stats: [string, string][] = [
    [String(game.stats.served), 'Drinks served'],
    [money(game.stats.earnings), 'Earned'],
    [money(game.stats.tips), 'Tips'],
    [String(game.stats.waste), 'Wasted'],
  ];
  return (
    <Card title={'Night ' + game.day + ' complete'} className="recap">
      <div className="recap-grid">
        {stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="phase-actions">
        <Button variant="secondary" onClick={() => setPanel('decor')}>
          Decorate
        </Button>
        <Button variant="secondary" onClick={() => setPanel('dice')}>
          Dice
        </Button>
      </div>
      <Button onClick={() => act({ type: 'nextDay' })}>
        Next night <ArrowRight size={16} />
      </Button>
    </Card>
  );
}
function ToolTray() {
  const { game, act } = useGame();
  const tools = [
    {
      label: 'Wipe',
      art: <SpongeArt />,
      badge: game.mess || null,
      run: () => act({ type: 'wipe' }),
    },
    {
      label: 'Wash',
      art: <GlassArt />,
      badge: game.dirtyGlasses || null,
      run: () => act({ type: 'wash' }),
    },
    { label: 'Ice', art: <IceArt />, badge: game.ice, run: () => act({ type: 'refillIce' }) },
  ];
  return (
    <div className="tool-tray">
      {tools.map((t) => (
        <button key={t.label} className="tray-tile" onClick={t.run} aria-label={t.label}>
          {t.art}
          {t.badge !== null && <span className="badge">{t.badge}</span>}
          <small>{t.label}</small>
        </button>
      ))}
      <span className="tray-divider" />
      <button
        className="tray-tile"
        onClick={() => act({ type: 'finish' })}
        aria-label="Last orders"
      >
        <BellArt />
        <small>Last orders</small>
      </button>
    </div>
  );
}
function RailButton({
  label,
  children,
  onClick,
  badge,
  small = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  badge?: number;
  small?: boolean;
}) {
  return (
    <button
      className={'rail-button ' + (small ? 'small' : '')}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
      {!!badge && <span className="badge">{badge}</span>}
      {!small && <small>{label}</small>}
    </button>
  );
}
function Hud() {
  const { game, paused, pause, setPanel } = useGame();
  const time = Math.max(0, SHIFT - game.seconds);
  const progress = Math.min(1, game.seconds / SHIFT);
  const phase = game.phase;
  const openTabs = game.guests.filter((g) => g.charge > 0 && !g.paid).length;
  return (
    <aside className="hud" aria-label="Bar status">
      <div className="hud-stat calendar" title={'Night ' + game.day}>
        <CalendarArt size={68} />
        <strong>{game.day}</strong>
        <small>
          {phase === 'opening'
            ? 'Getting ready'
            : phase === 'closing'
              ? 'Closing'
              : phase === 'recap'
                ? 'Done'
                : game.seconds >= 360
                  ? 'Last orders'
                  : 'Open'}
        </small>
      </div>
      <div className="hud-stat money">
        <CoinsArt size={44} />
        <strong className="cash">{money(game.cash)}</strong>
      </div>
      <div className="hud-stat sky" title="Time left tonight">
        <div className="sky-dial">
          <span className="sky-sun" style={{ top: 6 + progress * 58 + 'px' }} />
        </div>
        <strong className="clock">
          {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
        </strong>
      </div>
      <nav className="rail-tools">
        <RailButton label="Recipes" onClick={() => setPanel('recipe')}>
          <BookArt />
        </RailButton>
        <RailButton label="Tabs" onClick={() => setPanel('pos')} badge={openTabs}>
          <ReceiptArt />
        </RailButton>
        <RailButton label="Decorate" onClick={() => setPanel('decor')}>
          <PlantArt />
        </RailButton>
      </nav>
      <div className="rail-small">
        <RailButton small label="How to play" onClick={() => setPanel('help')}>
          <HelpArt size={34} />
        </RailButton>
        <RailButton
          small
          label="Sound"
          onClick={() =>
            useGame.getState().act({ type: 'setting', key: 'sound', value: !game.settings.sound })
          }
        >
          <SoundArt size={34} on={game.settings.sound} />
        </RailButton>
        <RailButton small label="Settings" onClick={() => setPanel('settings')}>
          <GearArt size={34} />
        </RailButton>
        <RailButton small label={paused ? 'Resume' : 'Pause'} onClick={pause}>
          <PauseArt size={34} paused={paused} />
        </RailButton>
      </div>
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
  const [toast, setToast] = useState('');
  useEffect(() => {
    void boot();
    return startClock();
  }, [boot]);
  useEffect(() => {
    if (!game.notice) return;
    setToast(game.notice);
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [game.notice]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const s = useGame.getState();
        if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;
        if (s.panel !== 'floor' && s.panel !== 'station') return;
        if (s.panel === 'station') s.setPanel('floor');
        else if (s.selected !== null && !s.paused) s.select(null);
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
  const dialogue = conversations.find((c) => c.id === useGame.getState().dialogue?.id);
  const dialogTitles: Partial<Record<Panel, string>> = {
    recipe: 'Recipe',
    settings: 'Settings',
    dialogue: dialogue?.customer ?? 'Chat',
    pos: 'Open tabs',
    decor: 'Decorate',
    dice: 'House dice',
    help: 'How to play',
    stock: 'Restock',
    menu: 'Tonight’s menu',
  };
  const dialogArt: Partial<Record<Panel, ReactNode>> = {
    recipe: <BookArt size={40} />,
    settings: <GearArt size={40} />,
    pos: <ReceiptArt size={40} />,
    decor: <PlantArt size={40} />,
    dice: <DiceArt size={40} />,
    help: <HelpArt size={40} />,
    stock: <BoxArt size={40} />,
    menu: <CocktailArt size={40} />,
  };
  const atStation = panel === 'station' || panel === 'recipe';
  const sidePanel = !atStation && phase !== 'service';
  return (
    <div
      className={
        'game-shell theme-' +
        game.settings.theme +
        (game.settings.reducedMotion ? ' reduced-motion' : '') +
        (atStation ? ' station-mode' : '') +
        (sidePanel ? ' with-side' : '')
      }
    >
      {sidePanel && phase === 'opening' && <OpeningCard />}
      {sidePanel && phase === 'closing' && <ClosingCard />}
      {sidePanel && phase === 'recap' && <RecapCard />}
      <main className="scene">
        <Suspense
          fallback={
            <div className="scene-loading">
              <CocktailArt size={48} />
              <span>Loading…</span>
            </div>
          }
        >
          <BarScene />
        </Suspense>
        {!atStation && phase === 'service' && <ToolTray />}
        {!atStation && phase === 'service' && game.guests.length === 0 && (
          <div className="empty-hint">No guests yet. Someone will walk in soon.</div>
        )}
        <div className="top-center">
          {tasks.length > 0 && (
            <div className="task-pill">
              <span className="walking-dot" />
              {tasks[0].operation === 'seat'
                ? 'Seating'
                : tasks[0].operation === 'order'
                  ? 'Taking order from'
                  : tasks[0].operation === 'pay'
                    ? 'Settling up with'
                    : tasks[0].operation === 'food'
                      ? 'Bringing food to'
                      : 'Walking to'}{' '}
              {game.guests.find((g) => g.id === tasks[0].id)?.name}
              <button onClick={cancelTasks} aria-label="Cancel queued tasks">
                <X size={14} strokeWidth={3} />
              </button>
            </div>
          )}
          {toast && (
            <p className="toast" role="status" aria-live="polite" key={toast}>
              {toast}
            </p>
          )}
        </div>
      </main>
      {atStation && <Station />}
      <Hud />
      <Dialog
        open={focusPanel}
        onOpenChange={(open) => {
          if (!open) setPanel(panel === 'recipe' ? 'station' : 'floor');
        }}
        title={dialogTitles[panel] ?? ''}
        art={dialogArt[panel]}
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
          <HelpPanel />
        )}
      </Dialog>
      {paused && !focusPanel && (
        <div className="pause-overlay">
          <div className="phase-card">
            <PauseArt size={64} paused />
            <h2>Paused</h2>
            <Button onClick={pause}>
              <Play size={17} /> Resume
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

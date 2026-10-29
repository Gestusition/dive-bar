import Station from './Station';
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Home,
  Lightbulb,
  Play,
  Upload,
  X,
} from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import {
  conversations,
  money,
  names,
  prices,
  recipeById,
  recipeMethod,
  recipes,
} from '../game/content';
import { ambience, upgradeInfo, type Game, type Guest, type Upgrade } from '../game/engine';
import { backupName, encodeBackup } from '../game/storage';
import { startClock, useGame, type Panel } from '../game/store';
import { MenuPanel, StockPanel } from './Management';
import {
  BellArt,
  BookArt,
  BoxArt,
  CalendarArt,
  CandleArt,
  CocktailArt,
  CoinsArt,
  DrinkArt,
  FrameArt,
  GearArt,
  GlassArt,
  GlassShapeArt,
  HeartArt,
  HelpArt,
  HostArt,
  IceArt,
  JukeboxArt,
  LightsArt,
  PauseArt,
  PlantArt,
  ReceiptArt,
  ShakerArt,
  SoundArt,
  SpongeArt,
  StirArt,
  TrashArt,
} from './art';
const BarScene = lazy(() => import('../view/BarScene'));
/** Stay mounted for `ms` after `show` turns off, so a closing animation can play. */
function useExit(show: boolean, ms: number) {
  const [mounted, setMounted] = useState(show);
  useEffect(() => {
    if (show || !ms) {
      setMounted(show);
      return;
    }
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [show, ms]);
  return mounted;
}
const SHIFT = 420;
function Title() {
  const { loaded, hasSave, start, saveError, game } = useGame();
  // One highlighted option at a time; it follows the pointer and keyboard focus.
  // With a save, Continue starts highlighted; a first-time Play stays plain until pointed at.
  const [hovered, setActive] = useState<number | null>(null);
  const active = hovered ?? (hasSave ? 0 : -1);
  const option = (i: number) => ({
    className: 'title-option ' + (active === i ? 'active' : ''),
    onMouseEnter: () => setActive(i),
    onFocus: () => setActive(i),
  });
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
          <button
            disabled={!loaded}
            onClick={() => {
              lockLandscape();
              start();
            }}
            {...option(0)}
          >
            {loaded ? (hasSave ? 'Continue' : 'Play') : 'Loading…'}
            {loaded && hasSave && (
              <small aria-hidden="true">
                Night {game.day} · {money(game.cash)}
              </small>
            )}
          </button>
          {hasSave && (
            <button
              {...option(1)}
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
const toolLabel = {
  shaker: 'Shaker',
  mixing_glass: 'Mixing glass',
  old_fashioned_glass: 'Rocks glass',
  build_glass: 'Build in the glass',
} as const;
const glassLabel = {
  cocktail_glass: 'Coupe',
  old_fashioned_glass: 'Rocks',
  highball: 'Highball',
  mug: 'Mug',
  hurricane: 'Hurricane',
} as const;
const glassShape = {
  cocktail_glass: 'coupe',
  old_fashioned_glass: 'rocks',
  highball: 'highball',
  mug: 'mug',
  hurricane: 'hurricane',
} as const;
export function RecipeCard({ id }: { id: string }) {
  const r = recipeById(id);
  const m = recipeMethod(r);
  const chilled = r.service.glass === 'chilled_cocktail_glass';
  return (
    <div className="recipe-card">
      <div className="recipe-heading">
        <DrinkArt size={56} id={r.id} />
        <h3>{r.name}</h3>
      </div>
      {/* How it is made comes first, large enough to read at a glance. */}
      <div className="recipe-method">
        <div className="method-chips">
          <span>
            {m.tool === 'shaker' ? <ShakerArt size={30} /> : <StirArt size={30} />}
            {toolLabel[m.tool]}
          </span>
          <span>
            {m.technique === 'shake' ? <ShakerArt size={30} /> : <StirArt size={30} />}
            {m.dissolve
              ? 'Muddle, then ' + m.technique
              : m.technique === 'shake'
                ? 'Shake'
                : 'Stir'}
          </span>
          <span>
            <GlassShapeArt size={30} shape={glassShape[m.glass]} />
            {glassLabel[m.glass]}
            {chilled ? ', chilled' : ''}
          </span>
        </div>
        <p>
          {r.preparation?.notes ??
            (r.id === 'margarita'
              ? 'Chill a cocktail glass. Add tequila, triple sec and lime juice to a shaker with ice. Shake, then strain. A half salt rim is optional.'
              : r.id === 'manhattan'
                ? 'Chill a cocktail glass. Combine rye, sweet vermouth and bitters in a mixing glass with ice. Stir, strain and add a cocktail cherry.'
                : 'Select the rocks glass. Add sugar, bitters and water; muddle until dissolved. Add ice and whiskey, stir gently, then add orange and a cherry.')}
        </p>
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
  const download = async () => {
    const url = URL.createObjectURL(await encodeBackup(game));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupName(game);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        label="Jukebox music"
        description={
          (game.upgrades.jukebox ? 'Plays ' : 'Buy the jukebox in Decorate. Plays ') +
          '“Bossa Antigua” by Kevin MacLeod (incompetech.com), CC BY 4.0.'
        }
        checked={game.settings.music}
        onChange={(v) => act({ type: 'setting', key: 'music', value: v })}
      />
      <SwitchRow
        label="Bartending hints"
        description="Highlights the next step at the counter."
        checked={game.settings.hints}
        onChange={(v) => act({ type: 'setting', key: 'hints', value: v })}
      />
      <SwitchRow
        label="Reduced motion"
        description="Fewer animations."
        checked={game.settings.reducedMotion}
        onChange={(v) => act({ type: 'setting', key: 'reducedMotion', value: v })}
      />
      <div className="field save-field">
        <h4>Save file</h4>
        <div className="backup-actions">
          <Button variant="secondary" size="sm" onClick={download}>
            <Download size={16} /> Export backup
          </Button>
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
            <Upload size={16} /> Import
          </Button>
        </div>
        <input
          hidden
          ref={input}
          type="file"
          accept=".divebar,.json,text/plain,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              await importSave(await file.text());
              setError('');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not read that save.');
            }
          }}
        />
        <p className="hint">
          Progress saves automatically on this device. Backups are checked for damage when you
          import them.
        </p>
      </div>
      {(error || saveError) && (
        <p role="alert" className="error-text">
          {error || saveError}
        </p>
      )}
    </div>
  );
}
const decorItems: { id: Upgrade; name: string; description: string; art: ReactNode }[] = [
  {
    id: 'barback',
    name: 'Host',
    description: 'Greets guests at the door, shows them to a seat and washes glasses.',
    art: <HostArt size={52} />,
  },
  {
    id: 'jukebox',
    name: 'Jukebox',
    description: 'Soft music all night. +2% tips.',
    art: <JukeboxArt size={52} />,
  },
  {
    id: 'doorLights',
    name: 'Door lights',
    description: 'String lights over the door draw more people in.',
    art: <LightsArt size={52} />,
  },
  {
    id: 'counterDecor',
    name: 'Counter candles',
    description: 'Candles and a little vase on the bar. +1% tips.',
    art: <CandleArt size={52} />,
  },
  {
    id: 'wallArt',
    name: 'Wall pictures',
    description: 'Framed prints for the bare walls. +1% tips.',
    art: <FrameArt size={52} />,
  },
  {
    id: 'plant',
    name: 'Corner plant',
    description: 'A bit of green for the corner. +1% tips.',
    art: <PlantArt size={52} />,
  },
  {
    id: 'neon',
    name: 'Neon sign',
    description: 'Lights up the sign behind the bar. +1% tips.',
    art: <BellArt size={52} />,
  },
];
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
      <p className="hint">
        A nicer room means better tips. Right now: +{Math.round(ambience(game) * 100)}% on every
        tip.
      </p>
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
              disabled={game.upgrades[item.id] || game.cash < upgradeInfo[item.id].cost}
              onClick={() => act({ type: 'buy', item: item.id })}
            >
              {game.upgrades[item.id] ? (
                <>
                  <Check size={14} /> Owned
                </>
              ) : (
                money(upgradeInfo[item.id].cost)
              )}
            </Button>
          </div>
        ))}
      </div>
    </>
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
    [
      <ReceiptArt key="r" size={30} />,
      'Get paid',
      'Settle the bill. Friends say how they want to split it, so listen. Tips show up as they pay.',
    ],
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
// Phase content lives inside the side panel's drawer, which already shows the title.
function Section({ children }: { title: string; children: ReactNode }) {
  return <div className="drawer-content">{children}</div>;
}
function OpeningCard() {
  const { game, select, setPanel, act } = useGame();
  return (
    <Section title="Get ready">
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
      <Button variant="ghost" size="sm" className="edit-menu" onClick={() => setPanel('menu')}>
        Edit menu
      </Button>
      <div className="section-actions">
        <Button onClick={() => act({ type: 'open' })}>
          Open the bar <ArrowRight size={17} />
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            select(-1);
            setPanel('station');
          }}
        >
          Practice
        </Button>
      </div>
    </Section>
  );
}
function ClosingCard() {
  const { game, setPanel, act } = useGame();
  const items = [
    {
      key: 'wipe',
      label: 'Wipe counter',
      art: <SpongeArt size={32} />,
      done: game.closing.wipe,
      run: () => act({ type: 'wipe' }),
    },
    {
      key: 'trash',
      label: 'Take out trash',
      art: <TrashArt size={32} />,
      done: game.closing.trash,
      run: () => act({ type: 'trash' }),
    },
    {
      key: 'restock',
      label: 'Restock shelves',
      art: <BoxArt size={32} />,
      done: game.closing.restock,
      run: () => setPanel('stock'),
    },
    {
      key: 'wash',
      label: 'Wash glasses',
      art: <GlassArt size={32} />,
      done: game.dirtyGlasses === 0,
      run: () => act({ type: 'wash' }),
    },
  ];
  return (
    <Section title="Closing time">
      <div className="checklist">
        {items.map((item) => (
          <button key={item.key} className={item.done ? 'done' : ''} onClick={item.run}>
            {item.art}
            <span>{item.label}</span>
            <i>{item.done ? <Check size={16} strokeWidth={3} /> : null}</i>
          </button>
        ))}
      </div>
      <div className="section-actions">
        <Button onClick={() => act({ type: 'finish' })}>
          Close the bar <ArrowRight size={16} />
        </Button>
      </div>
    </Section>
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
    <Section title={'Night ' + game.day + ' complete'}>
      <div className="recap-grid">
        {stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="section-actions">
        <Button onClick={() => act({ type: 'nextDay' })}>
          Next night <ArrowRight size={16} />
        </Button>
        <Button variant="secondary" onClick={() => setPanel('decor')}>
          Decorate
        </Button>
      </div>
    </Section>
  );
}
function ServiceCard() {
  const { game, act } = useGame();
  const waiting = game.guests.filter((g) => g.status !== 'leaving').length;
  const tools = [
    {
      label: 'Wipe',
      art: <SpongeArt size={40} />,
      badge: game.mess || null,
      run: () => act({ type: 'wipe' }),
    },
    {
      label: 'Wash',
      art: <GlassArt size={40} />,
      badge: game.dirtyGlasses || null,
      run: () => act({ type: 'wash' }),
    },
    {
      label: 'Ice',
      art: <IceArt size={40} />,
      badge: game.ice,
      run: () => act({ type: 'refillIce' }),
    },
    {
      label: 'Last orders',
      art: <BellArt size={40} />,
      badge: null,
      run: () => act({ type: 'finish' }),
    },
  ];
  return (
    <Section title="Behind the bar">
      <p className="hint">
        {waiting
          ? waiting + (waiting === 1 ? ' guest' : ' guests') + ' in — tap a bubble to help them.'
          : 'No guests yet. Someone will walk in soon.'}
      </p>
      <div className="tool-grid">
        {tools.map((t) => (
          <button key={t.label} className="tool-tile" onClick={t.run} aria-label={t.label}>
            {t.art}
            {t.badge !== null && <span className="badge">{t.badge}</span>}
            <small>{t.label}</small>
          </button>
        ))}
      </div>
      <p className="hint small-stats">
        {game.cleanGlasses} clean glasses · {game.mess} spills
      </p>
    </Section>
  );
}
type Drawer = 'phase' | 'recipes' | 'decor';
function RecipesDrawer() {
  const { game } = useGame();
  const menu = recipes.filter((r) => game.activeMenu.includes(r.id));
  const [picked, setPicked] = useState(menu[0]?.id ?? recipes[0].id);
  // Fall back to the first drink if the picked one leaves tonight's menu.
  const id = menu.some((r) => r.id === picked) ? picked : (menu[0]?.id ?? recipes[0].id);
  const setId = setPicked;
  return (
    <>
      <div className="segmented">
        {menu.map((r) => (
          <button key={r.id} aria-pressed={id === r.id} onClick={() => setId(r.id)}>
            {r.name}
          </button>
        ))}
      </div>
      <RecipeCard id={id} />
    </>
  );
}
function RailTile({
  label,
  art,
  active,
  badge,
  attention,
  onClick,
}: {
  label: string;
  art: ReactNode;
  active?: boolean;
  badge?: number | null;
  attention?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={'rail-tile ' + (active ? 'active ' : '') + (attention ? 'attention' : '')}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {art}
      {!!badge && <span className="badge">{badge}</span>}
      <small>{label}</small>
    </button>
  );
}
function Hud({
  drawer,
  setDrawer,
}: {
  drawer: Drawer | null;
  setDrawer: (d: Drawer | null) => void;
}) {
  const { game, paused, pause, setPanel } = useGame();
  const time = Math.max(0, SHIFT - game.seconds);
  const progress = Math.min(1, game.seconds / SHIFT);
  const phase = game.phase;
  const toggle = (d: Drawer) => setDrawer(drawer === d ? null : d);
  // Keep the last drawer's content on screen while the panel slides shut. Moving
  // between drawers swaps the content in place, with no blank frame in between.
  const [last, setLast] = useState(drawer);
  const reduced = game.settings.reducedMotion;
  useEffect(() => {
    if (drawer) {
      setLast(drawer);
      return;
    }
    if (reduced) {
      setLast(null);
      return;
    }
    const t = setTimeout(() => setLast(null), 320);
    return () => clearTimeout(t);
  }, [drawer, reduced]);
  const shown = drawer ?? last;
  // Keep the counter label and toasts clear of the open drawer.
  useEffect(() => {
    const wide = !window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
    const covered = drawer && wide ? (drawer === 'phase' ? 300 : 360) : 0;
    document.documentElement.style.setProperty('--scene-inset', covered + 'px');
  }, [drawer]);
  const phaseTile =
    phase === 'opening'
      ? { label: 'Get ready', art: <CocktailArt size={40} />, title: 'Get ready' }
      : phase === 'closing'
        ? { label: 'Closing', art: <TrashArt size={40} />, title: 'Closing time' }
        : phase === 'recap'
          ? {
              label: 'Night done',
              art: <HeartArt size={40} />,
              title: 'Night ' + game.day + ' complete',
            }
          : { label: 'Bar tools', art: <SpongeArt size={40} />, title: 'Bar tools' };
  const drawerTitle: Record<Drawer, string> = {
    phase: phaseTile.title,
    recipes: 'Recipes',
    decor: 'Decorate',
  };
  return (
    <aside className="hud" aria-label="Bar status">
      <section
        className={'drawer ' + (drawer ? 'open' : '')}
        style={{ '--drawer-w': (shown === 'phase' ? 300 : 360) + 'px' } as React.CSSProperties}
        aria-label={shown ? drawerTitle[shown] : undefined}
        aria-hidden={!drawer}
        inert={!drawer}
      >
        {shown && (
          <div className="drawer-inner">
            <header>
              <h2>{drawerTitle[shown]}</h2>
              <button
                className="close-button"
                aria-label="Close panel"
                onClick={() => setDrawer(null)}
              >
                <X size={18} strokeWidth={3} />
              </button>
            </header>
            <div className="drawer-body">
              {shown === 'phase' ? (
                phase === 'opening' ? (
                  <OpeningCard />
                ) : phase === 'closing' ? (
                  <ClosingCard />
                ) : phase === 'recap' ? (
                  <RecapCard />
                ) : (
                  <ServiceCard />
                )
              ) : shown === 'recipes' ? (
                <RecipesDrawer />
              ) : (
                <DecorPanel />
              )}
            </div>
          </div>
        )}
      </section>
      <div className="rail">
        <div className="rail-stat calendar" title={'Night ' + game.day}>
          <CalendarArt size={50} />
          <strong>{game.day}</strong>
        </div>
        <div className="rail-stat money">
          <CoinsArt size={34} />
          <strong className="cash">{money(game.cash)}</strong>
        </div>
        <div className="rail-stat sky" title="Time left tonight">
          <div className="sky-dial">
            <span className="sky-sun" style={{ left: progress * 100 + '%' }} />
          </div>
          <strong className="clock">
            {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
          </strong>
        </div>
        <span className="rail-divider" />
        <RailTile
          label={phaseTile.label}
          art={phaseTile.art}
          active={drawer === 'phase'}
          attention={phase !== 'service' && drawer !== 'phase'}
          badge={phase === 'service' ? game.mess + game.dirtyGlasses || null : null}
          onClick={() => toggle('phase')}
        />
        <RailTile
          label="Recipes"
          art={<BookArt size={40} />}
          active={drawer === 'recipes'}
          onClick={() => toggle('recipes')}
        />
        <RailTile
          label="Decorate"
          art={<PlantArt size={40} />}
          active={drawer === 'decor'}
          onClick={() => toggle('decor')}
        />
        <div className="rail-small">
          <button aria-label="How to play" title="How to play" onClick={() => setPanel('help')}>
            <HelpArt size={26} />
          </button>
          <button
            aria-label="Sound"
            title="Sound"
            onClick={() =>
              useGame.getState().act({ type: 'setting', key: 'sound', value: !game.settings.sound })
            }
          >
            <SoundArt size={26} on={game.settings.sound} />
          </button>
          <button aria-label="Settings" title="Settings" onClick={() => setPanel('settings')}>
            <GearArt size={26} />
          </button>
          <button
            aria-label={paused ? 'Resume' : 'Pause'}
            title={paused ? 'Resume' : 'Pause'}
            onClick={pause}
          >
            <PauseArt size={26} paused={paused} />
          </button>
        </div>
      </div>
    </aside>
  );
}
/**
 * On the first two nights a single line at the top says what to do next on the
 * floor, following whoever needs you most. It goes quiet while you walk.
 */
function floorGuide(game: Game, walking: boolean): string | null {
  if (!game.settings.hints || game.day > 2) return null;
  if (game.phase === 'opening')
    return 'Open “Get ready”, check tonight’s menu, then tap Open the bar.';
  if (game.phase === 'closing') return 'Open “Closing” and tick off every job, then close the bar.';
  if (game.phase === 'recap')
    return 'Night done! Decor raises your tips. Start the next night when you’re ready.';
  if (walking) return null;
  const here = game.guests.filter((g) => g.status !== 'leaving');
  const first = (status: Guest['status']) => here.find((g) => g.status === status);
  const pay = first('pay'),
    ready = first('ready'),
    ordered = here.find((g) => g.status === 'ordered' && !g.served),
    waiting = first('waiting');
  if (pay) return pay.name + ' wants to pay. Tap the coin bubble and settle up.';
  if (ready) return ready.name + ' is ready. Tap the ? bubble to take the order.';
  if (ordered) return 'Tap ' + ordered.name + '’s bubble, then Make drink.';
  if (waiting) return waiting.name + ' is at the door. Tap the ! bubble, then Seat guest.';
  if (here.length) return 'Let them settle in. Their bubble changes when they need you.';
  return 'The doors are open. Someone will walk in soon.';
}
/** On phones, go full screen and hold landscape where the browser allows it. */
let wantFullScreen = false;
function lockLandscape() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  wantFullScreen = true;
  if (document.fullscreenElement) return;
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (o: 'landscape') => Promise<void>;
  };
  document.documentElement
    .requestFullscreen?.()
    .then(() => orientation.lock?.('landscape'))
    .catch(() => {});
}
/**
 * Phones drop full screen when the player switches apps, locks the screen or swipes
 * the system bars in. The browser only lets a page go back to full screen from a
 * tap, so the next tap on the game does it.
 */
function useFullScreenComeback() {
  useEffect(() => {
    const again = () => {
      if (wantFullScreen && !document.fullscreenElement) lockLandscape();
    };
    document.addEventListener('pointerup', again, true);
    return () => document.removeEventListener('pointerup', again, true);
  }, []);
}
/** Covers the game on phones held upright; the bar only works in landscape. */
function RotateNotice() {
  return (
    <div className="rotate-notice" role="alert">
      <svg
        className="art rotate-phone"
        viewBox="0 0 64 64"
        width="96"
        height="96"
        aria-hidden="true"
      >
        <rect x="20" y="6" width="24" height="52" rx="5" fill="#fbf3e4" />
        <rect x="24" y="12" width="16" height="36" rx="2" fill="#f6b545" />
        <circle cx="32" cy="53" r="1.6" fill="#231a24" />
      </svg>
      <h2>Turn your phone sideways</h2>
      <p>Dive Bar is played in landscape.</p>
    </div>
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
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  useFullScreenComeback();
  const isDialog = (p: Panel) =>
    ['recipe', 'settings', 'dialogue', 'decor', 'help', 'stock', 'menu'].includes(p);
  const [lastDialog, setLastDialog] = useState<Panel>('help');
  useEffect(() => {
    if (isDialog(panel)) setLastDialog(panel);
  }, [panel]);
  const pauseOpen = paused && !isDialog(panel);
  const pauseMounted = useExit(pauseOpen, game.settings.reducedMotion ? 0 : 220);
  // The counter needs the room: tuck the drawer away there and bring it back
  // when the player returns to the floor.
  const tucked = useRef<Drawer | null>(null);
  useEffect(() => {
    if (panel === 'station') {
      setDrawer((d) => {
        if (d) tucked.current = d;
        return null;
      });
    } else if (panel === 'floor' && tucked.current) {
      setDrawer(tucked.current);
      tucked.current = null;
    }
  }, [panel]);
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
        else if (document.querySelector('.drawer.open')) setDrawer(null);
        else if (s.selected !== null && !s.paused) s.select(null);
        else s.pause();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);
  if (title)
    return (
      <>
        <Title />
        <RotateNotice />
      </>
    );
  const guest = game.guests.find((g) => g.id === selected);
  const recipeId = selected === -1 ? practiceRecipe : (guest?.recipeId ?? practiceRecipe);
  const focusPanel = isDialog(panel);
  // While a window plays its closing animation, keep showing what it held.
  const shownPanel = focusPanel ? panel : lastDialog;
  const dialogue = conversations.find((c) => c.id === useGame.getState().dialogue?.id);
  const dialogTitles: Partial<Record<Panel, string>> = {
    recipe: 'Recipe',
    settings: 'Settings',
    dialogue: dialogue?.customer ?? 'Chat',
    decor: 'Decorate',
    help: 'How to play',
    stock: 'Restock',
    menu: 'Tonight’s menu',
  };
  const dialogArt: Partial<Record<Panel, ReactNode>> = {
    recipe: <BookArt size={40} />,
    settings: <GearArt size={40} />,
    decor: <PlantArt size={40} />,
    help: <HelpArt size={40} />,
    stock: <BoxArt size={40} />,
    menu: <CocktailArt size={40} />,
  };
  const atStation = panel === 'station' || panel === 'recipe';
  return (
    <div
      className={
        'game-shell theme-' +
        game.settings.theme +
        (game.settings.reducedMotion ? ' reduced-motion' : '') +
        (atStation ? ' station-mode' : '')
      }
    >
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
        <div className="top-center">
          {!atStation && floorGuide(game, tasks.length > 0) && (
            <p className="floor-guide" role="status">
              <Lightbulb size={16} strokeWidth={2.5} />
              {floorGuide(game, tasks.length > 0)}
            </p>
          )}
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
              {tasks.length > 1 && (
                <small className="task-more">then {tasks.length - 1} more</small>
              )}
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
      <Hud drawer={drawer} setDrawer={setDrawer} />
      <Dialog
        open={focusPanel}
        onOpenChange={(open) => {
          if (!open) setPanel(panel === 'recipe' ? 'station' : 'floor');
        }}
        title={dialogTitles[shownPanel] ?? ''}
        art={dialogArt[shownPanel]}
      >
        {shownPanel === 'settings' ? (
          <SettingsPanel />
        ) : shownPanel === 'recipe' ? (
          <RecipeCard id={recipeId} />
        ) : shownPanel === 'dialogue' ? (
          <DialoguePanel />
        ) : shownPanel === 'decor' ? (
          <DecorPanel />
        ) : shownPanel === 'stock' ? (
          <StockPanel />
        ) : shownPanel === 'menu' ? (
          <MenuPanel />
        ) : (
          <HelpPanel />
        )}
      </Dialog>
      {pauseMounted && (
        <div className={'pause-overlay ' + (pauseOpen ? '' : 'closing')}>
          <div className="phase-card">
            <PauseArt size={64} paused />
            <h2>Paused</h2>
            <Button onClick={pause}>
              <Play size={17} /> Resume
            </Button>
            <Button variant="secondary" onClick={() => useGame.getState().toTitle()}>
              <Home size={17} /> Main menu
            </Button>
          </div>
        </div>
      )}
      <RotateNotice />
    </div>
  );
}

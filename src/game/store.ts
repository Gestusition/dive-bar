import { create } from 'zustand';
import {
  conversationFor,
  newGame,
  reduceGame,
  seatProblem,
  type Action,
  type Game,
  type Guest,
} from './engine';
import { conversations } from './content';
import { play, setMusic, setSoundSwitch } from './audio';
import { decodeBackup, loadSave, saveGame } from './storage';
import {
  advanceWalk,
  bartenderHome,
  servicePosition,
  walkingSpeed,
  type FloorPoint,
} from './navigation';
export type Panel =
  'floor' | 'station' | 'recipe' | 'settings' | 'dialogue' | 'decor' | 'help' | 'stock' | 'menu';
interface Store {
  game: Game;
  panel: Panel;
  selected: number | null;
  title: boolean;
  loaded: boolean;
  hasSave: boolean;
  paused: boolean;
  practiceRecipe: string;
  saveError: string;
  dialogue: { id: string; node: string; reply: string; next?: string } | null;
  /** What the hands are doing at the counter right now, for the drink on screen. */
  mixing: 'shake' | 'stir' | 'muddle' | null;
  /** The last bottle poured, so the counter can show it tipping into the tin. */
  pouring: { id: string; at: number } | null;
  tasks: {
    id: number;
    operation: 'seat' | 'order' | 'serve' | 'pay' | 'food' | 'move';
    left: number;
    foodType?: 'pretzel' | 'toastie';
    split?: 'one' | 'split';
  }[];
  bartenderPosition: FloorPoint;
  act: (a: Action) => void;
  setPanel: (p: Panel) => void;
  select: (id: number | null) => void;
  start: (fresh?: boolean) => void;
  toTitle: () => void;
  pause: () => void;
  boot: () => Promise<void>;
  talk: (id: number) => void;
  choose: (id: string) => void;
  continueDialogue: () => void;
  setPracticeRecipe: (id: string) => void;
  enqueue: (
    id: number,
    operation: Store['tasks'][number]['operation'],
    extra?: { foodType?: 'pretzel' | 'toastie'; split?: 'one' | 'split' },
  ) => void;
  cancelTasks: () => void;
  importSave: (text: string) => Promise<void>;
  setMixing: (m: Store['mixing']) => void;
}
const reading = new Set<Panel>([
  'recipe',
  'settings',
  'dialogue',
  'decor',
  'help',
  'stock',
  'menu',
]);
type Task = Store['tasks'][number];
/** Whether a queued task still makes sense once the bartender gets there. */
function stillNeeded(g: Guest | undefined, t: Task) {
  if (!g) return false;
  if (t.operation === 'seat') return g.status === 'waiting';
  if (t.operation === 'order') return g.status === 'ready';
  if (t.operation === 'pay') return g.status === 'pay' && !g.paid;
  if (t.operation === 'food')
    return (
      g.food === 'ready' || (g.food === 'none' && ['ordered', 'drinking', 'pay'].includes(g.status))
    );
  return g.status !== 'leaving';
}
const seed = () => {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
  } catch {
    return (Date.now() ^ (Math.random() * 4294967296)) >>> 0 || 1;
  }
};
/** Sounds for what changed: someone came in, paid, got a drink, or a step at the counter. */
function sounds(before: Game, after: Game, a: Action) {
  const old = new Map(before.guests.map((g) => [g.id, g]));
  if (after.guests.some((g) => !old.has(g.id))) play('door');
  const paid = after.guests.filter((g) => g.paid && !old.get(g.id)?.paid);
  if (paid.length) {
    play('register');
    if (paid.some((g) => g.tip > 0)) setTimeout(() => play('coin'), 420);
  }
  if (after.guests.some((g) => g.served && old.has(g.id) && !old.get(g.id)!.served)) play('glass');
  if (a.type !== 'prep') return;
  if (a.operation === 'transfer') play('pour');
  if (a.operation === 'ice' || a.operation === 'chill') play('ice');
  if (a.operation === 'garnish' || a.operation === 'ungarnish') play('garnish');
}
let saveChain = Promise.resolve();
const persist = (game: Game) => {
  saveChain = saveChain
    .catch(() => {})
    .then(() => saveGame(game))
    .catch(() => {
      useGame.setState({
        saveError: 'Could not save on this device. Export a backup from Settings.',
      });
    });
};
export const useGame = create<Store>((set, get) => ({
  game: newGame(),
  panel: 'floor',
  selected: null,
  title: true,
  loaded: false,
  hasSave: false,
  paused: false,
  practiceRecipe: 'margarita',
  saveError: '',
  dialogue: null,
  mixing: null,
  pouring: null,
  tasks: [],
  bartenderPosition: [...bartenderHome],
  act: (a) => {
    const before = get().game;
    // Each new night and each opening draws fresh randomness from the device.
    if (a.type === 'start' || a.type === 'open' || a.type === 'nextDay') a = { ...a, seed: seed() };
    const game = reduceGame(before, a);
    set({ game });
    if (game === before) return;
    sounds(before, game, a);
    if (a.type === 'prep' && a.operation === 'transfer') {
      const p = a.id === -1 ? before.practice : before.guests.find((g) => g.id === a.id)?.prep;
      if (p?.measure) set({ pouring: { id: p.measure.id, at: performance.now() } });
    }
    if (a.type !== 'tick') persist(game);
  },
  setPanel: (panel) => set({ panel }),
  select: (selected) => set({ selected }),
  start: (fresh) => {
    if (fresh)
      set({
        game: reduceGame(newGame(), { type: 'start', seed: seed() }),
        hasSave: false,
        tasks: [],
        bartenderPosition: [...bartenderHome],
      });
    else if (get().game.phase === 'title') get().act({ type: 'start' });
    set({ title: false, paused: false, panel: 'floor' });
  },
  // Save and go back to the title screen; Continue picks up from here.
  toTitle: () => {
    persist(get().game);
    set({ title: true, hasSave: true, paused: false, panel: 'floor', tasks: [], selected: null });
  },
  pause: () => set((s) => ({ paused: !s.paused })),
  boot: async () => {
    try {
      const game = await loadSave();
      if (game) set({ game, hasSave: game.phase !== 'title' });
    } catch {
      set({
        saveError: 'A saved night could not be loaded. You can start fresh or import a backup.',
      });
    }
    set({ loaded: true });
  },
  talk: (id) => {
    const guest = get().game.guests.find((g) => g.id === id);
    const c = guest && conversationFor(get().game, guest);
    if (c)
      set({ selected: id, panel: 'dialogue', dialogue: { id: c.id, node: 'start', reply: '' } });
  },
  choose: (id) => {
    const d = get().dialogue,
      selected = get().selected;
    if (!d || d.reply || selected === null) return;
    const choice = conversations
      .find((c) => c.id === d.id)
      ?.nodes.find((n) => n.id === d.node)
      ?.choices.find((c) => c.id === id);
    if (!choice) return;
    get().act({ type: 'choice', id: selected, conversationId: d.id, nodeId: d.node, choiceId: id });
    // The guest's actual answer: they may turn a suggestion down.
    set({ dialogue: { ...d, reply: get().game.notice || choice.reply, next: choice.next } });
  },
  continueDialogue: () => {
    const d = get().dialogue;
    if (d?.next) set({ dialogue: { id: d.id, node: d.next, reply: '' } });
    else set({ dialogue: null, panel: 'floor' });
  },
  setPracticeRecipe: (practiceRecipe) => set({ practiceRecipe }),
  enqueue: (id, operation, extra = {}) => {
    const { tasks, game } = get();
    const guest = game.guests.find((g) => g.id === id);
    // Say so straight away rather than walking over only to turn back.
    const problem = guest && operation === 'seat' ? seatProblem(game, guest) : null;
    if (problem) {
      set({ game: { ...game, notice: problem } });
      return;
    }
    if (tasks.some((t) => t.id === id && t.operation === operation)) return;
    if (tasks.length >= 3) {
      set({ game: { ...game, notice: 'Your hands are full. Finish what you’re doing first.' } });
      return;
    }
    set({ tasks: [...tasks, { id, operation, ...extra, left: 0.25 }] });
  },
  cancelTasks: () => set({ tasks: [] }),
  setMixing: (mixing) => set({ mixing }),
  importSave: async (text) => {
    const game = await decodeBackup(text);
    set({
      game,
      title: true,
      hasSave: true,
      paused: true,
      panel: 'floor',
      tasks: [],
      bartenderPosition: [...bartenderHome],
      dialogue: null,
    });
    persist(game);
  },
}));
export function startClock() {
  const timer = window.setInterval(() => {
    const s = useGame.getState();
    if (s.title || s.paused || reading.has(s.panel)) return;
    s.act({ type: 'tick', dt: 0.25 });
    const before = useGame.getState().tasks;
    const guests = useGame.getState().game.guests;
    // Drop anything that no longer needs doing, such as an order a friend already gave.
    const tasks = before
      .filter((t) =>
        stillNeeded(
          guests.find((g) => g.id === t.id),
          t,
        ),
      )
      .map((t) => ({ ...t }));
    const guest = tasks[0] && guests.find((g) => g.id === tasks[0].id);
    const target = guest ? servicePosition(guest) : bartenderHome;
    const bartenderPosition = advanceWalk(s.bartenderPosition, target, walkingSpeed * 0.25);
    useGame.setState({ bartenderPosition });
    if (tasks[0] && guest) {
      if (Math.hypot(bartenderPosition[0] - target[0], bartenderPosition[1] - target[1]) < 0.001)
        tasks[0].left -= 0.25;
      if (tasks[0].left <= 0) {
        const t = tasks.shift()!;
        useGame.getState().act({
          type: 'guest',
          id: t.id,
          operation: t.operation,
          foodType: t.foodType,
          split: t.split,
        });
      }
    }
    if (tasks.length || before.length) useGame.setState({ tasks });
  }, 250);
  const autosave = window.setInterval(() => {
    if (!useGame.getState().title) persist(useGame.getState().game);
  }, 5000);
  setSoundSwitch(() => useGame.getState().game.settings.sound);
  // The jukebox plays while the bar is open and music is on.
  const music = (s: Store) =>
    setMusic(
      s.loaded &&
        !s.title &&
        s.game.upgrades.jukebox &&
        s.game.settings.music &&
        s.game.settings.sound &&
        !document.hidden,
    );
  const unsubscribe = useGame.subscribe(music);
  const hide = () => {
    music(useGame.getState());
    if (document.hidden && useGame.getState().loaded && useGame.getState().game.phase !== 'title') {
      useGame.setState({ paused: true });
      persist(useGame.getState().game);
    }
  };
  document.addEventListener('visibilitychange', hide);
  return () => {
    clearInterval(timer);
    clearInterval(autosave);
    unsubscribe();
    setMusic(false);
    document.removeEventListener('visibilitychange', hide);
  };
}

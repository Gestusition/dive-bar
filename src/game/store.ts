import { create } from 'zustand';
import { conversationFor, newGame, reduceGame, type Action, type Game } from './engine';
import { conversations } from './content';
import { loadSave, saveGame, validateSave } from './storage';
import {
  advanceWalk,
  bartenderHome,
  servicePosition,
  walkingSpeed,
  type FloorPoint,
} from './navigation';
export type Panel =
  | 'floor'
  | 'station'
  | 'recipe'
  | 'settings'
  | 'dialogue'
  | 'pos'
  | 'decor'
  | 'dice'
  | 'help'
  | 'stock'
  | 'menu';
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
  tasks: {
    id: number;
    operation: 'seat' | 'order' | 'serve' | 'pay' | 'food' | 'move';
    left: number;
    foodType?: 'pretzel' | 'toastie';
  }[];
  bartenderPosition: FloorPoint;
  act: (a: Action) => void;
  setPanel: (p: Panel) => void;
  select: (id: number) => void;
  start: (fresh?: boolean) => void;
  pause: () => void;
  boot: () => Promise<void>;
  talk: (id: number) => void;
  choose: (id: string) => void;
  continueDialogue: () => void;
  setPracticeRecipe: (id: string) => void;
  enqueue: (
    id: number,
    operation: Store['tasks'][number]['operation'],
    foodType?: 'pretzel' | 'toastie',
  ) => void;
  cancelTasks: () => void;
  importSave: (text: string) => void;
}
const reading = new Set<Panel>([
  'recipe',
  'settings',
  'dialogue',
  'pos',
  'decor',
  'dice',
  'help',
  'stock',
  'menu',
]);
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
  tasks: [],
  bartenderPosition: [...bartenderHome],
  act: (a) => {
    const game = reduceGame(get().game, a);
    set({ game });
    if (a.type !== 'tick') {
      persist(game);
      if (!(a.type === 'prep' && a.operation === 'measure' && (a.amount ?? 0) < 5))
        sound(
          a.type === 'choice'
            ? 'story'
            : a.type === 'guest' && a.operation === 'pay'
              ? 'coin'
              : 'tap',
        );
    }
  },
  setPanel: (panel) => set({ panel }),
  select: (selected) => set({ selected }),
  start: (fresh) => {
    if (fresh)
      set({
        game: reduceGame(newGame(), { type: 'start' }),
        hasSave: false,
        tasks: [],
        bartenderPosition: [...bartenderHome],
      });
    else if (get().game.phase === 'title') get().act({ type: 'start' });
    set({ title: false, paused: false, panel: 'floor' });
    sound('coin');
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
    set({ dialogue: { ...d, reply: choice.reply, next: choice.next } });
  },
  continueDialogue: () => {
    const d = get().dialogue;
    if (d?.next) set({ dialogue: { id: d.id, node: d.next, reply: '' } });
    else set({ dialogue: null, panel: 'floor' });
  },
  setPracticeRecipe: (practiceRecipe) => set({ practiceRecipe }),
  enqueue: (id, operation, foodType) => {
    const tasks = get().tasks;
    if (tasks.length < 2 && !tasks.some((t) => t.id === id && t.operation === operation))
      set({ tasks: [...tasks, { id, operation, foodType, left: 0.35 }] });
  },
  cancelTasks: () => set({ tasks: [] }),
  importSave: (text) => {
    const game = validateSave(JSON.parse(text));
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
    const tasks = useGame.getState().tasks.map((t) => ({ ...t }));
    const guest = tasks[0] && useGame.getState().game.guests.find((g) => g.id === tasks[0].id);
    const target = guest ? servicePosition(guest) : bartenderHome;
    const bartenderPosition = advanceWalk(s.bartenderPosition, target, walkingSpeed * 0.25);
    useGame.setState({ bartenderPosition });
    if (tasks[0]) {
      if (!guest) tasks.shift();
      else if (
        Math.hypot(bartenderPosition[0] - target[0], bartenderPosition[1] - target[1]) < 0.001
      )
        tasks[0].left -= 0.25;
    }
    if (tasks[0]) {
      if (tasks[0].left <= 0) {
        const t = tasks.shift()!;
        useGame
          .getState()
          .act({ type: 'guest', id: t.id, operation: t.operation, foodType: t.foodType });
      }
      useGame.setState({ tasks });
    }
  }, 250);
  const autosave = window.setInterval(() => {
    if (!useGame.getState().title) persist(useGame.getState().game);
  }, 5000);
  const hide = () => {
    if (document.hidden && useGame.getState().loaded && useGame.getState().game.phase !== 'title') {
      useGame.setState({ paused: true });
      persist(useGame.getState().game);
    }
  };
  document.addEventListener('visibilitychange', hide);
  return () => {
    clearInterval(timer);
    clearInterval(autosave);
    document.removeEventListener('visibilitychange', hide);
  };
}
let audio: AudioContext | null = null;
export function sound(kind: 'tap' | 'coin' | 'story') {
  if (!useGame.getState().game.settings.sound) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      kind === 'coin' ? 660 : kind === 'story' ? 440 : 320,
      audio.currentTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === 'coin' ? 990 : 220,
      audio.currentTime + 0.12,
    );
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.15);
  } catch {
    /* Silent mode remains playable. */
  }
}

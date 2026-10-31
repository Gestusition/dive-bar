import { create } from 'zustand';
import {
  conversationFor,
  decorShown,
  newGame,
  reduceGame,
  seatProblem,
  type Action,
  type Game,
  type Guest,
} from './engine';
import { conversations } from './content';
import { deviceRandom } from './random';
import { cleanupInfo, cleanupTarget, type CleanupJob, type CleanupKind } from './cleanup';
import { hostDestination, hostHome, type HostVisit } from './host';
import { play, setMusic, setSoundSwitch } from './audio';
import {
  decodeBackup,
  loadSave,
  MAX_BACKUP_BYTES,
  NewerSave,
  recoverSetAside,
  saveGame,
  setAsideSave,
} from './storage';
import {
  advanceWalk,
  guestPath,
  guestSpeed,
  stepAlong,
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
  /**
   * The last bottle poured, so the counter can show it tipping into the tin. A free pour
   * is `holding` for as long as the button is held down.
   */
  pouring: { id: string; at: number; holding?: boolean; quantity?: number } | null;
  /** The step of the drink open at the counter; what is strained follows it. */
  benchStep: 'prep' | 'pour' | 'mix' | 'garnish';
  tasks: {
    id: number;
    operation: 'seat' | 'order' | 'serve' | 'pay' | 'food' | 'move';
    left: number;
    foodType?: 'pretzel' | 'toastie';
    split?: 'one' | 'split';
  }[];
  bartenderPosition: FloorPoint;
  hostPosition: FloorPoint;
  /** Where the host is heading, so the scene can walk one smooth route there. */
  hostTarget: FloorPoint;
  hostVisit: HostVisit | null;
  cleanupJob: CleanupJob | null;
  cleanupQueue: CleanupKind[];
  queueCleanup: (kind: CleanupKind) => void;
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
  importSave: (file: File) => Promise<void>;
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
    return g.food === 'ready' || (g.food === 'none' && ['ordered', 'drinking'].includes(g.status));
  return g.status !== 'leaving';
}
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
  benchStep: 'prep',
  tasks: [],
  bartenderPosition: [...bartenderHome],
  hostPosition: [...hostHome],
  hostTarget: [...hostHome],
  hostVisit: null,
  cleanupJob: null,
  cleanupQueue: [],
  queueCleanup: (kind) => {
    const s = get();
    if (s.cleanupJob?.kind === kind || s.cleanupQueue.includes(kind)) return;
    if (kind === 'wash' && !s.game.dirtyGlasses) return;
    if (
      s.game.phase === 'closing' &&
      kind !== 'wash' &&
      s.game.closing[kind] &&
      (kind === 'wipe' ? s.game.mess === 0 : s.game.trash === 0)
    )
      return;
    set({ cleanupQueue: [...s.cleanupQueue, kind] });
  },
  act: (a) => {
    if (a.type === 'wipe' || a.type === 'trash' || a.type === 'wash') {
      get().queueCleanup(a.type);
      return;
    }
    const before = get().game;
    const game = reduceGame(before, a, deviceRandom);
    set({ game });
    if (game === before) return;
    sounds(before, game, a);
    if (a.type === 'prep' && a.operation === 'transfer') {
      const p = a.id === -1 ? before.practice : before.guests.find((g) => g.id === a.id)?.prep;
      if (p?.measure)
        set({
          pouring: { id: p.measure.id, at: performance.now(), quantity: p.measure.quantity },
        });
    }
    if (a.type !== 'tick') persist(game);
  },
  setPanel: (panel) => set({ panel }),
  select: (selected) => set({ selected }),
  start: (fresh) => {
    if (fresh) {
      set({
        game: reduceGame(newGame(), { type: 'start' }, deviceRandom),
        hasSave: true,
        tasks: [],
        bartenderPosition: [...bartenderHome],
        hostPosition: [...hostHome],
        hostTarget: [...hostHome],
        hostVisit: null,
        cleanupJob: null,
        cleanupQueue: [],
        selected: null,
        dialogue: null,
        mixing: null,
        pouring: null,
        practiceRecipe: 'margarita',
        saveError: '',
      });
      persist(get().game);
    } else if (get().game.phase === 'title') get().act({ type: 'start' });
    set({ title: false, paused: false, panel: 'floor' });
  },
  // Save and go back to the title screen; Continue picks up from here.
  toTitle: () => {
    persist(get().game);
    set({
      title: true,
      hasSave: true,
      paused: false,
      panel: 'floor',
      tasks: [],
      selected: null,
      cleanupJob: null,
      cleanupQueue: [],
      hostVisit: null,
    });
  },
  pause: () => set((s) => ({ paused: !s.paused })),
  boot: async () => {
    try {
      // A save set aside by an earlier boot comes back once it can be read again.
      const game = (await loadSave()) ?? (await recoverSetAside().catch(() => null));
      if (game) set({ game, hasSave: game.phase !== 'title' });
    } catch (e) {
      // A save this version cannot read is never deleted: it is kept on the device,
      // out of the way of the new bar, and the player is told.
      await setAsideSave().catch(() => {});
      set({
        saveError:
          e instanceof NewerSave
            ? 'Your saved bar is from a newer version of Dive Bar, so a new bar was started. The save is kept on this device and comes back when the game is updated.'
            : 'Your saved bar could not be read, so a new bar was started. The old save is kept on this device.',
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
  importSave: async (file) => {
    // Checked before the file is read, so a huge file never reaches memory.
    if (file.size > MAX_BACKUP_BYTES) throw Error('That file is too big to be a Dive Bar save.');
    const game = await decodeBackup(await file.text());
    set({
      game,
      title: true,
      hasSave: true,
      paused: true,
      panel: 'floor',
      tasks: [],
      bartenderPosition: [...bartenderHome],
      hostPosition: [...hostHome],
      hostTarget: [...hostHome],
      hostVisit: null,
      cleanupJob: null,
      cleanupQueue: [],
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
    advanceCleanup();
    const current = useGame.getState();
    if (!decorShown(current.game, 'barback')) {
      // Sent home: back on duty, the host starts from their spot with nothing in hand.
      if (current.hostVisit || current.hostPosition.some((v, i) => v !== hostHome[i]))
        useGame.setState({
          hostPosition: [...hostHome],
          hostTarget: [...hostHome],
          hostVisit: null,
        });
    } else if (current.cleanupJob?.actor !== 'host') {
      const next = hostDestination(current.game.guests, current.hostVisit, current.hostPosition);
      const walk = stepAlong(
        current.hostPosition,
        guestPath(current.hostPosition, next.target),
        guestSpeed * 0.25,
      );
      useGame.setState({
        hostPosition: walk.position,
        hostTarget: next.target,
        hostVisit: next.visit,
      });
    }
    if (useGame.getState().cleanupJob?.actor === 'bartender') return;
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
        decorShown(s.game, 'jukebox') &&
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

/** Work progresses on the same pausable clock as service; effects commit only on completion. */
function advanceCleanup() {
  let s = useGame.getState();
  const host = decorShown(s.game, 'barback');
  // Sent home mid-job: nothing is written until a job is done, so it starts over.
  if (!host && s.cleanupJob?.actor === 'host')
    useGame.setState({
      cleanupJob: null,
      cleanupQueue: [s.cleanupJob.kind, ...s.cleanupQueue],
    });
  if (host) {
    if (s.game.phase === 'closing') {
      if (!s.game.closing.wipe || s.game.mess > 0) s.queueCleanup('wipe');
      if (!s.game.closing.trash || s.game.trash > 0) s.queueCleanup('trash');
    }
    if (s.game.dirtyGlasses > 0 && !s.game.guests.some((g) => g.status === 'waiting'))
      s.queueCleanup('wash');
  }
  s = useGame.getState();
  if (!s.cleanupJob && s.cleanupQueue.length) {
    const kind = s.cleanupQueue[0];
    useGame.setState({
      cleanupJob: {
        kind,
        actor: host ? 'host' : 'bartender',
        stage: 'walking',
        left: cleanupInfo[kind].seconds,
      },
      cleanupQueue: s.cleanupQueue.slice(1),
    });
    s = useGame.getState();
  }
  if (!s.cleanupJob) return;
  const job = { ...s.cleanupJob };
  const positionKey = job.actor === 'host' ? 'hostPosition' : 'bartenderPosition';
  const target = cleanupTarget(job);
  const next = stepAlong(
    s[positionKey],
    guestPath(s[positionKey], target),
    (job.actor === 'host' ? guestSpeed : walkingSpeed) * 0.25,
  ).position;
  useGame.setState({ [positionKey]: next });
  if (Math.hypot(next[0] - target[0], next[1] - target[1]) > 0.001) return;
  if (job.stage === 'walking') job.stage = 'working';
  else if (job.stage === 'carrying') {
    job.stage = 'emptying';
    job.left = 1.5;
  } else {
    job.left -= 0.25;
    if (job.left <= 0) {
      if (job.kind === 'trash' && job.stage === 'working') job.stage = 'carrying';
      else {
        const game = reduceGame(useGame.getState().game, { type: job.kind });
        useGame.setState({ game, cleanupJob: null });
        persist(game);
        return;
      }
    }
  }
  useGame.setState({ cleanupJob: job });
}

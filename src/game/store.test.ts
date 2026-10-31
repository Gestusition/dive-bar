import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, reduceGame } from './engine';
import { hostHome } from './host';
import { startClock, useGame } from './store';
import {
  decodeBackup,
  loadSave,
  NewerSave,
  recoverSetAside,
  saveGame,
  setAsideSave,
} from './storage';

vi.mock('./audio', () => ({ play: vi.fn(), setMusic: vi.fn(), setSoundSwitch: vi.fn() }));
vi.mock('./storage', () => ({
  decodeBackup: vi.fn(),
  loadSave: vi.fn(),
  recoverSetAside: vi.fn().mockResolvedValue(null),
  saveGame: vi.fn().mockResolvedValue(undefined),
  setAsideSave: vi.fn().mockResolvedValue(undefined),
  NewerSave: class NewerSave extends Error {},
  MAX_BACKUP_BYTES: 524288,
}));

const initial = useGame.getState();
let cleanup: () => void;
let documentStub: EventTarget & { hidden: boolean };
beforeEach(() => {
  vi.useFakeTimers();
  documentStub = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('document', documentStub);
  useGame.setState({
    ...initial,
    game: reduceGame(newGame(), { type: 'open' }),
    title: false,
    loaded: true,
  });
  cleanup = startClock();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('service clock and queue', () => {
  it('draws actual opening and later guest orders from Web Crypto instead of replaying the save seed', () => {
    let word = 0xffffffff;
    const entropy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = word;
      return array;
    });
    try {
      useGame.setState({ game: newGame() });
      useGame.getState().act({ type: 'open' });
      expect(useGame.getState().game.guests[0].recipeId).toBe(newGame().activeMenu.at(-1));
      const game = newGame();
      game.phase = 'service';
      game.spawnIn = 0;
      word = 0;
      useGame.setState({ game });
      vi.advanceTimersByTime(250);
      expect(useGame.getState().game.guests[0].recipeId).toBe(game.activeMenu[0]);
      expect(entropy.mock.calls.length).toBeGreaterThan(2);
    } finally {
      entropy.mockRestore();
    }
  });
  function closing(host = false) {
    const game = newGame();
    game.phase = 'closing';
    game.cash = 0;
    game.mess = 3;
    game.trash = 2;
    game.dirtyGlasses = 4;
    game.cleanGlasses = 8;
    game.upgrades.barback = host;
    useGame.setState({ game });
    return game;
  }
  it('walks and completes manual cleanup before applying effects, without requiring restock', () => {
    const before = closing();
    const state = useGame.getState();
    state.act({ type: 'wipe' });
    state.act({ type: 'wipe' });
    state.act({ type: 'trash' });
    state.act({ type: 'wash' });
    expect(useGame.getState().cleanupQueue).toEqual(['wipe', 'trash', 'wash']);
    expect(useGame.getState().game).toEqual(before);
    vi.advanceTimersByTime(1000);
    expect(useGame.getState().cleanupJob).toMatchObject({
      kind: 'wipe',
      actor: 'bartender',
      stage: 'working',
    });
    expect(useGame.getState().game.mess).toBe(3);
    state.act({ type: 'finish' });
    expect(useGame.getState().game.phase).toBe('closing');
    vi.advanceTimersByTime(60000);
    expect(useGame.getState().cleanupJob).toBeNull();
    expect(useGame.getState().game).toMatchObject({
      mess: 0,
      trash: 0,
      dirtyGlasses: 0,
      cleanGlasses: 12,
      cash: 0,
      closing: { wipe: true, trash: true, restock: false },
    });
    state.act({ type: 'finish' });
    expect(useGame.getState().game.phase).toBe('recap');
    expect(useGame.getState().game.inventory).toEqual(before.inventory);
  });
  it('automatically assigns closing jobs to the host and carries trash to the door before clearing it', () => {
    closing(true);
    vi.advanceTimersByTime(250);
    expect(useGame.getState().cleanupJob).toMatchObject({
      kind: 'wipe',
      actor: 'host',
      stage: 'walking',
    });
    expect(useGame.getState().game.mess).toBe(3);
    expect(useGame.getState().bartenderPosition).toEqual(initial.bartenderPosition);
    for (let i = 0; i < 160 && useGame.getState().cleanupJob?.stage !== 'carrying'; i++)
      vi.advanceTimersByTime(250);
    expect(useGame.getState().cleanupJob).toMatchObject({
      kind: 'trash',
      actor: 'host',
      stage: 'carrying',
    });
    expect(useGame.getState().game.trash).toBe(2);
    vi.advanceTimersByTime(60000);
    expect(useGame.getState().game).toMatchObject({
      mess: 0,
      trash: 0,
      dirtyGlasses: 0,
      cleanGlasses: 12,
    });
    expect(useGame.getState().cleanupJob).toBeNull();
    expect(useGame.getState().bartenderPosition).toEqual(initial.bartenderPosition);
    useGame.getState().act({ type: 'finish' });
    expect(useGame.getState().game.phase).toBe('recap');
  });
  it('hands the job to the bartender and sends the host home when they go off duty', () => {
    closing(true);
    vi.advanceTimersByTime(1000);
    expect(useGame.getState().cleanupJob).toMatchObject({ kind: 'wipe', actor: 'host' });
    expect(useGame.getState().hostPosition).not.toEqual(hostHome);
    useGame.getState().act({ type: 'toggleDecor', item: 'barback' });
    vi.advanceTimersByTime(250);
    expect(useGame.getState().cleanupJob).toMatchObject({ kind: 'wipe', actor: 'bartender' });
    expect(useGame.getState().hostPosition).toEqual(hostHome);
    expect(useGame.getState().game.mess).toBe(3);
    // What was already queued gets done, but nothing new is picked up without being asked.
    vi.advanceTimersByTime(60000);
    expect(useGame.getState().cleanupJob).toBeNull();
    expect(useGame.getState().game).toMatchObject({ mess: 0, trash: 0, dirtyGlasses: 0 });
    useGame.setState({ game: { ...useGame.getState().game, dirtyGlasses: 2 } });
    vi.advanceTimersByTime(1000);
    expect(useGame.getState().cleanupJob).toBeNull();
    expect(useGame.getState().cleanupQueue).toEqual([]);
  });
  it('pauses cleanup progress and worker movement in dialogs and on a hidden tab', () => {
    closing(true);
    vi.advanceTimersByTime(1000);
    const before = structuredClone({
      job: useGame.getState().cleanupJob,
      position: useGame.getState().hostPosition,
    });
    useGame.getState().setPanel('settings');
    vi.advanceTimersByTime(20000);
    expect({
      job: useGame.getState().cleanupJob,
      position: useGame.getState().hostPosition,
    }).toEqual(before);
    useGame.getState().setPanel('floor');
    documentStub.hidden = true;
    documentStub.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(20000);
    expect({
      job: useGame.getState().cleanupJob,
      position: useGame.getState().hostPosition,
    }).toEqual(before);
  });
  it('assigns a requested service wash to the host and restores all dirty glassware after the work', () => {
    const game = newGame();
    game.phase = 'service';
    game.spawnIn = 300;
    game.upgrades.barback = true;
    game.dirtyGlasses = 3;
    game.cleanGlasses = 9;
    useGame.setState({ game });
    vi.advanceTimersByTime(250);
    expect(useGame.getState().cleanupJob).toMatchObject({ kind: 'wash', actor: 'host' });
    expect(useGame.getState().game.dirtyGlasses).toBe(3);
    vi.advanceTimersByTime(20000);
    expect(useGame.getState().game.dirtyGlasses).toBe(0);
    expect(useGame.getState().game.cleanGlasses).toBe(12);
  });
  it('replaces an upgraded save and transient work immediately when starting a new bar', async () => {
    const old = newGame();
    old.day = 9;
    old.cash = 90000;
    for (const key of Object.keys(old.upgrades) as (keyof typeof old.upgrades)[])
      old.upgrades[key] = true;
    old.history = { old: 'remembered' };
    old.practice.amounts = { gin: 50 };
    useGame.setState({
      game: old,
      selected: 99,
      dialogue: { id: 'old', node: 'start', reply: '' },
      mixing: 'shake',
      pouring: { id: 'gin', at: 1 },
      tasks: [{ id: 99, operation: 'seat', left: 1 }],
      cleanupJob: { kind: 'wipe', actor: 'host', stage: 'working', left: 1 },
      cleanupQueue: ['trash'],
      saveError: 'Old error',
    });
    useGame.getState().start(true);
    const state = useGame.getState();
    expect(state.game).toEqual({
      ...newGame(),
      phase: 'opening',
      random: state.game.random,
      notice: state.game.notice,
    });
    expect(Object.values(state.game.upgrades)).toEqual(Array(7).fill(false));
    expect(state).toMatchObject({
      title: false,
      hasSave: true,
      selected: null,
      dialogue: null,
      mixing: null,
      pouring: null,
      tasks: [],
      cleanupJob: null,
      cleanupQueue: [],
      saveError: '',
    });
    await vi.waitFor(() => expect(saveGame).toHaveBeenCalledWith(state.game));
  });
  it.each(['recipe', 'settings', 'dialogue', 'decor', 'help', 'stock', 'menu'] as const)(
    'pauses service and walking in the %s panel',
    (panel) => {
      useGame.getState().enqueue(1, 'seat');
      useGame.getState().setPanel(panel);
      const before = structuredClone(useGame.getState().game);
      const position = [...useGame.getState().bartenderPosition];
      vi.advanceTimersByTime(60000);
      expect(useGame.getState().game).toEqual(before);
      expect(useGame.getState().bartenderPosition).toEqual(position);
      expect(useGame.getState().tasks).toHaveLength(1);
    },
  );
  it('executes seating only after the walk and drops duplicate errands', () => {
    useGame.getState().enqueue(1, 'seat');
    useGame.getState().enqueue(1, 'seat');
    expect(useGame.getState().tasks).toHaveLength(1);
    vi.advanceTimersByTime(250);
    expect(useGame.getState().game.guests[0].status).toBe('waiting');
    vi.advanceTimersByTime(10000);
    expect(useGame.getState().game.guests[0].seat).toBeGreaterThanOrEqual(0);
    expect(useGame.getState().tasks).toHaveLength(0);
  });
  it('pauses on a hidden tab and requires an explicit resume', () => {
    documentStub.hidden = true;
    documentStub.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(10000);
    expect(useGame.getState().game.seconds).toBe(0);
    documentStub.hidden = false;
    documentStub.dispatchEvent(new Event('visibilitychange'));
    expect(useGame.getState().paused).toBe(true);
    useGame.getState().pause();
    vi.advanceTimersByTime(1000);
    expect(useGame.getState().game.seconds).toBe(1);
  });
  it('keeps a device save it cannot read instead of deleting it, and says so', async () => {
    vi.mocked(loadSave).mockRejectedValueOnce(new Error('damaged'));
    await useGame.getState().boot();
    expect(setAsideSave).toHaveBeenCalled();
    expect(useGame.getState().saveError).toMatch(/kept on this device/);
    expect(useGame.getState().loaded).toBe(true);
  });
  it('keeps a save from a newer version for when the game is updated', async () => {
    vi.mocked(loadSave).mockRejectedValueOnce(new NewerSave());
    await useGame.getState().boot();
    expect(setAsideSave).toHaveBeenCalled();
    expect(useGame.getState().saveError).toMatch(/newer version/);
  });
  it('brings back a set-aside save once it can be read again', async () => {
    const kept = { ...newGame(), day: 7, phase: 'opening' as const };
    vi.mocked(loadSave).mockResolvedValueOnce(null);
    vi.mocked(recoverSetAside).mockResolvedValueOnce(kept);
    await useGame.getState().boot();
    expect(useGame.getState().game.day).toBe(7);
    expect(useGame.getState().hasSave).toBe(true);
  });
  it('rejects an oversized import before reading the file or changing the game', async () => {
    const before = useGame.getState().game;
    const file = { size: 524289, text: vi.fn() } as unknown as File;
    await expect(useGame.getState().importSave(file)).rejects.toThrow('too big');
    expect(file.text).not.toHaveBeenCalled();
    expect(decodeBackup).not.toHaveBeenCalled();
    expect(useGame.getState().game).toBe(before);
  });
});

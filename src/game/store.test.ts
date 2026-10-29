import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, reduceGame } from './engine';
import { startClock, useGame } from './store';
import { clearSave, decodeBackup, loadSave } from './storage';

vi.mock('./audio', () => ({ play: vi.fn(), setMusic: vi.fn(), setSoundSwitch: vi.fn() }));
vi.mock('./storage', () => ({
  clearSave: vi.fn(),
  decodeBackup: vi.fn(),
  loadSave: vi.fn(),
  saveGame: vi.fn().mockResolvedValue(undefined),
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
  it('recovers from a rejected device save without preventing startup', async () => {
    vi.mocked(loadSave).mockRejectedValueOnce(new Error('damaged'));
    vi.mocked(clearSave).mockResolvedValueOnce(undefined);
    await useGame.getState().boot();
    expect(clearSave).toHaveBeenCalled();
    expect(useGame.getState().loaded).toBe(true);
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

import { ingredients, recipes, roster, initialInventory } from './content';
import { newGame, type Game, type Guest, type Prep, type Upgrade } from './engine';
import { seal, unseal } from './seal';

// ---------- Validation ----------
// A save is only ever data. After its signature is checked it is parsed and then
// rebuilt here field by field: every value must have the right type and a sensible
// range, every id must be one the game knows, and anything unexpected is refused.
// Nothing from a save is ever run, and nothing unknown is carried over.
class Invalid extends Error {}
const fail = (what: string): never => {
  throw new Invalid('This save is not valid (' + what + ').');
};
type Raw = Record<string, unknown>;
const record = (v: unknown, what: string): Raw =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : fail(what);
/** Exactly these keys, no more and no fewer. */
function keys(v: unknown, expected: string[], what: string) {
  const r = record(v, what);
  const got = Object.keys(r);
  if (got.length !== expected.length || !expected.every((k) => Object.hasOwn(r, k))) fail(what);
  return r;
}
const num = (v: unknown, lo: number, hi: number, what: string, int = false) =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi && (!int || Number.isInteger(v))
    ? v
    : fail(what);
const int = (v: unknown, lo: number, hi: number, what: string) => num(v, lo, hi, what, true);
const bool = (v: unknown, what: string) => (typeof v === 'boolean' ? v : fail(what));
const str = (v: unknown, max: number, what: string) =>
  typeof v === 'string' && v.length <= max ? v : fail(what);
const oneOf = <T extends string>(v: unknown, options: readonly T[], what: string) =>
  options.includes(v as T) ? (v as T) : fail(what);
const list = (v: unknown, max: number, what: string) =>
  Array.isArray(v) && v.length <= max ? v : fail(what);
/** A record whose keys come from a known set, each value checked. */
function map<T>(
  v: unknown,
  allowed: Set<string>,
  value: (x: unknown) => T,
  what: string,
  max = 500,
) {
  const r = record(v, what);
  const entries = Object.keys(r);
  if (entries.length > max) fail(what);
  const out: Record<string, T> = {};
  for (const k of entries) {
    if (!allowed.has(k)) fail(what);
    out[k] = value(r[k]);
  }
  return out;
}
const ingredientIds = new Set(ingredients.map((i) => i.id));
const stockIds = new Set(Object.keys(initialInventory));
const customerIds = new Set(roster.map((c) => c.id));
const recipeIds = new Set(recipes.map((r) => r.id));
const tools = ['shaker', 'mixing_glass', 'old_fashioned_glass', 'build_glass'] as const;
const glasses = ['cocktail_glass', 'old_fashioned_glass', 'highball', 'mug', 'hurricane'] as const;
const statuses = ['waiting', 'reading', 'ready', 'ordered', 'drinking', 'pay', 'leaving'] as const;
const phases = ['title', 'opening', 'service', 'finishing', 'closing', 'recap'] as const;
const model = newGame();
const MONEY = 1e10;

function prep(v: unknown, what: string): Prep {
  const p = keys(v, Object.keys(model.practice), what);
  const measure =
    p.measure === null
      ? null
      : (() => {
          const m = keys(p.measure, ['id', 'quantity'], what);
          return {
            id: oneOf(m.id, [...ingredientIds], what),
            quantity: num(m.quantity, 0, 100, what),
          };
        })();
  return {
    amounts: map(p.amounts, ingredientIds, (q) => num(q, 0, 10000, what), what),
    measure,
    tool: oneOf(p.tool, tools, what),
    glass: oneOf(p.glass, glasses, what),
    chilled: bool(p.chilled, what),
    ice: bool(p.ice, what),
    dissolved: bool(p.dissolved, what),
    technique: oneOf(p.technique, ['none', 'shake', 'stir'] as const, what),
    mix: num(p.mix, 0, 2, what),
    garnish: map(p.garnish, stockIds, (q) => int(q, 0, 100, what), what),
    log: list(p.log, 400, what).map((x) => str(x, 80, what)),
    attempts: int(p.attempts, 0, 1e6, what),
  };
}
function guest(v: unknown): Guest {
  const what = 'guest';
  const g = keys(v, Object.keys(guestModel), what);
  const customerId = oneOf(g.customerId, [...customerIds], what);
  const charge = int(g.charge, 0, 1e6, what);
  return {
    id: int(g.id, 1, 1e9, what),
    customerId,
    // The name always comes from the game, never from the file.
    name:
      str(g.name, 40, what) === roster.find((c) => c.id === customerId)!.name
        ? roster.find((c) => c.id === customerId)!.name
        : fail(what),
    recipeId: oneOf(g.recipeId, [...recipeIds], what),
    status: oneOf(g.status, statuses, what),
    seat: int(g.seat, -1, 9, what),
    remaining: num(g.remaining, -1e7, 1e7, what),
    patience: num(g.patience, 0, 1e4, what),
    extraCherry: bool(g.extraCherry, what),
    tipDelta: num(g.tipDelta, -1, 1, what),
    served: bool(g.served, what),
    paid: bool(g.paid, what),
    charge,
    paidAmount: int(g.paidAmount, 0, charge, what),
    foodType: oneOf(g.foodType, ['pretzel', 'toastie'] as const, what),
    quality: num(g.quality, 0, 100, what),
    prep: prep(g.prep, what),
    food: oneOf(
      g.food,
      ['none', 'ordered', 'warming', 'ready', 'served', 'declined'] as const,
      what,
    ),
    foodTime: num(g.foodTime, -1e4, 1e4, what),
    talked: bool(g.talked, what),
    group: int(g.group, 0, 1e9, what),
    lead: bool(g.lead, what),
    splitAsk: oneOf(g.splitAsk, ['one', 'split'] as const, what),
    waited: num(g.waited, 0, 1, what),
    tip: int(g.tip, 0, 1e6, what),
  };
}
// The shape of a guest, for the key check.
const guestModel: Record<keyof Guest, true> = {
  id: true,
  customerId: true,
  name: true,
  recipeId: true,
  status: true,
  seat: true,
  remaining: true,
  patience: true,
  extraCherry: true,
  tipDelta: true,
  served: true,
  paid: true,
  charge: true,
  paidAmount: true,
  foodType: true,
  quality: true,
  prep: true,
  food: true,
  foodTime: true,
  talked: true,
  group: true,
  lead: true,
  splitAsk: true,
  waited: true,
  tip: true,
};
export function validateSave(raw: unknown): Game {
  const g = record(raw, 'save');
  if (g.version !== model.version) fail('version');
  keys(g, Object.keys(model), 'save');
  const guests = list(g.guests, 20, 'guests').map(guest);
  if (new Set(guests.map((x) => x.id)).size !== guests.length) fail('guests');
  const settings = keys(g.settings, Object.keys(model.settings), 'settings');
  const stats = keys(g.stats, Object.keys(model.stats), 'stats');
  const closing = keys(g.closing, Object.keys(model.closing), 'closing');
  const upgrades = keys(g.upgrades, Object.keys(model.upgrades), 'upgrades');
  const count = (v: unknown) => int(v, 0, MONEY, 'stats');
  const menu = list(g.activeMenu, recipeIds.size, 'menu').map((id) =>
    oneOf(id, [...recipeIds], 'menu'),
  );
  if (!menu.length || new Set(menu).size !== menu.length) fail('menu');
  const food = keys(g.foodStock, ['pretzel', 'toastie'], 'food');
  const history = record(g.history, 'history');
  if (Object.keys(history).length > 400) fail('history');
  const game: Game = {
    version: model.version,
    phase: oneOf(g.phase, phases, 'phase'),
    day: int(g.day, 1, 100000, 'day'),
    seconds: num(g.seconds, 0, 1e7, 'clock'),
    cash: int(g.cash, 0, MONEY, 'cash'),
    guests,
    inventory: (() => {
      const inv = map(g.inventory, stockIds, (q) => num(q, 0, 1e7, 'stock'), 'stock');
      if (Object.keys(inv).length !== stockIds.size) fail('stock');
      return inv;
    })(),
    ice: num(g.ice, 0, 1000, 'ice'),
    cleanGlasses: int(g.cleanGlasses, 0, 1000, 'glasses'),
    dirtyGlasses: int(g.dirtyGlasses, 0, 1000, 'glasses'),
    mess: num(g.mess, 0, 100, 'mess'),
    trash: num(g.trash, 0, 10000, 'trash'),
    nextId: int(g.nextId, 1, 1e9, 'ids'),
    spawnIn: num(g.spawnIn, -1e7, 1e7, 'clock'),
    random: int(g.random, 0, 0xffffffff, 'random'),
    history: Object.fromEntries(
      Object.entries(history).map(([k, v]) => [
        /^[a-z_]{1,32}\|[A-Za-z_]{1,40}$/.test(k) && customerIds.has(k.split('|')[0])
          ? k
          : fail('history'),
        str(v, 60, 'history'),
      ]),
    ),
    committed: list(g.committed, 1000, 'history').map((x) => str(x, 160, 'history')),
    stats: {
      served: count(stats.served),
      cancelled: count(stats.cancelled),
      earnings: count(stats.earnings),
      tips: count(stats.tips),
      waste: count(stats.waste),
    },
    closing: {
      wipe: bool(closing.wipe, 'closing'),
      trash: bool(closing.trash, 'closing'),
      restock: bool(closing.restock, 'closing'),
    },
    upgrades: Object.fromEntries(
      Object.keys(model.upgrades).map((k) => [k, bool(upgrades[k], 'upgrades')]),
    ) as Record<Upgrade, boolean>,
    settings: {
      mode: oneOf(settings.mode, ['chill', 'house', 'rush'] as const, 'settings'),
      sound: bool(settings.sound, 'settings'),
      music: bool(settings.music, 'settings'),
      hints: bool(settings.hints, 'settings'),
      reducedMotion: bool(settings.reducedMotion, 'settings'),
      theme: oneOf(settings.theme, ['amber', 'mint', 'rose'] as const, 'settings'),
      pourStyle: oneOf(settings.pourStyle, ['marked', 'free'] as const, 'settings'),
    },
    notice: str(g.notice, 400, 'notice'),
    practice: prep(g.practice, 'practice'),
    visitCount: map(g.visitCount, customerIds, (n) => int(n, 0, 1e6, 'visits'), 'visits'),
    rapport: map(g.rapport, customerIds, (n) => num(n, -5, 5, 'rapport'), 'rapport'),
    wasteHistory: list(g.wasteHistory, 100, 'waste').map((v) => {
      const w = keys(v, ['day', 'guestId', 'amounts', 'measure'], 'waste');
      const measure =
        w.measure === null
          ? null
          : (() => {
              const m = keys(w.measure, ['id', 'quantity'], 'waste');
              return {
                id: oneOf(m.id, [...ingredientIds], 'waste'),
                quantity: num(m.quantity, 0, 100, 'waste'),
              };
            })();
      return {
        day: int(w.day, 1, 100000, 'waste'),
        guestId: int(w.guestId, 0, 1e9, 'waste'),
        amounts: map(w.amounts, ingredientIds, (q) => num(q, 0, 10000, 'waste'), 'waste'),
        measure,
      };
    }),
    activeMenu: menu,
    foodStock: {
      pretzel: int(food.pretzel, 0, 1e5, 'food'),
      toastie: int(food.toastie, 0, 1e5, 'food'),
    },
  };
  return game;
}
/** Parse text as a save without ever trusting it beyond plain data. */
function parse(text: string) {
  try {
    return validateSave(JSON.parse(text));
  } catch (e) {
    throw e instanceof Invalid ? e : new Invalid('This save is not valid.');
  }
}

// ---------- Text helpers ----------
const toBase64 = (bytes: Uint8Array) => {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};
const fromBase64 = (text: string) =>
  /^[A-Za-z0-9+/]*={0,2}$/.test(text)
    ? Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
    : fail('encoding');

// ---------- The save on this device ----------
// Stored sealed, like a backup, so editing it in the browser's storage does not work.
export class OldSave extends Error {}
const DB = 'dive-bar',
  KEY = 'current',
  DEVICE = 'dive-bar device save v2';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function sealDevice(game: Game) {
  const s = seal(new TextEncoder().encode(JSON.stringify(game)), DEVICE);
  return ['v2', s.nonce, s.signature, toBase64(s.body)].join(':');
}
function openDevice(raw: unknown): Game {
  // Anything not in this version's sealed form is a save from an earlier version.
  if (typeof raw !== 'string' || !raw.startsWith('v2:')) throw new OldSave();
  const [, nonce, signature, body] = raw.split(':');
  const data = unseal({ nonce, signature, body: fromBase64(body ?? '') }, DEVICE);
  return parse(new TextDecoder().decode(data));
}
export async function loadSave(): Promise<Game | null> {
  const db = await database();
  try {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const r = db.transaction('saves').objectStore('saves').get(KEY);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return raw === undefined ? null : openDevice(raw);
  } finally {
    db.close();
  }
}
export async function saveGame(game: Game) {
  const sealed = sealDevice(game);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('saves', 'readwrite');
      t.objectStore('saves').put(sealed, KEY);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
export async function clearSave() {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('saves', 'readwrite');
      t.objectStore('saves').delete(KEY);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

// ---------- Backup files ----------
// A backup is a small text file: a readable header, then the save compressed,
// encrypted and signed. The header is signed too, so a file that was edited, made
// up, cut short or damaged is refused before anything in it is read.
const MAGIC = 'DIVE BAR SAVE';
const FORMAT = 3;
// A real backup is a few kilobytes. These limits are far above that, and stop an
// oversized file or a compression bomb from eating the phone's memory: the file
// size is checked before it is read, and unpacking stops at MAX_SAVE bytes.
export const MAX_BACKUP_BYTES = 512 * 1024;
const MAX_SAVE = 2 * 1024 * 1024;
async function compress(bytes: Uint8Array) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(out).arrayBuffer());
}
async function decompress(bytes: Uint8Array) {
  const reader = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_SAVE) {
      await reader.cancel();
      fail('size');
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
export const backupName = (game: Game) => 'dive-bar-night-' + game.day + '.divebar';
export async function encodeBackup(game: Game): Promise<Blob> {
  const data = new TextEncoder().encode(JSON.stringify(game));
  const gzip = typeof CompressionStream === 'function';
  const header = [
    MAGIC + ' v' + FORMAT,
    'night=' +
      game.day +
      ' cash=' +
      (game.cash / 100).toFixed(2) +
      ' saved=' +
      new Date().toISOString() +
      ' encoding=' +
      (gzip ? 'gzip' : 'plain'),
  ];
  const sealed = seal(gzip ? await compress(data) : data, header.join('\n'));
  const lines = [
    ...header,
    'nonce=' + sealed.nonce + ' signature=' + sealed.signature,
    ...toBase64(sealed.body).match(/.{1,76}/g)!,
  ];
  return new Blob([lines.join('\n') + '\n'], { type: 'application/octet-stream' });
}
/** Read a .divebar backup file. Anything else, or anything changed, is refused. */
export async function decodeBackup(text: string): Promise<Game> {
  if (text.length > MAX_BACKUP_BYTES) throw Error('That file is too big to be a Dive Bar save.');
  const [magic, meta, signed, ...body] = text.trim().split(/\r?\n/);
  if (!magic?.startsWith(MAGIC + ' v')) throw Error('That file is not a Dive Bar save.');
  if (magic !== MAGIC + ' v' + FORMAT)
    throw Error('This save is from another version of Dive Bar and cannot be loaded.');
  const field = (line: string | undefined, name: string) =>
    (line ?? '')
      .split(' ')
      .find((f) => f.startsWith(name + '='))
      ?.slice(name.length + 1) ?? '';
  try {
    const data = unseal(
      {
        nonce: field(signed, 'nonce'),
        signature: field(signed, 'signature'),
        body: fromBase64(body.join('')),
      },
      magic + '\n' + meta,
    );
    const plain = field(meta, 'encoding') === 'gzip' ? await decompress(data) : data;
    return parse(new TextDecoder().decode(plain));
  } catch {
    throw Error('This save file was changed or damaged, so it cannot be loaded.');
  }
}

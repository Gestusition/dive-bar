import { ingredients, recipes, roster, initialInventory } from './content';
import { emptyPrep, newGame, type Game, type Prep } from './engine';
const DB = 'dive-bar',
  KEY = 'current';
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
function validPrep(p: Prep) {
  return (
    p &&
    ['shaker', 'mixing_glass', 'old_fashioned_glass', 'build_glass'].includes(p.tool) &&
    ['cocktail_glass', 'old_fashioned_glass', 'highball', 'mug', 'hurricane'].includes(p.glass) &&
    typeof p.chilled === 'boolean' &&
    typeof p.ice === 'boolean' &&
    typeof p.dissolved === 'boolean' &&
    ['none', 'shake', 'stir'].includes(p.technique) &&
    finite(p.mix) &&
    Array.isArray(p.log) &&
    p.log.every((x) => typeof x === 'string') &&
    finite(p.attempts) &&
    p.amounts &&
    Object.entries(p.amounts).every(
      ([id, q]) => ingredients.some((i) => i.id === id) && finite(q),
    ) &&
    p.garnish &&
    Object.entries(p.garnish).every(([id, q]) => id in initialInventory && finite(q)) &&
    (p.measure === null ||
      (p.measure && ingredients.some((i) => i.id === p.measure!.id) && finite(p.measure.quantity)))
  );
}
/** Bring a save from an older build up to date, filling in anything it did not have yet. */
function migrate(raw: unknown) {
  const g = structuredClone(raw) as Game & { dice?: unknown; tokens?: unknown };
  if (!g || typeof g !== 'object') return g;
  delete g.dice;
  delete g.tokens;
  const model = newGame();
  if (g.settings && typeof g.settings === 'object')
    g.settings = { ...model.settings, ...g.settings };
  if (g.upgrades && typeof g.upgrades === 'object')
    g.upgrades = { ...model.upgrades, ...g.upgrades };
  const prep = (p: Prep) => {
    if (p && typeof p === 'object' && typeof p.mix !== 'number')
      p.mix = p.technique === 'none' ? 0 : 1;
  };
  prep(g.practice);
  if (Array.isArray(g.guests))
    for (const guest of g.guests) {
      if (!guest || typeof guest !== 'object') continue;
      guest.group ??= 0;
      guest.lead ??= true;
      guest.splitAsk ??= 'one';
      guest.waited ??= 0.5;
      guest.tip ??= 0;
      guest.prep ??= emptyPrep();
      prep(guest.prep);
    }
  return g;
}
export function validateSave(raw: unknown): Game {
  const g = migrate(raw);
  if (!g || g.version !== 1 || Object.keys(newGame()).some((k) => !(k in g)))
    throw Error('This save version is not supported. Your current save is unchanged.');
  if (
    !['title', 'opening', 'service', 'finishing', 'closing', 'recap'].includes(g.phase) ||
    !Number.isSafeInteger(g.cash) ||
    g.cash < 0 ||
    !finite(g.day) ||
    !finite(g.seconds) ||
    !finite(g.spawnIn) ||
    !finite(g.ice) ||
    !finite(g.cleanGlasses) ||
    !finite(g.dirtyGlasses) ||
    !finite(g.nextId) ||
    !finite(g.random)
  )
    throw Error('Invalid game values.');
  if (
    !g.inventory ||
    Object.keys(initialInventory).some((id) => !finite(g.inventory[id])) ||
    Object.keys(g.inventory).some((id) => !(id in initialInventory))
  )
    throw Error('Invalid stock.');
  if (
    !g.settings ||
    !['chill', 'house', 'rush'].includes(g.settings.mode) ||
    !['amber', 'mint', 'rose'].includes(g.settings.theme) ||
    !['marked', 'free'].includes(g.settings.pourStyle) ||
    typeof g.settings.sound !== 'boolean' ||
    typeof g.settings.music !== 'boolean' ||
    typeof g.settings.hints !== 'boolean' ||
    typeof g.settings.reducedMotion !== 'boolean'
  )
    throw Error('Invalid settings.');
  if (!validPrep(g.practice) || !Array.isArray(g.guests) || g.guests.length > 20)
    throw Error('Invalid preparation.');
  const ids = new Set<number>();
  const model = newGame();
  if (
    Object.keys(model.stats).some((k) => !finite(g.stats?.[k as keyof Game['stats']])) ||
    Object.keys(model.closing).some(
      (k) => typeof g.closing?.[k as keyof Game['closing']] !== 'boolean',
    ) ||
    Object.keys(model.upgrades).some(
      (k) => typeof g.upgrades?.[k as keyof Game['upgrades']] !== 'boolean',
    )
  )
    throw Error('Incomplete progress data.');
  if (
    !g.rapport ||
    Object.values(g.rapport).some((n) => !Number.isFinite(n) || Math.abs(n) > 5) ||
    !Array.isArray(g.wasteHistory) ||
    g.wasteHistory.length > 100
  )
    throw Error('Invalid customer memory or preparation history.');
  if (
    !Array.isArray(g.activeMenu) ||
    g.activeMenu.length < 1 ||
    g.activeMenu.length > 6 ||
    !g.activeMenu.every((id) => recipes.some((r) => r.id === id)) ||
    !g.foodStock ||
    !finite(g.foodStock.pretzel) ||
    !finite(g.foodStock.toastie)
  )
    throw Error('Invalid menu or food stock.');
  for (const guest of g.guests) {
    if (
      !guest ||
      ids.has(guest.id) ||
      !finite(guest.id) ||
      !roster.some((c) => c.id === guest.customerId) ||
      !recipes.some((r) => r.id === guest.recipeId) ||
      !validPrep(guest.prep) ||
      !['waiting', 'reading', 'ready', 'ordered', 'drinking', 'pay', 'leaving'].includes(
        guest.status,
      ) ||
      !Number.isFinite(guest.remaining) ||
      !finite(guest.charge) ||
      !finite(guest.paidAmount) ||
      guest.paidAmount > guest.charge ||
      !['pretzel', 'toastie'].includes(guest.foodType) ||
      !finite(guest.quality) ||
      !Number.isFinite(guest.tipDelta) ||
      typeof guest.name !== 'string' ||
      typeof guest.paid !== 'boolean' ||
      !finite(guest.group) ||
      typeof guest.lead !== 'boolean' ||
      !['one', 'split'].includes(guest.splitAsk) ||
      !finite(guest.waited) ||
      !finite(guest.tip) ||
      !['none', 'ordered', 'warming', 'ready', 'served'].includes(guest.food)
    )
      throw Error('Invalid guest or order.');
    ids.add(guest.id);
  }
  if (
    !g.history ||
    Object.values(g.history).some((v) => typeof v !== 'string') ||
    !Array.isArray(g.committed) ||
    !g.committed.every((v) => typeof v === 'string') ||
    !g.upgrades ||
    Object.values(g.upgrades).some((v) => typeof v !== 'boolean') ||
    !g.closing ||
    Object.values(g.closing).some((v) => typeof v !== 'boolean') ||
    !g.stats ||
    Object.values(g.stats).some((v) => !finite(v)) ||
    !g.visitCount ||
    Object.values(g.visitCount).some((v) => !finite(v))
  )
    throw Error('Invalid progress.');
  return structuredClone(g);
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadSave(): Promise<Game | null> {
  const db = await database();
  try {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const r = db.transaction('saves').objectStore('saves').get(KEY);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return raw ? validateSave(raw) : null;
  } finally {
    db.close();
  }
}
export async function saveGame(game: Game) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('saves', 'readwrite');
      t.objectStore('saves').put(structuredClone(game), KEY);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

// ---------- Backup files ----------
// A backup is a small text file: a header anyone can read, a checksum, and the
// save itself compressed and base64-encoded. A file that was cut short, edited
// or damaged fails the checksum instead of loading half a bar.
const MAGIC = 'DIVE BAR SAVE';
const FORMAT = 2;
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}
async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
const toBase64 = (bytes: Uint8Array) => {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
export const backupName = (game: Game) => 'dive-bar-night-' + game.day + '.divebar';
export async function encodeBackup(game: Game): Promise<Blob> {
  const json = new TextEncoder().encode(JSON.stringify(game));
  const gzip = typeof CompressionStream === 'function';
  const body = gzip ? await through(json, new CompressionStream('gzip')) : json;
  const lines = [
    MAGIC + ' v' + FORMAT,
    'night=' +
      game.day +
      ' cash=' +
      (game.cash / 100).toFixed(2) +
      ' saved=' +
      new Date().toISOString(),
    'encoding=' + (gzip ? 'gzip' : 'plain') + ' crc32=' + crc32(json),
    ...toBase64(body).match(/.{1,76}/g)!,
  ];
  return new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
}
/** Read a backup file. Older plain JSON exports still load. */
export async function decodeBackup(text: string): Promise<Game> {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return validateSave(JSON.parse(trimmed));
  const [magic, , meta, ...body] = trimmed.split(/\r?\n/);
  const version = Number(magic?.startsWith(MAGIC + ' v') ? magic.slice(MAGIC.length + 2) : NaN);
  if (!version) throw Error('That file is not a Dive Bar save.');
  if (version > FORMAT) throw Error('This save is from a newer version of Dive Bar.');
  const fields = Object.fromEntries((meta ?? '').split(' ').map((f) => f.split('=')));
  let bytes: Uint8Array;
  try {
    bytes = fromBase64(body.join(''));
    if (fields.encoding === 'gzip') bytes = await through(bytes, new DecompressionStream('gzip'));
  } catch {
    throw Error('This save file is damaged. Your current save is unchanged.');
  }
  if (crc32(bytes) !== fields.crc32)
    throw Error('This save file is damaged. Your current save is unchanged.');
  return validateSave(JSON.parse(new TextDecoder().decode(bytes)));
}

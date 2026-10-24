import { ingredients, recipes, roster, initialInventory } from './content';
import { newGame, type Game, type Prep } from './engine';
const DB = 'dive-bar', KEY = 'current';
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
function validPrep(p: Prep) { return p && ['shaker', 'mixing_glass', 'old_fashioned_glass'].includes(p.tool) && ['cocktail_glass', 'old_fashioned_glass'].includes(p.glass) && typeof p.chilled === 'boolean' && typeof p.ice === 'boolean' && typeof p.dissolved === 'boolean' && ['none', 'shake', 'stir'].includes(p.technique) && Array.isArray(p.log) && p.log.every(x => typeof x === 'string') && finite(p.attempts) && p.amounts && Object.entries(p.amounts).every(([id, q]) => ingredients.some(i => i.id === id) && finite(q)) && p.garnish && Object.entries(p.garnish).every(([id, q]) => id in initialInventory && finite(q)) && (p.measure === null || (p.measure && ingredients.some(i => i.id === p.measure!.id) && finite(p.measure.quantity))); }
export function validateSave(raw: unknown): Game {
 const g = raw as Game;
 if (!g || g.version !== 1 || Object.keys(newGame()).some(k => !(k in g))) throw Error('This save version is not supported. Your current save is unchanged.');
 if (!['title', 'opening', 'service', 'finishing', 'closing', 'recap'].includes(g.phase) || !Number.isSafeInteger(g.cash) || g.cash < 0 || !finite(g.day) || !finite(g.seconds) || !finite(g.spawnIn) || !finite(g.ice) || !finite(g.cleanGlasses) || !finite(g.dirtyGlasses) || !finite(g.nextId) || !finite(g.random)) throw Error('Invalid game values.');
 if (!g.inventory || Object.keys(initialInventory).some(id => !finite(g.inventory[id])) || Object.keys(g.inventory).some(id => !(id in initialInventory))) throw Error('Invalid stock.');
 if (!g.settings || !['chill', 'house', 'rush'].includes(g.settings.mode) || !['amber', 'mint', 'rose'].includes(g.settings.theme) || !['marked', 'free'].includes(g.settings.pourStyle) || typeof g.settings.sound !== 'boolean' || typeof g.settings.reducedMotion !== 'boolean') throw Error('Invalid settings.');
 if (!validPrep(g.practice) || !Array.isArray(g.guests) || g.guests.length > 20) throw Error('Invalid preparation.');
 const ids = new Set<number>();
 for (const guest of g.guests) {
  if (!guest || ids.has(guest.id) || !finite(guest.id) || !roster.some(c => c.id === guest.customerId) || !recipes.some(r => r.id === guest.recipeId) || !validPrep(guest.prep) || !['waiting','reading','ready','ordered','drinking','pay','leaving'].includes(guest.status) || !Number.isFinite(guest.remaining) || !finite(guest.charge) || !finite(guest.quality) || !Number.isFinite(guest.tipDelta) || typeof guest.name !== 'string' || typeof guest.paid !== 'boolean' || !['none','ordered','warming','ready','served'].includes(guest.food)) throw Error('Invalid guest or order.');
  ids.add(guest.id);
 }
 if (!g.history || Object.values(g.history).some(v => typeof v !== 'string') || !Array.isArray(g.committed) || !g.committed.every(v => typeof v === 'string') || !g.upgrades || Object.values(g.upgrades).some(v => typeof v !== 'boolean') || !g.closing || Object.values(g.closing).some(v => typeof v !== 'boolean') || !g.stats || Object.values(g.stats).some(v => !finite(v)) || !g.dice || !Array.isArray(g.dice.values) || g.dice.values.length > 5 || !g.dice.values.every(v => Number.isInteger(v) && v >= 1 && v <= 6) || !Array.isArray(g.dice.kept) || !finite(g.tokens) || !g.visitCount || Object.values(g.visitCount).some(v => !finite(v))) throw Error('Invalid progress.');
 return structuredClone(g);
}
function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(DB, 1); request.onupgradeneeded = () => request.result.createObjectStore('saves'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function loadSave(): Promise<Game | null> { const db = await database(); try { const raw = await new Promise<unknown>((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(KEY); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); return raw ? validateSave(raw) : null; } finally { db.close(); } }
export async function saveGame(game: Game) { const db = await database(); try { await new Promise<void>((resolve, reject) => { const t = db.transaction('saves', 'readwrite'); t.objectStore('saves').put(structuredClone(game), KEY); t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); }); } finally { db.close(); } }

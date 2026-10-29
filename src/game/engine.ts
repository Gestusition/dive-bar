import { quality } from './quality';
import { counterSeats, seatPairs, seats } from './navigation';
// Long enough for a guest to walk from the far table out of the front door.
const leaveTime = 6;
export { quality } from './quality';
import {
  conversations,
  enabled,
  initialInventory,
  ingredients,
  prices,
  recipeById,
  recipes,
  roster,
  stockItems,
  snacks,
  type Choice,
} from './content';

export type Phase = 'title' | 'opening' | 'service' | 'finishing' | 'closing' | 'recap';
export type Status = 'waiting' | 'reading' | 'ready' | 'ordered' | 'drinking' | 'pay' | 'leaving';
export type Tool = 'shaker' | 'mixing_glass' | 'old_fashioned_glass' | 'build_glass';
export type Split = 'one' | 'split';
export interface Prep {
  amounts: Record<string, number>;
  measure: { id: string; quantity: number } | null;
  tool: Tool;
  glass: 'cocktail_glass' | 'old_fashioned_glass' | 'highball' | 'mug' | 'hurricane';
  chilled: boolean;
  ice: boolean;
  dissolved: boolean;
  technique: 'none' | 'shake' | 'stir';
  /** How long it was shaken or stirred, as a share of the ideal time. */
  mix: number;
  garnish: Record<string, number>;
  log: string[];
  attempts: number;
}
export interface Guest {
  id: number;
  customerId: string;
  name: string;
  recipeId: string;
  status: Status;
  seat: number;
  remaining: number;
  patience: number;
  extraCherry: boolean;
  tipDelta: number;
  served: boolean;
  paid: boolean;
  charge: number;
  paidAmount: number;
  foodType: 'pretzel' | 'toastie';
  quality: number;
  prep: Prep;
  food: 'none' | 'ordered' | 'warming' | 'ready' | 'served' | 'declined';
  foodTime: number;
  talked: boolean;
  /** Guests who came in together share a group number; 0 is on their own. */
  group: number;
  /** The guest who speaks for the group, and the only one when alone. */
  lead: boolean;
  /** How the group wants to pay; the lead says so at the end. */
  splitAsk: Split;
  /** Share of their patience left when the drink arrived. */
  waited: number;
  tip: number;
}
export type Upgrade =
  'barback' | 'plant' | 'neon' | 'doorLights' | 'jukebox' | 'counterDecor' | 'wallArt';
export interface Game {
  /** Saves from earlier versions are not loaded; the game starts a fresh bar. */
  version: 2;
  phase: Phase;
  day: number;
  seconds: number;
  cash: number;
  guests: Guest[];
  inventory: Record<string, number>;
  ice: number;
  cleanGlasses: number;
  dirtyGlasses: number;
  mess: number;
  trash: number;
  nextId: number;
  spawnIn: number;
  random: number;
  history: Record<string, string>;
  committed: string[];
  stats: { served: number; cancelled: number; earnings: number; tips: number; waste: number };
  closing: { wipe: boolean; trash: boolean; restock: boolean };
  upgrades: Record<Upgrade, boolean>;
  settings: {
    mode: 'chill' | 'house' | 'rush';
    sound: boolean;
    music: boolean;
    hints: boolean;
    reducedMotion: boolean;
    theme: 'amber' | 'mint' | 'rose';
    pourStyle: 'marked' | 'free';
  };
  notice: string;
  practice: Prep;
  visitCount: Record<string, number>;
  rapport: Record<string, number>;
  wasteHistory: {
    day: number;
    guestId: number;
    amounts: Record<string, number>;
    measure: Prep['measure'];
  }[];
  activeMenu: string[];
  foodStock: Record<'pretzel' | 'toastie', number>;
}
export type Action =
  | {
      type:
        | 'start'
        | 'open'
        | 'nextDay'
        | 'tick'
        | 'wipe'
        | 'trash'
        | 'wash'
        | 'refillIce'
        | 'restock'
        | 'finish';
      dt?: number;
      /** Fresh randomness from the device, so every night plays out differently. */
      seed?: number;
    }
  | {
      type: 'guest';
      id: number;
      operation: 'seat' | 'order' | 'serve' | 'pay' | 'food' | 'move';
      paymentId?: string;
      split?: Split;
      foodType?: 'pretzel' | 'toastie';
    }
  | { type: 'toggleMenu'; id: string }
  | { type: 'purchase'; items: Record<string, number> }
  | {
      type: 'prep';
      id: number;
      operation:
        | 'measure'
        | 'transfer'
        | 'discardMeasure'
        | 'discard'
        | 'tool'
        | 'glass'
        | 'chill'
        | 'ice'
        | 'muddle'
        | 'shake'
        | 'stir'
        | 'garnish'
        | 'ungarnish';
      ingredient?: string;
      amount?: number;
      value?: string;
    }
  | { type: 'choice'; id: number; conversationId: string; nodeId: string; choiceId: string }
  | { type: 'buy'; item: Upgrade }
  | {
      type: 'setting';
      key: keyof Game['settings'];
      value: Game['settings'][keyof Game['settings']];
    };

export const emptyPrep = (): Prep => ({
  amounts: {},
  measure: null,
  tool: 'shaker',
  glass: 'cocktail_glass',
  chilled: false,
  ice: false,
  dissolved: false,
  technique: 'none',
  mix: 0,
  garnish: {},
  log: [],
  attempts: 0,
});
export function newGame(): Game {
  return {
    version: 2,
    phase: 'title',
    day: 1,
    seconds: 0,
    cash: 12000,
    guests: [],
    inventory: { ...initialInventory },
    ice: 24,
    cleanGlasses: 12,
    dirtyGlasses: 0,
    mess: 0,
    trash: 0,
    nextId: 1,
    spawnIn: 1,
    random: 9173,
    history: {},
    committed: [],
    stats: { served: 0, cancelled: 0, earnings: 0, tips: 0, waste: 0 },
    closing: { wipe: false, trash: false, restock: false },
    upgrades: {
      barback: false,
      plant: false,
      neon: false,
      doorLights: false,
      jukebox: false,
      counterDecor: false,
      wallArt: false,
    },
    settings: {
      mode: 'house',
      sound: true,
      music: true,
      hints: true,
      reducedMotion: false,
      theme: 'amber',
      pourStyle: 'marked',
    },
    notice: 'A little bar. A good story. Your kind of night.',
    practice: emptyPrep(),
    visitCount: {},
    rapport: {},
    wasteHistory: [],
    activeMenu: recipes.slice(0, 6).map((r) => r.id),
    foodStock: { pretzel: 12, toastie: 8 },
  };
}
/** What each upgrade costs, and how much it lifts tips by making the room nicer. */
export const upgradeInfo: Record<Upgrade, { cost: number; tip: number }> = {
  plant: { cost: 1500, tip: 0.01 },
  neon: { cost: 2500, tip: 0.01 },
  doorLights: { cost: 2000, tip: 0.005 },
  counterDecor: { cost: 1800, tip: 0.01 },
  wallArt: { cost: 2200, tip: 0.01 },
  jukebox: { cost: 4500, tip: 0.02 },
  barback: { cost: 6000, tip: 0 },
};
export const ambience = (s: Game) =>
  (Object.keys(upgradeInfo) as Upgrade[]).reduce(
    (n, k) => n + (s.upgrades[k] ? upgradeInfo[k].tip : 0),
    0,
  );
/** Remember that something happened once; only the recent past is kept. */
const commit = (s: Game, token: string) => {
  s.committed.push(token);
  if (s.committed.length > 500) s.committed = s.committed.slice(-500);
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export type RandomSource = () => number;
// Runtime entropy belongs to this reducer call, never to serialized save data.
const randomSources = new WeakMap<Game, RandomSource>();
const rand = (s: Game) => {
  s.random = (Math.imul(s.random, 1664525) + 1013904223) >>> 0;
  return randomSources.get(s)?.() ?? s.random / 4294967296;
};
/** Scramble a seed so that even close seeds start far apart (MurmurHash3 finaliser). */
const mix32 = (n: number) => {
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return (n ^ (n >>> 16)) >>> 0;
};
const pick = <T>(s: Game, list: T[]) => list[Math.floor(rand(s) * list.length)];
const active = (s: Game) => s.guests.filter((g) => !['waiting', 'leaving'].includes(g.status));
export const work = (s: Game) =>
  s.guests.filter((g) => ['reading', 'ready', 'ordered'].includes(g.status)).length;
/** How many guests can be in at once. */
export const seatCap = (s: Game) =>
  s.settings.mode === 'rush' ? 6 : s.settings.mode === 'chill' ? 3 : 4;
const orderPatience = (s: Game, g: Guest) =>
  (s.settings.mode === 'chill' ? 260 : s.settings.mode === 'rush' ? 144 : 160) +
  (s.rapport[g.customerId] ?? 0) * 6;
export const volume = (p: Prep) =>
  Object.entries(p.amounts).reduce(
    (n, [id, q]) =>
      n +
      q *
        (ingredients.find((i) => i.id === id)?.unit === 'dash'
          ? 0.8
          : ingredients.find((i) => i.id === id)?.unit === 'ml'
            ? 1
            : 0),
    0,
  );
/** Everyone who came in with this guest, the guest included. */
export const party = (s: Game, g: Guest) =>
  g.group ? s.guests.filter((x) => x.group === g.group && x.status !== 'leaving') : [g];
function openSeats(s: Game, size: number, random = false): number[] | null {
  const used = new Set(active(s).map((g) => g.seat));
  if (size > 1) {
    const free = seatPairs.filter((pair) => pair.every((i) => !used.has(i)));
    return free.length ? (random ? pick(s, free) : free[0]) : null;
  }
  // On their own, guests take a stool first, then the near chair at a table.
  const stools = counterSeats.filter((i) => !used.has(i));
  const tables = seatPairs
    .filter((pair) => !counterSeats.includes(pair[0]) && !used.has(pair[0]))
    .map((pair) => pair[0]);
  const choice = stools.length ? stools : tables;
  if (!choice.length) return null;
  return [random ? pick(s, choice) : choice[0]];
}
/** Why a guest at the door cannot be seated yet, or null when they can. */
export function seatProblem(s: Game, g: Guest): string | null {
  if (g.status !== 'waiting') return null;
  const group = s.guests.filter((x) => x.status === 'waiting' && x.group === g.group && g.group);
  const size = Math.max(1, group.length);
  if (active(s).length + size > seatCap(s))
    return 'The bar is full for now. Settle a tab to free a seat.';
  if (!openSeats(s, size)) return size > 1 ? 'No free table for two yet.' : 'No free seat yet.';
  return null;
}
function seatParty(s: Game, g: Guest) {
  const group = g.group
    ? s.guests.filter((x) => x.status === 'waiting' && x.group === g.group)
    : [g];
  const places = openSeats(s, group.length, true);
  if (!places) return false;
  group.forEach((x, i) => {
    x.seat = places[i];
    x.status = 'reading';
    x.remaining = 8 + i * 3;
  });
  return true;
}
const names = (list: Guest[]) => list.map((g) => g.name).join(' and ');
/** Every drink on tonight's menu has the same chance, including repeat orders. */
function chooseRecipe(s: Game) {
  return pick(s, s.activeMenu);
}
function newGuest(s: Game, customerId: string, group: number, lead: boolean): Guest {
  return {
    id: s.nextId++,
    customerId,
    name: roster.find((c) => c.id === customerId)!.name,
    recipeId: chooseRecipe(s),
    status: 'waiting',
    seat: -1,
    remaining: 90,
    patience: 160,
    extraCherry: false,
    tipDelta: 0,
    served: false,
    paid: false,
    charge: 0,
    paidAmount: 0,
    foodType: 'pretzel',
    quality: 0,
    prep: emptyPrep(),
    food: 'none',
    foodTime: 0,
    talked: false,
    group,
    lead,
    splitAsk: rand(s) < 0.55 ? 'split' : 'one',
    waited: 0.5,
    tip: 0,
  };
}
function spawn(s: Game, alone = false) {
  if (s.guests.some((g) => g.status === 'waiting') || s.seconds >= 360) return [];
  const here = new Set(s.guests.map((g) => g.customerId));
  const free = roster.map((c) => c.id).filter((id) => !here.has(id));
  // Someone who already came in tonight only comes back once everyone else has.
  const fresh = free.filter((id) => s.history[id + '|night'] !== String(s.day));
  const pool = fresh.length ? fresh : free;
  if (!pool.length) return [];
  const chance = s.settings.mode === 'rush' ? 0.45 : s.settings.mode === 'chill' ? 0.25 : 0.35;
  const size = !alone && pool.length > 1 && rand(s) < chance ? 2 : 1;
  const group = size > 1 ? s.nextId : 0;
  const arrived: Guest[] = [];
  for (let i = 0; i < size; i++) {
    const id = pool.splice(Math.floor(rand(s) * pool.length), 1)[0];
    arrived.push(newGuest(s, id, group, i === 0));
    s.history[id + '|night'] = String(s.day);
  }
  s.guests.push(...arrived);
  return arrived;
}
export function conversationFor(s: Game, g: Guest) {
  if (
    g.talked ||
    g.status !== 'ordered' ||
    g.prep.measure ||
    Object.values(g.prep.amounts).some((q) => q > 0)
  )
    return undefined;
  const key = g.customerId + '|cherry_origin';
  if (g.customerId === 'mara' && ['old_fashioned', 'manhattan', 'cherry_mule'].includes(g.recipeId))
    return conversations.find(
      (c) =>
        c.id ===
        (s.history[key] === 'local_family_orchard' ? 'cherry_story_callback' : 'cherry_origin'),
    );
  const pool = conversations.filter(
    (c) =>
      enabled.has(c.id) &&
      c.customerId === g.customerId &&
      c.nodes.every((n) =>
        n.choices.every(
          (ch) =>
            !ch.orderChange ||
            !recipes.some((r) => r.id === ch.orderChange) ||
            s.activeMenu.includes(ch.orderChange),
        ),
      ) &&
      !['wrong_drink', 'music_volume', 'menu_wait', 'closing_time'].includes(c.id),
  );
  return pool[(s.day + g.id) % Math.max(1, pool.length)];
}
/**
 * A tip follows the drink first: a remake-level drink earns nothing, an excellent one
 * around a fifth of the bill. Conversation, quick service, a nice room and paying the
 * way the guest asked move it up or down, with a little chance on top.
 */
export function tipFor(s: Game, g: Guest, bonus = 0) {
  if (!g.served || g.charge <= 0 || g.quality < 55) return 0;
  let rate = g.quality < 55 ? 0 : 0.04 + ((g.quality - 55) / 45) * 0.16;
  rate += g.tipDelta + (g.waited - 0.5) * 0.08 + ambience(s) + bonus + (rand(s) - 0.5) * 0.04;
  // Left waiting at the till.
  if (g.remaining <= 0) rate -= 0.05;
  return Math.round((g.charge * clamp(rate, 0, 0.35)) / 25) * 25;
}
/** The main reasons behind a tip, in the guest's terms, for the payment note. */
export function tipReasons(s: Game, g: Guest) {
  const why: string[] = [];
  if (g.quality >= 90) why.push('a great drink');
  else if (g.quality < 75) why.push('the drink was only so-so');
  if (g.tipDelta >= 0.04) why.push('a good chat');
  else if (g.tipDelta <= -0.04) why.push('an awkward chat');
  if (g.waited >= 0.7) why.push('quick service');
  else if (g.waited <= 0.3) why.push('a long wait');
  if (ambience(s) >= 0.03) why.push('a lovely room');
  if (g.remaining <= 0) why.push('waiting to pay');
  return why;
}
function tick(s: Game, dt: number) {
  if (!['service', 'finishing'].includes(s.phase)) return;
  const speed = s.settings.mode === 'chill' ? 0.85 : 1;
  const t = clamp(dt, 0, 1) * speed;
  s.seconds += t;
  s.spawnIn -= t;
  if (s.seconds >= 420) s.phase = 'finishing';
  if (s.spawnIn <= 0 && s.seconds < 360) {
    spawn(s);
    s.spawnIn =
      ((s.settings.mode === 'rush' ? 44 : s.settings.mode === 'chill' ? 75 : 58) +
        rand(s) * 16 -
        8) *
      (s.upgrades.doorLights ? 0.85 : 1);
  }
  for (const g of s.guests) {
    g.remaining -= t;
    if (g.status === 'reading' && g.remaining <= 0) {
      g.status = 'ready';
      g.remaining = 75;
    } else if (g.status === 'drinking' && g.remaining <= 0) {
      g.status = 'pay';
      g.remaining = 90;
      s.dirtyGlasses++;
    } else if (['ordered', 'ready', 'waiting'].includes(g.status) && g.remaining <= 0) {
      g.status = g.charge > g.paidAmount ? 'pay' : 'leaving';
      g.remaining = g.status === 'pay' ? 90 : leaveTime;
      s.stats.cancelled++;
      s.notice = g.name + ' couldn’t wait any longer. Take a breath; the next one is yours.';
      s.spawnIn = Math.max(s.spawnIn, 35);
    }
    if (g.food === 'warming') {
      g.foodTime -= t;
      if (g.foodTime <= 0) {
        g.food = 'ready';
        s.notice = g.name + '’s snack is ready to serve.';
      }
    }
    if (s.seconds >= 360 && ['waiting', 'reading', 'ready'].includes(g.status)) {
      g.status = 'leaving';
      g.remaining = leaveTime;
    }
    if (s.seconds >= 510 && g.status === 'ordered') {
      g.status = g.charge > g.paidAmount ? 'pay' : 'leaving';
      g.remaining = g.status === 'pay' ? 90 : leaveTime;
      s.stats.cancelled++;
    }
  }
  s.guests = s.guests.filter((g) => g.status !== 'leaving' || g.remaining > 0);
  // The host greets guests at the door, shows them to a seat and keeps glasses washed.
  if (s.upgrades.barback) {
    const door = s.guests.find((g) => g.status === 'waiting' && g.lead && g.remaining < 87);
    if (door && !seatProblem(s, door) && seatParty(s, door))
      s.notice = 'Your host showed ' + names(party(s, door)) + ' to a seat.';
  }
  if (s.seconds >= 360 && !s.guests.some((g) => g.status !== 'leaving')) {
    s.phase = 'closing';
    s.guests = [];
    s.notice = 'Last glass, best glass. Let’s put the bar to bed.';
  }
}
const declines = [
  'Hmm, I’ll stick with the {drink}, thanks.',
  'Tempting, but I came for the {drink}.',
  'Maybe next time. The {drink} is fine.',
  'Not tonight. Just the {drink}, please.',
];

export function reduceGame(current: Game, a: Action, random?: RandomSource): Game {
  const s = structuredClone(current);
  if (random) randomSources.set(s, random);
  const note = (message: string) => {
    s.notice = message;
  };
  if ('seed' in a && a.seed) s.random = mix32(s.random ^ a.seed) || 9173;
  if (a.type === 'tick') {
    tick(s, a.dt ?? 0.25);
    return s;
  }
  if (
    a.type === 'toggleMenu' &&
    ['opening', 'recap'].includes(s.phase) &&
    recipes.some((r) => r.id === a.id)
  ) {
    if (s.activeMenu.includes(a.id)) {
      if (s.activeMenu.length > 1) s.activeMenu = s.activeMenu.filter((id) => id !== a.id);
      else note('Keep at least one drink on the menu.');
    } else if (s.activeMenu.length < recipes.length) s.activeMenu.push(a.id);
  }
  if (a.type === 'purchase') {
    const rows = Object.entries(a.items);
    const itemCost = (id: string) =>
      id.startsWith('snack_')
        ? snacks.find((i) => 'snack_' + i.id === id)?.cost
        : stockItems.find((i) => i.id === id)?.costMinorPerUnit;
    if (
      rows.some(
        ([id, q]) =>
          itemCost(id) === undefined ||
          !Number.isFinite(q) ||
          q < 0 ||
          q > 10000 ||
          (id.startsWith('snack_') && !Number.isInteger(q)),
      )
    )
      return current;
    const cost = rows.reduce((n, [id, q]) => n + Math.ceil(q * itemCost(id)!), 0);
    if (cost > s.cash) {
      note('That restock is more than the till can cover. Adjust the quantities.');
      return s;
    }
    s.cash -= cost;
    for (const [id, q] of rows) {
      if (id.startsWith('snack_')) s.foodStock[id.slice(6) as 'pretzel' | 'toastie'] += q;
      else s.inventory[id] = (s.inventory[id] ?? 0) + q;
    }
    s.closing.restock = true;
    note(
      'Stock checked. ' +
        (cost ? 'Restock cost: $' + (cost / 100).toFixed(2) : 'No purchase needed.'),
    );
  }
  if (a.type === 'start') {
    s.phase = 'opening';
    note('Your bar, your pace.');
  }
  if (a.type === 'open') {
    s.phase = 'service';
    s.seconds = 0;
    s.spawnIn = 38;
    const first = spawn(s, true);
    note(
      first.length ? 'The doors are open. ' + first[0].name + ' walks in.' : 'The doors are open.',
    );
  }
  if (a.type === 'setting') {
    (s.settings[a.key] as typeof a.value) = a.value;
  }
  if (a.type === 'nextDay') {
    s.day++;
    s.settings.hints = false;
    s.phase = 'opening';
    s.seconds = 0;
    s.guests = [];
    s.stats = { served: 0, cancelled: 0, earnings: 0, tips: 0, waste: 0 };
    s.closing = { wipe: false, trash: false, restock: false };
    s.spawnIn = 1;
    s.practice = emptyPrep();
    note('A new night. A few familiar faces.');
  }
  if (a.type === 'wipe') {
    s.mess = 0;
    s.closing.wipe = true;
    note('A clean counter. Room for the next good thing.');
  }
  if (a.type === 'trash') {
    s.trash = 0;
    s.closing.trash = true;
    note('Trash is out.');
  }
  if (a.type === 'wash') {
    const count = s.dirtyGlasses;
    s.cleanGlasses += count;
    s.dirtyGlasses = 0;
    note(count ? 'Clean glasses back on the shelf.' : 'All glasses are already clean.');
  }
  if (a.type === 'refillIce') {
    const cost = Math.max(0, 24 - s.ice) * 2;
    if (s.cash >= cost) {
      s.cash -= cost;
      s.ice = 24;
      note('Ice bin topped up.');
    } else note('Not enough cash for a full ice refill.');
  }
  if (a.type === 'restock') {
    const rows = Object.entries(initialInventory);
    const cost = rows.reduce(
      (n, [id, par]) =>
        n +
        Math.ceil(
          Math.max(0, par - (s.inventory[id] ?? 0)) *
            (stockItems.find((i) => i.id === id)?.costMinorPerUnit ?? 0),
        ),
      0,
    );
    if (s.cash >= cost) {
      s.cash -= cost;
      for (const [id, par] of rows) s.inventory[id] = Math.max(s.inventory[id] ?? 0, par);
      s.closing.restock = true;
      note('Shelves restored to par. Cost: $' + (cost / 100).toFixed(2));
    } else {
      s.closing.restock = true;
      note('Keep the stock you have. A small starter kit will keep the next night possible.');
      if (
        !recipes.some((r) =>
          r.ingredients.every((i) =>
            i.allowed.some((id) => (s.inventory[id] ?? 0) >= (i.quantity ?? 2)),
          ),
        )
      ) {
        for (const i of recipeById('margarita').ingredients)
          s.inventory[i.allowed[0]] = Math.max(
            s.inventory[i.allowed[0]] ?? 0,
            (i.quantity ?? 1) * 3,
          );
      }
    }
  }
  if (a.type === 'finish') {
    if (s.phase === 'service' || s.phase === 'finishing') {
      s.seconds = Math.max(360, s.seconds);
      s.spawnIn = 999999;
      note('Last orders called. Finish confirmed drinks and settle the tabs.');
      if (!s.guests.length) s.phase = 'closing';
    } else if (s.phase === 'closing') {
      if (s.closing.wipe && s.closing.trash && !s.mess && !s.trash && !s.dirtyGlasses) {
        s.phase = 'recap';
        note('Lights low. Till counted. A night to remember.');
      } else
        note(
          'Finish wiping, taking out trash and washing glasses before you close. Restocking is optional.',
        );
    }
  }
  if (a.type === 'buy') {
    const cost = upgradeInfo[a.item]?.cost;
    if (cost === undefined) return current;
    if (!s.upgrades[a.item] && s.cash >= cost) {
      s.cash -= cost;
      s.upgrades[a.item] = true;
      note(
        a.item === 'barback'
          ? 'Meet your host. Guests at the door get a seat, and glasses stay washed.'
          : a.item === 'jukebox'
            ? 'The jukebox hums into life.'
            : 'A little more like your own place.',
      );
    } else
      note(
        s.upgrades[a.item] ? 'Already part of your bar.' : 'Save a little more for this upgrade.',
      );
  }
  if (a.type === 'guest') {
    const g = s.guests.find((g) => g.id === a.id);
    if (!g) return current;
    if (a.operation === 'seat' && g.status === 'waiting') {
      const problem = seatProblem(s, g);
      if (problem || !seatParty(s, g)) {
        note(problem ?? 'No free seat yet.');
        return s;
      }
      const seated = party(s, g);
      note(names(seated) + (seated.length > 1 ? ' have' : ' has') + ' a menu. Give them a moment.');
    }
    if (a.operation === 'order' && g.status === 'ready') {
      const ordering = party(s, g).filter((x) => x.status === 'ready');
      for (const x of ordering) {
        x.status = 'ordered';
        x.remaining = orderPatience(s, x);
        s.history[x.customerId + '|lastOrder'] = x.recipeId;
      }
      const drinks = ordering.map((x) => recipeById(x.recipeId).name);
      note(
        names(ordering) +
          ': “' +
          (drinks.length > 1 && drinks[0] === drinks[1]
            ? 'Two ' + drinks[0] + 's'
            : drinks
                .map((d, i) => (/^[AEIOU]/.test(d) ? 'an ' : 'a ').replace(/^a/, i ? 'a' : 'A') + d)
                .join(' and ')) +
          ', please.”',
      );
    }
    if (a.operation === 'serve' && g.status === 'ordered') {
      const q = quality(g.prep, recipeById(g.recipeId), g.extraCherry);
      g.quality = q.score;
      if (q.score < 55 || q.invalid) {
        note('Not ready to serve: ' + q.issues.slice(0, 2).join(' · '));
        return s;
      }
      if (s.cleanGlasses <= 0) {
        note('Wash a glass at the sink first.');
        return s;
      }
      if (g.prep.measure) {
        note('There is still liquid in the jigger. Transfer or discard it first.');
        return s;
      }
      g.served = true;
      g.waited = clamp(g.remaining / orderPatience(s, g), 0, 1);
      g.charge =
        prices[g.recipeId] +
        (g.food === 'served' ? snacks.find((n) => n.id === g.foodType)!.price : 0);
      g.status = 'drinking';
      g.remaining = 20;
      s.cleanGlasses--;
      s.mess = Math.min(4, s.mess + 1);
      s.stats.served++;
      note(
        g.name +
          ': “' +
          (q.score >= 90
            ? 'That’s a lovely drink.'
            : q.score >= 75
              ? 'Just what I needed.'
              : 'Hm. It’ll do.') +
          '” ' +
          q.label +
          ' · ' +
          q.score +
          '/100',
      );
    }
    if (a.operation === 'pay' && g.status === 'pay' && !g.paid) {
      const paying = party(s, g).filter((x) => !x.paid);
      const still = paying.find((x) => x.status !== 'pay');
      if (still) {
        note('Wait for ' + still.name + ' to finish. They’ll pay together.');
        return s;
      }
      if (paying.some((x) => x.food === 'warming' || x.food === 'ready')) {
        note('Finish serving the snack before settling this tab.');
        return s;
      }
      if (a.paymentId && s.committed.includes(a.paymentId)) return current;
      if (a.paymentId) commit(s, a.paymentId);
      const ask = paying.find((x) => x.lead)?.splitAsk ?? 'one';
      const together = paying.length > 1;
      const right = !together || !a.split || a.split === ask;
      let total = 0,
        tips = 0;
      const why = [...new Set(paying.flatMap((x) => tipReasons(s, x)))];
      for (const x of paying) {
        const amount = x.charge - x.paidAmount;
        x.paidAmount += amount;
        total += amount;
        x.tip = tipFor(s, x, together ? (right ? 0.03 : -0.04) : 0);
        tips += x.tip;
        x.paid = true;
        x.status = 'leaving';
        x.remaining = leaveTime;
        s.visitCount[x.customerId] = (s.visitCount[x.customerId] ?? 0) + 1;
      }
      s.cash += total + tips;
      s.stats.earnings += total + tips;
      s.stats.tips += tips;
      const amount = (n: number) => '$' + (n / 100).toFixed(2);
      note(
        (right
          ? names(paying) + ' settled up'
          : '“We said ' + (ask === 'split' ? 'separate bills' : 'one bill') + '.” ' + 'Settled') +
          ' · ' +
          amount(total) +
          (tips ? ' + ' + amount(tips) + ' tip' : ' · no tip') +
          (why.length ? ' (' + why.slice(0, 3).join(', ') + ')' : ''),
      );
    }
    if (a.operation === 'food') {
      if (g.paid || g.status === 'leaving') return current;
      if (g.food === 'none' && ['ordered', 'drinking'].includes(g.status)) {
        if (s.seconds >= 360) {
          note('The kitchen has taken its last orders for tonight.');
          return s;
        }
        const snack = snacks.find((n) => n.id === (a.foodType ?? 'pretzel'))!;
        if (s.guests.some((x) => x.food === 'warming')) {
          note('The warming station is busy. Serve that snack first.');
          return s;
        }
        if (s.foodStock[snack.id] <= 0) {
          note('That snack is sold out for tonight.');
          return s;
        }
        const roll = rand(s);
        if (roll >= 0.6) {
          g.foodType = snack.id;
          g.food = 'declined';
          note(g.name + ': “No snack for me, thanks.”');
          return s;
        }
        // Some guests turn the offer down but ask for the other snack; if that one is gone they settle.
        const other = snacks.find((n) => n.id !== snack.id)!;
        const swap = roll >= 0.4 && s.foodStock[other.id] > 0;
        const chosen = swap ? other : snack;
        s.foodStock[chosen.id]--;
        g.foodType = chosen.id;
        g.food = 'warming';
        g.foodTime = chosen.seconds;
        note(
          (swap
            ? g.name +
              ': “Not the ' +
              snack.name.toLowerCase() +
              ', could I get a ' +
              other.name.toLowerCase() +
              ' instead?” '
            : snack.name + ' for ' + g.name + '. ') +
            'Ready in ' +
            chosen.seconds +
            ' seconds.',
        );
      } else if (g.food === 'ready') {
        g.food = 'served';
        const snack = snacks.find((n) => n.id === g.foodType)!;
        g.charge += snack.price;
        note(snack.name + ' served. Added $' + (snack.price / 100).toFixed(2) + ' to the tab.');
      }
    }
    if (a.operation === 'move' && !g.group) {
      const used = new Set(
        active(s)
          .filter((x) => x.id !== g.id)
          .map((x) => x.seat),
      );
      const seat = seats.map((_, i) => i).find((i) => i !== g.seat && i < 6 && !used.has(i));
      if (seat !== undefined) {
        g.seat = seat;
        note('A quieter corner for ' + g.name + '.');
      }
    }
  }
  if (a.type === 'prep') {
    const g = s.guests.find((g) => g.id === a.id);
    const practice = a.id === -1;
    const p = practice ? s.practice : g?.prep;
    if (!p || (!practice && g?.status !== 'ordered')) return current;
    const spend = (id: string, amount: number) => {
      if (practice) return true;
      if ((s.inventory[id] ?? 0) + 0.00001 < amount) {
        note('Out of ' + id.replaceAll('_', ' ') + '. Check stock.');
        return false;
      }
      s.inventory[id] = Math.max(0, (s.inventory[id] ?? 0) - amount);
      return true;
    };
    if (a.operation === 'measure' && a.ingredient) {
      const i = ingredients.find((i) => i.id === a.ingredient);
      if (!i) return current;
      const amount = Math.round(clamp(a.amount ?? 1, 0.1, i.unit === 'ml' ? 50 : 1) * 100) / 100;
      if (p.measure && p.measure.id !== i.id) {
        note('Transfer the current measure before changing bottles.');
        return s;
      }
      if (i.unit !== 'ml' && i.unit !== 'dash') {
        if ((p.amounts[i.id] ?? 0) >= 20) {
          note('That’s plenty of ' + i.name.toLowerCase() + '.');
          return s;
        }
        if (spend(i.id, 1)) {
          p.amounts[i.id] = (p.amounts[i.id] ?? 0) + 1;
          p.log.push('Added ' + i.name);
        }
      } else {
        const capacity = i.unit === 'ml' ? 50 : 5;
        const q = Math.min(amount, capacity - (p.measure?.quantity ?? 0));
        if (q > 0 && spend(i.id, q)) {
          p.measure = { id: i.id, quantity: Number(((p.measure?.quantity ?? 0) + q).toFixed(2)) };
          note(i.name + ' · ' + p.measure.quantity.toFixed(i.unit === 'ml' ? 1 : 0) + ' ' + i.unit);
        }
      }
    }
    if (a.operation === 'transfer' && p.measure) {
      const amount = p.measure.quantity;
      const addition =
        ingredients.find((i) => i.id === p.measure!.id)?.unit === 'dash' ? amount * 0.8 : amount;
      if (volume(p) + addition > (p.tool === 'old_fashioned_glass' ? 250 : 440)) {
        note('The vessel is full. Discard or use another preparation.');
        return s;
      }
      p.amounts[p.measure.id] = Number(((p.amounts[p.measure.id] ?? 0) + amount).toFixed(2));
      p.log.push('Added ' + amount + ' ' + p.measure.id);
      p.measure = null;
      p.technique = 'none';
      p.mix = 0;
    }
    if (a.operation === 'discardMeasure') {
      if (p.measure && !practice) {
        s.stats.waste++;
        s.trash++;
      }
      p.measure = null;
      note('Jigger emptied.');
    }
    if (a.operation === 'discard') {
      const fresh = emptyPrep();
      fresh.attempts = p.attempts + 1;
      if (practice) s.practice = fresh;
      else if (g) {
        s.wasteHistory.push({
          day: s.day,
          guestId: g.id,
          amounts: { ...p.amounts },
          measure: p.measure ? { ...p.measure } : null,
        });
        s.wasteHistory = s.wasteHistory.slice(-100);
        g.prep = fresh;
        s.stats.waste++;
        s.trash++;
      }
      note('Fresh start. Used ingredients stay used.');
    }
    if (a.operation === 'tool') {
      if (volume(p) || Object.values(p.amounts).some(Boolean)) {
        note('Empty this preparation before changing vessels.');
        return s;
      }
      p.tool = a.value as Tool;
      // Built in the rocks glass, the drink is served in it too.
      if (p.tool === 'old_fashioned_glass') p.glass = 'old_fashioned_glass';
      note('Selected ' + String(a.value).replaceAll('_', ' '));
    }
    if (a.operation === 'glass') p.glass = a.value as Prep['glass'];
    if (a.operation === 'chill') {
      p.chilled = true;
      note('Serving glass chilled.');
    }
    if (a.operation === 'ice' && !p.ice) {
      if (practice || s.ice > 0) {
        p.ice = true;
        p.log.push('ice');
        if (!practice) s.ice--;
        note('Ice added.');
      } else note('Ice bin empty. Refill at the bar.');
    }
    if (a.operation === 'muddle') {
      if (
        ((p.amounts.sugar_cube ?? 0) > 0 &&
          (p.amounts.angostura_bitters ?? 0) > 0 &&
          ((p.amounts.plain_water ?? 0) > 0 ||
            ((p.amounts.orange_slice ?? 0) > 0 && (p.amounts.cocktail_cherry ?? 0) > 0)) &&
          !(p.amounts.bourbon || p.amounts.rye_whiskey || p.amounts.brandy)) ||
        ((p.amounts.superfine_sugar ?? 0) > 0 && (p.amounts.fresh_lime_juice ?? 0) > 0 && !p.ice)
      ) {
        p.dissolved = true;
        p.log.push('Sugar dissolved before whiskey');
        note('Sugar dissolved. Continue with the recipe’s next step.');
      } else note('Add sugar, bitters and water first. Muddle before the whiskey.');
    }
    if (a.operation === 'shake' || a.operation === 'stir') {
      p.technique = a.operation;
      p.mix = Math.round(clamp(a.amount ?? 1, 0, 2) * 100) / 100;
      p.log.push(a.operation);
      note(
        p.mix < 0.7
          ? 'Not quite long enough. Keep going next time.'
          : p.mix > 1.35
            ? 'That went on a while. It may be watery.'
            : a.operation === 'shake'
              ? 'A good shake. Strain into your serving glass.'
              : 'Stirred gently. Ready for the finishing touches.',
      );
    }
    if (a.operation === 'garnish' && a.ingredient) {
      if ((p.garnish[a.ingredient] ?? 0) >= 10) {
        note('There’s no room for more of that on the glass.');
        return s;
      }
      if (spend(a.ingredient, 1)) {
        p.garnish[a.ingredient] = (p.garnish[a.ingredient] ?? 0) + 1;
        note('Added ' + a.ingredient.replaceAll('_', ' '));
      }
    }
    // A garnish taken back off is thrown away, not returned to the jar.
    if (a.operation === 'ungarnish' && a.ingredient && (p.garnish[a.ingredient] ?? 0) > 0) {
      p.garnish[a.ingredient]--;
      if (!p.garnish[a.ingredient]) delete p.garnish[a.ingredient];
      note('Took off the ' + a.ingredient.replaceAll('_', ' ') + '.');
    }
  }
  // Keep a long practice session's history small. The steps the taste check reads
  // (ice, dissolving) are always kept, in order.
  if (a.type === 'prep') {
    const p = a.id === -1 ? s.practice : s.guests.find((g) => g.id === a.id)?.prep;
    if (p && p.log.length > 200)
      p.log = p.log.filter(
        (e, i) => i >= p.log.length - 150 || e === 'ice' || e.startsWith('Sugar dissolved'),
      );
  }
  if (a.type === 'choice') {
    const g = s.guests.find((g) => g.id === a.id);
    const c = conversations.find((c) => c.id === a.conversationId);
    const node = c?.nodes.find((n) => n.id === a.nodeId);
    const ch: Choice | undefined = node?.choices.find((ch) => ch.id === a.choiceId);
    const token = [s.day, a.id, a.conversationId, a.nodeId].join(':');
    if (
      !g ||
      !c ||
      !ch ||
      c.customerId !== g.customerId ||
      s.committed.includes(token) ||
      g.status !== 'ordered'
    )
      return current;
    commit(s, token);
    s.rapport[g.customerId] = clamp((s.rapport[g.customerId] ?? 0) + ch.trust, -5, 5);
    g.tipDelta = clamp(g.tipDelta + ch.tip, -0.1, 0.15);
    g.remaining += ch.patience * 8;
    if (ch.storyId && c.storySubjectKey)
      s.history[c.customerId + '|' + c.storySubjectKey] = ch.storyId;
    let reply = ch.reply;
    if (ch.orderChange === 'extra_cherry') g.extraCherry = true;
    else if (
      ch.orderChange &&
      ch.orderChange !== g.recipeId &&
      recipes.some((r) => r.id === ch.orderChange)
    ) {
      // A suggestion is only a suggestion. Regulars who trust you, and guests offered
      // their favourite, say yes more often.
      const favourite = roster.find((r) => r.id === g.customerId)?.defaultRecipeId;
      const chance = clamp(
        0.35 +
          (s.rapport[g.customerId] ?? 0) * 0.07 +
          (favourite === ch.orderChange ? 0.3 : 0) +
          ch.trust * 0.05,
        0.15,
        0.9,
      );
      if (rand(s) < chance) g.recipeId = ch.orderChange;
      else reply = pick(s, declines).replace('{drink}', recipeById(g.recipeId).name);
    }
    if (ch.result === 'cancel' || ch.result === 'decline') {
      g.status = g.charge > g.paidAmount ? 'pay' : 'leaving';
      g.remaining = g.status === 'pay' ? 90 : leaveTime;
      if (ch.result === 'cancel') {
        s.stats.cancelled++;
        s.spawnIn = Math.max(s.spawnIn, 35);
      }
    }
    if (ch.result === 'reselect' || ch.result === 'defer') {
      g.status = 'ready';
      g.remaining = 75;
    }
    if (!ch.next) g.talked = true;
    note(reply);
  }
  return s;
}

import { quality } from './quality';
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
export interface Prep {
  amounts: Record<string, number>;
  measure: { id: string; quantity: number } | null;
  tool: Tool;
  glass: 'cocktail_glass' | 'old_fashioned_glass' | 'highball' | 'mug' | 'hurricane';
  chilled: boolean;
  ice: boolean;
  dissolved: boolean;
  technique: 'none' | 'shake' | 'stir';
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
  food: 'none' | 'ordered' | 'warming' | 'ready' | 'served';
  foodTime: number;
  talked: boolean;
}
export interface Game {
  version: 1;
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
  upgrades: { barback: boolean; plant: boolean; neon: boolean };
  settings: {
    mode: 'chill' | 'house' | 'rush';
    sound: boolean;
    reducedMotion: boolean;
    theme: 'amber' | 'mint' | 'rose';
    pourStyle: 'marked' | 'free';
  };
  notice: string;
  practice: Prep;
  visitCount: Record<string, number>;
  dice: {
    values: number[];
    kept: boolean[];
    rolled: number;
    opponent: number;
    result: string;
    playedDay: number;
  };
  tokens: number;
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
        | 'finish'
        | 'rollDice';
      dt?: number;
    }
  | {
      type: 'guest';
      id: number;
      operation: 'seat' | 'order' | 'serve' | 'pay' | 'food' | 'move';
      amountMinor?: number;
      paymentId?: string;
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
        | 'garnish';
      ingredient?: string;
      amount?: number;
      value?: string;
    }
  | { type: 'choice'; id: number; conversationId: string; nodeId: string; choiceId: string }
  | { type: 'buy'; item: 'barback' | 'plant' | 'neon' }
  | {
      type: 'setting';
      key: keyof Game['settings'];
      value: Game['settings'][keyof Game['settings']];
    }
  | { type: 'keepDie'; index: number };

export const emptyPrep = (): Prep => ({
  amounts: {},
  measure: null,
  tool: 'shaker',
  glass: 'cocktail_glass',
  chilled: false,
  ice: false,
  dissolved: false,
  technique: 'none',
  garnish: {},
  log: [],
  attempts: 0,
});
export function newGame(): Game {
  return {
    version: 1,
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
    upgrades: { barback: false, plant: false, neon: true },
    settings: {
      mode: 'house',
      sound: true,
      reducedMotion: false,
      theme: 'amber',
      pourStyle: 'marked',
    },
    notice: 'A little bar. A good story. Your kind of night.',
    practice: emptyPrep(),
    visitCount: {},
    dice: { values: [], kept: [], rolled: 0, opponent: 0, result: '', playedDay: 0 },
    tokens: 0,
    rapport: {},
    wasteHistory: [],
    activeMenu: ['old_fashioned', 'margarita', 'manhattan'],
    foodStock: { pretzel: 12, toastie: 8 },
  };
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const rand = (s: Game) => {
  s.random = (Math.imul(s.random, 1664525) + 1013904223) >>> 0;
  return s.random / 4294967296;
};
const active = (s: Game) => s.guests.filter((g) => !['waiting', 'leaving'].includes(g.status));
export const work = (s: Game) =>
  s.guests.filter((g) => ['reading', 'ready', 'ordered'].includes(g.status)).length;
export const cap = (s: Game) =>
  s.settings.mode === 'rush' ? 4 : s.settings.mode === 'chill' ? 2 : 3;
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
function spawn(s: Game) {
  if (s.guests.some((g) => g.status === 'waiting') || s.seconds >= 360) return;
  const order = [
    'mara',
    'len',
    'nadia',
    'eli',
    'priya',
    'cass',
    'sam',
    'alex',
    'lena',
    'owen',
    'theo',
    'june',
  ];
  const id = order[(s.nextId - 1) % order.length];
  const c = roster.find((c) => c.id === id)!;
  s.guests.push({
    id: s.nextId++,
    customerId: id,
    name: c.name,
    recipeId: s.activeMenu.includes(c.defaultRecipeId)
      ? c.defaultRecipeId
      : s.activeMenu[(s.nextId - 2 + s.activeMenu.length) % s.activeMenu.length],
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
  });
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
  return pool[(s.day - 1) % Math.max(1, pool.length)];
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
      (s.settings.mode === 'rush' ? 44 : s.settings.mode === 'chill' ? 75 : 58) + rand(s) * 8 - 4;
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
      g.remaining = g.status === 'pay' ? 90 : 3;
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
      g.remaining = 3;
    }
    if (s.seconds >= 510 && g.status === 'ordered') {
      g.status = g.charge > g.paidAmount ? 'pay' : 'leaving';
      g.remaining = g.status === 'pay' ? 90 : 3;
      s.stats.cancelled++;
    }
  }
  s.guests = s.guests.filter((g) => g.status !== 'leaving' || g.remaining > 0);
  if (s.upgrades.barback) {
    if (s.dirtyGlasses > 0 && Math.floor(s.seconds / 4) !== Math.floor((s.seconds - t) / 4)) {
      s.dirtyGlasses--;
      s.cleanGlasses++;
    }
    if (s.ice < 5 && s.cash >= (12 - s.ice) * 2) {
      const cost = (12 - s.ice) * 2;
      s.cash -= cost;
      s.ice = 12;
    }
    if (s.trash > 3) s.trash = 0;
  }
  if (s.seconds >= 360 && !s.guests.some((g) => g.status !== 'leaving')) {
    s.phase = 'closing';
    s.guests = [];
    s.notice = 'Last glass, best glass. Let’s put the bar to bed.';
  }
}

export function reduceGame(current: Game, a: Action): Game {
  const s = structuredClone(current);
  const note = (message: string) => {
    s.notice = message;
  };
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
    } else if (s.activeMenu.length < 6) s.activeMenu.push(a.id);
    else note('Six drinks is a comfortable menu. Remove one first.');
  }
  if (a.type === 'purchase') {
    const rows = Object.entries(a.items);
    const itemCost = (id: string) =>
      id.startsWith('snack_')
        ? snacks.find((i) => 'snack_' + i.id === id)?.cost
        : stockItems.find((i) => i.id === id)?.costMinorPerUnit;
    if (
      rows.some(
        ([id, q]) => itemCost(id) === undefined || !Number.isFinite(q) || q < 0 || q > 10000,
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
    note('Your bar, your pace. Check the menu, then open the doors.');
  }
  if (a.type === 'open') {
    s.phase = 'service';
    s.seconds = 0;
    s.spawnIn = 38;
    spawn(s);
    note('Mara is at the door. Tap her to offer a seat.');
  }
  if (a.type === 'setting') {
    (s.settings[a.key] as typeof a.value) = a.value;
  }
  if (a.type === 'nextDay') {
    s.day++;
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
        Math.ceil(Math.max(0, par - (s.inventory[id] ?? 0))) *
          (stockItems.find((i) => i.id === id)?.costMinorPerUnit ?? 0),
      0,
    );
    if (s.cash >= cost) {
      s.cash -= cost;
      s.inventory = { ...initialInventory };
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
      if (s.closing.wipe && s.closing.trash && s.closing.restock && !s.dirtyGlasses) {
        s.phase = 'recap';
        note('Lights low. Till counted. A night to remember.');
      } else note('Wipe, clear trash, wash glasses and check stock before you close.');
    }
  }
  if (a.type === 'buy') {
    const costs = { plant: 1500, neon: 2500, barback: 6000 };
    if (!s.upgrades[a.item] && s.cash >= costs[a.item]) {
      s.cash -= costs[a.item];
      s.upgrades[a.item] = true;
      note(
        a.item === 'barback'
          ? 'Meet your barback. Clean glasses, ice and trash are covered.'
          : 'A little more like your own place.',
      );
    } else
      note(
        s.upgrades[a.item] ? 'Already part of your bar.' : 'Save a little more for this upgrade.',
      );
  }
  if (a.type === 'keepDie') {
    if (s.dice.rolled === 1) s.dice.kept[a.index] = !s.dice.kept[a.index];
  }
  if (a.type === 'rollDice') {
    if (s.dice.playedDay === s.day && s.dice.result) {
      note('One friendly round per night. Come back after the next shift.');
      return s;
    }
    if (s.dice.rolled === 0 || s.dice.result)
      s.dice = {
        values: Array.from({ length: 5 }, () => 1 + Math.floor(rand(s) * 6)),
        kept: [false, false, false, false, false],
        rolled: 1,
        opponent: 0,
        result: '',
        playedDay: 0,
      };
    else {
      s.dice.values = s.dice.values.map((v, i) =>
        s.dice.kept[i] ? v : 1 + Math.floor(rand(s) * 6),
      );
      s.dice.opponent = Array.from({ length: 5 }, () => 1 + Math.floor(rand(s) * 6)).reduce(
        (x, y) => x + y,
        0,
      );
      const total = s.dice.values.reduce((x, y) => x + y, 0);
      s.dice.result =
        total > s.dice.opponent
          ? 'You win! One house token.'
          : total === s.dice.opponent
            ? 'A friendly tie.'
            : 'Len wins this round. Another night?';
      if (total > s.dice.opponent) s.tokens++;
      s.dice.rolled = 2;
      s.dice.playedDay = s.day;
    }
  }
  if (a.type === 'guest') {
    const g = s.guests.find((g) => g.id === a.id);
    if (!g) return current;
    if (a.operation === 'seat' && g.status === 'waiting') {
      if (active(s).length >= (s.settings.mode === 'rush' ? 3 : 2) || work(s) >= cap(s)) {
        note('Finish a ticket first. Keep the bar comfortable.');
        return s;
      }
      const used = new Set(active(s).map((g) => g.seat));
      g.seat =
        Array.from({ length: 4 }, (_, i) => (i + g.id - 1) % 4).find((i) => !used.has(i)) ?? 0;
      g.status = 'reading';
      g.remaining = 8;
      note(g.name + ' has a menu. Give them a moment to choose.');
    }
    if (a.operation === 'order' && g.status === 'ready') {
      g.status = 'ordered';
      g.remaining =
        (s.settings.mode === 'chill' ? 260 : s.settings.mode === 'rush' ? 144 : 160) +
        (s.rapport[g.customerId] ?? 0) * 6;
      note(g.name + ': “A ' + recipeById(g.recipeId).name + ', please.”');
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
          (q.score >= 90 ? 'That’s a lovely drink.' : 'Just what I needed.') +
          '” ' +
          q.label +
          ' · ' +
          q.score +
          '/100',
      );
    }
    if (a.operation === 'pay' && g.status === 'pay' && !g.paid) {
      if (g.food === 'warming' || g.food === 'ready') {
        note('Finish serving the snack before settling this tab.');
        return s;
      }
      if (a.paymentId && s.committed.includes(a.paymentId)) return current;
      const amount = a.amountMinor ?? g.charge - g.paidAmount;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > g.charge - g.paidAmount) {
        note('Payment must match an unpaid part of the tab.');
        return s;
      }
      if (a.paymentId) s.committed.push(a.paymentId);
      g.paidAmount += amount;
      s.cash += amount;
      s.stats.earnings += amount;
      if (g.paidAmount < g.charge) {
        note('Payment received. Remaining: $' + ((g.charge - g.paidAmount) / 100).toFixed(2));
        return s;
      }
      const rate = g.remaining > 0 ? clamp(0.1 + g.tipDelta, 0, 0.25) : 0;
      const tip = Math.round((g.served ? prices[g.recipeId] : 0) * rate);
      s.cash += tip;
      s.stats.earnings += tip;
      s.stats.tips += tip;
      g.paid = true;
      g.status = 'leaving';
      g.remaining = 3;
      s.visitCount[g.customerId] = (s.visitCount[g.customerId] ?? 0) + 1;
      note(g.name + ' settled up. Tip: $' + (tip / 100).toFixed(2));
    }
    if (a.operation === 'food') {
      if (g.food === 'none' && ['ordered', 'drinking', 'pay'].includes(g.status)) {
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
        s.foodStock[snack.id]--;
        g.foodType = snack.id;
        g.food = 'warming';
        g.foodTime = snack.seconds;
        note(snack.name + ' for ' + g.name + '. Ready in ' + snack.seconds + ' seconds.');
      } else if (g.food === 'ready') {
        g.food = 'served';
        const snack = snacks.find((n) => n.id === g.foodType)!;
        g.charge += snack.price;
        note(snack.name + ' served. Added $' + (snack.price / 100).toFixed(2) + ' to the tab.');
      }
    }
    if (a.operation === 'move') {
      const used = new Set(
        active(s)
          .filter((x) => x.id !== g.id)
          .map((x) => x.seat),
      );
      const seat = [0, 1, 2, 3].find((i) => i !== g.seat && !used.has(i));
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
        p.measure.id === 'plain_water' || p.measure.id === 'angostura_bitters'
          ? amount * 0.8
          : amount;
      if (volume(p) + addition > (p.tool === 'old_fashioned_glass' ? 250 : 440)) {
        note('The vessel is full. Discard or use another preparation.');
        return s;
      }
      p.amounts[p.measure.id] = Number(((p.amounts[p.measure.id] ?? 0) + amount).toFixed(2));
      p.log.push('Added ' + amount + ' ' + p.measure.id);
      p.measure = null;
      p.technique = 'none';
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
      p.log.push(a.operation);
      note(
        a.operation === 'shake'
          ? 'A good shake. Strain into your serving glass.'
          : 'Stirred gently. Ready for the finishing touches.',
      );
    }
    if (a.operation === 'garnish' && a.ingredient) {
      if (spend(a.ingredient, 1)) {
        p.garnish[a.ingredient] = (p.garnish[a.ingredient] ?? 0) + 1;
        note('Added ' + a.ingredient.replaceAll('_', ' '));
      }
    }
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
    s.committed.push(token);
    s.rapport[g.customerId] = clamp((s.rapport[g.customerId] ?? 0) + ch.trust, -5, 5);
    g.tipDelta = clamp(g.tipDelta + ch.tip, -0.1, 0.15);
    g.remaining += ch.patience * 8;
    if (ch.storyId && c.storySubjectKey)
      s.history[c.customerId + '|' + c.storySubjectKey] = ch.storyId;
    if (ch.orderChange === 'extra_cherry') g.extraCherry = true;
    else if (ch.orderChange && recipes.some((r) => r.id === ch.orderChange))
      g.recipeId = ch.orderChange;
    if (ch.result === 'cancel' || ch.result === 'decline') {
      g.status = 'leaving';
      g.remaining = 3;
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
    note(ch.reply);
  }
  return s;
}

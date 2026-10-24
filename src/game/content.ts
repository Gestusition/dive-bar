import recipesData from '../../data/cocktails.en.json';
import original from '../../data/dialogues.en.json';
import social from '../../data/social-dialogues.en.json';
import profile from '../../data/vertical-slice.en.json';
import catalogue from '../../data/catalogue.en.json';

export interface Ingredient {
  id: string;
  name: string;
  kind: string;
  unit: string;
}
export interface RecipeIngredient {
  slot: string;
  allowed: string[];
  quantity: number | null;
  unit: string;
  optional?: boolean;
  gameTarget?: { preferred: number; acceptedMin: number; acceptedMax: number };
}
export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  service: {
    glass: string;
    ice: string;
    garnish: { allOf?: (string | { oneOf: string[] })[]; optional?: string[] };
  };
  steps: { action: string }[];
  source: { url: string; publisher?: string };
  preparation?: {
    tool: 'shaker' | 'mixing_glass' | 'old_fashioned_glass' | 'build_glass';
    technique: 'shake' | 'stir';
    glass: 'cocktail_glass' | 'old_fashioned_glass' | 'highball' | 'mug' | 'hurricane';
    notes: string;
    dissolve?: 'before_ice' | 'before_spirit';
    garnishCounts?: Record<string, number>;
  };
}
export interface Choice {
  id: string;
  text: string;
  reply: string;
  result?: string;
  next?: string;
  trust: number;
  patience: number;
  tip: number;
  orderChange?: string;
  worldChange?: string;
  storyId?: string;
}
export interface Conversation {
  id: string;
  customer: string;
  customerId: string;
  storySubjectKey?: string;
  nodes: { id: string; line: string; choices: Choice[] }[];
}
export const recipes = [...recipesData.recipes, ...catalogue.recipes] as Recipe[];
export const ingredients = [
  ...recipesData.ingredients,
  ...catalogue.ingredients,
  ...catalogue.garnishes.map((g) => ({ ...g, kind: 'fruit' })),
  ...[
    { id: 'orange_slice', name: 'Orange slice', kind: 'fruit', unit: 'piece' },
    { id: 'cocktail_cherry', name: 'Cocktail cherry', kind: 'fruit', unit: 'piece' },
  ],
] as Ingredient[];
export const roster = profile.customers;
export const prices: Record<string, number> = {
  ...Object.fromEntries(
    catalogue.recipes.map((r) => [r.id, r.id === 'cherry_lemonade' ? 700 : 1300]),
  ),
  ...profile.economy.pricesMinor,
};
export const stockItems = [
  ...profile.economy.stock,
  ...catalogue.ingredients.map((i) => ({
    ...i,
    parQuantity: i.openingQuantity,
    purchasePackQuantity: 100,
  })),
  ...catalogue.garnishes.map((i) => ({
    ...i,
    parQuantity: i.openingQuantity,
    purchasePackQuantity: 10,
  })),
];
export const conversations = [...original.conversations, ...social.conversations] as Conversation[];
export const enabled = new Set(profile.dialogueTiers.vertical_slice);
export const initialInventory = Object.fromEntries(
  stockItems.map((i) => [i.id, i.openingQuantity]),
) as Record<string, number>;
export const names: Record<string, string> = Object.fromEntries([
  ...ingredients.map((i) => [i.id, i.name]),
  ['cocktail_cherry', 'Cocktail cherry'],
  ['orange_slice', 'Orange slice'],
  ['orange_zest', 'Orange zest'],
  ['half_salt_rim', 'Half salt rim'],
]);
export const ingredientColors: Record<string, string> = {
  ...Object.fromEntries(catalogue.ingredients.map((i) => [i.id, i.color])),
  bourbon: '#c48232',
  rye_whiskey: '#a76329',
  tequila_100_agave: '#d6c996',
  triple_sec: '#f0b453',
  sweet_red_vermouth: '#963f4d',
  fresh_lime_juice: '#b2cf74',
  angostura_bitters: '#783c31',
  plain_water: '#a9d9e0',
  sugar_cube: '#fff0d1',
};
export const money = (n: number) => '$' + (n / 100).toFixed(2);
export const recipeById = (id: string) => recipes.find((r) => r.id === id)!;
export const recipeMethod = (r: Recipe) =>
  r.preparation ?? {
    tool:
      r.id === 'old_fashioned'
        ? ('old_fashioned_glass' as const)
        : r.id === 'margarita'
          ? ('shaker' as const)
          : ('mixing_glass' as const),
    technique: r.id === 'margarita' ? ('shake' as const) : ('stir' as const),
    glass:
      r.id === 'old_fashioned' ? ('old_fashioned_glass' as const) : ('cocktail_glass' as const),
    notes: '',
    dissolve: r.id === 'old_fashioned' ? ('before_spirit' as const) : undefined,
    garnishCounts: {} as Record<string, number>,
  };
export const snacks = [
  { id: 'pretzel' as const, name: 'Warm pretzel', price: 500, cost: 100, seconds: 12 },
  { id: 'toastie' as const, name: 'Cheese toastie', price: 700, cost: 180, seconds: 18 },
];

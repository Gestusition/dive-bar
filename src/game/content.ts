import recipesData from '../../data/cocktails.en.json';
import original from '../../data/dialogues.en.json';
import social from '../../data/social-dialogues.en.json';
import profile from '../../data/vertical-slice.en.json';

export interface Ingredient { id: string; name: string; kind: string; unit: string }
export interface RecipeIngredient { slot: string; allowed: string[]; quantity: number | null; unit: string; gameTarget?: { preferred: number; acceptedMin: number; acceptedMax: number } }
export interface Recipe { id: string; name: string; ingredients: RecipeIngredient[]; service: { glass: string; ice: string; garnish: { allOf?: (string | { oneOf: string[] })[]; optional?: string[] } }; steps: { action: string }[]; source: { url: string } }
export interface Choice { id: string; text: string; reply: string; result?: string; next?: string; trust: number; patience: number; tip: number; orderChange?: string; worldChange?: string; storyId?: string }
export interface Conversation { id: string; customer: string; customerId: string; storySubjectKey?: string; nodes: { id: string; line: string; choices: Choice[] }[] }
export const recipes = recipesData.recipes as Recipe[];
export const ingredients = recipesData.ingredients as Ingredient[];
export const roster = profile.customers;
export const prices: Record<string, number> = profile.economy.pricesMinor;
export const conversations = [...original.conversations, ...social.conversations] as Conversation[];
export const enabled = new Set(profile.dialogueTiers.vertical_slice);
export const initialInventory = Object.fromEntries(profile.economy.stock.map(i => [i.id, i.openingQuantity])) as Record<string, number>;
export const names: Record<string, string> = Object.fromEntries([...ingredients.map(i => [i.id, i.name]), ['cocktail_cherry', 'Cocktail cherry'], ['orange_slice', 'Orange slice'], ['orange_zest', 'Orange zest'], ['half_salt_rim', 'Half salt rim']]);
export const ingredientColors: Record<string, string> = { bourbon: '#c48232', rye_whiskey: '#a76329', tequila_100_agave: '#d6c996', triple_sec: '#f0b453', sweet_red_vermouth: '#963f4d', fresh_lime_juice: '#b2cf74', angostura_bitters: '#783c31', plain_water: '#a9d9e0', sugar_cube: '#fff0d1' };
export const money = (n: number) => '$' + (n / 100).toFixed(2);
export const recipeById = (id: string) => recipes.find(r => r.id === id)!;

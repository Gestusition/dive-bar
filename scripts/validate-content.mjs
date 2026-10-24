import fs from 'node:fs';
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const requireValue = (value, message) => {
  if (!value) throw new Error(message);
};
const profile = read('data/vertical-slice.en.json');
const cocktailData = read('data/cocktails.en.json');
const banks = ['data/dialogues.en.json', 'data/social-dialogues.en.json'].map(read);
const ids = new Set(),
  stories = new Set();
for (const { conversations } of banks)
  for (const c of conversations) {
    requireValue(!ids.has(c.id), 'Duplicate encounter: ' + c.id);
    ids.add(c.id);
    requireValue(
      profile.customers.some((x) => x.id === c.customerId),
      'Unknown customer: ' + c.id,
    );
    const nodes = new Map(c.nodes.map((n) => [n.id, n]));
    requireValue(nodes.has('start') && nodes.size === c.nodes.length, 'Invalid node IDs');
    const visited = new Set(),
      pending = new Set();
    const visit = (id) => {
      requireValue(!pending.has(id), 'Cycle: ' + c.id);
      if (visited.has(id)) return;
      requireValue(nodes.has(id), 'Missing node: ' + id);
      pending.add(id);
      visited.add(id);
      for (const choice of nodes.get(id).choices) {
        requireValue(Boolean(choice.next) !== Boolean(choice.result), 'Invalid transition');
        if (choice.next) visit(choice.next);
        if (choice.storyId)
          stories.add([c.customerId, c.storySubjectKey, choice.storyId].join('|'));
      }
      pending.delete(id);
    };
    visit('start');
    requireValue(visited.size === nodes.size, 'Unreachable node: ' + c.id);
  }
for (const { conversations } of banks)
  for (const c of conversations)
    if (c.eligibility?.requiresStory) {
      const p = c.eligibility.requiresStory;
      requireValue(
        stories.has([p.customerId, p.subjectKey, p.storyId].join('|')),
        'Broken story prerequisite',
      );
    }
for (const id of Object.values(profile.dialogueTiers).flat())
  requireValue(ids.has(id), 'Missing encounter ' + id);
const catalogue = read('data/catalogue.en.json');
const allIngredients = [
  ...cocktailData.ingredients,
  ...catalogue.ingredients,
  ...catalogue.garnishes,
  { id: 'orange_slice' },
  { id: 'cocktail_cherry' },
];
const ingredients = new Set(allIngredients.map((i) => i.id));
requireValue(ingredients.size === allIngredients.length, 'Duplicate ingredient ID');
const recipes = [...cocktailData.recipes, ...catalogue.recipes];
requireValue(new Set(recipes.map((r) => r.id)).size === recipes.length, 'Duplicate recipe ID');
for (const recipe of recipes) {
  requireValue(recipe.name && recipe.service && recipe.source, 'Incomplete recipe: ' + recipe.id);
  for (const ingredient of recipe.ingredients)
    requireValue(
      ingredient.allowed.length > 0 && ingredient.allowed.every((id) => ingredients.has(id)),
      'Unknown ingredient in ' + recipe.id,
    );
}
for (const file of fs.readdirSync('data').filter((f) => f.endsWith('.json'))) read('data/' + file);
console.log(
  'Content valid: ' +
    ids.size +
    ' encounters, ' +
    recipes.length +
    ' sourced or declared house recipes, ' +
    stories.size +
    ' story variants.',
);

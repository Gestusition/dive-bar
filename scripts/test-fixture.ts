// Test-only signed backup. It enters through the same import UI as player backups.
import { newGame, reduceGame } from '../src/game/engine';
import { roster } from '../src/game/content';
import { encodeBackup } from '../src/game/storage';

const game = reduceGame(newGame(), { type: 'open' });
game.guests = [game.guests[0]];
Object.assign(game.guests[0], {
  customerId: 'mara',
  name: roster.find((g) => g.id === 'mara')!.name,
  recipeId: 'manhattan',
  group: 0,
  lead: true,
});
game.notice = 'The doors are open. Mara walks in.';
game.spawnIn = 300;
game.settings.reducedMotion = true;
if (process.argv.includes('--closing')) {
  game.settings.reducedMotion = false;
  game.phase = 'closing';
  game.notice = 'Last glass collected. Time to clean up.';
  game.guests = [];
  game.mess = 3;
  game.trash = 2;
  game.dirtyGlasses = 4;
  game.cleanGlasses = 8;
  game.cash = 0;
  game.upgrades.barback = process.argv.includes('--host');
}
if (process.argv.includes('--showcase')) {
  for (const upgrade of Object.keys(game.upgrades) as (keyof typeof game.upgrades)[])
    game.upgrades[upgrade] = true;
  game.settings.theme = 'rose';
  game.settings.sound = false;
  game.settings.music = false;
  if (process.argv.includes('--opening')) {
    game.phase = 'opening';
    game.guests = [];
    game.notice = 'A little bar. A good story. Your kind of night.';
  } else {
    game.guests[0].status = 'ordered';
    game.guests[0].seat = 0;
    game.notice = 'Mara ordered a Manhattan.';
  }
}
process.stdout.write(new Uint8Array(await (await encodeBackup(game)).arrayBuffer()));

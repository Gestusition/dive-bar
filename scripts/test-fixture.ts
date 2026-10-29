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
process.stdout.write(new Uint8Array(await (await encodeBackup(game)).arrayBuffer()));

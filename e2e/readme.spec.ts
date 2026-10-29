import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

test('README showcase captures use owned decor and the Rose theme', async ({ page }) => {
  test.skip(!process.env.UPDATE_SCREENSHOTS, 'Documentation capture is explicitly requested.');
  test.skip(!['desktop', 'touch'].includes(test.info().project.name), 'README capture profiles.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);

  async function loadShowcase(opening = false) {
    const buffer = execFileSync('bun', [
      'run',
      'scripts/test-fixture.ts',
      '--showcase',
      ...(opening ? ['--opening'] : []),
    ]);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({
      name: 'showcase.divebar',
      mimeType: 'application/octet-stream',
      buffer,
    });
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.locator('.game-shell')).toHaveClass(/theme-rose/);
  }
  async function capture(name: string) {
    // Flush real frames after camera/layout changes before saving the WebGL view.
    await page.clock.runFor(500);
    await page.evaluate(() => document.fonts.ready);
    mkdirSync('docs/screenshots', { recursive: true });
    await page.screenshot({
      path: `docs/screenshots/${name}.jpg`,
      type: 'jpeg',
      quality: 90,
      scale: 'css',
    });
  }
  await loadShowcase(true);
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  await expect(page.locator('.shop-item.owned')).toHaveCount(7);
  await page.getByRole('button', { name: 'Close panel' }).click();
  if (test.info().project.name === 'touch') {
    await page.getByRole('button', { name: 'Recipes', exact: true }).click();
    await capture('phone-recipes');
    return;
  }
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Main menu' }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await capture('title');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Get ready', exact: true }).click();
  await capture('get-ready');
  await page.getByRole('button', { name: 'Close panel' }).click();
  await loadShowcase();
  await page.getByRole('button', { name: 'Select Mara', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Make drink' })).toBeVisible();
  await capture('service');
  await page.getByRole('button', { name: 'Make drink' }).click();
  await page.getByRole('button', { name: 'Mixing glass', exact: true }).click();
  await page.getByRole('button', { name: 'Chill glass', exact: true }).click();
  await page.getByRole('button', { name: /Next: Pour/ }).click();
  for (const bottle of ['Rye Whiskey', 'Sweet Red Vermouth', 'Angostura Bitters'])
    await page
      .locator('.pour-row', { hasText: bottle })
      .getByRole('button', { name: 'Pour', exact: true })
      .click();
  await capture('counter-pour-ready');
  await page.getByRole('button', { name: /Next: Mix/ }).click();
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await page.getByRole('button', { name: 'Stir Hold', exact: true }).focus();
  await page.keyboard.down('Space');
  await page.clock.runFor(2500);
  await page.keyboard.up('Space');
  await page.getByRole('button', { name: /Next: Garnish/ }).click();
  await page.getByRole('button', { name: /^Cocktail cherry/ }).click();
  await expect(page.locator('.bench-steps .done')).toHaveCount(4);
  await capture('counter-garnish');
});

import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { unseal } from '../src/game/seal';
const storyBackup = execFileSync('bun', ['run', 'scripts/test-fixture.ts']);

// Jump no further than the simulation's 250 ms interval: every service tick still
// runs, while redundant intermediate animation frames are coalesced by the clock.
async function advanceService(page: Page, milliseconds: number) {
  for (let left = milliseconds; left > 0; left -= 250)
    await page.clock.fastForward(Math.min(left, 250));
}
async function hold(page: Page, name: string, milliseconds: number) {
  const button = page.getByRole('button', { name: name + ' Hold', exact: true });
  await button.focus();
  await page.keyboard.down('Space');
  await page.clock.runFor(milliseconds);
  await page.keyboard.up('Space');
}
async function importNight(page: Page) {
  // A normal signed backup gives story tests a known guest, without exposing or
  // changing the production store or replacing gameplay randomness.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'story.divebar',
    mimeType: 'application/octet-stream',
    buffer: storyBackup,
  });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  // Import preserves the drawer the player had open. Close it before trying to
  // reach a guest; on narrow WebKit layouts it covers the door's action card.
  await page.getByRole('button', { name: 'Close panel' }).click();
}

async function capture(page: Page, name: string) {
  if (!process.env.UPDATE_SCREENSHOTS) return;
  const project = test.info().project.name;
  if (name === 'phone-recipes' ? project !== 'touch' : project !== 'desktop') return;
  // The test clock is paused: DOM updates do not paint the WebGL camera or the
  // resized canvas until animation frames run. Flush frames before capturing.
  await page.clock.runFor(250);
  mkdirSync('docs/screenshots', { recursive: true });
  await page.screenshot({
    path: `docs/screenshots/${name}.jpg`,
    type: 'jpeg',
    quality: 90,
    scale: 'css',
  });
}
async function enter(page: Page, titleCapture = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('./');
  if (titleCapture) {
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await capture(page, 'title');
  }
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Get ready', exact: true }).click();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}
async function order(page: Page) {
  await enter(page);
  await importNight(page);
  await page.getByRole('button', { name: 'Seat guest' }).click();
  await advanceService(page, 18000);
  await page.getByRole('button', { name: 'Take order', exact: true }).click();
  await advanceService(page, 6000);
  await expect(page.getByRole('button', { name: 'Make drink' })).toBeVisible();
}
const step = (page: Page, name: string) =>
  page.locator('.bench-steps button', { hasText: name }).click();
const pour = (page: Page, bottle: string) =>
  page
    .locator('.pour-row', { hasText: bottle })
    .getByRole('button', { name: 'Pour', exact: true })
    .click();
const poured = (page: Page, bottle: string) =>
  page.locator('.pour-row', { hasText: bottle }).locator('.pour-name small');

test('opening, real renderer, menu and layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enter(page, true);
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await expect(page.getByText('The lights won’t turn on.')).toHaveCount(0);
  const counterLabel = page.getByRole('button', { name: /Counter/ });
  const counterLabelBox = await counterLabel.boundingBox();
  const sceneBox = await page.locator('.scene').boundingBox();
  expect(counterLabelBox).not.toBeNull();
  expect(sceneBox).not.toBeNull();
  expect(counterLabelBox!.y).toBeLessThan(sceneBox!.y + 60);
  await page.getByRole('button', { name: 'Edit menu' }).click();
  await expect(page.getByRole('button', { name: /Moscow Mule/ })).toBeVisible();
  await page.getByRole('button', { name: /Moscow Mule/ }).click();
  await expect(page.getByRole('button', { name: /Moscow Mule/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Close dialog' }).click();
  // Nothing spills past the screen: no page scroll and the side rail fits.
  expect(
    await page.evaluate(() => {
      const root = document.documentElement;
      const rail = document.querySelector('.rail')!;
      return (
        root.scrollWidth <= Math.ceil(root.getBoundingClientRect().width) &&
        rail.scrollHeight <= rail.clientHeight + 1
      );
    }),
  ).toBe(true);
  expect(errors).toEqual([]);
  await capture(page, 'get-ready');
});
test('phones held upright are asked to turn sideways', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Only touch screens are asked to rotate.');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Turn your phone sideways' })).toBeVisible();
  await page.setViewportSize({ width: 740, height: 360 });
  await expect(page.getByRole('heading', { name: 'Turn your phone sideways' })).toBeHidden();
});
test('service waits for the walk around the counter', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Open the bar' }).click();
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Seat guest' }).click();
  await advanceService(page, 500);
  await expect(page.getByRole('button', { name: 'Seat guest' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel queued tasks' })).toBeVisible();
  await advanceService(page, 4000);
  await expect(page.getByText('Give them a moment to choose.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seat guest' })).toHaveCount(0);
});

test('a believable cherry story, actual Manhattan, one settlement and persistent night', async ({
  page,
}) => {
  await order(page);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await page.getByRole('button', { name: /A local family picks/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /Of course. One extra cherry/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await capture(page, 'service');
  await page.getByRole('button', { name: 'Make drink' }).click();
  // Prep
  await page.getByRole('button', { name: 'Mixing glass', exact: true }).click();
  await page.getByRole('button', { name: 'Chill glass', exact: true }).click();
  // Pour
  await page.getByRole('button', { name: /Next: Pour/ }).click();
  await pour(page, 'Rye Whiskey');
  await pour(page, 'Sweet Red Vermouth');
  await pour(page, 'Angostura Bitters');
  await expect(poured(page, 'Rye Whiskey')).toHaveText(/^50 \/ 50 ml/);
  await capture(page, 'counter-pour-ready');
  // Mix
  await page.getByRole('button', { name: /Next: Mix/ }).click();
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await hold(page, 'Stir', 2500);
  // Garnish
  await page.getByRole('button', { name: /Next: Garnish/ }).click();
  const cherry = page.getByRole('button', { name: /^Cocktail cherry/ });
  await cherry.click();
  await cherry.click();
  // Every step is genuinely complete, so every step is ticked.
  await expect(page.locator('.bench-steps .done')).toHaveCount(4);
  await capture(page, 'counter-garnish');
  await page.getByRole('button', { name: 'Taste check', exact: true }).click();
  await expect(page.getByText('100/100', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Strain & serve' }).click();
  await advanceService(page, 22000);
  await page.getByRole('button', { name: 'Settle $14.00' }).click();
  await advanceService(page, 6000);
  const cash = await page.locator('.cash').textContent();
  expect(Number(cash!.slice(1))).toBeGreaterThan(134);
  expect(Number(cash!.slice(1))).toBeLessThanOrEqual(139);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Main menu' }).click();
  // Observe the actual committed, sealed cash balance instead of sleeping.
  await expect
    .poll(async () => {
      const raw = await page.evaluate(
        async () =>
          new Promise<string>((resolve, reject) => {
            const request = indexedDB.open('dive-bar', 1);
            request.onsuccess = () => {
              const db = request.result;
              const read = db.transaction('saves').objectStore('saves').get('current');
              read.onsuccess = () => {
                db.close();
                resolve(read.result);
              };
              read.onerror = () => {
                db.close();
                reject(read.error);
              };
            };
            request.onerror = () => reject(request.error);
          }),
      );
      if (!raw) return null;
      const [, nonce, signature, body] = raw.split(':');
      return JSON.parse(
        new TextDecoder().decode(
          unseal(
            { nonce, signature, body: new Uint8Array(Buffer.from(body, 'base64')) },
            'dive-bar device save v2',
          ),
        ),
      ).cash;
    })
    .toBe(Math.round(Number(cash!.slice(1)) * 100));
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.cash')).toHaveText(cash!);
});
test('unromantic truth cancels the order without taking payment', async ({ page }) => {
  await order(page);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await page.getByRole('button', { name: /We buy them at the supermarket/ }).click();
  await expect(page.getByRole('dialog').getByText(/Just supermarket cherries/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await advanceService(page, 4000);
  await expect(page.getByRole('button', { name: 'Make drink' })).toHaveCount(0);
  await expect(page.locator('.cash')).toHaveText('$120.00');
});
test('practice measures real quantities without consuming paid stock', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('button', { name: 'Chill glass', exact: true }).click();
  await step(page, 'Pour');
  await pour(page, '100% Agave Tequila');
  await pour(page, 'Triple Sec');
  await pour(page, 'Fresh Lime Juice');
  await step(page, 'Mix');
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await hold(page, 'Shake', 3000);
  await step(page, 'Garnish');
  await page.getByRole('button', { name: 'Check my drink' }).click();
  await expect(page.getByText('100/100', { exact: true })).toBeVisible();
  await expect(page.locator('.cash')).toHaveText('$120.00');
});
test('steps are ticked only when they are really done', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  const prep = page.locator('.bench-steps button', { hasText: 'Prep' });
  // A Margarita is shaken: the rocks glass is the wrong vessel.
  await page.getByRole('button', { name: 'Rocks glass', exact: true }).click();
  await expect(prep).not.toHaveClass(/done/);
  await page.getByRole('button', { name: 'Shaker', exact: true }).click();
  await page.getByRole('button', { name: 'Coupe', exact: true }).click();
  await expect(prep).toHaveClass(/done/);
  await step(page, 'Pour');
  const pourStep = page.locator('.bench-steps button', { hasText: 'Pour' });
  await pour(page, '100% Agave Tequila');
  await expect(pourStep).not.toHaveClass(/done/);
  // Close enough counts; the taste score judges the fine detail.
  const triple = page.locator('.pour-row', { hasText: 'Triple Sec' });
  await triple.getByRole('button', { name: 'Less Triple Sec' }).click();
  await pour(page, 'Triple Sec');
  await expect(poured(page, 'Triple Sec')).toHaveText(/^15 \/ 20 ml/);
  await pour(page, 'Fresh Lime Juice');
  await expect(pourStep).not.toHaveClass(/done/);
  await triple.getByRole('button', { name: 'Less Triple Sec' }).click();
  await triple.getByRole('button', { name: 'Less Triple Sec' }).click();
  await pour(page, 'Triple Sec');
  await expect(pourStep).toHaveClass(/done/);
});
test('the practice picker switches drinks inside the counter', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('button', { name: 'Practice recipe' }).click();
  await page.getByRole('button', { name: /Bloody Mary/ }).click();
  await expect(page.locator('.bench-title h2')).toHaveText('Bloody Mary');
  await step(page, 'Pour');
  // Dashes are poured in full, not capped at one.
  const sauce = page.locator('.pour-row', { hasText: 'Worcestershire' });
  await sauce.getByRole('button', { name: 'Pour', exact: true }).click();
  await expect(poured(page, 'Worcestershire')).toHaveText(/^2 \/ 2 dash/);
});
test('paused reading cannot advance the shift', async ({ page }) => {
  await order(page);
  const before = await page.locator('.clock').textContent();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await advanceService(page, 60000);
  await expect(page.locator('.clock')).toHaveText(before!);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await advanceService(page, 2000);
  expect(await page.locator('.clock').textContent()).not.toBe(before);
});
test('last call, closing checklist and the next night form a complete loop', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Open the bar' }).click();
  await page.getByRole('button', { name: 'Last orders' }).click();
  await advanceService(page, 5000);
  await expect(page.getByRole('heading', { name: 'Closing time' })).toBeVisible();
  await page.getByRole('button', { name: 'Wipe counter', exact: true }).click();
  await page.getByRole('button', { name: 'Take out trash', exact: true }).click();
  await page.getByRole('button', { name: 'Restock shelves', exact: true }).click();
  await page.getByRole('button', { name: 'Done, nothing to buy', exact: true }).click();
  await page.getByRole('button', { name: 'Close the bar' }).click();
  await expect(page.getByRole('heading', { name: 'Night 1 complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Next night' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
});
test('fresh profiles and New game start with an unowned shop and persist the reset', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  await expect(page.locator('.shop-item')).toHaveCount(7);
  await expect(page.locator('.shop-item.owned')).toHaveCount(0);
  const host = page.locator('.shop-item').filter({ has: page.getByText('Host', { exact: true }) });
  await host.getByRole('button').click();
  await expect(host.getByRole('button', { name: 'Owned' })).toBeDisabled();
  await expect(page.locator('.cash')).toHaveText('$60.00');
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.clock.runFor(250);
  await page.screenshot({ path: test.info().outputPath('hired-host.png') });
  await page.getByRole('button', { name: 'Get ready', exact: true }).click();
  await page.getByRole('button', { name: 'Open the bar' }).click();
  await advanceService(page, 12000);
  await expect(page.getByRole('button', { name: 'Seat guest' })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('host-escort.png') });
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Main menu' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect(page.locator('.cash')).toHaveText('$120.00');
  // Reload before the five-second autosave: New game itself must replace the old save.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  await expect(page.locator('.shop-item')).toHaveCount(7);
  await expect(page.locator('.shop-item.owned')).toHaveCount(0);
  await expect(page.locator('.cash')).toHaveText('$120.00');
});

test('side drawers open from the rail and close again', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Recipes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recipes', exact: true })).toBeVisible();
  await capture(page, 'phone-recipes');
  await page.getByRole('button', { name: 'Decorate', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Decorate', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect(page.locator('.drawer.open')).toHaveCount(0);
});
test('Escape closes a reading panel without accidentally pausing the game', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Get ready', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Paused' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toHaveCount(0);
});
test('the pause menu saves and returns to the title', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Main menu' }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await expect(page.getByText('Night 1 · $120.00')).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.cash')).toHaveText('$120.00');
});
test('a held free pour stops when its workstation loses focus', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Free pour', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await step(page, 'Pour');
  await page
    .locator('.pour-row', { hasText: '100% Agave Tequila' })
    .getByRole('button', { name: 'Hold to pour' })
    .hover();
  await page.mouse.down();
  await page.clock.runFor(500);
  const amount = poured(page, '100% Agave Tequila');
  const during = await amount.textContent();
  expect(parseFloat(during!)).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await advanceService(page, 2000);
  await expect(amount).toHaveText(during!);
  await page.mouse.up();
});

test('an overpour cannot complete the step or be served', async ({ page }) => {
  await order(page);
  await page.getByRole('button', { name: 'Make drink' }).click();
  await page.getByRole('button', { name: 'Mixing glass', exact: true }).click();
  await step(page, 'Pour');
  await pour(page, 'Rye Whiskey');
  await page
    .locator('.pour-row', { hasText: 'Sweet Red Vermouth' })
    .getByRole('button', { name: 'More Sweet Red Vermouth' })
    .click();
  await pour(page, 'Sweet Red Vermouth');
  await pour(page, 'Angostura Bitters');
  await expect(poured(page, 'Sweet Red Vermouth')).toHaveText(/^25 \/ 20 ml/);
  await expect(page.locator('.bench-steps button', { hasText: 'Pour' })).not.toHaveClass(/done/);
  await expect(page.getByText('Too much in this preparation.', { exact: false })).toBeVisible();
  await step(page, 'Mix');
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await hold(page, 'Stir', 2500);
  await step(page, 'Garnish');
  await page.getByRole('button', { name: /^Cocktail cherry/ }).click();
  await page.getByRole('button', { name: 'Strain & serve' }).click();
  await expect(page.getByRole('complementary', { name: 'Counter', exact: true })).toBeVisible();
  await expect(page.getByText(/Not ready to serve:.*outside the serving measure/)).toBeVisible();
  await expect(page.locator('.cash')).toHaveText('$120.00');
});

test('overmixing is not marked complete and optional garnish needs no addition', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await step(page, 'Garnish');
  await expect(page.locator('.bench-steps button', { hasText: 'Garnish' })).toHaveClass(/done/);
  await step(page, 'Mix');
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await hold(page, 'Shake', 4500);
  await expect(page.locator('.bench-steps button', { hasText: 'Mix' })).not.toHaveClass(/done/);
  await expect(page.getByText(/Mixed too long. Discard/)).toBeVisible();
});

test('backup export is a signed file and damaged import preserves the current bar', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('dive-bar-night-1.divebar');
  const stream = await download.createReadStream();
  const parts = [];
  for await (const chunk of stream!) parts.push(chunk);
  expect(Buffer.concat(parts).toString()).toMatch(/^DIVE BAR SAVE v3/);
  await page.locator('input[type=file]').setInputFiles({
    name: 'damaged.divebar',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(storyBackup.toString().replace('night=1', 'night=9')),
  });
  await expect(page.getByRole('alert').filter({ hasText: /changed or damaged/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.cash')).toHaveText('$120.00');
});

test('pointer-held mixing stops on focus loss without restarting', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await step(page, 'Mix');
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await page.getByRole('button', { name: 'Shake Hold', exact: true }).hover();
  await page.mouse.down();
  await page.clock.runFor(3000);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('.bench-tile.busy')).toHaveCount(0);
  const mix = page.locator('.bench-steps button', { hasText: 'Mix' });
  await expect(mix).toHaveClass(/done/);
  await page.clock.runFor(3000);
  await expect(mix).toHaveClass(/done/);
  await page.mouse.up();
});

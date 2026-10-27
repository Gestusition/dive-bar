import { expect, test, type Page } from '@playwright/test';
async function enter(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('./');
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
  await page.getByRole('button', { name: 'Open the bar' }).click();
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Seat guest' }).click();
  await page.clock.runFor(18000);
  await page.getByRole('button', { name: 'Take order', exact: true }).click();
  await page.clock.runFor(6000);
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
  await enter(page);
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
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: 'Seat guest' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel queued tasks' })).toBeVisible();
  await page.clock.runFor(4000);
  await expect(page.getByText('Give them a moment to choose.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seat guest' })).toHaveCount(0);
});

test('a believable cherry story, actual Manhattan, one settlement and persistent night', async ({
  page,
}) => {
  // Software WebGL can make the simulated service exceed the default 90 seconds.
  test.slow();
  await order(page);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await page.getByRole('button', { name: /A local family picks/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /Of course. One extra cherry/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
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
  // Mix
  await page.getByRole('button', { name: /Next: Mix/ }).click();
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await page.getByRole('button', { name: 'Stir', exact: true }).click();
  await page.clock.runFor(3000);
  // Garnish
  await page.getByRole('button', { name: /Next: Garnish/ }).click();
  const cherry = page.getByRole('button', { name: /Cocktail cherry/ });
  await cherry.click();
  await cherry.click();
  // Every step is genuinely complete, so every step is ticked.
  await expect(page.locator('.bench-steps .done')).toHaveCount(4);
  await page.getByRole('button', { name: 'Taste check', exact: true }).click();
  await expect(page.getByText('100/100', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Strain & serve' }).click();
  await page.clock.runFor(22000);
  await page.getByRole('button', { name: 'Settle $14.00' }).click();
  await page.clock.runFor(6000);
  await expect(page.locator('.cash')).toHaveText('$136.80');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.cash')).toHaveText('$136.80');
});
test('unromantic truth cancels the order without taking payment', async ({ page }) => {
  // Seating and ordering also render every simulated tick on software WebGL.
  test.slow();
  await order(page);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await page.getByRole('button', { name: /We buy them at the supermarket/ }).click();
  await expect(page.getByRole('dialog').getByText(/Just supermarket cherries/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.clock.runFor(4000);
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
  await page.getByRole('button', { name: 'Shake', exact: true }).click();
  await page.clock.runFor(4000);
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
  await sauce.getByRole('button', { name: /^More/ }).click();
  await sauce.getByRole('button', { name: 'Pour', exact: true }).click();
  await expect(poured(page, 'Worcestershire')).toHaveText(/^2 \/ 2 dash/);
});
test('paused reading cannot advance the shift', async ({ page }) => {
  // This advances a full simulated minute after seating and ordering.
  test.slow();
  await order(page);
  const before = await page.locator('.clock').textContent();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.clock.runFor(60000);
  await expect(page.locator('.clock')).toHaveText(before!);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.clock.runFor(2000);
  expect(await page.locator('.clock').textContent()).not.toBe(before);
});
test('last call, closing checklist and the next night form a complete loop', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Open the bar' }).click();
  await page.getByRole('button', { name: 'Last orders' }).click();
  await page.clock.runFor(5000);
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
test('side drawers open from the rail and close again', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Recipes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recipes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tabs', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Open tabs', exact: true })).toBeVisible();
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
  await page.clock.runFor(2000);
  await expect(amount).toHaveText(during!);
  await page.mouse.up();
});

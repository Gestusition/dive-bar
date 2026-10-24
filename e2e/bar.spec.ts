import { expect, test, type Page } from '@playwright/test';
async function enter(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: 'Make yourself at home' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduced motion' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}
async function order(page: Page) {
  await enter(page);
  await page.getByRole('button', { name: 'Turn the sign to open' }).click();
  await page.getByRole('button', { name: 'Offer a seat' }).click();
  await page.clock.runFor(11000);
  await page.getByRole('button', { name: 'Take order', exact: true }).click();
  await page.clock.runFor(1750);
  await expect(page.getByRole('button', { name: 'Make their drink' })).toBeVisible();
}
async function measure(page: Page, bottle: string, amount: number) {
  await page.getByRole('button', { name: new RegExp('^' + bottle) }).click();
  if (amount) {
    await page.getByRole('button', { name: String(amount), exact: true }).click();
    await page.getByRole('button', { name: 'Measure ' + amount + ' ml', exact: true }).click();
  } else await page.getByRole('button', { name: 'Measure 1 dash', exact: true }).click();
  await page.getByRole('button', { name: 'Transfer', exact: true }).click();
}
test('opening, real renderer, menu and mobile layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enter(page);
  await expect(page.getByRole('heading', { name: 'Before the first hello' })).toBeVisible();
  await expect(page.getByText('The lights won’t turn on.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose tonight’s menu' }).click();
  await expect(page.getByRole('button', { name: /Moscow Mule/ })).toBeVisible();
  await page.getByRole('button', { name: /Moscow Mule/ }).click();
  await expect(page.getByRole('button', { name: /Moscow Mule/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Close dialog' }).click();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        Math.ceil(document.documentElement.getBoundingClientRect().width),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('a believable cherry story, actual Manhattan, one settlement and persistent night', async ({
  page,
}) => {
  await order(page);
  await page.getByRole('button', { name: 'Have a little chat' }).click();
  await page.getByRole('button', { name: /A local family picks/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /Of course. One extra cherry/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Make their drink' }).click();
  await page.getByRole('button', { name: 'Mixing glass', exact: true }).click();
  await measure(page, 'Rye Whiskey', 50);
  await measure(page, 'Sweet Red Vermouth', 20);
  await measure(page, 'Angostura Bitters', 0);
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await page.getByRole('button', { name: 'Stir', exact: true }).click();
  await page.clock.runFor(3000);
  await page.getByRole('button', { name: 'Chill glass', exact: true }).click();
  const cherry = page.getByRole('button', { name: /Cocktail cherry/ });
  await cherry.click();
  await cherry.click();
  await page.getByRole('button', { name: 'Taste check', exact: true }).click();
  await expect(page.getByText('100/100', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Strain & serve' }).click();
  await page.clock.runFor(22000);
  await page.getByRole('button', { name: 'Settle $14.00' }).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.cash')).toHaveText('$136.80');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole('button', { name: 'Continue your night' }).click();
  await expect(page.locator('.cash')).toHaveText('$136.80');
});
test('unromantic truth cancels the order without taking payment', async ({ page }) => {
  await order(page);
  await page.getByRole('button', { name: 'Have a little chat' }).click();
  await page.getByRole('button', { name: /We buy them at the supermarket/ }).click();
  await expect(page.getByRole('dialog').getByText(/Just supermarket cherries/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.clock.runFor(4000);
  await expect(page.getByRole('button', { name: 'Make their drink' })).toHaveCount(0);
  await expect(page.locator('.cash')).toHaveText('$120.00');
});
test('practice measures real quantities without consuming paid stock', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'A little practice first' }).click();
  await measure(page, '100% Agave Tequila', 50);
  await measure(page, 'Triple Sec', 20);
  await measure(page, 'Fresh Lime Juice', 15);
  await page.getByRole('button', { name: 'Add ice', exact: true }).click();
  await page.getByRole('button', { name: 'Shake', exact: true }).click();
  await page.clock.runFor(4000);
  await page.getByRole('button', { name: 'Chill glass', exact: true }).click();
  await page.getByRole('button', { name: 'How did I do?' }).click();
  await expect(page.getByText('100/100', { exact: true })).toBeVisible();
  await expect(page.locator('.cash')).toHaveText('$120.00');
});
test('paused reading cannot advance the shift', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Turn the sign to open' }).click();
  await page.getByRole('button', { name: 'Call last orders' }).click();
  await page.clock.runFor(5000);
  await expect(page.getByRole('heading', { name: 'One last little tidy' })).toBeVisible();
  await page.getByRole('button', { name: 'Wipe the counter', exact: true }).click();
  await page.getByRole('button', { name: 'Take out the trash', exact: true }).click();
  await page.getByRole('button', { name: 'Check & replenish stock', exact: true }).click();
  await page.getByRole('button', { name: 'Stock checked · no purchase', exact: true }).click();
  await page.getByRole('button', { name: 'Count the till & close' }).click();
  await expect(page.getByRole('heading', { name: 'A night well spent' })).toBeVisible();
  await page.getByRole('button', { name: 'Another night, another story' }).click();
  await expect(page.getByRole('heading', { name: 'Before the first hello' })).toBeVisible();
});
test('Escape closes a reading panel without accidentally pausing the game', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The bar can wait.' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'The bar can wait.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'The bar can wait.' })).toHaveCount(0);
});
test('a toggled free pour stops when its workstation loses focus', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Free pour', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'A little practice first' }).click();
  await page.getByRole('button', { name: 'Tap to pour', exact: true }).click();
  await page.clock.runFor(500);
  const amount = await page.locator('.measure-value').textContent();
  expect(parseFloat(amount!)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'A little practice first' }).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.measure-value')).toHaveText(amount!);
});

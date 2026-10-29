import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
// Usage: node _shot.mjs <name> [width] [height]
// Renders the current bar and saves the full view plus a 4x3 grid of
// close-up tiles so every part of the scene can be inspected.
const out = process.argv[2] || 'shot';
const W = +(process.argv[3] || 1600),
  H = +(process.argv[4] || 1000);
const dir = resolve(process.env.SCREENSHOT_DIR ?? 'artifacts/scene') + sep;
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 3 });
await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173');
await page.getByRole('button', { name: /^(Play|Continue)$/ }).click({ timeout: 30000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: dir + out + '.png', scale: 'css' });
const box = await page.locator('canvas').first().boundingBox();
const cols = 4,
  rows = 3;
for (let r = 0; r < rows; r++)
  for (let c = 0; c < cols; c++)
    await page.screenshot({
      path: `${dir}${out}-${r}${c}.png`,
      clip: {
        x: box.x + (box.width / cols) * c,
        y: box.y + (box.height / rows) * r,
        width: box.width / cols,
        height: box.height / rows,
      },
    });
await browser.close();

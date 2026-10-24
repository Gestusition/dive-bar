import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'bun run preview -- --host 127.0.0.1 --port 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 1000 },
        // GPU-less Actions runners otherwise intermittently block WebGL 2.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1970486
        launchOptions: process.env.CI
          ? { headless: false, firefoxUserPrefs: { 'webgl.force-enabled': true } }
          : {},
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'touch', use: { ...devices['Pixel 7'] } },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    },
  ],
});

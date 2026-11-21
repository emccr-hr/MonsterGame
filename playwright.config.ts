import { defineConfig, devices } from '@playwright/test';

// Small smoke suite against the production build (docs/ci-standards.md). `npm run build` first;
// `npm run ci:local -- --full` does that for you.
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/smoke',
  // One at a time: several headless WebGL pages at once stalled page loads on the dev laptop,
  // and the suite is small (about 10 seconds serial).
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

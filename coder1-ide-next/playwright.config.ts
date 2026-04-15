import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Coder1 IDE Agent Hub e2e tests.
 *
 * Prerequisites:
 *   1. Dev server running: npm run dev (port 3001)
 *   2. Set env vars: TEST_EMAIL, TEST_PASSWORD
 *   3. First run will create e2e/.auth/user.json via global setup
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e/report' }], ['list']],

  use: {
    baseURL: 'http://localhost:3001',
    storageState: 'e2e/.auth/user.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

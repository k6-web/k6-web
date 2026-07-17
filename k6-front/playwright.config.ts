import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : [['html', {open: 'never'}], ['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: process.env.CI
    ? [
      {
        name: 'chromium',
        use: {...devices['Desktop Chrome']},
      },
      {
        name: 'firefox',
        use: {...devices['Desktop Firefox']},
      },
      {
        name: 'webkit',
        use: {...devices['Desktop Safari']},
      },
    ]
    : [
      {
        name: 'chromium',
        use: {...devices['Desktop Chrome']},
      },
    ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_TIMEOUT_MILLISECONDS = 120_000;
const EXPECT_TIMEOUT_MILLISECONDS = 5_000;

export default defineConfig({
  testDir: './tests/specs',
  timeout: PLAYWRIGHT_TIMEOUT_MILLISECONDS,
  expect: {
    timeout: EXPECT_TIMEOUT_MILLISECONDS,
  },
  reporter: [['list']],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

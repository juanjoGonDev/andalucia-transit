import { defineConfig } from '@playwright/test';

const DEFAULT_TIMEOUT_MS = 30000;
const EXPECT_TIMEOUT_MS = 5000;
const ACTION_TIMEOUT_MS = 15000;
const NAVIGATION_TIMEOUT_MS = 30000;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const CI_RETRY_COUNT = 2;
const LOCAL_RETRY_COUNT = 0;
const HEADLESS_MODE = true;
const BROWSER_NAME = 'chromium';
const PROJECT_NAME = 'chromium';
const REPORTER_DOT = 'dot';
const REPORTER_LIST = 'list';
const TRACE_MODE = 'retain-on-failure';
const IGNORE_HTTPS_ERRORS = true;
const TRACE_STORAGE = 'on-first-retry';
const TEST_DIRECTORY = './tests/playwright';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: TEST_DIRECTORY,
  timeout: DEFAULT_TIMEOUT_MS,
  expect: {
    timeout: EXPECT_TIMEOUT_MS,
  },
  forbidOnly: isCI,
  retries: isCI ? CI_RETRY_COUNT : LOCAL_RETRY_COUNT,
  reporter: isCI ? REPORTER_DOT : REPORTER_LIST,
  use: {
    browserName: BROWSER_NAME,
    headless: HEADLESS_MODE,
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    ignoreHTTPSErrors: IGNORE_HTTPS_ERRORS,
    actionTimeout: ACTION_TIMEOUT_MS,
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
    trace: isCI ? TRACE_STORAGE : TRACE_MODE,
  },
  projects: [
    {
      name: PROJECT_NAME,
    },
  ],
});

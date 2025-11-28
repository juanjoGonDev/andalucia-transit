import { expect, test } from '@playwright/test';

const SMOKE_TEST_NAME = 'playwright smoke baseline';
const BLANK_URL = 'about:blank';

test(SMOKE_TEST_NAME, async ({ page }) => {
  await page.goto(BLANK_URL);
  await expect(page).toHaveURL(BLANK_URL);
});

import { expect, test } from '@playwright/test';

const HOME_TABS_SUITE = 'home tabs keyboard navigation';
const BASE_URL = process.env.E2E_BASE_URL;
const HOME_PATH = '/';

test.describe(HOME_TABS_SUITE, () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for home tabs tests.');

  test('supports roving focus and activation keys', async ({ page }) => {
    const resolvedBaseUrl = BASE_URL as string;
    const homeUrl = new URL(HOME_PATH, resolvedBaseUrl).toString();

    await page.goto(homeUrl);

    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();

    const tabs = tabList.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);

    const firstTab = tabs.first();
    await firstTab.focus();
    await expect(firstTab).toBeFocused();

    await Promise.all([
      page.waitForURL((url) => url.pathname.endsWith('/recents')),
      page.keyboard.press('ArrowRight')
    ]);

    const secondTab = tabs.nth(1);
    await expect(secondTab).toBeFocused();
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');

    await Promise.all([
      page.waitForURL((url) => url.pathname === '/'),
      page.keyboard.press('Home')
    ]);

    await expect(firstTab).toBeFocused();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');

    await Promise.all([
      page.waitForURL((url) => url.pathname.endsWith('/favs')),
      page.keyboard.press('End')
    ]);

    const lastTab = tabs.last();
    await expect(lastTab).toBeFocused();
    await expect(lastTab).toHaveAttribute('aria-selected', 'true');
  });
});

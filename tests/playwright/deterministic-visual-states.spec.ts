import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const RECENT_PATH = '/recents';
const FAVORITES_PATH = '/favorites';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DATA_ITEM_COUNT = 2;

async function open(page: Page, path: string): Promise<void> {
  const baseUrl = BASE_URL as string;
  await page.goto(new URL(path, baseUrl).toString());
}

test.describe('deterministic visual data states', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for visual-state tests.');
  test.skip(
    MOCK_MODE !== 'data' && MOCK_MODE !== 'empty',
    'E2E_MOCK_MODE must identify the deterministic data mode.',
  );

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('renders recent-search history according to the selected mock mode', async ({ page }) => {
    await open(page, RECENT_PATH);

    const items = page.locator('.home-recent__item');
    const emptyState = page.locator('.home-recent__empty');

    if (MOCK_MODE === 'data') {
      await expect(items).toHaveCount(DATA_ITEM_COUNT);
      await expect(emptyState).toBeHidden();
      return;
    }

    await expect(items).toHaveCount(0);
    await expect(emptyState).toBeVisible();
  });

  test('renders favorites according to the selected mock mode', async ({ page }) => {
    await open(page, FAVORITES_PATH);

    const items = page.locator('.favorites__item');
    const emptyState = page.locator('.favorites__empty');

    if (MOCK_MODE === 'data') {
      await expect(items).toHaveCount(DATA_ITEM_COUNT);
      await expect(emptyState).toBeHidden();
      return;
    }

    await expect(items).toHaveCount(0);
    await expect(emptyState).toBeVisible();
  });
});

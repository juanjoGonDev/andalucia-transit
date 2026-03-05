import { expect, test } from '@playwright/test';

const STOP_DETAIL_SUITE = 'stop detail live region';
const BASE_URL = process.env.E2E_BASE_URL;
const STOP_ID = 'sevilla:001';
const STOP_DETAIL_PATH = `/stop-detail/${STOP_ID}`;

const LIVE_REGION_SELECTOR = '.stop-detail__live-region';
const UPCOMING_LIST_SELECTOR = '.stop-detail__list';

const hasBaseUrl = Boolean(BASE_URL);

const resolveStopDetailUrl = (): string => {
  if (!hasBaseUrl) {
    throw new Error('E2E_BASE_URL environment variable is required for stop detail tests.');
  }

  const resolvedBase = BASE_URL as string;
  return new URL(STOP_DETAIL_PATH, resolvedBase).toString();
};

test.describe(STOP_DETAIL_SUITE, () => {
  test.skip(!hasBaseUrl, 'E2E_BASE_URL environment variable is required for stop detail tests.');

  test('exposes a single polite live region for timeline progress', async ({ page }) => {
    const stopDetailUrl = resolveStopDetailUrl();

    await page.goto(stopDetailUrl);

    const upcomingList = page.locator(UPCOMING_LIST_SELECTOR).first();
    await expect(upcomingList).toBeVisible();

    const liveRegions = page.locator(LIVE_REGION_SELECTOR);
    await expect(liveRegions).toHaveCount(1);

    const liveRegion = liveRegions.first();
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    await expect(liveRegion).not.toHaveText('');
  });
});

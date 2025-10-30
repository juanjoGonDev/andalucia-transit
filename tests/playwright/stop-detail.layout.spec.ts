import { expect, test } from '@playwright/test';

const STOP_DETAIL_LAYOUT_SUITE = 'stop detail layout tokens';
const BASE_URL = process.env.E2E_BASE_URL;
const STOP_ID = 'sevilla:001';
const STOP_DETAIL_PATH = `/stop-detail/${STOP_ID}`;

const UPCOMING_LIST_SELECTOR = '.stop-detail__list';
const LIST_ITEM_SELECTOR = '.stop-detail__list-item';

const TABLET_WIDTH = 1024;
const TABLET_HEIGHT = 768;
const EXPECTED_PADDING = '16px';
const EXPECTED_GAP = '24px';

const hasBaseUrl = Boolean(BASE_URL);

const resolveStopDetailUrl = (): string => {
  if (!hasBaseUrl) {
    throw new Error('E2E_BASE_URL environment variable is required for stop detail tests.');
  }

  const resolvedBase = BASE_URL as string;
  return new URL(STOP_DETAIL_PATH, resolvedBase).toString();
};

test.describe(STOP_DETAIL_LAYOUT_SUITE, () => {
  test.skip(!hasBaseUrl, 'E2E_BASE_URL environment variable is required for stop detail tests.');

  test('uses spacing tokens on tablet breakpoints', async ({ page }) => {
    const stopDetailUrl = resolveStopDetailUrl();

    await page.setViewportSize({ width: TABLET_WIDTH, height: TABLET_HEIGHT });
    await page.goto(stopDetailUrl);

    const list = page.locator(UPCOMING_LIST_SELECTOR).first();
    await expect(list).toBeVisible();

    const firstItem = page.locator(LIST_ITEM_SELECTOR).first();
    await expect(firstItem).toBeVisible();

    const padding = await firstItem.evaluate<{
      paddingBlockStart: string;
      paddingBlockEnd: string;
      paddingInlineStart: string;
      paddingInlineEnd: string;
    }>((element) => {
      const styles = window.getComputedStyle(element as Element);
      return {
        paddingBlockStart: styles.paddingBlockStart,
        paddingBlockEnd: styles.paddingBlockEnd,
        paddingInlineStart: styles.paddingInlineStart,
        paddingInlineEnd: styles.paddingInlineEnd,
      };
    });

    expect(padding.paddingBlockStart).toBe(EXPECTED_PADDING);
    expect(padding.paddingBlockEnd).toBe(EXPECTED_PADDING);
    expect(padding.paddingInlineStart).toBe(EXPECTED_PADDING);
    expect(padding.paddingInlineEnd).toBe(EXPECTED_PADDING);

    const gap = await list.evaluate<string>((element) => {
      const styles = window.getComputedStyle(element as Element);
      return styles.rowGap || styles.gap;
    });

    expect(gap).toBe(EXPECTED_GAP);
  });
});

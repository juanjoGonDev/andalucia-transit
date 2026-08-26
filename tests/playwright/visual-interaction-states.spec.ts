import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const RECENT_PATH = '/recents';
const TIMETABLE_API_GLOB = '**/v1/Consorcios/*/horarios_origen_destino*';
const HOLIDAY_API_GLOB = '**/PublicHolidays/**';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const DATA_ITEM_COUNT = 2;
const TRANSPARENT_BACKGROUND = 'rgba(0, 0, 0, 0)';

async function open(page: Page, path: string): Promise<void> {
  const baseUrl = BASE_URL as string;
  await page.goto(new URL(path, baseUrl).toString());
}

async function openRecentData(page: Page): Promise<void> {
  await open(page, RECENT_PATH);
  await expect(page.locator('.home-recent__item')).toHaveCount(DATA_ITEM_COUNT);
  await expect(page.locator('.recent-search-card__status--disabled')).toHaveCount(DATA_ITEM_COUNT);
}

async function capture(page: Page, name: string): Promise<void> {
  if (!EVIDENCE_DIR) {
    return;
  }

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: join(EVIDENCE_DIR, name),
    fullPage: true,
  });
}

async function dismissDialog(page: Page): Promise<void> {
  const cancel = page.locator('.confirm-dialog__actions .app-button--ghost');
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(page.locator('app-overlay-dialog-container[role="dialog"]')).toHaveCount(0);
}

test.describe('deterministic interaction visual states', () => {
  test.skip(
    !BASE_URL,
    'E2E_BASE_URL environment variable is required for interaction-state tests.',
  );
  test.skip(MOCK_MODE !== 'data', 'E2E_MOCK_MODE=data is required for interaction-state tests.');

  test('keeps confirm dialogs on one coherent shared surface', async ({ page }) => {
    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await openRecentData(page);

      const clearAction = page.locator('.home__panel-action');
      await expect(clearAction).toBeVisible();
      await clearAction.click();

      const dialog = page.locator('app-overlay-dialog-container[role="dialog"]');
      const surface = dialog.locator('.app-overlay-dialog__surface');
      const title = dialog.locator('.app-dialog__title');
      const content = dialog.locator('.app-dialog__content');
      const actions = dialog.locator('.app-dialog__actions');

      await expect(dialog).toBeVisible();
      await expect(title).toBeVisible();
      await expect(content).toBeVisible();
      await expect(actions).toBeVisible();
      await expect(dialog.locator('.confirm-dialog__actions .app-button')).toHaveCount(2);

      const surfaceBackground = await surface.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      expect(surfaceBackground).not.toBe(TRANSPARENT_BACKGROUND);

      for (const region of [title, content, actions]) {
        expect(await region.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
          TRANSPARENT_BACKGROUND,
        );
      }

      expect(
        Number.parseFloat(
          await title.evaluate((element) => getComputedStyle(element).borderBottomWidth),
        ),
      ).toBeGreaterThan(0);
      expect(
        Number.parseFloat(
          await actions.evaluate((element) => getComputedStyle(element).borderTopWidth),
        ),
      ).toBeGreaterThan(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      await capture(page, `dialog-confirm_es_${viewport.width}_${viewport.height}_full.png`);
      await dismissDialog(page);
    }
  });

  test('exposes route-search loading, error and retry states without stale empty content', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.route(HOLIDAY_API_GLOB, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    let releaseFirstTimetableRequest: () => void = () => undefined;
    const firstTimetableRequestGate = new Promise<void>((resolve) => {
      releaseFirstTimetableRequest = resolve;
    });
    let timetableRequestCount = 0;

    await page.route(TIMETABLE_API_GLOB, async (route) => {
      timetableRequestCount += 1;

      if (timetableRequestCount === 1) {
        await firstTimetableRequestGate;
      }

      await route.abort('failed');
    });

    await openRecentData(page);
    const firstRecentCard = page.locator('.home-recent__item').first();
    await firstRecentCard.getByRole('button').first().click();

    await expect(page).toHaveURL(/\/routes\//);
    const results = page.locator('.route-search__results');
    const loading = page.locator('.route-search__async[role="status"]');
    await expect(results).toHaveAttribute('aria-busy', 'true');
    await expect(loading).toBeVisible();
    await expect(page.locator('.route-search__empty--results')).toHaveCount(0);
    await capture(page, 'route-search-loading_es_390_844_full.png');

    releaseFirstTimetableRequest();

    const error = page.locator('.route-search__async[role="alert"]');
    const retry = error.locator('.app-outline-button');
    await expect(error).toBeVisible();
    await expect(results).not.toHaveAttribute('aria-busy', 'true');
    await expect(retry).toBeVisible();
    await expect(page.locator('.route-search__empty--results')).toHaveCount(0);
    await capture(page, 'route-search-error_es_390_844_full.png');

    await retry.click();
    await expect.poll(() => timetableRequestCount).toBe(2);
    await expect(error).toBeVisible();
  });
});

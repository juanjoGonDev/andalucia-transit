import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const RECENT_PATH = '/recents';
const STOP_DIRECTORY_INDEX_PATH = '/assets/data/stop-directory/index.json';
const STOP_DIRECTORY_BASE_PATH = '/assets/data/stop-directory/';
const TIMETABLE_API_GLOB = '**/v1/Consorcios/*/horarios_origen_destino*';
const HOLIDAY_API_GLOB = '**/PublicHolidays/**';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const DATA_ITEM_COUNT = 2;
const MINIMUM_TOUCH_TARGET_PX = 44;
const TRANSPARENT_BACKGROUND = 'rgba(0, 0, 0, 0)';

interface StopDirectoryIndexFile {
  readonly chunks: readonly StopDirectoryChunkDescriptor[];
}

interface StopDirectoryChunkDescriptor {
  readonly path: string;
}

interface StopDirectoryChunkFile {
  readonly stops: readonly StopDirectoryEntry[];
}

interface StopDirectoryEntry {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly name: string;
  readonly municipality: string;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

interface DirectionsTestStop {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly name: string;
  readonly municipality: string;
  readonly latitude: number;
  readonly longitude: number;
}

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

async function loadDirectionsTestStop(page: Page): Promise<DirectionsTestStop> {
  const baseUrl = BASE_URL as string;
  const indexResponse = await page.request.get(
    new URL(STOP_DIRECTORY_INDEX_PATH, baseUrl).toString(),
  );
  expect(indexResponse.ok()).toBe(true);

  const directory = (await indexResponse.json()) as StopDirectoryIndexFile;

  for (const descriptor of directory.chunks) {
    const chunkResponse = await page.request.get(
      new URL(`${STOP_DIRECTORY_BASE_PATH}${descriptor.path}`, baseUrl).toString(),
    );
    expect(chunkResponse.ok()).toBe(true);

    const chunk = (await chunkResponse.json()) as StopDirectoryChunkFile;
    const candidate = chunk.stops.find(
      (stop) =>
        Number.isSafeInteger(stop.consortiumId) &&
        stop.consortiumId > 0 &&
        stop.stopId.trim().length > 0 &&
        stop.name.trim().length > 0 &&
        stop.municipality.trim().length > 0 &&
        Number.isFinite(stop.location.latitude) &&
        Number.isFinite(stop.location.longitude),
    );

    if (candidate) {
      return {
        consortiumId: candidate.consortiumId,
        stopId: candidate.stopId,
        name: candidate.name,
        municipality: candidate.municipality,
        latitude: candidate.location.latitude,
        longitude: candidate.location.longitude,
      };
    }
  }

  throw new Error('Canonical stop directory does not contain a stop with usable coordinates.');
}

async function forceStopInformationFallback(page: Page): Promise<void> {
  await page.route(
    /https:\/\/api\.ctan\.es\/v1\/Consorcios\/\d+\/paradas\/[^?]+/u,
    async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{}',
      });
    },
  );
}

async function configureDirectionsGeolocation(
  context: BrowserContext,
  stop: DirectionsTestStop,
): Promise<void> {
  const baseUrl = BASE_URL as string;
  const origin = new URL(baseUrl).origin;
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({
    latitude: stop.latitude + 0.001,
    longitude: stop.longitude + 0.001,
  });
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

  test('keeps stop information distance guidance explicit on mobile and desktop', async ({
    context,
    page,
  }) => {
    const stop = await loadDirectionsTestStop(page);
    await forceStopInformationFallback(page);
    await configureDirectionsGeolocation(context, stop);

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, `/stop-info/${stop.consortiumId}/${encodeURIComponent(stop.stopId)}`);

      const card = page.locator('.stop-info__card');
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(card.locator('.stop-info__card-title')).toHaveText(stop.name);
      await expect(card.locator('.stop-info__location')).toContainText(stop.municipality);
      await expect(card).not.toContainText(String(stop.latitude));
      await expect(card).not.toContainText(String(stop.longitude));

      const directions = card.locator('.stop-info__directions');
      const action = directions.locator('.stop-info__directions-action');
      await expect(directions).toBeVisible();
      await expect(action).toBeVisible();

      const actionBounds = await action.boundingBox();
      expect(actionBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);

      await action.click();

      await expect(directions.locator('.stop-info__directions-distance')).toBeVisible();
      await expect(directions.locator('.stop-info__directions-disclaimer')).toContainText(
        'línea recta',
      );
      await expect(page.locator('.leaflet-routing-container')).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      await capture(page, `stop-info-directions_es_${viewport.width}_${viewport.height}_full.png`);
    }
  });
});

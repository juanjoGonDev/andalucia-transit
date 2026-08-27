import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const STOP_DIRECTORY_INDEX_PATH = '/assets/data/stop-directory/index.json';
const STOP_DIRECTORY_BASE_PATH = '/assets/data/stop-directory/';
const MINIMUM_TOUCH_TARGET_PX = 44;
const VIEWPORTS = [
  { name: 'mobile', size: { width: 390, height: 844 } },
  { name: 'desktop', size: { width: 1440, height: 900 } },
] as const;

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

interface TestStop {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly name: string;
  readonly municipality: string;
  readonly latitude: number;
  readonly longitude: number;
}

test.describe('stop information directions guidance', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for stop information tests.');

  for (const viewport of VIEWPORTS) {
    test(`keeps approximate distance guidance explicit and responsive on ${viewport.name}`, async ({
      context,
      page,
    }) => {
      const resolvedBaseUrl = BASE_URL as string;
      const stop = await loadTestStop(page, resolvedBaseUrl);
      await forceStopInformationFallback(page);
      await configureGeolocation(context, resolvedBaseUrl, stop);
      await page.setViewportSize(viewport.size);
      await page.goto(
        new URL(
          `/stop-info/${stop.consortiumId}/${encodeURIComponent(stop.stopId)}`,
          resolvedBaseUrl,
        ).toString(),
      );

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

      if (EVIDENCE_DIR) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/stop-info-directions-${viewport.size.width}x${viewport.size.height}.png`,
          fullPage: true,
        });
      }
    });
  }
});

async function loadTestStop(page: Page, baseUrl: string): Promise<TestStop> {
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

async function configureGeolocation(
  context: BrowserContext,
  baseUrl: string,
  stop: TestStop,
): Promise<void> {
  const origin = new URL(baseUrl).origin;
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({
    latitude: stop.latitude + 0.001,
    longitude: stop.longitude + 0.001,
  });
}

import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const MAP_PATH = '/map';
const STOP_DIRECTORY_INDEX_PATH = '/assets/data/stop-directory/index.json';
const STOP_DIRECTORY_BASE_PATH = '/assets/data/stop-directory/';
const TARGET_STOP_NAME = 'La Gangosa';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const MINIMUM_TOUCH_TARGET_PX = 44;

interface StopDirectoryIndexFile {
  readonly chunks: readonly StopDirectoryChunkDescriptor[];
}

interface StopDirectoryChunkDescriptor {
  readonly path: string;
}

interface StopDirectoryChunkFile {
  readonly stops: readonly StopDirectorySearchEntry[];
}

interface StopDirectorySearchEntry {
  readonly stopCode: string;
  readonly name: string;
  readonly municipality: string;
}

interface SearchStop {
  readonly code: string;
  readonly name: string;
  readonly municipality: string;
}

async function loadStopByName(page: Page, baseUrl: string, name: string): Promise<SearchStop> {
  const indexResponse = await page.request.get(
    new URL(STOP_DIRECTORY_INDEX_PATH, baseUrl).toString(),
  );
  expect(indexResponse.ok()).toBe(true);

  const directory = (await indexResponse.json()) as StopDirectoryIndexFile;
  const normalizedName = name.toLocaleLowerCase('es');

  for (const descriptor of directory.chunks) {
    const chunkResponse = await page.request.get(
      new URL(`${STOP_DIRECTORY_BASE_PATH}${descriptor.path}`, baseUrl).toString(),
    );
    expect(chunkResponse.ok()).toBe(true);

    const chunk = (await chunkResponse.json()) as StopDirectoryChunkFile;
    const candidate = chunk.stops.find(
      (stop) =>
        stop.stopCode.trim().length > 0 &&
        stop.name.toLocaleLowerCase('es').includes(normalizedName) &&
        stop.municipality.trim().length > 0,
    );

    if (candidate) {
      return {
        code: candidate.stopCode.trim(),
        name: candidate.name.trim(),
        municipality: candidate.municipality.trim(),
      };
    }
  }

  throw new Error(`Stop directory does not contain a searchable stop matching ${name}.`);
}

test.describe('map viewport refresh', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for map viewport tests.');
  test.skip(MOCK_MODE !== 'data', 'E2E_MOCK_MODE=data is required for map viewport tests.');

  test('refreshes nearby cards from a searched viewport and keeps popup close accessible', async ({
    page,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    const target = await loadStopByName(page, resolvedBaseUrl, TARGET_STOP_NAME);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, resolvedBaseUrl).toString());

    const mapSurface = page.locator('.map__canvas');
    const searchInput = page.locator('#map-network-search');
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    await expect(searchInput).toBeVisible();

    await searchInput.fill(target.name);
    const targetOption = page
      .locator('.app-autocomplete__option')
      .filter({ hasText: target.name })
      .filter({ hasText: target.code })
      .filter({ hasText: target.municipality })
      .first();
    await expect(targetOption).toBeVisible();
    await targetOption.click();

    const popup = page.locator('.app-map-stop-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.app-map-stop-popup__title')).toHaveText(target.name);

    const closeButton = popup.locator('.leaflet-popup-close-button');
    await expect(closeButton).toBeVisible();
    const closeBounds = await closeButton.boundingBox();
    expect(closeBounds?.width ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
    expect(closeBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
    await closeButton.focus();
    await expect(closeButton).toBeFocused();

    const nearbyInspector = page.locator('.map__inspector--nearby');
    await nearbyInspector.locator(':scope > summary').click();
    const nearbyPanel = nearbyInspector.locator('.map__panel');
    await expect(nearbyPanel).toBeVisible();

    const nearbyNames = nearbyPanel.locator('.map-stop__name');
    await expect
      .poll(() => nearbyNames.allTextContents(), { timeout: 15_000 })
      .toContain(target.name);
    await expect(nearbyPanel).not.toHaveAttribute('aria-busy', 'true');
  });
});

import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MAP_PATH = '/map';
const STOP_DIRECTORY_INDEX_PATH = '/assets/data/stop-directory/index.json';
const STOP_DIRECTORY_BASE_PATH = '/assets/data/stop-directory/';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const MINIMUM_PAINTED_PIXELS = 100;
const MINIMUM_MOBILE_MAP_HEIGHT = 360;
const MAXIMUM_MOBILE_PANEL_RATIO = 0.45;
const MINIMUM_DESKTOP_PANEL_START_RATIO = 0.55;
const MINIMUM_SEARCH_CODE_LENGTH = 2;
const MINIMUM_TOUCH_TARGET_PX = 44;
const TARGET_STOP_NAME = 'La Gangosa';
const SEVILLE_LOCATION = { latitude: 37.389092, longitude: -5.984459 } as const;

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

interface CanonicalSearchStop {
  readonly code: string;
  readonly name: string;
  readonly municipality: string;
}

async function loadStopDirectory(page: Page, baseUrl: string): Promise<StopDirectorySearchEntry[]> {
  const indexResponse = await page.request.get(
    new URL(STOP_DIRECTORY_INDEX_PATH, baseUrl).toString(),
  );
  expect(indexResponse.ok()).toBe(true);

  const directory = (await indexResponse.json()) as StopDirectoryIndexFile;
  const stops: StopDirectorySearchEntry[] = [];

  for (const descriptor of directory.chunks) {
    const chunkResponse = await page.request.get(
      new URL(`${STOP_DIRECTORY_BASE_PATH}${descriptor.path}`, baseUrl).toString(),
    );
    expect(chunkResponse.ok()).toBe(true);

    const chunk = (await chunkResponse.json()) as StopDirectoryChunkFile;
    stops.push(...chunk.stops);
  }

  return stops;
}

async function loadCanonicalSearchStop(page: Page, baseUrl: string): Promise<CanonicalSearchStop> {
  const stops = await loadStopDirectory(page, baseUrl);
  const codeCounts = new Map<string, number>();

  for (const entry of stops) {
    const code = entry.stopCode.trim();
    if (code.length < MINIMUM_SEARCH_CODE_LENGTH) {
      continue;
    }

    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }

  const candidate = stops.find((entry) => {
    const code = entry.stopCode.trim();
    return (
      code.length >= MINIMUM_SEARCH_CODE_LENGTH &&
      codeCounts.get(code) === 1 &&
      entry.name.trim().length > 0 &&
      entry.municipality.trim().length > 0
    );
  });

  expect(candidate).toBeDefined();
  if (!candidate) {
    throw new Error('Canonical stop chunks do not contain a unique searchable stop code.');
  }

  return toSearchStop(candidate);
}

async function loadSearchStopByName(
  page: Page,
  baseUrl: string,
  name: string,
): Promise<CanonicalSearchStop> {
  const stops = await loadStopDirectory(page, baseUrl);
  const normalizedName = name.toLocaleLowerCase('es');
  const candidate = stops.find(
    (entry) =>
      entry.stopCode.trim().length > 0 &&
      entry.name.toLocaleLowerCase('es').includes(normalizedName) &&
      entry.municipality.trim().length > 0,
  );

  expect(candidate).toBeDefined();
  if (!candidate) {
    throw new Error(`Canonical stop chunks do not contain a searchable stop matching ${name}.`);
  }

  return toSearchStop(candidate);
}

function toSearchStop(entry: StopDirectorySearchEntry): CanonicalSearchStop {
  return {
    code: entry.stopCode.trim(),
    name: entry.name.trim(),
    municipality: entry.municipality.trim(),
  };
}

async function openMapSearch(page: Page): Promise<Locator> {
  const searchTrigger = page.locator('.map-search__trigger');
  await expect(searchTrigger).toBeVisible();
  await expect(searchTrigger).toHaveAttribute('aria-expanded', 'false');
  await searchTrigger.click();

  const searchInput = page.locator('#map-network-search');
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toBeFocused();
  await expect(searchTrigger).toHaveAttribute('aria-expanded', 'true');
  return searchInput;
}

async function selectSearchStop(
  page: Page,
  stop: CanonicalSearchStop,
  query: string,
): Promise<void> {
  const searchInput = await openMapSearch(page);
  await searchInput.fill(query);

  const stopOption = page
    .locator('.app-autocomplete__option')
    .filter({ hasText: stop.name })
    .filter({ hasText: stop.code })
    .filter({ hasText: stop.municipality })
    .first();
  await expect(stopOption).toBeVisible();
  await stopOption.click();
  await expect(searchInput).not.toBeVisible();
}

async function openNearbyInspector(page: Page): Promise<Locator> {
  const nearbyInspector = page.locator('.map__inspector--nearby');
  const trigger = nearbyInspector.locator(':scope > summary');
  await expect(trigger).toBeVisible();
  await trigger.click();

  const panel = nearbyInspector.locator('.map__panel');
  await expect(panel).toBeVisible();
  return panel;
}

async function countPaintedPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext('2d');
    if (!context) {
      return 0;
    }

    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let painted = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if ((pixels[index] ?? 0) > 0) {
        painted += 1;
      }
    }

    return painted;
  });
}

test.describe('network map exploration', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for map exploration tests.');

  test('searches a real stop, reopens its marker and navigates through the popover action', async ({
    page,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    const searchStop = await loadCanonicalSearchStop(page, resolvedBaseUrl);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, resolvedBaseUrl).toString());

    const mapRegion = page.locator('.map__leaflet');
    const mapSurface = page.locator('.map__canvas');
    const overlayCanvas = page.locator('.leaflet-overlay-pane canvas').first();

    await expect(mapRegion).toBeVisible();
    await expect(mapRegion).toHaveAttribute('role', 'region');
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-out')).toBeVisible();
    await expect(overlayCanvas).toBeVisible({ timeout: 15_000 });
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    expect(await countPaintedPixels(overlayCanvas)).toBeGreaterThan(MINIMUM_PAINTED_PIXELS);

    await selectSearchStop(page, searchStop, searchStop.code);

    const popup = page.locator('.app-map-stop-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.app-map-stop-popup__title')).toHaveText(searchStop.name);
    await expect(popup.locator('.app-map-stop-popup__code')).toHaveText(searchStop.code);
    await expect(popup.locator('.app-map-stop-popup__municipality')).toHaveText(
      searchStop.municipality,
    );

    const closeButton = popup.locator('.leaflet-popup-close-button');
    await expect(closeButton).toBeVisible();
    const closeBounds = await closeButton.boundingBox();
    expect(closeBounds?.width ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
    expect(closeBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);
    await closeButton.focus();
    await expect(closeButton).toBeFocused();

    const mapBox = await mapRegion.boundingBox();
    expect(mapBox).not.toBeNull();
    if (!mapBox) {
      return;
    }

    await closeButton.click();
    await expect(popup).toBeHidden();
    await page.mouse.click(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);

    await expect(popup).toBeVisible();
    const detailsAction = popup.locator('.app-map-stop-popup__action');
    await expect(detailsAction).toBeVisible();
    await detailsAction.click();

    await expect(page).toHaveURL(/\/stop-detail\/.+\?consortiumId=\d+/, { timeout: 10_000 });
  });

  test('refreshes nearby cards from the settled viewport selected through map search', async ({
    page,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    const targetStop = await loadSearchStopByName(page, resolvedBaseUrl, TARGET_STOP_NAME);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, resolvedBaseUrl).toString());

    const mapSurface = page.locator('.map__canvas');
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    await selectSearchStop(page, targetStop, targetStop.name);
    const popup = page.locator('.app-map-stop-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.app-map-stop-popup__title')).toHaveText(targetStop.name);

    const nearbyPanel = await openNearbyInspector(page);
    const nearbyNames = nearbyPanel.locator('.map-stop__name');
    await expect
      .poll(() => nearbyNames.allTextContents(), { timeout: 15_000 })
      .toContain(targetStop.name);
    await expect(nearbyPanel).not.toHaveAttribute('aria-busy', 'true');
  });

  test('highlights the matching map marker when a nearby stop card is hovered', async ({
    page,
    context,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    const origin = new URL(resolvedBaseUrl).origin;
    await context.grantPermissions(['geolocation'], { origin });
    await context.setGeolocation(SEVILLE_LOCATION);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, resolvedBaseUrl).toString());

    const mapSurface = page.locator('.map__canvas');
    const overlayCanvas = page.locator('.leaflet-overlay-pane canvas').first();
    const locateButton = page.locator('.map__controls button').first();

    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    await locateButton.click();
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    const nearbyPanel = await openNearbyInspector(page);
    const nearbyStop = nearbyPanel.locator('.map__stop-item').first();
    await expect(nearbyStop).toBeVisible({ timeout: 15_000 });

    const baselinePaintedPixels = await countPaintedPixels(overlayCanvas);
    await nearbyStop.hover();

    await expect
      .poll(() => countPaintedPixels(overlayCanvas), { timeout: 5_000 })
      .toBeGreaterThan(baselinePaintedPixels);
  });

  test('keeps the map immersive while search, controls and results remain usable', async ({
    page,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    const mapUrl = new URL(MAP_PATH, resolvedBaseUrl).toString();

    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(mapUrl);

    const workspace = page.locator('.map__workspace');
    const mapSurface = page.locator('.map__canvas');
    const searchShell = page.locator('.map__search-shell');
    const controls = page.locator('.map__controls');

    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    await openMapSearch(page);
    await expect(controls).toBeVisible();
    const panel = await openNearbyInspector(page);

    const workspaceBox = await workspace.boundingBox();
    const panelBox = await panel.boundingBox();
    const mapBox = await mapSurface.boundingBox();
    const searchBox = await searchShell.boundingBox();
    const controlsBox = await controls.boundingBox();

    expect(workspaceBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();

    if (!workspaceBox || !panelBox || !mapBox || !searchBox || !controlsBox) {
      return;
    }

    expect(mapBox.width).toBeGreaterThanOrEqual(workspaceBox.width - 1);
    expect(mapBox.height).toBeGreaterThanOrEqual(workspaceBox.height - 1);
    expect(searchBox.x).toBeGreaterThanOrEqual(mapBox.x);
    expect(searchBox.y).toBeGreaterThanOrEqual(mapBox.y);
    expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(mapBox.x + mapBox.width + 1);
    expect(panelBox.x).toBeGreaterThan(mapBox.x + mapBox.width * MINIMUM_DESKTOP_PANEL_START_RATIO);
    expect(panelBox.y).toBeGreaterThanOrEqual(mapBox.y);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(mapBox.y + mapBox.height + 1);
    expect(controlsBox.x).toBeGreaterThanOrEqual(panelBox.x + panelBox.width - 1);
    expect(await panel.evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(mapUrl);
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    await openMapSearch(page);
    const mobilePanel = await openNearbyInspector(page);

    const mobileWorkspaceBox = await workspace.boundingBox();
    const mobileMapBox = await mapSurface.boundingBox();
    const mobilePanelBox = await mobilePanel.boundingBox();
    const mobileSearchBox = await searchShell.boundingBox();
    expect(mobileWorkspaceBox).not.toBeNull();
    expect(mobileMapBox).not.toBeNull();
    expect(mobilePanelBox).not.toBeNull();
    expect(mobileSearchBox).not.toBeNull();

    if (!mobileWorkspaceBox || !mobileMapBox || !mobilePanelBox || !mobileSearchBox) {
      return;
    }

    expect(mobileMapBox.height).toBeGreaterThanOrEqual(MINIMUM_MOBILE_MAP_HEIGHT);
    expect(mobileMapBox.height).toBeGreaterThanOrEqual(mobileWorkspaceBox.height - 1);
    expect(mobilePanelBox.y).toBeGreaterThan(mobileMapBox.y + mobileMapBox.height / 2);
    expect(mobilePanelBox.y + mobilePanelBox.height).toBeLessThanOrEqual(
      mobileMapBox.y + mobileMapBox.height + 1,
    );
    expect(mobilePanelBox.height).toBeLessThan(MOBILE_VIEWPORT.height * MAXIMUM_MOBILE_PANEL_RATIO);
    expect(mobileSearchBox.x).toBeGreaterThanOrEqual(mobileMapBox.x);
    expect(mobileSearchBox.x + mobileSearchBox.width).toBeLessThanOrEqual(
      mobileMapBox.x + mobileMapBox.width + 1,
    );
    expect(await mobilePanel.evaluate((element) => getComputedStyle(element).overflowY)).toBe(
      'auto',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });
});

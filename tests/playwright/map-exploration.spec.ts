import { expect, test, type Locator } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MAP_PATH = '/map';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const MINIMUM_PAINTED_PIXELS = 100;
const MINIMUM_MOBILE_MAP_HEIGHT = 360;
const DESKTOP_COLUMN_DOMINANCE_RATIO = 1.3;
const DESKTOP_HEIGHT_TOLERANCE_PX = 3;
const SEVILLE_LOCATION = { latitude: 37.389092, longitude: -5.984459 } as const;

interface CanvasActivationPoint {
  readonly x: number;
  readonly y: number;
}

async function findLargestPaintedComponentCenter(
  canvas: Locator,
): Promise<CanvasActivationPoint | null> {
  return canvas.evaluate((element: HTMLCanvasElement): CanvasActivationPoint | null => {
    const context = element.getContext('2d');
    if (!context || element.width <= 0 || element.height <= 0) {
      return null;
    }

    const image = context.getImageData(0, 0, element.width, element.height);
    const visited = new Uint8Array(element.width * element.height);
    const scaleX = element.clientWidth / element.width;
    const scaleY = element.clientHeight / element.height;
    let largestCount = 0;
    let largestX = 0;
    let largestY = 0;

    const isPainted = (index: number): boolean => (image.data[index * 4 + 3] ?? 0) > 0;

    for (let start = 0; start < visited.length; start += 1) {
      if (visited[start] || !isPainted(start)) {
        continue;
      }

      const queue = [start];
      visited[start] = 1;
      let cursor = 0;
      let count = 0;
      let sumX = 0;
      let sumY = 0;

      while (cursor < queue.length) {
        const index = queue[cursor];
        cursor += 1;
        const x = index % element.width;
        const y = Math.floor(index / element.width);
        count += 1;
        sumX += x;
        sumY += y;

        const neighbors = [
          x > 0 ? index - 1 : -1,
          x + 1 < element.width ? index + 1 : -1,
          y > 0 ? index - element.width : -1,
          y + 1 < element.height ? index + element.width : -1,
        ];

        for (const neighbor of neighbors) {
          if (neighbor < 0 || visited[neighbor] || !isPainted(neighbor)) {
            continue;
          }

          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }

      if (count > largestCount) {
        largestCount = count;
        largestX = sumX / count;
        largestY = sumY / count;
      }
    }

    if (largestCount === 0) {
      return null;
    }

    return {
      x: largestX * scaleX,
      y: largestY * scaleY,
    };
  });
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
    context,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    const origin = new URL(resolvedBaseUrl).origin;
    await context.grantPermissions(['geolocation'], { origin });
    await context.setGeolocation(SEVILLE_LOCATION);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, resolvedBaseUrl).toString());

    const mapRegion = page.locator('.map__leaflet');
    const mapSurface = page.locator('.map__canvas');
    const overlayCanvas = page.locator('.leaflet-overlay-pane canvas').first();
    const locateButton = page.locator('.map__locate-button');

    await expect(mapRegion).toBeVisible();
    await expect(mapRegion).toHaveAttribute('role', 'region');
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-out')).toBeVisible();
    await expect(overlayCanvas).toBeVisible({ timeout: 15_000 });
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    expect(await countPaintedPixels(overlayCanvas)).toBeGreaterThan(MINIMUM_PAINTED_PIXELS);

    await locateButton.click();

    const nearbyStop = page.locator('.map__stop-item').first();
    await expect(nearbyStop).toBeVisible({ timeout: 15_000 });
    await expect(nearbyStop.locator('.map-stop__icon')).toBeVisible();
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    const stopName = (await nearbyStop.locator('.map-stop__name').textContent())?.trim() ?? '';
    const stopMunicipality =
      (await nearbyStop.locator('.map-stop__municipality').textContent())?.trim() ?? '';
    const stopCode = (await nearbyStop.locator('.map-stop__code').textContent())?.trim() ?? '';
    expect(stopName).not.toBe('');
    expect(stopMunicipality).not.toBe('');
    expect(stopCode).not.toBe('');

    const searchInput = page.locator('#map-network-search');
    await searchInput.fill(stopName);

    const stopOption = page
      .locator('.app-autocomplete__option')
      .filter({ hasText: stopName })
      .filter({ hasText: stopMunicipality })
      .first();
    await expect(stopOption).toBeVisible();
    await stopOption.click();

    const popup = page.locator('.app-map-stop-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.app-map-stop-popup__title')).toHaveText(stopName);
    await expect(popup.locator('.app-map-stop-popup__code')).toHaveText(stopCode);
    await expect(popup.locator('.app-map-stop-popup__municipality')).toHaveText(stopMunicipality);

    const markerPoint = await findLargestPaintedComponentCenter(overlayCanvas);
    expect(markerPoint).not.toBeNull();
    if (!markerPoint) {
      return;
    }

    await page.locator('.leaflet-popup-close-button').click();
    await expect(popup).toBeHidden();
    await overlayCanvas.click({ position: markerPoint });

    await expect(popup).toBeVisible();
    const detailsAction = popup.locator('.app-map-stop-popup__action');
    await expect(detailsAction).toBeVisible();
    await detailsAction.click();

    await expect(page).toHaveURL(/\/stop-detail\/.+\?consortiumId=\d+/, { timeout: 10_000 });
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
    const locateButton = page.locator('.map__locate-button');

    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    await locateButton.click();

    const nearbyStop = page.locator('.map__stop-item').first();
    await expect(nearbyStop).toBeVisible({ timeout: 15_000 });
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    const baselinePaintedPixels = await countPaintedPixels(overlayCanvas);
    await nearbyStop.hover();

    await expect
      .poll(() => countPaintedPixels(overlayCanvas), { timeout: 5_000 })
      .toBeGreaterThan(baselinePaintedPixels);
  });

  test('keeps the map dominant and the results panel bounded at canonical breakpoints', async ({
    page,
  }) => {
    const resolvedBaseUrl = BASE_URL as string;
    const mapUrl = new URL(MAP_PATH, resolvedBaseUrl).toString();

    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(mapUrl);

    const workspace = page.locator('.map__workspace');
    const primary = page.locator('.map__primary');
    const panel = page.locator('.map__panel');
    const mapSurface = page.locator('.map__canvas');
    const searchInput = page.locator('#map-network-search');

    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
    await expect(searchInput).toBeVisible();

    const workspaceBox = await workspace.boundingBox();
    const primaryBox = await primary.boundingBox();
    const panelBox = await panel.boundingBox();
    const mapBox = await mapSurface.boundingBox();
    const searchBox = await searchInput.boundingBox();

    expect(workspaceBox).not.toBeNull();
    expect(primaryBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(searchBox).not.toBeNull();

    if (!workspaceBox || !primaryBox || !panelBox || !mapBox || !searchBox) {
      return;
    }

    expect(primaryBox.width).toBeGreaterThan(panelBox.width * DESKTOP_COLUMN_DOMINANCE_RATIO);
    expect(Math.abs(primaryBox.height - panelBox.height)).toBeLessThanOrEqual(
      DESKTOP_HEIGHT_TOLERANCE_PX,
    );
    expect(searchBox.x).toBeGreaterThanOrEqual(primaryBox.x);
    expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(primaryBox.x + primaryBox.width + 1);
    expect(mapBox.height).toBeGreaterThan(workspaceBox.height / 2);
    expect(await panel.evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(mapUrl);
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    const mobileMapBox = await mapSurface.boundingBox();
    const mobilePanelBox = await panel.boundingBox();
    expect(mobileMapBox).not.toBeNull();
    expect(mobilePanelBox).not.toBeNull();

    if (!mobileMapBox || !mobilePanelBox) {
      return;
    }

    expect(mobileMapBox.height).toBeGreaterThanOrEqual(MINIMUM_MOBILE_MAP_HEIGHT);
    expect(mobilePanelBox.y).toBeGreaterThan(mobileMapBox.y + mobileMapBox.height);
    expect(mobilePanelBox.height).toBeLessThan(MOBILE_VIEWPORT.height * 0.7);
    expect(await panel.evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });
});

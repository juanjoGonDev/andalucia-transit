import { expect, test, type Locator } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MAP_PATH = '/map';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const MINIMUM_PAINTED_PIXELS = 100;
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
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    const stopName = (await nearbyStop.locator('.map-stop__name').textContent())?.trim() ?? '';
    const stopCode = (await nearbyStop.locator('.map-stop__code').textContent())?.trim() ?? '';
    expect(stopName).not.toBe('');
    expect(stopCode).not.toBe('');

    const searchInput = page.locator('#map-network-search');
    await searchInput.fill(stopName);

    const stopOption = page
      .locator('.app-autocomplete__option')
      .filter({ hasText: stopName })
      .filter({ hasText: stopCode })
      .first();
    await expect(stopOption).toBeVisible();
    await stopOption.click();

    const popup = page.locator('.app-map-stop-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.app-map-stop-popup__title')).toHaveText(stopName);

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
});

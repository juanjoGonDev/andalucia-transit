import { expect, test, type Locator } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MAP_PATH = '/map';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const MINIMUM_PAINTED_PIXELS = 100;
const MINIMUM_MARKER_RUN_PIXELS = 4;
const SEARCH_STOP_NAME = 'Apeadero Torredonjimeno';
const SEVILLE_LOCATION = { latitude: 37.389092, longitude: -5.984459 } as const;

interface CanvasActivationPoint {
  readonly x: number;
  readonly y: number;
}

async function findPaintedMarkerPoint(canvas: Locator): Promise<CanvasActivationPoint | null> {
  return canvas.evaluate(
    (element: HTMLCanvasElement, minimumRunPixels: number): CanvasActivationPoint | null => {
      const context = element.getContext('2d');
      if (!context || element.width <= 0 || element.height <= 0) {
        return null;
      }

      const image = context.getImageData(0, 0, element.width, element.height);
      const scaleX = element.clientWidth / element.width;
      const scaleY = element.clientHeight / element.height;

      for (let y = 0; y < element.height; y += 1) {
        let runStart = -1;

        for (let x = 0; x <= element.width; x += 1) {
          const alpha = x < element.width ? (image.data[(y * element.width + x) * 4 + 3] ?? 0) : 0;

          if (alpha > 0 && runStart < 0) {
            runStart = x;
            continue;
          }

          if (alpha > 0 || runStart < 0) {
            continue;
          }

          const runEnd = x - 1;
          if (runEnd - runStart + 1 >= minimumRunPixels) {
            return {
              x: ((runStart + runEnd) / 2) * scaleX,
              y: y * scaleY,
            };
          }

          runStart = -1;
        }
      }

      return null;
    },
    MINIMUM_MARKER_RUN_PIXELS,
  );
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

  test('renders the stop network and navigates through a marker popover action', async ({ page }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, resolvedBaseUrl).toString());

    const mapRegion = page.locator('.map__leaflet');
    const mapSurface = page.locator('.map__canvas');
    const zoomControl = page.locator('.leaflet-control-zoom');
    const overlayCanvas = page.locator('.leaflet-overlay-pane canvas').first();

    await expect(mapRegion).toBeVisible();
    await expect(mapRegion).toHaveAttribute('role', 'region');
    await expect(zoomControl).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible();
    await expect(page.locator('.leaflet-control-zoom-out')).toBeVisible();
    await expect(overlayCanvas).toBeVisible({ timeout: 15_000 });
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    expect(await countPaintedPixels(overlayCanvas)).toBeGreaterThan(MINIMUM_PAINTED_PIXELS);

    const activationPoint = await findPaintedMarkerPoint(overlayCanvas);
    expect(activationPoint).not.toBeNull();
    if (!activationPoint) {
      return;
    }

    await overlayCanvas.click({ position: activationPoint });

    const popup = page.locator('.app-map-stop-popup');
    const detailsAction = popup.locator('.app-map-stop-popup__action');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.app-map-stop-popup__title')).not.toHaveText('');
    await expect(detailsAction).toBeVisible();

    await detailsAction.click();
    await expect(page).toHaveURL(/\/stop-detail\/.+\?consortiumId=\d+/, { timeout: 10_000 });
  });

  test('focuses a stop selected through map search and opens its popover', async ({ page }) => {
    const resolvedBaseUrl = BASE_URL as string;
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, resolvedBaseUrl).toString());

    const mapSurface = page.locator('.map__canvas');
    const searchInput = page.locator('#map-network-search');

    await expect(searchInput).toBeVisible();
    await expect(mapSurface).not.toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });

    await searchInput.fill('Torredonjimeno');

    const option = page
      .locator('.app-autocomplete__option')
      .filter({ hasText: SEARCH_STOP_NAME })
      .first();
    await expect(option).toBeVisible();
    await option.click();

    const popup = page.locator('.app-map-stop-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('.app-map-stop-popup__title')).toHaveText(SEARCH_STOP_NAME);
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

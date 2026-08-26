import { expect, test, type Locator } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MAP_PATH = '/map';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const MINIMUM_PAINTED_PIXELS = 100;
const MINIMUM_MARKER_RUN_PIXELS = 4;

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
          const alpha =
            x < element.width ? image.data[(y * element.width + x) * 4 + 3] ?? 0 : 0;

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
              y: y * scaleY
            };
          }

          runStart = -1;
        }
      }

      return null;
    },
    MINIMUM_MARKER_RUN_PIXELS
  );
}

test.describe('network map exploration', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for map exploration tests.');

  test('renders the stop network and navigates through a map marker', async ({ page }) => {
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

    const paintedPixels = await overlayCanvas.evaluate((element: HTMLCanvasElement) => {
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

    expect(paintedPixels).toBeGreaterThan(MINIMUM_PAINTED_PIXELS);

    const activationPoint = await findPaintedMarkerPoint(overlayCanvas);
    expect(activationPoint).not.toBeNull();
    if (!activationPoint) {
      return;
    }

    await overlayCanvas.click({ position: activationPoint });
    await expect(page).toHaveURL(/\/stop-detail\/.+/, { timeout: 10_000 });
  });
});

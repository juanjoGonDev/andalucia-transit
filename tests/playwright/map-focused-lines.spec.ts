import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MAP_PATH = '/map';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const MINIMUM_TOUCH_TARGET_PX = 44;
const MINIMUM_TEXT_CONTRAST = 4.5;
const GEOGRAPHIC_LINES_URL = /https:\/\/api\.ctan\.es\/v1\/Consorcios\/\d+\/lineas(?:\?.*)?$/;
const NEARBY_STOPS_URL = /https:\/\/api\.ctan\.es\/v1\/Consorcios\/\d+\/paradas(?:\?.*)?$/;
const CANONICAL_STOP_LINES_URL =
  /https:\/\/api\.ctan\.es\/v1\/Consorcios\/\d+\/paradas\/lineasPorParadas\/.+/;
const REMOVED_COMPAT_STOP_LINES_URL =
  /https:\/\/api\.ctan\.es\/v1\/Consorcios\/\d+\/lineasPorParadas\/.+/;

const FALLBACK_LINE = {
  idLinea: 380,
  codigo: 'M-380',
  nombre: 'Almería - Aguadulce - El Ejido',
  modo: 'Autobús',
} as const;

test.describe('map focused lines recovery', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for map focused-line tests.');

  test('loads focused lines from nearby same-zone stops without compatibility lookups', async ({
    page,
  }) => {
    let canonicalRequests = 0;
    let geographicRequests = 0;
    let removedCompatRequests = 0;
    await mockNearbyStops(page);
    await page.route(GEOGRAPHIC_LINES_URL, async (route) => {
      geographicRequests += 1;
      await failRoute(route);
    });
    await page.route(CANONICAL_STOP_LINES_URL, async (route) => {
      canonicalRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([FALLBACK_LINE]),
      });
    });
    await page.route(REMOVED_COMPAT_STOP_LINES_URL, async (route) => {
      removedCompatRequests += 1;
      await failRoute(route);
    });

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, BASE_URL as string).toString());

    const linesPanel = await openLinesInspector(page);
    const card = linesPanel.locator('.map__route-item app-interactive-card').first();
    const destination = card.locator('.map-route__destination');

    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.locator('.map-route__code')).toHaveText(FALLBACK_LINE.codigo);
    await expect(destination).toHaveText(FALLBACK_LINE.nombre);
    await expect(page.locator('.map__toast--error')).toHaveCount(0);
    expect(canonicalRequests).toBeGreaterThan(0);
    expect(geographicRequests).toBe(0);
    expect(removedCompatRequests).toBe(0);

    const contrast = await measureContrast(card);
    expect(contrast).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
  });

  test('shows a retryable toast instead of consuming the focused-lines inspector on terminal failure', async ({
    page,
  }) => {
    await mockNearbyStops(page);
    await page.route(CANONICAL_STOP_LINES_URL, failRoute);
    await page.route(REMOVED_COMPAT_STOP_LINES_URL, failRoute);

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(new URL(MAP_PATH, BASE_URL as string).toString());

    const toast = page.locator('.map__toast--error');
    await expect(toast).toBeVisible({ timeout: 15_000 });
    await expect(toast).toHaveAttribute('role', 'alert');

    const retryButton = toast.locator('button');
    const retryBounds = await retryButton.boundingBox();
    expect(retryBounds?.height ?? 0).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_PX);

    const linesPanel = await openLinesInspector(page);
    await expect(linesPanel.locator('.map__panel-error')).toHaveCount(0);

    const workspaceBox = await page.locator('.map__workspace').boundingBox();
    const toastBox = await toast.boundingBox();
    expect(workspaceBox).not.toBeNull();
    expect(toastBox).not.toBeNull();

    if (workspaceBox && toastBox) {
      expect(toastBox.x).toBeGreaterThanOrEqual(workspaceBox.x);
      expect(toastBox.y).toBeGreaterThanOrEqual(workspaceBox.y);
      expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(
        workspaceBox.x + workspaceBox.width + 1,
      );
      expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(
        workspaceBox.y + workspaceBox.height + 1,
      );
    }
  });
});

async function mockNearbyStops(page: Page): Promise<void> {
  await page.route(NEARBY_STOPS_URL, async (route) => {
    const requestUrl = new URL(route.request().url());
    const latitude = Number(requestUrl.searchParams.get('latitud'));
    const longitude = Number(requestUrl.searchParams.get('longitud'));
    const resolvedLatitude = Number.isFinite(latitude) ? latitude : 36.84;
    const resolvedLongitude = Number.isFinite(longitude) ? longitude : -2.46;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          idParada: 15,
          idZona: 'A',
          latitud: resolvedLatitude,
          longitud: resolvedLongitude,
        },
        {
          idParada: 16,
          idZona: 'A',
          latitud: resolvedLatitude + 0.001,
          longitud: resolvedLongitude + 0.001,
        },
        {
          idParada: 17,
          idZona: 'B',
          latitud: resolvedLatitude + 0.002,
          longitud: resolvedLongitude + 0.002,
        },
      ]),
    });
  });
}

async function failRoute(
  route: Parameters<Page['route']>[1] extends (route: infer R) => unknown ? R : never,
) {
  await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
}

async function openLinesInspector(page: Page): Promise<Locator> {
  const inspector = page.locator('.map__inspector--lines');
  const trigger = inspector.locator(':scope > summary');
  await expect(trigger).toBeVisible();
  await trigger.click();

  const panel = inspector.locator('.map__panel');
  await expect(panel).toBeVisible();
  return panel;
}

async function measureContrast(card: Locator): Promise<number> {
  const colors = await card.evaluate((element, textSelector) => {
    const textElement = element.querySelector(textSelector);
    if (!textElement) {
      throw new Error(`Missing text element ${textSelector}`);
    }

    return {
      background: getComputedStyle(element).backgroundColor,
      foreground: getComputedStyle(textElement).color,
    };
  }, '.map-route__destination');

  return contrastRatio(parseRgb(colors.background), parseRgb(colors.foreground));
}

function parseRgb(value: string): readonly [number, number, number] {
  const channels = value
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  if (!channels || channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) {
    throw new Error(`Unsupported computed color: ${value}`);
  }

  return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0] as const;
}

function contrastRatio(
  background: readonly [number, number, number],
  foreground: readonly [number, number, number],
): number {
  const backgroundLuminance = relativeLuminance(background);
  const foregroundLuminance = relativeLuminance(foreground);
  const lighter = Math.max(backgroundLuminance, foregroundLuminance);
  const darker = Math.min(backgroundLuminance, foregroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb: readonly [number, number, number]): number {
  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

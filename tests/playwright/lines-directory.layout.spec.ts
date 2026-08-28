import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const LINES_PATH = '/lines';
const LINE_DETAIL_PATH = '/lines/1/259';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const NARROW_VIEWPORT = { width: 320, height: 568 } as const;
const TABLET_VIEWPORT = { width: 768, height: 1024 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const LINE_API_GLOB = '**/v1/Consorcios/1/lineas/259**';
const OSM_TILE_GLOB = 'https://*.tile.openstreetmap.org/**';

const lineDetailResponse = {
  idLinea: '259',
  codigo: '1011',
  nombre: 'M-101A Circular Bormujos - Castilleja - Tomares',
  modo: 'Bus',
  polilinea: [
    [37.373, -6.072],
    [37.379, -6.052],
    [37.383, -6.032],
    [37.386, -6.012]
  ]
} as const;

const lineStopsResponse = [
  {
    idParada: '4101',
    idLinea: '259',
    idNucleo: '1001',
    idZona: 'A',
    latitud: 37.373,
    longitud: -6.072,
    nombre: 'Bormujos Centro',
    sentido: 0,
    orden: 1,
    modos: 1
  },
  {
    idParada: '4102',
    idLinea: '259',
    idNucleo: '1002',
    idZona: 'A',
    latitud: 37.379,
    longitud: -6.052,
    nombre: 'Castilleja Plaza',
    sentido: 0,
    orden: 2,
    modos: 1
  },
  {
    idParada: '4103',
    idLinea: '259',
    idNucleo: '1003',
    idZona: 'A',
    latitud: 37.386,
    longitud: -6.012,
    nombre: 'Tomares Centro',
    sentido: 0,
    orden: 3,
    modos: 1
  },
  {
    idParada: '4199',
    idLinea: '259',
    idNucleo: '1003',
    idZona: 'A',
    latitud: 37.386,
    longitud: -6.012,
    nombre: 'Tomares Vuelta',
    sentido: 1,
    orden: 1,
    modos: 1
  }
] as const;

async function open(page: Page, path: string): Promise<void> {
  await page.goto(new URL(path, BASE_URL as string).toString());
}

async function stubLineDetail(page: Page): Promise<void> {
  await page.route(LINE_API_GLOB, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/paradas') ? lineStopsResponse : lineDetailResponse;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route(OSM_TILE_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eef2f6"/></svg>'
    });
  });
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  ).toBe(true);
}

async function capture(page: Page, name: string): Promise<void> {
  if (!EVIDENCE_DIR) {
    return;
  }

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, name), fullPage: true });
}

test.describe('Lines directory and line detail layout', () => {
  test.use({ locale: 'es-ES' });
  test.skip(!BASE_URL, 'E2E_BASE_URL is required.');

  test('keeps line discovery usable at narrow and mobile widths', async ({ page }) => {
    for (const viewport of [NARROW_VIEWPORT, MOBILE_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, LINES_PATH);

      const firstLine = page.locator('.lines__line').first();
      await expect(firstLine).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.lines__filters')).toBeVisible();
      await expect(page.locator('.lines__control--search input')).toBeVisible();
      await expect(page.locator('.lines__pagination')).toBeVisible();
      await assertNoHorizontalOverflow(page);

      if (viewport.width === MOBILE_VIEWPORT.width) {
        await capture(page, 'lines-data_es_390_844_full.png');
      }
    }
  });

  test('filters canonical line records through URL-backed directory state', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, `${LINES_PATH}?q=1011&area=1`);

    const lines = page.locator('.lines__line');
    await expect(lines).toHaveCount(1, { timeout: 15_000 });
    await expect(lines.first()).toContainText('1011');
    await expect(page.locator('.lines__result-count')).toContainText('1 línea');
    await expect(page.locator('.lines__control--search input')).toHaveValue('1011');
  });

  test('uses one-column line-detail map and stop flow on mobile', async ({ page }) => {
    await stubLineDetail(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, LINE_DETAIL_PATH);

    const routeMap = page.locator('.route-map');
    const stopsPanel = page.locator('.line-detail__stops-panel');
    await expect(routeMap).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.line-detail__stop-row')).toHaveCount(3);
    await expect(stopsPanel).toBeVisible();

    const [mapBox, stopsBox] = await Promise.all([routeMap.boundingBox(), stopsPanel.boundingBox()]);
    expect(mapBox).not.toBeNull();
    expect(stopsBox).not.toBeNull();
    expect((stopsBox?.y ?? 0) >= (mapBox?.y ?? 0) + (mapBox?.height ?? 0) - 1).toBe(true);
    await assertNoHorizontalOverflow(page);
    await capture(page, 'line-detail-data_es_390_844_full.png');
  });

  test('uses the intended map-first two-column workspace on desktop', async ({ page }) => {
    await stubLineDetail(page);

    for (const viewport of [TABLET_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, LINE_DETAIL_PATH);

      const mapColumn = page.locator('.line-detail__map-column');
      const stopsPanel = page.locator('.line-detail__stops-panel');
      await expect(mapColumn).toBeVisible({ timeout: 15_000 });
      await expect(stopsPanel).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const [mapBox, stopsBox] = await Promise.all([mapColumn.boundingBox(), stopsPanel.boundingBox()]);
      expect(mapBox).not.toBeNull();
      expect(stopsBox).not.toBeNull();

      if (viewport.width === DESKTOP_VIEWPORT.width) {
        expect((mapBox?.width ?? 0) > (stopsBox?.width ?? 0) * 1.4).toBe(true);
        await capture(page, 'line-detail-data_es_1440_900_full.png');
      } else {
        expect((stopsBox?.y ?? 0) >= (mapBox?.y ?? 0) + (mapBox?.height ?? 0) - 1).toBe(true);
      }
    }
  });

  test('synchronizes a map marker selection with the stop list', async ({ page }) => {
    await stubLineDetail(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, LINE_DETAIL_PATH);
    await expect(page.locator('.line-detail__stop-row')).toHaveCount(3, { timeout: 15_000 });

    const marker = page.locator('.leaflet-interactive[fill-opacity]').first();
    await expect(marker).toBeVisible();
    await marker.click({ force: true });

    await expect(page.locator('.line-detail__stop-row--selected')).toHaveCount(1);
    await expect(page.locator('.line-detail__stop-row--selected')).toContainText('Bormujos Centro');
  });
});
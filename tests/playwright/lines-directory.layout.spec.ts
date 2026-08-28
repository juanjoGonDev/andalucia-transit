import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const LINES_PATH = '/lines';
const LINE_DETAIL_PATH = '/lines/1/259';
const ROUTE_SEARCH_PREVIEW_PATH =
  '/routes/alpha-station--c7salpha/to/beta-terminal--c7sbeta/on/2026-08-29';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const NARROW_VIEWPORT = { width: 320, height: 568 } as const;
const TABLET_VIEWPORT = { width: 768, height: 1024 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const LINE_API_GLOB = '**/v1/Consorcios/1/lineas/259**';
const ROUTE_SEARCH_LINE_API_GLOB = '**/v1/Consorcios/7/lineas/259**';
const ROUTE_SEARCH_LINES_BY_STOP_GLOB =
  '**/v1/Consorcios/7/paradas/lineasPorParadas/alpha**';
const ROUTE_SEARCH_TIMETABLE_GLOB = '**/v1/Consorcios/7/horarios_origen_destino**';
const STOP_DIRECTORY_INDEX_GLOB = '**/assets/data/stop-directory/index.json';
const STOP_DIRECTORY_CHUNK_GLOB = '**/assets/data/stop-directory/route-preview-test.json';
const HOLIDAY_API_GLOB = 'https://date.nager.at/**';
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
    [37.386, -6.012],
  ],
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
    modos: 1,
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
    modos: 1,
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
    modos: 1,
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
    modos: 1,
  },
] as const;

const routeSearchLineStopsResponse = [
  {
    idParada: 'alpha',
    idLinea: '259',
    idNucleo: 'nuc-alpha',
    idZona: 'A',
    latitud: 37.373,
    longitud: -6.072,
    nombre: 'Alpha Station',
    sentido: 1,
    orden: 1,
    modos: 1,
  },
  {
    idParada: 'middle',
    idLinea: '259',
    idNucleo: 'nuc-middle',
    idZona: 'A',
    latitud: 37.379,
    longitud: -6.052,
    nombre: 'Middle Stop',
    sentido: 1,
    orden: 2,
    modos: 1,
  },
  {
    idParada: 'beta',
    idLinea: '259',
    idNucleo: 'nuc-beta',
    idZona: 'A',
    latitud: 37.386,
    longitud: -6.012,
    nombre: 'Beta Terminal',
    sentido: 1,
    orden: 3,
    modos: 1,
  },
] as const;

async function open(page: Page, path: string): Promise<void> {
  await page.goto(new URL(path, BASE_URL as string).toString());
}

async function stubLineDetail(page: Page): Promise<void> {
  await page.route(LINE_API_GLOB, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/paradas') ? lineStopsResponse : lineDetailResponse;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await stubOpenStreetMapTiles(page);
}

async function stubRouteSearchPreview(page: Page): Promise<{
  readonly lineDetailRequestCount: () => number;
}> {
  let lineDetailRequests = 0;

  await page.route(STOP_DIRECTORY_INDEX_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        metadata: {
          generatedAt: '2026-08-28T00:00:00.000Z',
          timezone: 'Europe/Madrid',
          providerName: 'CTAN deterministic route preview',
          consortiums: [{ id: 7, name: 'Test Consortium', shortName: 'Test' }],
          totalStops: 2,
        },
        chunks: [
          {
            id: 'route-preview-test',
            consortiumId: 7,
            path: 'route-preview-test.json',
            stopCount: 2,
          },
        ],
        searchIndex: [
          {
            stopId: 'alpha',
            stopCode: 'A001',
            name: 'Alpha Station',
            municipality: 'Alpha City',
            municipalityId: 'mun-alpha',
            nucleus: 'Alpha',
            nucleusId: 'nuc-alpha',
            consortiumId: 7,
            chunkId: 'route-preview-test',
          },
          {
            stopId: 'beta',
            stopCode: 'B001',
            name: 'Beta Terminal',
            municipality: 'Beta City',
            municipalityId: 'mun-beta',
            nucleus: 'Beta',
            nucleusId: 'nuc-beta',
            consortiumId: 7,
            chunkId: 'route-preview-test',
          },
        ],
      }),
    });
  });

  await page.route(STOP_DIRECTORY_CHUNK_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        metadata: {
          generatedAt: '2026-08-28T00:00:00.000Z',
          timezone: 'Europe/Madrid',
          providerName: 'CTAN deterministic route preview',
          consortiumId: 7,
          consortiumName: 'Test Consortium',
          stopCount: 2,
        },
        stops: [
          {
            consortiumId: 7,
            stopId: 'alpha',
            stopCode: 'A001',
            name: 'Alpha Station',
            municipality: 'Alpha City',
            municipalityId: 'mun-alpha',
            nucleus: 'Alpha',
            nucleusId: 'nuc-alpha',
            zone: 'A',
            location: { latitude: 37.373, longitude: -6.072 },
          },
          {
            consortiumId: 7,
            stopId: 'beta',
            stopCode: 'B001',
            name: 'Beta Terminal',
            municipality: 'Beta City',
            municipalityId: 'mun-beta',
            nucleus: 'Beta',
            nucleusId: 'nuc-beta',
            zone: 'A',
            location: { latitude: 37.386, longitude: -6.012 },
          },
        ],
      }),
    });
  });

  await page.route(ROUTE_SEARCH_LINES_BY_STOP_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          idLinea: '259',
          codigo: 'M-301',
          nombre: 'Alpha - Beta',
          descripcion: 'Autobús',
          prioridad: 1,
        },
      ]),
    });
  });

  await page.route(ROUTE_SEARCH_LINE_API_GLOB, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const isStopsRequest = path.endsWith('/paradas');

    if (!isStopsRequest) {
      lineDetailRequests += 1;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        isStopsRequest
          ? routeSearchLineStopsResponse
          : {
              idLinea: '259',
              codigo: 'M-301',
              nombre: 'Alpha - Beta',
              modo: 'Bus',
              polilinea: [
                [37.373, -6.072],
                [37.379, -6.052],
                [37.386, -6.012],
              ],
            },
      ),
    });
  });

  await page.route(ROUTE_SEARCH_TIMETABLE_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bloques: [],
        horario: [
          {
            idlinea: '259',
            codigo: 'M-301',
            horas: ['19:50', '20:27'],
            dias: 'LD',
            observaciones: '',
          },
          {
            idlinea: '259',
            codigo: 'M-301',
            horas: ['20:45', '21:25'],
            dias: 'LD',
            observaciones: '',
          },
        ],
        frecuencias: [{ idfrecuencia: 'daily', acronimo: 'LD', nombre: 'Diario' }],
      }),
    });
  });

  await page.route(HOLIDAY_API_GLOB, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await stubOpenStreetMapTiles(page);

  return { lineDetailRequestCount: () => lineDetailRequests };
}

async function stubOpenStreetMapTiles(page: Page): Promise<void> {
  await page.route(OSM_TILE_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eef2f6"/></svg>',
    });
  });
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
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

  test('keeps line discovery usable across required widths', async ({ page }) => {
    for (const viewport of [NARROW_VIEWPORT, MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
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
      if (viewport.width === DESKTOP_VIEWPORT.width) {
        const [lineBox, nameBox] = await Promise.all([
          firstLine.boundingBox(),
          firstLine.locator('.lines__line-name').boundingBox(),
        ]);
        expect(lineBox).not.toBeNull();
        expect(nameBox).not.toBeNull();
        expect((nameBox?.width ?? 0) >= (lineBox?.width ?? 0) * 0.35).toBe(true);
        await capture(page, 'lines-data_es_1440_900_full.png');
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
    const stopsPanel = page.locator('.transit-route-workspace__stops-panel');
    await expect(routeMap).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.transit-route-workspace__stop-row')).toHaveCount(3);
    await expect(stopsPanel).toBeVisible();

    const [mapBox, stopsBox] = await Promise.all([
      routeMap.boundingBox(),
      stopsPanel.boundingBox(),
    ]);
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

      const mapColumn = page.locator('.transit-route-workspace__map-column');
      const stopsPanel = page.locator('.transit-route-workspace__stops-panel');
      await expect(mapColumn).toBeVisible({ timeout: 15_000 });
      await expect(stopsPanel).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const [mapBox, stopsBox] = await Promise.all([
        mapColumn.boundingBox(),
        stopsPanel.boundingBox(),
      ]);
      expect(mapBox).not.toBeNull();
      expect(stopsBox).not.toBeNull();

      if (viewport.width === DESKTOP_VIEWPORT.width) {
        const firstStopRow = page.locator('.transit-route-workspace__stop-row').first();
        const stopSelect = firstStopRow.locator('.transit-route-workspace__stop-select');
        const stopDetails = firstStopRow.locator('.transit-route-workspace__stop-details');
        const [rowBox, selectBox, detailsBox] = await Promise.all([
          firstStopRow.boundingBox(),
          stopSelect.boundingBox(),
          stopDetails.boundingBox(),
        ]);
        expect(Math.abs((mapBox?.height ?? 0) - (stopsBox?.height ?? 0))).toBeLessThanOrEqual(1);
        expect((mapBox?.width ?? 0) > (stopsBox?.width ?? 0) * 1.4).toBe(true);
        expect(rowBox).not.toBeNull();
        expect(selectBox).not.toBeNull();
        expect(detailsBox).not.toBeNull();
        expect((selectBox?.width ?? 0) >= (rowBox?.width ?? 0) * 0.9).toBe(true);
        expect((detailsBox?.y ?? 0) >= (selectBox?.y ?? 0) + (selectBox?.height ?? 0) - 1).toBe(
          true,
        );
        await capture(page, 'line-detail-data_es_1440_900_full.png');
      } else {
        expect((stopsBox?.y ?? 0) >= (mapBox?.y ?? 0) + (mapBox?.height ?? 0) - 1).toBe(true);
      }
    }
  });

  test('synchronizes stop-list selection with the canvas marker highlight', async ({ page }) => {
    await stubLineDetail(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, LINE_DETAIL_PATH);
    await expect(page.locator('.transit-route-workspace__stop-row')).toHaveCount(3, {
      timeout: 15_000,
    });

    const overlayCanvas = page.locator('.leaflet-overlay-pane canvas').first();
    await expect(overlayCanvas).toBeVisible({ timeout: 15_000 });
    const baselinePaintedPixels = await countPaintedPixels(overlayCanvas);

    await page.locator('.transit-route-workspace__stop-select').first().click();

    const selectedRow = page.locator('.transit-route-workspace__stop-row--selected');
    await expect(selectedRow).toHaveCount(1);
    await expect(selectedRow).toContainText('Bormujos Centro');
    await expect
      .poll(() => countPaintedPixels(overlayCanvas), { timeout: 5_000 })
      .toBeGreaterThan(baselinePaintedPixels);
  });
});

test.describe('Route search reusable route workspace', () => {
  test.use({ locale: 'es-ES' });
  test.skip(!BASE_URL, 'E2E_BASE_URL is required.');

  test('loads the schedule line and direction lazily and keeps equal desktop heights', async ({
    page,
  }) => {
    const requests = await stubRouteSearchPreview(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await open(page, ROUTE_SEARCH_PREVIEW_PATH);

    const departures = page.locator('.route-search__item');
    await expect(departures).toHaveCount(2, { timeout: 15_000 });
    const preview = departures.first().locator('.route-search-route-preview');
    const summary = preview.locator('summary');
    await expect(summary).toContainText('M-301');
    await expect(summary).toContainText('Beta Terminal');
    expect(requests.lineDetailRequestCount()).toBe(0);

    await summary.click();
    await expect(preview).toHaveJSProperty('open', true);
    const mapColumn = preview.locator('.transit-route-workspace__map-column');
    const stopsPanel = preview.locator('.transit-route-workspace__stops-panel');
    await expect(mapColumn).toBeVisible({ timeout: 15_000 });
    await expect(preview.locator('.transit-route-workspace__stop-row')).toHaveCount(3);
    await expect.poll(() => requests.lineDetailRequestCount()).toBe(1);

    const [mapBox, stopsBox] = await Promise.all([
      mapColumn.boundingBox(),
      stopsPanel.boundingBox(),
    ]);
    expect(mapBox).not.toBeNull();
    expect(stopsBox).not.toBeNull();
    expect(Math.abs((mapBox?.height ?? 0) - (stopsBox?.height ?? 0))).toBeLessThanOrEqual(1);
    await assertNoHorizontalOverflow(page);
    await capture(page, 'route-search-preview-data_es_1440_900_full.png');
  });

  test('stacks the same expanded route workspace on mobile without overflow', async ({ page }) => {
    await stubRouteSearchPreview(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, ROUTE_SEARCH_PREVIEW_PATH);

    const preview = page.locator('.route-search__item').first().locator('.route-search-route-preview');
    await expect(preview.locator('summary')).toContainText('M-301', { timeout: 15_000 });
    await preview.locator('summary').click();

    const mapColumn = preview.locator('.transit-route-workspace__map-column');
    const stopsPanel = preview.locator('.transit-route-workspace__stops-panel');
    await expect(mapColumn).toBeVisible({ timeout: 15_000 });
    await expect(preview.locator('.transit-route-workspace__stop-row')).toHaveCount(3);

    const [mapBox, stopsBox] = await Promise.all([
      mapColumn.boundingBox(),
      stopsPanel.boundingBox(),
    ]);
    expect(mapBox).not.toBeNull();
    expect(stopsBox).not.toBeNull();
    expect((stopsBox?.y ?? 0) >= (mapBox?.y ?? 0) + (mapBox?.height ?? 0) - 1).toBe(true);
    await assertNoHorizontalOverflow(page);
    await capture(page, 'route-search-preview-data_es_390_844_full.png');
  });
});

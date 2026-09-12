import { expect, type Page, test } from './visual-evidence.fixture';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const FAVORITES_PATH = '/favorites';
const LINES_PATH = '/lines';
const LINE_DETAIL_PATH = '/lines/1/259';
const LINE_API_GLOB = '**/v1/Consorcios/1/lineas/259**';
const OSM_TILE_GLOB = 'https://*.tile.openstreetmap.org/**';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const STOP_FAVORITE_COUNT = 2;
const LINE_FAVORITE_COUNT = 1;
const AGGREGATE_FAVORITE_COUNT = STOP_FAVORITE_COUNT + LINE_FAVORITE_COUNT;
const MOCK_LINE_CONSORTIUM_ID = 6;
const MOCK_LINE_CODE = 'M-101';
const MOCK_LINE_NAME = 'Almería - Huércal - Viator - Campamento';

const lineDetailResponse = {
  idLinea: '259',
  codigo: '1011',
  nombre: 'M-101A Circular Bormujos - Castilleja - Tomares NN',
  modo: 'Bus',
  polilinea: [
    [37.373, -6.072],
    [37.379, -6.052],
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
  await page.route(OSM_TILE_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    });
  });
}

test.describe('aggregate favorites product checks', () => {
  test.use({ locale: 'es-ES' });
  test.skip(!BASE_URL, 'E2E_BASE_URL is required.');
  test.skip(MOCK_MODE !== 'data', 'Aggregate favorites checks require deterministic data mode.');

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('combines deterministic line and stop favorites without CTAN NN placeholders', async ({
    page,
  }) => {
    await open(page, FAVORITES_PATH);

    await expect(page.locator('.favorites__item')).toHaveCount(AGGREGATE_FAVORITE_COUNT);
    await expect(page.locator('.favorites__entity-title')).toHaveText(['Líneas', 'Paradas']);
    await expect(page.getByText(MOCK_LINE_NAME, { exact: true })).toBeVisible();

    const names = await page.locator('.favorites-card__name').allTextContents();
    expect(names).toHaveLength(AGGREGATE_FAVORITE_COUNT);
    for (const name of names) {
      expect(name).not.toMatch(/\sNN\s*$/iu);
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });

  test('exposes the canonical saved line as favorite directly from the line directory', async ({
    page,
  }) => {
    const query = new URLSearchParams({
      q: MOCK_LINE_CODE,
      area: String(MOCK_LINE_CONSORTIUM_ID),
    });
    await open(page, `${LINES_PATH}?${query.toString()}`);

    const lineItem = page.locator('.lines__item').filter({ hasText: MOCK_LINE_CODE });
    await expect(lineItem).toHaveCount(1, { timeout: 15_000 });
    await expect(lineItem.locator('.lines__line-name')).toHaveText(MOCK_LINE_NAME);
    await expect(page.locator('.lines__input')).toHaveValue(MOCK_LINE_CODE);

    const favorite = lineItem.locator('.lines__favorite');
    await expect(favorite).toBeVisible();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  });

  test('exposes line favorite management from line detail and normalizes its title', async ({ page }) => {
    await stubLineDetail(page);
    await open(page, LINE_DETAIL_PATH);

    await expect(page.locator('.line-detail__heading h1')).toHaveText(
      'M-101A Circular Bormujos - Castilleja - Tomares',
      { timeout: 15_000 },
    );
    const favorite = page.locator('.line-detail__favorite');
    await expect(favorite).toBeVisible();
    await expect(favorite).toHaveAttribute('aria-pressed', 'false');
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  });
});

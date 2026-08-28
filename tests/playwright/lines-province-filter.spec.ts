import { expect, test, type Page } from './visual-evidence.fixture';

const BASE_URL = process.env.E2E_BASE_URL;
const LINES_PATH = '/lines';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const CATALOG_INDEX_GLOB = '**/assets/data/catalog/index.json';
const CATALOG_LINES_GLOB = '**/assets/data/catalog/consortium-*/lines.json';
const CONSORTIUM_LINE_PATH_PATTERN = /\/consortium-(\d+)\/lines\.json$/u;

const CONSORTIA = [
  {
    id: 2,
    name: 'Bahía de Cádiz',
    shortName: 'CMTBC',
    province: 'Cádiz',
    datasets: {
      municipalities: 'consortium-2/municipalities.json',
      nuclei: 'consortium-2/nuclei.json',
      lines: 'consortium-2/lines.json',
    },
  },
  {
    id: 5,
    name: 'Campo de Gibraltar',
    shortName: 'CTMCG',
    province: 'Cádiz',
    datasets: {
      municipalities: 'consortium-5/municipalities.json',
      nuclei: 'consortium-5/nuclei.json',
      lines: 'consortium-5/lines.json',
    },
  },
  {
    id: 9,
    name: 'Costa de Huelva',
    shortName: 'CTHU',
    province: 'Huelva',
    datasets: {
      municipalities: 'consortium-9/municipalities.json',
      nuclei: 'consortium-9/nuclei.json',
      lines: 'consortium-9/lines.json',
    },
  },
] as const;

const LINES_BY_CONSORTIUM: Readonly<Record<number, readonly unknown[]>> = {
  2: [
    {
      id: '201',
      code: 'M-020',
      name: 'Cádiz - San Fernando',
      mode: 'AUTOBUS',
      operators: ['Operador Cádiz'],
    },
  ],
  5: [
    {
      id: '501',
      code: 'M-150',
      name: 'Algeciras - La Línea',
      mode: 'AUTOBUS',
      operators: ['Operador Campo de Gibraltar'],
    },
  ],
  9: [
    {
      id: '901',
      code: 'M-900',
      name: 'Huelva - Punta Umbría',
      mode: 'AUTOBUS',
      operators: ['Operador Huelva'],
    },
  ],
};

test.describe('Lines province filter', () => {
  test.use({ locale: 'es-ES' });
  test.skip(!BASE_URL, 'E2E_BASE_URL is required.');

  test('groups every CTAN consortium assigned to the selected province and keeps URL state', async ({
    page,
  }) => {
    await stubProvinceCatalog(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, `${LINES_PATH}?province=C%C3%A1diz`);

    const provinceSelect = page.getByLabel('Provincia');
    const lines = page.locator('.lines__line');

    await expect(provinceSelect).toHaveValue('Cádiz');
    await expect(lines).toHaveCount(2);
    await expect(lines.nth(0)).toContainText('Bahía de Cádiz');
    await expect(lines.nth(1)).toContainText('Campo de Gibraltar');
    await expect(page.locator('.lines__result-count')).toContainText('2 líneas');
    await assertNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByLabel('Provincia')).toHaveValue('Cádiz');
    await expect(page.locator('.lines__line')).toHaveCount(2);
  });

  test('clears province when a narrower transport area is selected', async ({ page }) => {
    await stubProvinceCatalog(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, `${LINES_PATH}?province=C%C3%A1diz`);

    await page.getByLabel('Área de transporte').selectOption({ label: 'Costa de Huelva' });

    await expect(page.getByLabel('Provincia')).toHaveValue('');
    await expect(page.locator('.lines__line')).toHaveCount(1);
    await expect(page.locator('.lines__line').first()).toContainText('Costa de Huelva');
    await expect.poll(() => new URL(page.url()).searchParams.get('area')).toBe('9');
    await expect.poll(() => new URL(page.url()).searchParams.has('province')).toBe(false);
  });
});

async function open(page: Page, path: string): Promise<void> {
  await page.goto(new URL(path, BASE_URL as string).toString());
}

async function stubProvinceCatalog(page: Page): Promise<void> {
  await page.route(CATALOG_INDEX_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        metadata: {
          generatedAt: '2026-08-29T00:00:00.000Z',
          timezone: 'Europe/Madrid',
          providerName: 'CTAN deterministic province fixture',
          consortiums: CONSORTIA,
        },
        consortia: CONSORTIA,
      }),
    });
  });

  await page.route(CATALOG_LINES_GLOB, async (route) => {
    const consortiumId = readConsortiumId(route.request().url());
    const lines = consortiumId === null ? [] : (LINES_BY_CONSORTIUM[consortiumId] ?? []);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ lines }),
    });
  });
}

function readConsortiumId(requestUrl: string): number | null {
  const match = CONSORTIUM_LINE_PATH_PATTERN.exec(new URL(requestUrl).pathname);
  const consortiumId = Number(match?.[1]);
  return Number.isSafeInteger(consortiumId) && consortiumId > 0 ? consortiumId : null;
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}

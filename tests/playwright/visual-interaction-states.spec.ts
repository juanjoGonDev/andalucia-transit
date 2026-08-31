import {
  selectVisualStopDetailEntry,
  type VisualStopServicesSnapshotEntry,
} from '../../scripts/visual/exact-visual-data';
import {
  captureVisualEvidence,
  EXACT_VISUAL_REGRESSION,
  expect,
  installExactStopDetailVisualData,
  test,
  type Page,
} from './visual-evidence.fixture';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const RECENT_PATH = '/recents';
const STOP_SERVICES_SNAPSHOT_PATH = '/assets/data/snapshots/stop-services/latest.json';
const STOP_SCHEDULE_API_GLOB = '**/v1/Consorcios/*/paradas/**';
const TIMETABLE_API_GLOB = '**/v1/Consorcios/*/horarios_origen_destino*';
const HOLIDAY_API_GLOB = '**/PublicHolidays/**';
const NEWS_LIST_URL_PATTERN =
  /^https:\/\/api\.ctan\.es\/v1\/Consorcios\/(\d+)\/noticias(?:\?.*)?$/u;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const DATA_ITEM_COUNT = 2;
const NEWS_PAGE_SIZE = 8;
const TRANSPARENT_BACKGROUND = 'rgba(0, 0, 0, 0)';

async function open(page: Page, path: string): Promise<void> {
  const baseUrl = BASE_URL as string;
  await page.goto(new URL(path, baseUrl).toString());
}

async function openRecentData(page: Page): Promise<void> {
  await open(page, RECENT_PATH);
  await expect(page.locator('.home-recent__item')).toHaveCount(DATA_ITEM_COUNT);
  await expect(page.locator('.recent-search-card__status--disabled')).toHaveCount(DATA_ITEM_COUNT);
}

async function dismissDialog(page: Page): Promise<void> {
  const cancel = page.locator('.confirm-dialog__actions .app-button--ghost');
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(page.locator('app-overlay-dialog-container[role="dialog"]')).toHaveCount(0);
}

async function loadPopulatedStop(page: Page): Promise<VisualStopServicesSnapshotEntry> {
  if (EXACT_VISUAL_REGRESSION) {
    const exactStop = selectVisualStopDetailEntry(undefined, true);
    if (!exactStop) {
      throw new Error('Exact Stop Detail fixture is missing its canonical populated stop.');
    }
    return exactStop;
  }

  const baseUrl = BASE_URL as string;
  const response = await page.request.get(new URL(STOP_SERVICES_SNAPSHOT_PATH, baseUrl).toString());
  expect(response.ok()).toBe(true);

  const snapshot: unknown = await response.json();
  const stop = selectVisualStopDetailEntry(snapshot, false);
  if (!stop) {
    throw new Error('Stop-services snapshot does not contain a populated stop fixture.');
  }

  return stop;
}

async function mockNewsFeed(page: Page): Promise<void> {
  await page.route(NEWS_LIST_URL_PATTERN, async (route) => {
    const match = NEWS_LIST_URL_PATTERN.exec(route.request().url());
    const consortiumId = Number(match?.[1]);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildNewsList(consortiumId)),
    });
  });
}

function buildNewsList(consortiumId: number): readonly Record<string, unknown>[] {
  if (consortiumId === 6) {
    return [
      ...Array.from({ length: 10 }, (_, index) => ({
        idNoticia: 600 + index,
        titulo: `Aviso Almería ${index + 1}`,
        resumen: `Información de servicio de Almería ${index + 1}`,
        categoria: index % 2 === 0 ? 'Avisos' : 'Tarifas',
        fechaInicio: `2026-08-${String(28 - index).padStart(2, '0')}T09:00:00+02:00`,
        orden: index,
      })),
      {
        idNoticia: 699,
        titulo: 'Noticia CTAN sin contenido',
        resumen: '__',
        texto: '<p>&nbsp;</p>',
        categoria: 'Avisos',
        fechaInicio: '2026-08-29T09:00:00+02:00',
        orden: 99,
      },
    ];
  }

  if (consortiumId === 9) {
    return [
      {
        idNoticia: 901,
        titulo: 'Aviso Costa de Huelva',
        resumen: 'Información de servicio de Huelva',
        categoria: 'Avisos',
        fechaInicio: '2026-08-18T09:00:00+02:00',
        orden: 0,
      },
      {
        idNoticia: 902,
        titulo: 'Tarifa Costa de Huelva',
        resumen: 'Información tarifaria de Huelva',
        categoria: 'Tarifas',
        fechaInicio: '2026-08-17T09:00:00+02:00',
        orden: 1,
      },
    ];
  }

  return [];
}

test.describe('deterministic interaction visual states', () => {
  test.use({ locale: 'es-ES' });

  test.skip(
    !BASE_URL,
    'E2E_BASE_URL environment variable is required for interaction-state tests.',
  );
  test.skip(MOCK_MODE !== 'data', 'E2E_MOCK_MODE=data is required for interaction-state tests.');

  test('keeps confirm dialogs on one coherent shared surface', async ({ page }) => {
    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await openRecentData(page);

      const clearAction = page.locator('.home__panel-action');
      await expect(clearAction).toBeVisible();
      await clearAction.click();

      const dialog = page.locator('app-overlay-dialog-container[role="dialog"]');
      const surface = dialog.locator('.app-overlay-dialog__surface');
      const title = dialog.locator('.app-dialog__title');
      const content = dialog.locator('.app-dialog__content');
      const actions = dialog.locator('.app-dialog__actions');

      await expect(dialog).toBeVisible();
      await expect(title).toBeVisible();
      await expect(content).toBeVisible();
      await expect(actions).toBeVisible();
      await expect(dialog.locator('.confirm-dialog__actions .app-button')).toHaveCount(2);

      const surfaceBackground = await surface.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      expect(surfaceBackground).not.toBe(TRANSPARENT_BACKGROUND);

      for (const region of [title, content, actions]) {
        expect(await region.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
          TRANSPARENT_BACKGROUND,
        );
      }

      expect(
        Number.parseFloat(
          await title.evaluate((element) => getComputedStyle(element).borderBottomWidth),
        ),
      ).toBeGreaterThan(0);
      expect(
        Number.parseFloat(
          await actions.evaluate((element) => getComputedStyle(element).borderTopWidth),
        ),
      ).toBeGreaterThan(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      await captureVisualEvidence(
        page,
        `dialog-confirm_es_${viewport.width}_${viewport.height}_full.png`,
      );
      await dismissDialog(page);
    }
  });

  test('exposes route-search loading, error and retry states without stale empty content', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.route(HOLIDAY_API_GLOB, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    let releaseFirstTimetableRequest: () => void = () => undefined;
    const firstTimetableRequestGate = new Promise<void>((resolve) => {
      releaseFirstTimetableRequest = resolve;
    });
    let timetableRequestCount = 0;

    await page.route(TIMETABLE_API_GLOB, async (route) => {
      timetableRequestCount += 1;

      if (timetableRequestCount === 1) {
        await firstTimetableRequestGate;
      }

      await route.abort('failed');
    });

    await openRecentData(page);
    const firstRecentCard = page.locator('.home-recent__item').first();
    await firstRecentCard.getByRole('button').first().click();

    await expect(page).toHaveURL(/\/routes\//);
    const results = page.locator('.route-search__results');
    const loading = page.locator('.route-search__async[role="status"]');
    await expect(results).toHaveAttribute('aria-busy', 'true');
    await expect(loading).toBeVisible();
    await expect(page.locator('.route-search__empty--results')).toHaveCount(0);
    await captureVisualEvidence(page, 'route-search-loading_es_390_844_full.png');

    releaseFirstTimetableRequest();

    const error = page.locator('.route-search__async[role="alert"]');
    const retry = error.locator('.app-outline-button');
    await expect(error).toBeVisible();
    await expect(results).not.toHaveAttribute('aria-busy', 'true');
    await expect(retry).toBeVisible();
    await expect(page.locator('.route-search__empty--results')).toHaveCount(0);
    await captureVisualEvidence(page, 'route-search-error_es_390_844_full.png');

    await retry.click();
    await expect.poll(() => timetableRequestCount).toBe(2);
    await expect(error).toBeVisible();
  });

  test('keeps stop tasks progressive and exposes real walking-map handoff', async ({ page }) => {
    await installExactStopDetailVisualData(page);
    const stop = await loadPopulatedStop(page);
    await page.route(STOP_SCHEDULE_API_GLOB, async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    });

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(
        page,
        `/stop-detail/${encodeURIComponent(stop.stopId)}?consortiumId=${stop.consortiumId}`,
      );

      await expect(page.locator('.stop-detail__title')).toHaveText(stop.stopName, {
        timeout: 15_000,
      });
      await expect(page.locator('[data-stop-section="departures"]')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(
        page.locator('.stop-detail__panel--departures .stop-detail__select'),
      ).toBeVisible();
      await expect(page.locator('app-stop-utility')).toHaveCount(0);

      await page.locator('[data-stop-section="directions"]').click();
      await expect(page.locator('[data-stop-section="directions"]')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.locator('.stop-detail__panel--departures')).toHaveCount(0);
      await expect(page.locator('.stop-utility__line')).toHaveCount(0);

      const mapLinks = page.locator('.stop-utility__map-link');
      await expect(mapLinks).toHaveCount(2);
      await expect(mapLinks.first()).toHaveAttribute(
        'href',
        /google\.com\/maps\/dir\/.*travelmode=walking/u,
      );
      await expect(mapLinks.last()).toHaveAttribute('href', /maps\.apple\.com/u);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      await captureVisualEvidence(
        page,
        `stop-detail-directions_es_${viewport.width}_${viewport.height}_full.png`,
      );
    }
  });

  test('filters, orders and paginates CTAN news with durable URL state', async ({ page }) => {
    await mockNewsFeed(page);

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, '/news');

      const areaSelect = page.locator('.news__select--area');
      const categorySelect = page.locator('.news__select--category');
      const orderSelect = page.locator('.news__select--order');
      const topPagination = page.locator('.news__pagination-slot--top .news__pagination');
      const bottomPagination = page.locator('.news__pagination-slot--bottom .news__pagination');

      await expect(page.locator('.news__card')).toHaveCount(NEWS_PAGE_SIZE, { timeout: 15_000 });
      await expect(page.locator('.news__filter')).toHaveCount(0);
      await expect(page.locator('.news__select')).toHaveCount(3);
      await expect(page.getByText('Noticia CTAN sin contenido')).toHaveCount(0);
      await expect(areaSelect.locator('option')).toHaveCount(10);
      await expect(areaSelect.getByRole('option', { name: 'Área de Almería' })).toHaveCount(1);
      await expect(areaSelect.getByRole('option', { name: 'Área de Sevilla' })).toHaveCount(1);
      await expect(bottomPagination).toBeVisible();
      await expect(bottomPagination.locator('.news__page-status')).toContainText('Página 1 de 2');

      if (viewport === DESKTOP_VIEWPORT) {
        await expect(topPagination).toBeVisible();
      } else {
        await expect(topPagination).toBeHidden();
      }

      await bottomPagination.locator('.news__page-action').last().click();
      await expect(page.locator('.news__card')).toHaveCount(4);
      await expect(bottomPagination.locator('.news__page-status')).toContainText('Página 2 de 2');
      await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2');

      await areaSelect.selectOption({ label: 'Área de Almería' });
      await expect(bottomPagination.locator('.news__page-status')).toContainText('Página 1 de 2');
      await expect(page.locator('.news__result-count')).toContainText('10 noticias');
      await expect.poll(() => new URL(page.url()).searchParams.get('area')).toBe('6');
      await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBeNull();

      await categorySelect.selectOption({ label: 'Avisos' });
      await expect(page.locator('.news__card')).toHaveCount(5);
      await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('Avisos');

      await orderSelect.selectOption({ label: 'Más antiguas primero' });
      await expect(page.locator('.news__card-title').first()).toHaveText('Aviso Almería 9');
      await expect.poll(() => new URL(page.url()).searchParams.get('order')).toBe('oldest');
      await expect(page.locator('.news__area')).toHaveText([
        'Área de Almería',
        'Área de Almería',
        'Área de Almería',
        'Área de Almería',
        'Área de Almería',
      ]);

      await page.reload();
      await expect(areaSelect).toHaveValue(/6/u);
      await expect(categorySelect).toHaveValue(/Avisos/u);
      await expect(orderSelect).toHaveValue(/oldest/u);
      await expect(page.locator('.news__card')).toHaveCount(5);
      await expect(page.locator('.news__card-title').first()).toHaveText('Aviso Almería 9');

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      await captureVisualEvidence(
        page,
        `news-filtered_es_${viewport.width}_${viewport.height}_full.png`,
      );

      await areaSelect.selectOption({ label: 'Área de Sevilla' });
      await expect(page.locator('.news__card')).toHaveCount(0);
      await expect(page.locator('.news__empty-message')).toHaveText(
        'No hay noticias para los filtros seleccionados.',
      );
      await expect.poll(() => new URL(page.url()).searchParams.get('area')).toBe('1');
    }
  });

  test('uses lang=EN and never renders Spanish-only news aliases in English mode', async ({
    page,
  }) => {
    const requestedLanguages: string[] = [];
    await page.addInitScript(() => {
      window.localStorage.setItem('andalucia-transit.language', 'en');
    });
    await page.route(NEWS_LIST_URL_PATTERN, async (route) => {
      const requestUrl = new URL(route.request().url());
      const match = NEWS_LIST_URL_PATTERN.exec(route.request().url());
      const consortiumId = Number(match?.[1]);
      requestedLanguages.push(requestUrl.searchParams.get('lang') ?? '');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          consortiumId === 6
            ? [
                {
                  idNoticia: 610,
                  tituloEn: 'English service update',
                  resumen: 'English service information',
                  categoria: 'Service alerts',
                  fechaInicio: '2026-08-28T09:00:00+02:00',
                },
                {
                  idNoticia: 611,
                  tituloEs: 'Aviso solo en español',
                  resumen: 'Contenido solo en español',
                  categoria: 'Avisos',
                  fechaInicio: '2026-08-27T09:00:00+02:00',
                },
              ]
            : [],
        ),
      });
    });

    await page.setViewportSize(MOBILE_VIEWPORT);
    await open(page, '/news');

    await expect(page.locator('.news__toolbar-title')).toHaveText('Filter news');
    await expect(page.locator('.news__card')).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator('.news__card-title')).toHaveText('English service update');
    await expect(page.getByText('Aviso solo en español')).toHaveCount(0);
    await expect(page.getByText('Contenido solo en español')).toHaveCount(0);
    await expect.poll(() => requestedLanguages.length).toBe(9);
    expect(new Set(requestedLanguages)).toEqual(new Set(['EN']));
  });
});

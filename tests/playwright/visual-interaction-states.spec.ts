import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const RECENT_PATH = '/recents';
const STOP_SERVICES_SNAPSHOT_PATH = '/assets/data/snapshots/stop-services/latest.json';
const STOP_SCHEDULE_API_GLOB = '**/v1/Consorcios/*/paradas/**';
const TIMETABLE_API_GLOB = '**/v1/Consorcios/*/horarios_origen_destino*';
const HOLIDAY_API_GLOB = '**/PublicHolidays/**';
const NEWS_LIST_URL_PATTERN = /^https:\/\/api\.ctan\.es\/v1\/Consorcios\/(\d+)\/noticias(?:\?.*)?$/u;
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const DATA_ITEM_COUNT = 2;
const NEWS_PAGE_SIZE = 8;
const TRANSPARENT_BACKGROUND = 'rgba(0, 0, 0, 0)';

interface StopServicesSnapshotFile {
  readonly stops: readonly StopServicesSnapshotEntry[];
}

interface StopServicesSnapshotEntry {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopName: string;
  readonly services: readonly unknown[];
}

async function open(page: Page, path: string): Promise<void> {
  const baseUrl = BASE_URL as string;
  await page.goto(new URL(path, baseUrl).toString());
}

async function openRecentData(page: Page): Promise<void> {
  await open(page, RECENT_PATH);
  await expect(page.locator('.home-recent__item')).toHaveCount(DATA_ITEM_COUNT);
  await expect(page.locator('.recent-search-card__status--disabled')).toHaveCount(DATA_ITEM_COUNT);
}

async function capture(page: Page, name: string): Promise<void> {
  if (!EVIDENCE_DIR) {
    return;
  }

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: join(EVIDENCE_DIR, name),
    fullPage: true,
  });
}

async function dismissDialog(page: Page): Promise<void> {
  const cancel = page.locator('.confirm-dialog__actions .app-button--ghost');
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(page.locator('app-overlay-dialog-container[role="dialog"]')).toHaveCount(0);
}

async function loadPopulatedStop(page: Page): Promise<StopServicesSnapshotEntry> {
  const baseUrl = BASE_URL as string;
  const response = await page.request.get(
    new URL(STOP_SERVICES_SNAPSHOT_PATH, baseUrl).toString(),
  );
  expect(response.ok()).toBe(true);

  const snapshot = (await response.json()) as StopServicesSnapshotFile;
  const stop = snapshot.stops.find(
    (candidate) =>
      Number.isSafeInteger(candidate.consortiumId) &&
      candidate.consortiumId > 0 &&
      candidate.stopId.trim().length > 0 &&
      candidate.stopName.trim().length > 0 &&
      candidate.services.length > 0,
  );

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
    return Array.from({ length: 10 }, (_, index) => ({
      idNoticia: 600 + index,
      titulo: `Aviso Almería ${index + 1}`,
      resumen: `Información de servicio de Almería ${index + 1}`,
      categoria: index % 2 === 0 ? 'Avisos' : 'Tarifas',
      fechaInicio: `2026-08-${String(28 - index).padStart(2, '0')}T09:00:00+02:00`,
      orden: index,
    }));
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

      await capture(page, `dialog-confirm_es_${viewport.width}_${viewport.height}_full.png`);
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
    await capture(page, 'route-search-loading_es_390_844_full.png');

    releaseFirstTimetableRequest();

    const error = page.locator('.route-search__async[role="alert"]');
    const retry = error.locator('.app-outline-button');
    await expect(error).toBeVisible();
    await expect(results).not.toHaveAttribute('aria-busy', 'true');
    await expect(retry).toBeVisible();
    await expect(page.locator('.route-search__empty--results')).toHaveCount(0);
    await capture(page, 'route-search-error_es_390_844_full.png');

    await retry.click();
    await expect.poll(() => timetableRequestCount).toBe(2);
    await expect(error).toBeVisible();
  });

  test('keeps stop tasks progressive and exposes real walking-map handoff', async ({ page }) => {
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
      await expect(page.locator('.stop-detail__panel--departures .stop-detail__select')).toBeVisible();
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
      await expect(mapLinks.first()).toHaveAttribute('href', /google\.com\/maps\/dir\/.*travelmode=walking/u);
      await expect(mapLinks.last()).toHaveAttribute('href', /maps\.apple\.com/u);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      await capture(
        page,
        `stop-detail-directions_es_${viewport.width}_${viewport.height}_full.png`,
      );
    }
  });

  test('filters, orders and paginates CTAN news without horizontal filter scrolling', async ({
    page,
  }) => {
    await mockNewsFeed(page);

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await open(page, '/news');

      await expect(page.locator('.news__card')).toHaveCount(NEWS_PAGE_SIZE, { timeout: 15_000 });
      await expect(page.locator('.news__filter')).toHaveCount(0);
      await expect(page.locator('.news__select')).toHaveCount(3);
      await expect(page.locator('.news__page-status')).toContainText('Página 1 de 2');

      await page.locator('.news__page-action').last().click();
      await expect(page.locator('.news__card')).toHaveCount(4);
      await expect(page.locator('.news__page-status')).toContainText('Página 2 de 2');

      await page.locator('.news__select--area').selectOption({ label: 'Área de Almería' });
      await expect(page.locator('.news__page-status')).toContainText('Página 1 de 2');
      await expect(page.locator('.news__result-count')).toContainText('10 noticias');

      await page.locator('.news__select--category').selectOption({ label: 'Avisos' });
      await expect(page.locator('.news__card')).toHaveCount(5);
      await page.locator('.news__select--order').selectOption('oldest');
      await expect(page.locator('.news__card-title').first()).toHaveText('Aviso Almería 9');
      await expect(page.locator('.news__area')).toHaveText([
        'Área de Almería',
        'Área de Almería',
        'Área de Almería',
        'Área de Almería',
        'Área de Almería',
      ]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);

      await capture(page, `news-filtered_es_${viewport.width}_${viewport.height}_full.png`);
    }
  });
});

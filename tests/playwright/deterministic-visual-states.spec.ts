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
const FAVORITES_PATH = '/favorites';
const STOP_SERVICES_SNAPSHOT_PATH = '/assets/data/snapshots/stop-services/latest.json';
const STOP_SCHEDULE_API_GLOB = '**/v1/Consorcios/*/paradas/**';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const RECENT_ITEM_COUNT = 2;

async function open(page: Page, path: string): Promise<void> {
  const baseUrl = BASE_URL as string;
  await page.goto(new URL(path, baseUrl).toString());
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
    throw new Error('Stop-services snapshot does not contain a populated Stop Detail fixture.');
  }

  return stop;
}

async function openStopDetail(page: Page, stop: VisualStopServicesSnapshotEntry): Promise<void> {
  const path = `/stop-detail/${encodeURIComponent(stop.stopId)}?consortiumId=${stop.consortiumId}`;
  await open(page, path);

  await expect(page.locator('.stop-detail__title')).toHaveText(stop.stopName, { timeout: 15_000 });
  const departures = page.locator('.stop-detail__panel--departures');
  await expect(departures).toBeVisible();
  await expect(departures.locator('.stop-detail__select')).toBeVisible();

  const visibleService = departures.locator('.stop-detail__list-item:visible').first();
  if (!(await visibleService.isVisible())) {
    const history = departures.locator('.stop-detail__history');
    await expect(history).toBeVisible();
    await history.locator('summary').click();
  }
  await expect(departures.locator('.stop-detail__list-item:visible').first()).toBeVisible();

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}

async function captureStopDetail(
  page: Page,
  viewport: typeof MOBILE_VIEWPORT | typeof DESKTOP_VIEWPORT,
): Promise<void> {
  await captureVisualEvidence(
    page,
    `stop-detail-data_es_${viewport.width}_${viewport.height}_full.png`,
  );
}

test.describe('deterministic visual data states', () => {
  test.use({ locale: 'es-ES' });

  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for visual-state tests.');
  test.skip(
    MOCK_MODE !== 'data' && MOCK_MODE !== 'empty',
    'E2E_MOCK_MODE must identify the deterministic data mode.',
  );

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('renders recent-search history according to the selected mock mode', async ({ page }) => {
    await open(page, RECENT_PATH);

    const items = page.locator('.home-recent__item');
    const emptyState = page.locator('.home-recent__empty');

    if (MOCK_MODE === 'data') {
      await expect(items).toHaveCount(RECENT_ITEM_COUNT);
      await expect(emptyState).toBeHidden();
      return;
    }

    await expect(items).toHaveCount(0);
    await expect(emptyState).toBeVisible();
  });

  test('renders a non-empty favorites collection in populated mode and an empty state otherwise', async ({
    page,
  }) => {
    await open(page, FAVORITES_PATH);

    const items = page.locator('.favorites__item');
    const emptyState = page.locator('.favorites__empty');

    if (MOCK_MODE === 'data') {
      expect(await items.count()).toBeGreaterThan(0);
      await expect(emptyState).toBeHidden();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
      return;
    }

    await expect(items).toHaveCount(0);
    await expect(emptyState).toBeVisible();
  });

  test('renders populated Stop Detail without horizontal overflow on mobile and desktop', async ({
    page,
  }) => {
    test.skip(MOCK_MODE !== 'data', 'Populated Stop Detail evidence requires E2E_MOCK_MODE=data.');

    await installExactStopDetailVisualData(page);
    const stop = await loadPopulatedStop(page);
    await page.route(STOP_SCHEDULE_API_GLOB, async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    });

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await openStopDetail(page, stop);
      await captureStopDetail(page, viewport);
    }
  });
});

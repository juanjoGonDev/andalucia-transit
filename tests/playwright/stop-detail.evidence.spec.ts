import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const MOCK_MODE = process.env.E2E_MOCK_MODE;
const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const STOP_SERVICES_SNAPSHOT_PATH = '/assets/data/snapshots/stop-services/latest.json';
const STOP_SCHEDULE_API_GLOB = '**/v1/Consorcios/*/paradas/**';
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;

interface StopServicesSnapshotFile {
  readonly stops: readonly StopServicesSnapshotEntry[];
}

interface StopServicesSnapshotEntry {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopName: string;
  readonly services: readonly unknown[];
}

async function loadPopulatedStop(page: Page): Promise<StopServicesSnapshotEntry> {
  const baseUrl = BASE_URL as string;
  const response = await page.request.get(new URL(STOP_SERVICES_SNAPSHOT_PATH, baseUrl).toString());
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
    throw new Error('Stop-services snapshot does not contain a populated Stop Detail fixture.');
  }

  return stop;
}

async function openStopDetail(page: Page, stop: StopServicesSnapshotEntry): Promise<void> {
  const baseUrl = BASE_URL as string;
  const path = `/stop-detail/${encodeURIComponent(stop.stopId)}?consortiumId=${stop.consortiumId}`;
  await page.goto(new URL(path, baseUrl).toString());

  const content = page.locator('.stop-detail__content');
  await expect(content).toBeVisible({ timeout: 15_000 });
  await expect(content.locator('.stop-detail__title')).toHaveText(stop.stopName);
  await expect(content.locator('.stop-detail__schedule')).toBeVisible();
  await expect(content.locator('.stop-detail__list-item').first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}

async function capture(page: Page, viewport: (typeof MOBILE_VIEWPORT) | (typeof DESKTOP_VIEWPORT)) {
  if (!EVIDENCE_DIR) {
    return;
  }

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: join(EVIDENCE_DIR, `stop-detail_es_${viewport.width}_${viewport.height}_full.png`),
    fullPage: true,
  });
}

test.describe('Stop Detail visual evidence', () => {
  test.use({ locale: 'es-ES' });

  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for Stop Detail evidence.');
  test.skip(MOCK_MODE !== 'data', 'E2E_MOCK_MODE=data is required for Stop Detail evidence.');

  test('renders a populated schedule without horizontal overflow on mobile and desktop', async ({
    page,
  }) => {
    const stop = await loadPopulatedStop(page);

    await page.route(STOP_SCHEDULE_API_GLOB, async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    });

    for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(viewport);
      await openStopDetail(page, stop);
      await capture(page, viewport);
    }
  });
});

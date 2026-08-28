import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  expect,
  test as base,
  type Locator,
  type Page,
} from '@playwright/test';

const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const EXACT_VISUAL_REGRESSION = process.env.E2E_EXACT_VISUAL_REGRESSION === 'true';
const FIXED_VISUAL_TIME = new Date('2026-08-28T21:50:00+02:00');
const FIXED_STOP_SNAPSHOT_DATE = '2026-08-27';
const FIXED_STOP_SNAPSHOT_TIMESTAMP = '2026-08-27T16:11:16.206Z';
const LEAFLET_SETTLE_TIMEOUT_MS = 5_000;
const MAP_TILE_SCRIPT = resolve(process.cwd(), 'scripts/visual/determinize-map-tiles.js');
const LINES_DIRECTORY_PATH = '/lines';
const STOP_DETAIL_PATH_PREFIX = '/stop-detail/';
const EXACT_LINE_CATALOG_GLOB = '**/assets/data/catalog/consortium-*/lines.json';
const EXACT_STOP_SERVICES_SNAPSHOT_GLOB = '**/assets/data/snapshots/stop-services/latest.json';
const CONSORTIUM_LINE_PATH_PATTERN = /\/consortium-(\d+)\/lines\.json$/u;
const ISO_DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}(T.*)$/u;
const EXACT_LINES_PER_CONSORTIUM = 2;

interface ExactLineCatalogEntry {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly mode: string;
  readonly operators: readonly string[];
}

export const test = base.extend({
  page: async ({ page }, use) => {
    if (EVIDENCE_DIR && EXACT_VISUAL_REGRESSION) {
      await page.addInitScript(() => {
        history.scrollRestoration = 'manual';
      });
      await page.clock.setFixedTime(FIXED_VISUAL_TIME);
      await installExactVisualDataRoutes(page);
    }

    await use(page);
  },
});

export { expect };
export type { Locator, Page };

export async function captureVisualEvidence(page: Page, name: string): Promise<void> {
  if (!EVIDENCE_DIR) {
    return;
  }

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await stabilizeVisualEvidence(page);
  await page.screenshot({
    path: join(EVIDENCE_DIR, name),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  });
}

async function installExactVisualDataRoutes(page: Page): Promise<void> {
  await page.route(EXACT_LINE_CATALOG_GLOB, async (route) => {
    if (getFramePath(route.request().frame().url()) !== LINES_DIRECTORY_PATH) {
      await route.continue();
      return;
    }

    const consortiumId = readConsortiumId(route.request().url());
    if (consortiumId === null) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ lines: buildExactLineCatalog(consortiumId) }),
    });
  });

  await page.route(EXACT_STOP_SERVICES_SNAPSHOT_GLOB, async (route) => {
    if (!getFramePath(route.request().frame().url()).startsWith(STOP_DETAIL_PATH_PREFIX)) {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    const payload: unknown = await response.json();
    await route.fulfill({ response, json: normalizeExactStopServicesSnapshot(payload) });
  });
}

function getFramePath(frameUrl: string): string {
  try {
    return new URL(frameUrl).pathname;
  } catch {
    return '';
  }
}

function readConsortiumId(requestUrl: string): number | null {
  const match = CONSORTIUM_LINE_PATH_PATTERN.exec(new URL(requestUrl).pathname);
  const consortiumId = Number(match?.[1]);
  return Number.isSafeInteger(consortiumId) && consortiumId > 0 ? consortiumId : null;
}

function buildExactLineCatalog(consortiumId: number): readonly ExactLineCatalogEntry[] {
  const firstCode = consortiumId === 1 ? '1011' : `V-${consortiumId}01`;
  const secondCode = consortiumId === 1 ? '1100' : `V-${consortiumId}02`;
  const entries = [
    buildExactLine(consortiumId, 1, firstCode),
    buildExactLine(consortiumId, EXACT_LINES_PER_CONSORTIUM, secondCode),
  ];

  return Object.freeze(entries);
}

function buildExactLine(
  consortiumId: number,
  ordinal: number,
  code: string,
): ExactLineCatalogEntry {
  return {
    id: `${consortiumId}${String(ordinal).padStart(3, '0')}`,
    code,
    name: `Línea visual estable ${consortiumId}.${ordinal}`,
    mode: 'AUTOBUS',
    operators: Object.freeze(['Operador visual estable']),
  };
}

function normalizeExactStopServicesSnapshot(payload: unknown): unknown {
  const root = readRecord(payload);
  if (!root) {
    return payload;
  }

  const metadata = readRecord(root['metadata']);
  const stops = Array.isArray(root['stops'])
    ? root['stops'].map(normalizeExactStopSnapshotEntry)
    : root['stops'];

  return {
    ...root,
    ...(metadata
      ? { metadata: { ...metadata, generatedAt: FIXED_STOP_SNAPSHOT_TIMESTAMP } }
      : {}),
    stops,
  };
}

function normalizeExactStopSnapshotEntry(value: unknown): unknown {
  const stop = readRecord(value);
  if (!stop) {
    return value;
  }

  const services = Array.isArray(stop['services'])
    ? stop['services'].map(normalizeExactStopService)
    : stop['services'];
  const query = readRecord(stop['query']);

  return {
    ...stop,
    services,
    ...(query
      ? {
          query: {
            ...query,
            requestedAt: FIXED_STOP_SNAPSHOT_TIMESTAMP,
            startTime: pinIsoDate(query['startTime']),
            endTime: pinIsoDate(query['endTime']),
          },
        }
      : {}),
  };
}

function normalizeExactStopService(value: unknown): unknown {
  const service = readRecord(value);
  if (!service) {
    return value;
  }

  return {
    ...service,
    scheduledTime: pinIsoDate(service['scheduledTime']),
  };
}

function pinIsoDate(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const match = ISO_DATE_PREFIX_PATTERN.exec(value);
  return match?.[1] ? `${FIXED_STOP_SNAPSHOT_DATE}${match[1]}` : value;
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

async function stabilizeVisualEvidence(page: Page): Promise<void> {
  if (EXACT_VISUAL_REGRESSION) {
    await stabilizeExactCaptureState(page);
  }

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  if (EXACT_VISUAL_REGRESSION && (await page.locator('.leaflet-container').count()) > 0) {
    await page.addScriptTag({ path: MAP_TILE_SCRIPT });
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.leaflet-tile')).every((tile) =>
          tile.classList.contains('leaflet-tile-loaded'),
        ),
      undefined,
      { timeout: LEAFLET_SETTLE_TIMEOUT_MS },
    );
    await waitForStableLeafletFrames(page);
  }

  if (EXACT_VISUAL_REGRESSION) {
    await stabilizeExactCaptureState(page);
  }
  await waitForTwoAnimationFrames(page);
}

async function stabilizeExactCaptureState(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    history.scrollRestoration = 'manual';
    document.documentElement.style.setProperty('overflow-anchor', 'none', 'important');
    document.body?.style.setProperty('overflow-anchor', 'none', 'important');
  });
  await resetScrollPosition(page);
  await waitForTwoAnimationFrames(page);
}

async function resetScrollPosition(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousScrollBehavior;
  });
  await page.waitForFunction(() => window.scrollX === 0 && window.scrollY === 0);
}

async function waitForStableLeafletFrames(page: Page): Promise<void> {
  await page.waitForFunction(
    async () => {
      const snapshot = (): string =>
        Array.from(
          document.querySelectorAll(
            '.leaflet-map-pane, .leaflet-tile-pane, .leaflet-overlay-pane, .leaflet-marker-pane, .leaflet-tooltip-pane, .leaflet-popup-pane, .leaflet-overlay-pane canvas',
          ),
        )
          .map((element) => {
            const htmlElement = element as HTMLElement;
            const rect = htmlElement.getBoundingClientRect();
            return [
              htmlElement.className,
              htmlElement.style.transform,
              rect.x,
              rect.y,
              rect.width,
              rect.height,
            ].join(':');
          })
          .join('|');

      const first = snapshot();
      await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
      await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
      return first === snapshot();
    },
    undefined,
    { timeout: LEAFLET_SETTLE_TIMEOUT_MS },
  );
}

async function waitForTwoAnimationFrames(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
    await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
  });
}

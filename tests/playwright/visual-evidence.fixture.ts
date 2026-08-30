import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  expect,
  test as base,
  type Locator,
  type Page,
} from '@playwright/test';

import {
  FIXED_VISUAL_TIME_ISO,
  buildExactStopServicesSnapshot,
} from '../../scripts/visual/exact-visual-data';

const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
export const EXACT_VISUAL_REGRESSION = process.env.E2E_EXACT_VISUAL_REGRESSION === 'true';
const FIXED_VISUAL_TIME = new Date(FIXED_VISUAL_TIME_ISO);
const LEAFLET_SETTLE_TIMEOUT_MS = 5_000;
const MAP_TILE_SCRIPT = resolve(process.cwd(), 'scripts/visual/determinize-map-tiles.js');
const LINES_DIRECTORY_PATH = '/lines';
const STOP_DETAIL_PATH_PREFIX = '/stop-detail/';
const APP_LAYOUT_SURFACE_SELECTOR = '.app-layout__surface';
const EXACT_LINE_CATALOG_GLOB = '**/assets/data/catalog/consortium-*/lines.json';
const EXACT_STOP_SERVICES_SNAPSHOT_GLOB = '**/assets/data/snapshots/stop-services/latest.json';
const CONSORTIUM_LINE_PATH_PATTERN = /\/consortium-(\d+)\/lines\.json$/u;
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
    if (EVIDENCE_DIR) {
      await page.addInitScript(() => {
        history.scrollRestoration = 'manual';
      });
      await page.clock.setFixedTime(FIXED_VISUAL_TIME);

      if (EXACT_VISUAL_REGRESSION) {
        await installExactVisualDataRoutes(page);
      }
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

export async function installExactStopDetailVisualData(page: Page): Promise<void> {
  if (!EXACT_VISUAL_REGRESSION) {
    return;
  }

  await page.route(EXACT_STOP_SERVICES_SNAPSHOT_GLOB, async (route) => {
    if (!getFramePath(route.request().frame().url()).startsWith(STOP_DETAIL_PATH_PREFIX)) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildExactStopServicesSnapshot()),
    });
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
  await page.evaluate((surfaceSelector) => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    for (const surface of document.querySelectorAll<HTMLElement>(surfaceSelector)) {
      surface.scrollLeft = 0;
      surface.scrollTop = 0;
    }
    window.scrollTo(0, 0);

    root.style.scrollBehavior = previousScrollBehavior;
  }, APP_LAYOUT_SURFACE_SELECTOR);
  await page.waitForFunction(
    (surfaceSelector) =>
      window.scrollX === 0 &&
      window.scrollY === 0 &&
      Array.from(document.querySelectorAll<HTMLElement>(surfaceSelector)).every(
        (surface) => surface.scrollLeft === 0 && surface.scrollTop === 0,
      ),
    APP_LAYOUT_SURFACE_SELECTOR,
  );
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

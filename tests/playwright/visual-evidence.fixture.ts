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
const LEAFLET_SETTLE_TIMEOUT_MS = 5_000;
const MAP_TILE_SCRIPT = resolve(process.cwd(), 'scripts/visual/determinize-map-tiles.js');

export const test = base.extend({
  page: async ({ page }, use) => {
    if (EVIDENCE_DIR && EXACT_VISUAL_REGRESSION) {
      await page.addInitScript(() => {
        history.scrollRestoration = 'manual';
      });
      await page.clock.setFixedTime(FIXED_VISUAL_TIME);
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

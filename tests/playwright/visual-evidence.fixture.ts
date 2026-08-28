import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  expect,
  test as base,
  type Locator,
  type Page,
} from '@playwright/test';

const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;
const FIXED_VISUAL_TIME = new Date('2026-08-28T21:50:00+02:00');
const LEAFLET_SETTLE_TIMEOUT_MS = 5_000;
const MAP_TILE_SCRIPT = resolve(process.cwd(), 'scripts/visual/determinize-map-tiles.js');

export const test = base.extend({
  page: async ({ page }, use) => {
    if (EVIDENCE_DIR) {
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
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  if ((await page.locator('.leaflet-container').count()) > 0) {
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

  await waitForTwoAnimationFrames(page);
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

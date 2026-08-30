import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;

export async function captureViewportVisualEvidence(page: Page, name: string): Promise<void> {
  if (!EVIDENCE_DIR) {
    return;
  }

  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
    await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
  });
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: join(EVIDENCE_DIR, name),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  });
}

import { test } from '@playwright/test';
import { expectExactPwaInstallShell } from './pwa-icon.assert';

const BASE_URL = process.env.E2E_BASE_URL;

test.describe('PWA install shell', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for PWA shell tests.');

  test('serves current theme metadata and exact approved install artwork', async ({ page }) => {
    await expectExactPwaInstallShell(page, BASE_URL as string);
  });
});

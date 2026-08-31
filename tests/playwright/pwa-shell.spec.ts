import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const PRIMARY_COLOR = '#0061fe';
const BACKGROUND_COLOR = '#f6f7f8';

interface WebManifest {
  readonly background_color: string;
  readonly icons: readonly {
    readonly purpose: string;
    readonly src: string;
  }[];
  readonly theme_color: string;
}

test.describe('PWA install shell', () => {
  test.skip(!BASE_URL, 'E2E_BASE_URL environment variable is required for PWA shell tests.');

  test('serves current theme metadata and install artwork', async ({ page, request }) => {
    const appUrl = new URL('/', BASE_URL as string).toString();
    await page.goto(appUrl);

    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      PRIMARY_COLOR,
    );

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const manifestUrl = new URL(manifestHref as string, page.url()).toString();
    const manifestResponse = await request.get(manifestUrl);
    expect(manifestResponse.ok()).toBe(true);

    const manifest = (await manifestResponse.json()) as WebManifest;
    expect(manifest.theme_color).toBe(PRIMARY_COLOR);
    expect(manifest.background_color).toBe(BACKGROUND_COLOR);
    expect(manifest.icons.map(({ purpose }) => purpose)).toEqual(['any', 'maskable']);

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(new URL(icon.src, manifestUrl).toString());
      expect(iconResponse.ok()).toBe(true);
      expect(await iconResponse.text()).toContain('<svg');
    }
  });
});

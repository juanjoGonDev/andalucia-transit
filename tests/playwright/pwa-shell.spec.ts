import { expect, test } from '@playwright/test';
import { APPROVED_ICON, CURRENT_THEME } from '../../scripts/pwa-contract';

const BASE_URL = process.env.E2E_BASE_URL;

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

  test('serves current theme metadata and exact approved install artwork', async ({ page, request }) => {
    const appUrl = new URL('/', BASE_URL as string).toString();
    await page.goto(appUrl);

    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      CURRENT_THEME.primary
    );

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const manifestUrl = new URL(manifestHref as string, page.url()).toString();
    const manifestResponse = await request.get(manifestUrl);
    expect(manifestResponse.ok()).toBe(true);

    const manifest = (await manifestResponse.json()) as WebManifest;
    expect(manifest.theme_color).toBe(CURRENT_THEME.primary);
    expect(manifest.background_color).toBe(CURRENT_THEME.background);
    expect(manifest.icons).toHaveLength(1);
    expect(manifest.icons).toMatchObject([
      {
        src: 'favicon.svg',
        purpose: 'any maskable'
      }
    ]);

    const iconUrl = new URL(manifest.icons[0].src, manifestUrl).toString();
    const iconResponse = await request.get(iconUrl);
    expect(iconResponse.ok()).toBe(true);
    expect(await iconResponse.text()).toContain('<svg');

    const rendered = await page.evaluate(
      async ({ height, iconUrl: source, width }) => {
        const image = new Image();
        image.src = source;
        await image.decode();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          throw new Error('2D canvas context is unavailable');
        }

        context.drawImage(image, 0, 0, width, height);
        const rgba = context.getImageData(0, 0, width, height).data;
        const digest = await crypto.subtle.digest('SHA-256', rgba);
        const hash = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, '0')
        ).join('');

        return {
          hash,
          naturalHeight: image.naturalHeight,
          naturalWidth: image.naturalWidth
        };
      },
      { height: APPROVED_ICON.height, iconUrl, width: APPROVED_ICON.width }
    );

    expect(rendered.naturalWidth).toBeGreaterThan(0);
    expect(rendered.naturalHeight).toBeGreaterThan(0);
    expect(rendered.hash).toBe(APPROVED_ICON.renderedRgbaSha256);
  });
});

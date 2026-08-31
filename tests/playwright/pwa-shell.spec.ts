import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;
const PRIMARY_COLOR = '#0061fe';
const BACKGROUND_COLOR = '#f6f7f8';
const APPROVED_ICON = {
  height: 1254,
  renderedRgbaSha256: '57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef',
  width: 1254
} as const;

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
      PRIMARY_COLOR
    );

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const manifestUrl = new URL(manifestHref as string, page.url()).toString();
    const manifestResponse = await request.get(manifestUrl);
    expect(manifestResponse.ok()).toBe(true);

    const manifest = (await manifestResponse.json()) as WebManifest;
    expect(manifest.theme_color).toBe(PRIMARY_COLOR);
    expect(manifest.background_color).toBe(BACKGROUND_COLOR);
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
    expect(await iconResponse.text()).toContain('data:image/webp;base64,');

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

    expect(rendered.naturalWidth).toBe(APPROVED_ICON.width);
    expect(rendered.naturalHeight).toBe(APPROVED_ICON.height);
    expect(rendered.hash).toBe(APPROVED_ICON.renderedRgbaSha256);
  });
});

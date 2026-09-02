import { expect, type Page } from '@playwright/test';
import { APPROVED_ICON, CURRENT_THEME } from '../../scripts/pwa-contract';
import { optimizePwaIconForDelivery } from '../../scripts/pwa-icon-output';

interface WebManifest {
  readonly background_color: string;
  readonly icons: readonly {
    readonly purpose: string;
    readonly src: string;
  }[];
  readonly theme_color: string;
}

interface RenderedIconEvidence {
  readonly hash: string;
  readonly naturalHeight: number;
  readonly naturalWidth: number;
  readonly optimizedHash: string;
  readonly optimizedNaturalHeight: number;
  readonly optimizedNaturalWidth: number;
}

export async function expectExactPwaInstallShell(
  page: Page,
  baseUrl: string,
): Promise<RenderedIconEvidence> {
  const appUrl = new URL('/', baseUrl).toString();
  await page.goto(appUrl);

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    CURRENT_THEME.primary,
  );

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();

  const manifestUrl = new URL(manifestHref as string, page.url()).toString();
  const manifestResponse = await page.request.get(manifestUrl);
  expect(manifestResponse.ok()).toBe(true);

  const manifest = (await manifestResponse.json()) as WebManifest;
  expect(manifest.theme_color).toBe(CURRENT_THEME.primary);
  expect(manifest.background_color).toBe(CURRENT_THEME.background);
  expect(manifest.icons).toHaveLength(1);
  expect(manifest.icons).toMatchObject([
    {
      src: 'favicon.svg',
      purpose: 'any maskable',
    },
  ]);

  const iconUrl = new URL(manifest.icons[0].src, manifestUrl).toString();
  const iconResponse = await page.request.get(iconUrl);
  expect(iconResponse.ok()).toBe(true);
  const iconSource = await iconResponse.text();
  expect(iconSource).toContain('<svg');
  const optimizedIconSource = optimizePwaIconForDelivery(iconSource);

  const rendered = await page.evaluate(
    async ({ height, iconUrl: source, optimizedSource, width }) => {
      async function renderIcon(imageSource: string) {
        const image = new Image();
        image.src = imageSource;
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
          byte.toString(16).padStart(2, '0'),
        ).join('');

        return {
          hash,
          naturalHeight: image.naturalHeight,
          naturalWidth: image.naturalWidth,
        };
      }

      const optimizedUrl = URL.createObjectURL(
        new Blob([optimizedSource], { type: 'image/svg+xml;charset=utf-8' }),
      );
      try {
        const original = await renderIcon(source);
        const optimized = await renderIcon(optimizedUrl);
        return {
          hash: original.hash,
          naturalHeight: original.naturalHeight,
          naturalWidth: original.naturalWidth,
          optimizedHash: optimized.hash,
          optimizedNaturalHeight: optimized.naturalHeight,
          optimizedNaturalWidth: optimized.naturalWidth,
        };
      } finally {
        URL.revokeObjectURL(optimizedUrl);
      }
    },
    {
      height: APPROVED_ICON.height,
      iconUrl,
      optimizedSource: optimizedIconSource,
      width: APPROVED_ICON.width,
    },
  );

  console.info(`PWA icon Chromium RGBA SHA-256: ${rendered.hash}`);
  console.info(`PWA optimized icon Chromium RGBA SHA-256: ${rendered.optimizedHash}`);
  expect(rendered.naturalWidth).toBeGreaterThan(0);
  expect(rendered.naturalHeight).toBeGreaterThan(0);
  expect(rendered.optimizedNaturalWidth).toBe(rendered.naturalWidth);
  expect(rendered.optimizedNaturalHeight).toBe(rendered.naturalHeight);
  expect(rendered.hash).toBe(APPROVED_ICON.renderedRgbaSha256);
  expect(rendered.optimizedHash).toBe(APPROVED_ICON.renderedRgbaSha256);

  return rendered;
}

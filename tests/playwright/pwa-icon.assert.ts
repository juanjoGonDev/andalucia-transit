import { expect, type Page } from '@playwright/test';
import { APPROVED_ICON, CURRENT_THEME } from '../../scripts/pwa-contract';

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
}

interface RenderedIconVariant extends RenderedIconEvidence {
  readonly name: string;
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
  const svgSource = await iconResponse.text();
  expect(svgSource).toContain('<svg');

  const variants = await page.evaluate(
    async ({ height, source, width }) => {
      const render = async (name: string, svg: string): Promise<RenderedIconVariant> => {
        const image = new Image();
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
          name,
          naturalHeight: image.naturalHeight,
          naturalWidth: image.naturalWidth,
        };
      };

      const themePalette = source
        .replaceAll('#02193e', '#060f2b')
        .replaceAll('#0162f3', '#0061fe');
      const themeCorners = themePalette.replaceAll('#000', '#060f2b');
      const pureWhite = themeCorners.replaceAll('#fdfdfd', '#ffffff');
      const targetDimensions = (svg: string) =>
        svg.replace('width="1095" height="1095"', `width="${width}" height="${height}"`);

      const candidates = [
        ['supplied', source],
        ['theme-palette', themePalette],
        ['theme-palette-navy-corners', themeCorners],
        ['theme-palette-navy-corners-white', pureWhite],
        ['supplied-1254', targetDimensions(source)],
        ['theme-palette-1254', targetDimensions(themePalette)],
        ['theme-palette-navy-corners-1254', targetDimensions(themeCorners)],
        ['theme-palette-navy-corners-white-1254', targetDimensions(pureWhite)],
      ] as const;

      return Promise.all(candidates.map(([name, svg]) => render(name, svg)));
    },
    { height: APPROVED_ICON.height, source: svgSource, width: APPROVED_ICON.width },
  );

  for (const variant of variants) {
    console.info(
      `PWA icon variant ${variant.name}: ${variant.hash} (${variant.naturalWidth}x${variant.naturalHeight})`,
    );
  }

  const rendered = variants[0];
  expect(rendered.naturalWidth).toBeGreaterThan(0);
  expect(rendered.naturalHeight).toBeGreaterThan(0);
  expect(rendered.hash).toBe(APPROVED_ICON.renderedRgbaSha256);

  return rendered;
}

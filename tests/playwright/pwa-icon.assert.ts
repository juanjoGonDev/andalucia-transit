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

interface PaletteProbeEvidence {
  readonly candidateCount: number;
  readonly exactMatchName: string | null;
  readonly served: RenderedIconEvidence;
  readonly uniqueHashCount: number;
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

  const probe = await page.evaluate(
    async ({ expectedHash, height, source, width }): Promise<PaletteProbeEvidence> => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('2D canvas context is unavailable');
      }

      const render = async (svg: string): Promise<RenderedIconEvidence> => {
        const image = new Image();
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        await image.decode();

        context.clearRect(0, 0, width, height);
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
      };

      const replaceCorners = (svg: string, color: string): string =>
        svg.replaceAll('fill="#000"', `fill="${color}"`).replaceAll('stroke="#000"', `stroke="${color}"`);

      const served = await render(source);
      const navyCandidates = ['#02193e', '#060f2b'] as const;
      const blueCandidates = ['#0162f3', '#0061fe', '#0b54d4'] as const;
      const whiteCandidates = ['#fdfdfd', '#ffffff', '#f6f7f8'] as const;
      const cornerCandidates = ['#000', '#02193e', '#060f2b', 'transparent'] as const;
      const hashes = new Set<string>();
      let exactMatchName: string | null = null;
      let candidateCount = 0;

      for (const navy of navyCandidates) {
        for (const blue of blueCandidates) {
          for (const white of whiteCandidates) {
            for (const corners of cornerCandidates) {
              candidateCount += 1;
              const candidate = replaceCorners(
                source
                  .replaceAll('#02193e', navy)
                  .replaceAll('#0162f3', blue)
                  .replaceAll('#fdfdfd', white),
                corners,
              );
              const rendered = await render(candidate);
              hashes.add(rendered.hash);
              if (rendered.hash === expectedHash) {
                exactMatchName = `navy=${navy};blue=${blue};white=${white};corners=${corners}`;
              }
            }
          }
        }
      }

      return {
        candidateCount,
        exactMatchName,
        served,
        uniqueHashCount: hashes.size,
      };
    },
    {
      expectedHash: APPROVED_ICON.renderedRgbaSha256,
      height: APPROVED_ICON.height,
      source: svgSource,
      width: APPROVED_ICON.width,
    },
  );

  console.info(
    probe.exactMatchName
      ? `PWA icon palette probe exact match: ${probe.exactMatchName}`
      : `PWA icon palette probe: no exact match across ${probe.candidateCount} candidates (${probe.uniqueHashCount} unique hashes)`,
  );
  console.info(
    `PWA icon Chromium RGBA SHA-256: ${probe.served.hash} (${probe.served.naturalWidth}x${probe.served.naturalHeight})`,
  );

  expect(probe.served.naturalWidth).toBeGreaterThan(0);
  expect(probe.served.naturalHeight).toBeGreaterThan(0);
  expect(probe.served.hash).toBe(APPROVED_ICON.renderedRgbaSha256);

  return probe.served;
}

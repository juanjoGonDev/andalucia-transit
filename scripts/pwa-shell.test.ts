import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { APPROVED_ICON, CURRENT_THEME } from './pwa-contract';

interface ManifestIcon {
  readonly purpose: string;
  readonly sizes: string;
  readonly src: string;
  readonly type: string;
}

interface WebManifest {
  readonly background_color: string;
  readonly icons: readonly ManifestIcon[];
  readonly theme_color: string;
}

async function readManifest(): Promise<WebManifest> {
  const content = await readFile('public/manifest.webmanifest', 'utf8');
  return JSON.parse(content) as WebManifest;
}

function readEmbeddedPayload(svg: string): Buffer {
  const match = svg.match(/href="data:image\/webp;base64,([^"]+)"/);
  assert.ok(match?.[1], 'favicon.svg must embed the approved lossless WebP payload');
  return Buffer.from(match[1], 'base64');
}

test('PWA manifest uses the current application theme', async () => {
  const manifest = await readManifest();

  assert.equal(manifest.theme_color, CURRENT_THEME.primary);
  assert.equal(manifest.background_color, CURRENT_THEME.background);
});

test('PWA manifest has one canonical icon for any and maskable purposes', async () => {
  const manifest = await readManifest();

  assert.deepEqual(manifest.icons, [
    {
      src: 'favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable'
    }
  ]);

  await assert.rejects(readFile('public/app-icon-maskable.svg', 'utf8'));
});

test('canonical icon embeds the exact approved lossless payload', async () => {
  const icon = await readFile('public/favicon.svg', 'utf8');
  const payload = readEmbeddedPayload(icon);

  assert.match(icon, new RegExp(`viewBox="0 0 ${APPROVED_ICON.width} ${APPROVED_ICON.height}"`));
  assert.match(icon, new RegExp(`width="${APPROVED_ICON.width}"`));
  assert.match(icon, new RegExp(`height="${APPROVED_ICON.height}"`));
  assert.equal(createHash('sha256').update(payload).digest('hex'), APPROVED_ICON.payloadSha256);
  assert.doesNotMatch(icon, /#3f51b5/i);
  assert.doesNotMatch(icon, /junta/i);
});

test('document metadata colors mobile browser chrome with the current primary', async () => {
  const index = await readFile('src/index.html', 'utf8');

  assert.match(
    index,
    new RegExp(`<meta name="theme-color" content="${CURRENT_THEME.primary}">`)
  );
  assert.match(index, /<meta name="mobile-web-app-capable" content="yes">/);
  assert.match(index, /<meta name="apple-mobile-web-app-capable" content="yes">/);
});

test('service worker precaches manifest and can update canonical icon artwork', async () => {
  const config = await readFile('ngsw-config.json', 'utf8');
  const parsed = JSON.parse(config) as {
    readonly assetGroups: readonly {
      readonly name: string;
      readonly resources: { readonly files: readonly string[] };
    }[];
  };
  const appGroup = parsed.assetGroups.find((group) => group.name === 'app');
  const assetsGroup = parsed.assetGroups.find((group) => group.name === 'assets');

  assert.ok(appGroup);
  assert.ok(assetsGroup);
  assert.ok(appGroup.resources.files.includes('/manifest.webmanifest'));
  assert.ok(appGroup.resources.files.includes('/favicon.svg'));
  assert.ok(assetsGroup.resources.files.some((pattern) => pattern.includes('svg')));
});

export { APPROVED_ICON };

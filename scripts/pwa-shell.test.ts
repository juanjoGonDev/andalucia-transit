import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const CURRENT_THEME = {
  background: '#f6f7f8',
  primary: '#0061fe',
  secondary: '#060f2b'
} as const;

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

test('PWA manifest uses the current application theme', async () => {
  const manifest = await readManifest();

  assert.equal(manifest.theme_color, CURRENT_THEME.primary);
  assert.equal(manifest.background_color, CURRENT_THEME.background);
});

test('PWA manifest exposes separate any and maskable vector icons', async () => {
  const manifest = await readManifest();

  assert.deepEqual(manifest.icons, [
    {
      src: 'favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any'
    },
    {
      src: 'app-icon-maskable.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'maskable'
    }
  ]);
});

test('maskable install artwork owns the full canvas and current brand colors', async () => {
  const icon = await readFile('public/app-icon-maskable.svg', 'utf8');

  assert.match(icon, /<rect width="64" height="64" fill="#060f2b"\/>/);
  assert.match(icon, new RegExp(CURRENT_THEME.primary));
  assert.match(icon, new RegExp(CURRENT_THEME.secondary));
  assert.doesNotMatch(icon, /#3f51b5/i);
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

test('service worker precaches manifest and can update vector install artwork', async () => {
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

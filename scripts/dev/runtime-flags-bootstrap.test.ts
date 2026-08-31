import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  injectRuntimeFlagsBootstrap,
  installRuntimeFlagsBootstrap,
} from './runtime-flags-bootstrap.mjs';

const INDEX_HTML = '<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n</head>\n<body></body>\n</html>\n';
const MOCK_FLAGS = 'window.__TEST_FLAGS__ = Object.freeze({ mockDataMode: "data" });\n';

test('injects the runtime flags script once before the head closes', () => {
  const injected = injectRuntimeFlagsBootstrap(INDEX_HTML);
  const scriptTag = '<script src="assets/runtime-flags.js"></script>';

  assert.ok(injected.includes(scriptTag));
  assert.ok(injected.indexOf(scriptTag) < injected.indexOf('</head>'));
  assert.equal(injectRuntimeFlagsBootstrap(injected), injected);
});

test('rejects documents without a head boundary', () => {
  assert.throws(
    () => injectRuntimeFlagsBootstrap('<html><body></body></html>'),
    /Cannot install runtime flags/,
  );
});

test('installs and restores the runtime flag sources', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'andalucia-transit-runtime-flags-'));
  const indexPath = join(directory, 'index.html');
  const runtimeFlagsPath = join(directory, 'runtime-flags.js');
  const originalFlags = 'window.__TEST_FLAGS__ = Object.freeze({ mockDataMode: null });\n';

  context.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  await Promise.all([
    writeFile(indexPath, INDEX_HTML, 'utf-8'),
    writeFile(runtimeFlagsPath, originalFlags, 'utf-8'),
  ]);

  const restore = await installRuntimeFlagsBootstrap(MOCK_FLAGS, { indexPath, runtimeFlagsPath });

  assert.equal(await readFile(runtimeFlagsPath, 'utf-8'), MOCK_FLAGS);
  assert.ok((await readFile(indexPath, 'utf-8')).includes('assets/runtime-flags.js'));

  await restore();
  await restore();

  assert.equal(await readFile(runtimeFlagsPath, 'utf-8'), originalFlags);
  assert.equal(await readFile(indexPath, 'utf-8'), INDEX_HTML);
});

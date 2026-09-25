import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Script, createContext } from 'node:vm';

/**
 * Guards the committed `src/assets/runtime-flags.js` against dev-mode leftovers.
 *
 * `scripts/dev/start-with-mock-mode.mjs` and `start-with-snapshot.mjs` rewrite this file in
 * place while a dev server runs and restore it on exit. If the rewritten state is ever
 * committed (e.g. the process dies before restoring), the production app boots in mock
 * mode: recent searches/favorites/alarms stop persisting, and a debug line can even
 * overwrite user preferences (`localStorage.setItem('…routeSearchPreferences', …)`) on
 * every page load. This guard makes that state fail `test:scripts` instead of shipping.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME_FLAGS_PATH = path.join(REPO_ROOT, 'src/assets/runtime-flags.js');

interface LocalStorageStub {
  readonly written: Record<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function buildLocalStorageStub(): LocalStorageStub {
  const written: Record<string, string> = {};

  return {
    written,
    getItem: (key) => (key in written ? written[key] : null),
    setItem: (key, value) => {
      written[key] = value;
    },
    removeItem: (key) => {
      delete written[key];
    }
  };
}

function evaluateRuntimeFlags(source: string): {
  readonly flags: Record<string, unknown>;
  readonly localStorage: LocalStorageStub;
} {
  const localStorage = buildLocalStorageStub();
  const context = createContext({ window: { localStorage }, localStorage });

  new Script(source, { filename: 'runtime-flags.js' }).runInContext(context, {
    timeout: 1_000
  });

  const flags = (context.window as { __ANDALUCIA_TRANSIT_FLAGS__?: unknown })
    .__ANDALUCIA_TRANSIT_FLAGS__;

  assert.ok(
    flags && typeof flags === 'object',
    'runtime-flags.js must define window.__ANDALUCIA_TRANSIT_FLAGS__'
  );

  return { flags: flags as Record<string, unknown>, localStorage };
}

test('committed runtime flags do not enable a mock data mode', async () => {
  const { flags } = evaluateRuntimeFlags(await readFile(RUNTIME_FLAGS_PATH, 'utf8'));

  assert.ok(
    flags.mockDataMode === null || flags.mockDataMode === undefined,
    `committed runtime-flags.js must not enable mockDataMode (found ${JSON.stringify(flags.mockDataMode)}); ` +
      'dev mock flags come from `pnpm dev:mock-data` and must be restored before committing'
  );
});

test('committed runtime flags never write to localStorage', async () => {
  const { flags, localStorage } = evaluateRuntimeFlags(
    await readFile(RUNTIME_FLAGS_PATH, 'utf8')
  );

  assert.deepEqual(
    Object.keys(localStorage.written),
    [],
    `committed runtime-flags.js must not touch localStorage (found writes: ${JSON.stringify(
      localStorage.written
    )}); the mock dev bootstrap seeds preferences there and must never ship`
  );
  assert.ok(flags, 'runtime flags are evaluated');
});

test('committed runtime flags prefer the live API over snapshots', async () => {
  const { flags } = evaluateRuntimeFlags(await readFile(RUNTIME_FLAGS_PATH, 'utf8'));

  assert.equal(
    flags.forceSnapshot,
    false,
    'the production default is live-API-first with snapshot fallback when the API is ' +
      'unavailable; `forceSnapshot: true` is a dev override (`pnpm start:snapshot`) and ' +
      'must be restored before committing'
  );
});

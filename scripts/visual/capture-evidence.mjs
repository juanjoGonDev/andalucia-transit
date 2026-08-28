import { once } from 'node:events';
import { mkdir, rm, stat } from 'node:fs/promises';
import { dirname, delimiter, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { MAX_EVIDENCE_FILE_BYTES, VISUAL_EVIDENCE_ASSETS } from './evidence-assets.mjs';

const READY_ATTEMPTS = 60;
const READY_DELAY_MS = 2_000;
const STOP_TIMEOUT_MS = 30_000;
const HOST = '127.0.0.1';
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = resolve(SCRIPT_DIRECTORY, '..', '..');
const MAP_TILE_SCRIPT = resolve(SCRIPT_DIRECTORY, 'determinize-map-tiles.js');

const POPULATED_SPECS = Object.freeze([
  'tests/playwright/deterministic-visual-states.spec.ts',
  'tests/playwright/home-tabs.layout.spec.ts',
  'tests/playwright/lines-directory.layout.spec.ts',
  'tests/playwright/map-exploration.spec.ts',
  'tests/playwright/map-focused-lines.spec.ts',
  'tests/playwright/theme.contrast.spec.ts',
  'tests/playwright/visual-interaction-states.spec.ts',
]);

const POPULATED_CAPTURES = Object.freeze([
  { route: '/', slug: 'home-data' },
  { route: '/routes', slug: 'route-search-initial' },
  { route: '/map', slug: 'map-data', deterministicMapTiles: true },
  { route: '/recents', slug: 'recent-data' },
  { route: '/favorites', slug: 'favorites-data' },
  { route: '/settings', slug: 'settings-data' },
  { route: '/news', slug: 'news-data' },
]);

const EMPTY_CAPTURES = Object.freeze([
  { route: '/recents', slug: 'recent-empty' },
  { route: '/favorites', slug: 'favorites-empty' },
]);

function workspaceEnvironment(workspace, extra = {}) {
  const path = [resolve(workspace, 'node_modules/.bin'), process.env.PATH ?? '']
    .filter(Boolean)
    .join(delimiter);
  return { ...process.env, CI: 'true', PATH: path, ...extra };
}

function runCommand(command, args, { cwd, env = {} }) {
  return new Promise((resolveCommand, rejectCommand) => {
    console.log(`$ ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      cwd,
      env: workspaceEnvironment(cwd, env),
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', rejectCommand);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveCommand();
        return;
      }
      rejectCommand(
        new Error(
          `${command} exited with ${code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`}`,
        ),
      );
    });
  });
}

function startApplication(workspace, mode, port) {
  const script = resolve(workspace, 'scripts/dev/start-with-mock-mode.mjs');
  console.log(`Starting ${mode} application from ${workspace} on ${HOST}:${port}`);
  return spawn(process.execPath, [script, mode, '--host', HOST, '--port', String(port)], {
    cwd: workspace,
    env: workspaceEnvironment(workspace),
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: false,
  });
}

async function waitForReady(child, url) {
  for (let attempt = 1; attempt <= READY_ATTEMPTS; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Application exited before becoming ready at ${url}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The server may still be starting.
    }
    await delay(READY_DELAY_MS);
  }
  throw new Error(`Application did not become ready at ${url}`);
}

async function waitForUnavailable(url) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }
    } catch {
      return;
    }
    await delay(1_000);
  }
  throw new Error(`Application still owns ${url} after shutdown`);
}

async function stopApplication(child, url) {
  if (!child || child.exitCode !== null) {
    return;
  }

  const exited = once(child, 'exit').then(() => true);
  child.kill('SIGTERM');
  const stopped = await Promise.race([exited, delay(STOP_TIMEOUT_MS).then(() => false)]);
  if (!stopped) {
    child.kill('SIGKILL');
    await once(child, 'exit');
    throw new Error(`Application did not stop cleanly at ${url}`);
  }
  await waitForUnavailable(url);
}

async function captureRoute({
  harnessRoot,
  outDir,
  baseUrl,
  route,
  slug,
  deterministicMapTiles,
}) {
  const args = [
    'run',
    'screenshot',
    '--',
    `--url=${baseUrl}${route}`,
    '--waitFor=app-root',
    `--outDir=${outDir}`,
    `--name=${slug}`,
    '--locale=es',
    '--breakpoints=390x844,1440x900',
    '--fullPage=true',
  ];
  if (deterministicMapTiles) {
    args.push(`--evalFile=${MAP_TILE_SCRIPT}`);
  }
  await runCommand('pnpm', args, { cwd: harnessRoot });
}

async function captureRoutes(options, captures) {
  for (const capture of captures) {
    await captureRoute({ ...options, ...capture });
  }
}

async function verifyEvidenceDirectory(outDir) {
  for (const file of VISUAL_EVIDENCE_ASSETS) {
    const path = resolve(outDir, file);
    const metadata = await stat(path);
    if (!metadata.isFile() || metadata.size === 0) {
      throw new Error(`Required visual evidence is empty: ${path}`);
    }
    if (metadata.size > MAX_EVIDENCE_FILE_BYTES) {
      throw new Error(
        `Visual evidence exceeds ${MAX_EVIDENCE_FILE_BYTES} bytes: ${path} (${metadata.size})`,
      );
    }
  }
}

export async function captureEvidence({
  workspace,
  outDir,
  port,
  harnessWorkspace = HARNESS_ROOT,
}) {
  const applicationRoot = resolve(workspace);
  const harnessRoot = resolve(harnessWorkspace);
  const evidenceRoot = resolve(outDir);
  const baseUrl = `http://${HOST}:${port}`;
  console.log(`Using visual harness ${harnessRoot} against application ${applicationRoot}`);
  await rm(evidenceRoot, { recursive: true, force: true });
  await mkdir(evidenceRoot, { recursive: true });

  let app = null;
  try {
    app = startApplication(applicationRoot, 'data', port);
    await waitForReady(app, `${baseUrl}/`);
    await runCommand('pnpm', ['exec', 'playwright', 'test', ...POPULATED_SPECS], {
      cwd: harnessRoot,
      env: {
        E2E_BASE_URL: baseUrl,
        E2E_MOCK_MODE: 'data',
        E2E_EVIDENCE_DIR: evidenceRoot,
      },
    });
    await captureRoutes(
      { harnessRoot, outDir: evidenceRoot, baseUrl },
      POPULATED_CAPTURES,
    );

    await stopApplication(app, `${baseUrl}/`);
    app = startApplication(applicationRoot, 'empty', port);
    await waitForReady(app, `${baseUrl}/`);
    await runCommand(
      'pnpm',
      ['exec', 'playwright', 'test', 'tests/playwright/deterministic-visual-states.spec.ts'],
      {
        cwd: harnessRoot,
        env: { E2E_BASE_URL: baseUrl, E2E_MOCK_MODE: 'empty' },
      },
    );
    await captureRoutes(
      { harnessRoot, outDir: evidenceRoot, baseUrl },
      EMPTY_CAPTURES,
    );
    await verifyEvidenceDirectory(evidenceRoot);
  } finally {
    if (app) {
      await stopApplication(app, `${baseUrl}/`);
    }
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      workspace: { type: 'string' },
      outDir: { type: 'string' },
      port: { type: 'string' },
    },
    strict: true,
  });

  if (!values.workspace || !values.outDir || !values.port) {
    throw new Error(
      'Usage: capture-evidence.mjs --workspace <dir> --outDir <dir> --port <number>',
    );
  }
  const port = Number(values.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port: ${values.port}`);
  }

  await captureEvidence({ workspace: values.workspace, outDir: values.outDir, port });
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}

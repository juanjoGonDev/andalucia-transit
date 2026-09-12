import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { assertFocusedPwaBranchCoverage } from './pwa-coverage-gate.mjs';

const NEWLINE = '\n';
const EXIT_SUCCESS = 0;
const ERROR_PREFIX = '[run-angular-tests]';
const PWA_UPDATE_SPEC = 'src/app/core/services/pwa-update.service.spec.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prepareScript = resolve(__dirname, 'prepare.mjs');

async function spawnAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on('error', reject);
    child.on('exit', code => {
      if (code === EXIT_SUCCESS) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function spawnWithOutput(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    let stdout = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', chunk => {
      process.stderr.write(chunk);
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === EXIT_SUCCESS) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function ensureChromiumBinary() {
  let chromePath;
  try {
    chromePath = chromium.executablePath();
    await access(chromePath, fsConstants.X_OK);
    return chromePath;
  } catch (error) {
    await spawnAsync(process.execPath, [prepareScript], { stdio: 'inherit' });
    chromePath = chromium.executablePath();
    await access(chromePath, fsConstants.X_OK);
    return chromePath;
  }
}

function createNgTestArgs(extraArgs = []) {
  return [
    'ng',
    'test',
    '--browsers=ChromeHeadlessNoSandbox',
    '--watch=false',
    '--code-coverage',
    ...extraArgs,
  ];
}

function createNgTestEnv(chromePath) {
  return {
    ...process.env,
    CHROME_BIN: chromePath,
  };
}

async function runAngularTests(chromePath) {
  await spawnAsync('npx', createNgTestArgs(process.argv.slice(2)), {
    stdio: 'inherit',
    env: createNgTestEnv(chromePath),
  });

  const focusedOutput = await spawnWithOutput(
    'npx',
    createNgTestArgs([`--include=${PWA_UPDATE_SPEC}`]),
    { env: createNgTestEnv(chromePath) },
  );
  assertFocusedPwaBranchCoverage(focusedOutput);
}

ensureChromiumBinary()
  .then(runAngularTests)
  .catch(error => {
    process.stderr.write(`${ERROR_PREFIX} ${error.message}${NEWLINE}`);
    process.exit(1);
  });

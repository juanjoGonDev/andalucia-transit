import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { assertPwaBranchCoverage } from './pwa-coverage-gate.mjs';

const NEWLINE = '\n';
const EXIT_SUCCESS = 0;
const ERROR_PREFIX = '[run-angular-tests]';
const PWA_UPDATE_SPEC = 'src/app/core/services/pwa-update.service.spec.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prepareScript = resolve(__dirname, 'prepare.mjs');
const pwaCoverageSummary = resolve(
  __dirname,
  '../../coverage/andalucia-transit/coverage-summary.json',
);

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

async function runNgTest(chromePath, extraArgs = [], extraEnv = {}) {
  const baseArgs = [
    'test',
    '--browsers=ChromeHeadlessNoSandbox',
    '--watch=false',
    '--code-coverage',
  ];

  await spawnAsync('npx', ['ng', ...baseArgs, ...extraArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
      CHROME_BIN: chromePath,
    },
  });
}

async function verifyPwaBranchCoverage() {
  const coverageSummary = JSON.parse(await readFile(pwaCoverageSummary, 'utf8'));
  assertPwaBranchCoverage(coverageSummary);
}

async function runAngularTests(chromePath) {
  await runNgTest(chromePath, process.argv.slice(2));
  await rm(pwaCoverageSummary, { force: true });
  await runNgTest(
    chromePath,
    [`--include=${PWA_UPDATE_SPEC}`],
    { PWA_COVERAGE_ONLY: '1' },
  );
  await verifyPwaBranchCoverage();
}

ensureChromiumBinary()
  .then(runAngularTests)
  .catch(error => {
    process.stderr.write(`${ERROR_PREFIX} ${error.message}${NEWLINE}`);
    process.exit(1);
  });

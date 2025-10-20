import { spawn } from 'node:child_process';
import process from 'node:process';

const PLATFORM_WINDOWS = 'win32';
const COMMAND_NPX = 'npx';
const COMMAND_NPX_WINDOWS = 'npx.cmd';
const ARG_PLAYWRIGHT = 'playwright';
const ARG_INSTALL = 'install';
const ARG_WITH_DEPS = '--with-deps';
const ENV_SKIP = 'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD';
const VALUE_TRUE = 'true';
const VALUE_ONE = '1';
const EXIT_SUCCESS = 0;
const NEWLINE = '\n';
const STDIO_INHERIT = 'inherit';
const ERROR_INSTALL = 'Playwright browser installation failed';

function isTruthy(value) {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized === VALUE_TRUE || normalized === VALUE_ONE;
}

function shouldSkip() {
  return isTruthy(process.env[ENV_SKIP]);
}

function isWindows() {
  return process.platform === PLATFORM_WINDOWS;
}

function resolveExecutable() {
  return isWindows() ? COMMAND_NPX_WINDOWS : COMMAND_NPX;
}

function runInstall() {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveExecutable(), [ARG_PLAYWRIGHT, ARG_INSTALL, ARG_WITH_DEPS], {
      stdio: STDIO_INHERIT,
      shell: isWindows(),
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === EXIT_SUCCESS) {
        resolve();
        return;
      }
      reject(new Error(ERROR_INSTALL));
    });
  });
}

async function main() {
  if (shouldSkip()) {
    return;
  }
  await runInstall();
}

main().catch((error) => {
  process.stderr.write(`${error.message}${NEWLINE}`);
  process.exit(1);
});

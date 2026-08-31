import { spawn } from 'node:child_process';
import process from 'node:process';

const PLATFORM_WINDOWS = 'win32';
const COMMAND_NPX = 'npx';
const COMMAND_PNPM = 'pnpm';
const COMMAND_YARN = 'yarn';
const COMMAND_SUFFIX_WINDOWS = '.cmd';
const ARG_EXEC = 'exec';
const ARG_PLAYWRIGHT = 'playwright';
const ARG_INSTALL = 'install';
const ARG_CHROMIUM = 'chromium';
const ARG_WITH_DEPS = '--with-deps';
const ARG_LEFTHOOK = 'lefthook';
const ENV_SKIP_PLAYWRIGHT = 'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD';
const ENV_USER_AGENT = 'npm_config_user_agent';
const PACKAGE_MANAGER_PNPM = 'pnpm';
const PACKAGE_MANAGER_YARN = 'yarn';
const PACKAGE_MANAGER_NPM = 'npm';
const VALUE_TRUE = 'true';
const VALUE_ONE = '1';
const VALUE_SEPARATOR = ' ';
const VALUE_VERSION_SEPARATOR = '/';
const EXIT_UNKNOWN = 'unknown';
const EXIT_SUCCESS = 0;
const STDIO_INHERIT = 'inherit';
const NEWLINE = '\n';
const ERROR_PLAYWRIGHT = 'Playwright browser installation failed';
const ERROR_LEFTHOOK = 'Lefthook installation failed';

function log(message) {
  process.stdout.write(`${message}${NEWLINE}`);
}

function isWindows() {
  return process.platform === PLATFORM_WINDOWS;
}

function resolveCommand(base) {
  if (!isWindows()) {
    return base;
  }
  return `${base}${COMMAND_SUFFIX_WINDOWS}`;
}

function isTruthy(value) {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized === VALUE_TRUE || normalized === VALUE_ONE;
}

function shouldSkipPlaywright() {
  return isTruthy(process.env[ENV_SKIP_PLAYWRIGHT]);
}

function parsePackageManager() {
  const agent = process.env[ENV_USER_AGENT];
  if (!agent) {
    return PACKAGE_MANAGER_NPM;
  }
  const [firstToken] = agent.split(VALUE_SEPARATOR);
  if (!firstToken) {
    return PACKAGE_MANAGER_NPM;
  }
  const name = firstToken.split(VALUE_VERSION_SEPARATOR)[0];
  if (name === PACKAGE_MANAGER_PNPM) {
    return PACKAGE_MANAGER_PNPM;
  }
  if (name === PACKAGE_MANAGER_YARN) {
    return PACKAGE_MANAGER_YARN;
  }
  return PACKAGE_MANAGER_NPM;
}

function runProcess(command, args, shell) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: STDIO_INHERIT,
      shell,
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === EXIT_SUCCESS) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? EXIT_UNKNOWN}`));
    });
  });
}

async function installPlaywright() {
  if (shouldSkipPlaywright()) {
    log('Skipping Playwright Chromium installation.');
    return;
  }
  log('Installing Playwright Chromium...');
  const command = resolveCommand(COMMAND_NPX);
  try {
    await runProcess(command, [ARG_PLAYWRIGHT, ARG_INSTALL, ARG_CHROMIUM, ARG_WITH_DEPS], isWindows());
    log('Playwright Chromium installed.');
  } catch (error) {
    throw new Error(`${ERROR_PLAYWRIGHT}: ${error.message}`);
  }
}

function resolveLefthookCommand() {
  const packageManager = parsePackageManager();
  if (packageManager === PACKAGE_MANAGER_PNPM) {
    return { command: resolveCommand(COMMAND_PNPM), args: [ARG_EXEC, ARG_LEFTHOOK, ARG_INSTALL] };
  }
  if (packageManager === PACKAGE_MANAGER_YARN) {
    return { command: resolveCommand(COMMAND_YARN), args: [ARG_LEFTHOOK, ARG_INSTALL] };
  }
  return { command: resolveCommand(COMMAND_NPX), args: [ARG_LEFTHOOK, ARG_INSTALL] };
}

async function installLefthook() {
  log('Installing Lefthook hooks...');
  const { command, args } = resolveLefthookCommand();
  try {
    await runProcess(command, args, isWindows());
    log('Lefthook hooks installed.');
  } catch (error) {
    throw new Error(`${ERROR_LEFTHOOK}: ${error.message}`);
  }
}

async function main() {
  log('Preparing workspace tooling...');
  await Promise.all([installPlaywright(), installLefthook()]);
  log('Workspace tooling ready.');
}

main().catch(error => {
  process.stderr.write(`${error.message}${NEWLINE}`);
  process.exit(1);
});

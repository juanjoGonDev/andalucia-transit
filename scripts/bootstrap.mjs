import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = join(scriptDirectory, '..');
const summary = [];
const timings = [];
let corepackAlreadyEnabled = false;

function logWithTime(message) {
  const now = new Date();
  const timeString = now.toISOString().substring(11, 23);
  console.log(`[${timeString}] ${message}`);
  return now;
}

function logElapsedTime(startTime, operation) {
  const endTime = new Date();
  const elapsed = (endTime - startTime) / 1000;
  const formatted = elapsed.toFixed(2);
  timings.push({ operation, duration: formatted });
  logWithTime(`✅ ${operation} completed in ${formatted} seconds`);
  return endTime;
}

function readJsonFile(relativePath) {
  const absolutePath = join(rootDirectory, relativePath);
  const content = readFileSync(absolutePath, 'utf8');
  return JSON.parse(content);
}

function parseVersion(value) {
  return value
    .replace(/^v/, '')
    .split('.')
    .map((segment) => Number.parseInt(segment, 10) || 0);
}

function compareVersions(left, right) {
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference < 0) {
      return -1;
    }
    if (difference > 0) {
      return 1;
    }
  }
  return 0;
}

function satisfiesConstraint(version, constraint) {
  if (!constraint) {
    return true;
  }
  if (constraint.startsWith('>=')) {
    return compareVersions(version, parseVersion(constraint.slice(2))) >= 0;
  }
  if (constraint.startsWith('>')) {
    return compareVersions(version, parseVersion(constraint.slice(1))) > 0;
  }
  if (constraint.startsWith('<=')) {
    return compareVersions(version, parseVersion(constraint.slice(2))) <= 0;
  }
  if (constraint.startsWith('<')) {
    return compareVersions(version, parseVersion(constraint.slice(1))) < 0;
  }
  if (constraint.startsWith('=')) {
    return compareVersions(version, parseVersion(constraint.slice(1))) === 0;
  }
  return compareVersions(version, parseVersion(constraint)) === 0;
}

function ensureNodeRequirement(range) {
  if (!range) {
    console.error('Node.js engine requirement missing in package.json.');
    process.exit(1);
  }
  const normalized = range.split(' ').filter((part) => part.length > 0);
  const version = parseVersion(process.version);
  const allSatisfied = normalized.every((constraint) => satisfiesConstraint(version, constraint));
  if (!allSatisfied) {
    console.error(`Node.js ${process.version} does not satisfy required range ${range}.`);
    process.exit(1);
  }
  summary.push(`Node.js requirement satisfied (${range}).`);
}

function parsePackageManager(value) {
  if (!value) {
    return null;
  }
  const lastAt = value.lastIndexOf('@');
  if (lastAt <= 0) {
    return { name: value, version: null };
  }
  const name = value.slice(0, lastAt);
  const version = value.slice(lastAt + 1);
  return { name, version };
}

function commandAvailable(command) {
  const result = spawnSync(command, ['--version'], { cwd: rootDirectory, stdio: 'ignore' });
  return result.status === 0;
}

async function execute(command, args, operation = 'Run command') {
  return new Promise((resolve) => {
    const startTime = logWithTime(`🚀 Starting: ${operation} (${command} ${args.join(' ')})`);
    try {
      const result = spawnSync(command, args, {
        cwd: rootDirectory,
        stdio: 'inherit',
        shell: true,
      });
      const success = result.status === 0;
      if (success) {
        logElapsedTime(startTime, operation);
      } else {
        console.error(`❌ ${operation} failed (code: ${result.status ?? 'N/A'})`);
      }
      resolve(success);
    } catch (error) {
      console.error(`❌ ${operation} threw an error: ${error.message}`);
      resolve(false);
    }
  });
}

async function ensureCorepack() {
  if (corepackAlreadyEnabled) {
    return true;
  }
  try {
    try {
      const corepackCheck = spawnSync('corepack', ['--version'], {
        stdio: 'pipe',
        encoding: 'utf8',
      });
      if (corepackCheck.status !== 0) {
        throw new Error('Corepack check failed');
      }
      logWithTime(`ℹ️ Corepack ${corepackCheck.stdout.trim()} detected`);
    } catch (error) {
      logWithTime('ℹ️ Corepack is not available, continuing without it.');
      summary.push('Corepack not available, continuing without it.');
      return false;
    }
    logWithTime('🔄 Enabling Corepack...');
    const result = await execute('corepack', ['enable'], 'Enable Corepack');
    if (!result) {
      logWithTime('⚠️ Corepack could not be enabled, continuing without it.');
      return false;
    }
    summary.push('Corepack enabled successfully.');
    corepackAlreadyEnabled = true;
    return true;
  } catch (error) {
    logWithTime('⚠️ Enabling Corepack failed, continuing without it.');
    return false;
  }
}

async function prepareWithCorepack(name, version) {
  if (!version) {
    return true;
  }
  try {
    logWithTime(`🔧 Preparing ${name}@${version} with Corepack...`);
    const result = await execute('corepack', ['prepare', `${name}@${version}`, '--activate'], `Prepare ${name} with Corepack`);
    return result !== null;
  } catch (error) {
    logWithTime(`⚠️ Corepack could not prepare ${name}@${version}: ${error.message}`);
    return false;
  }
}

function lockExists(name) {
  if (name === 'pnpm') {
    return existsSync(join(rootDirectory, 'pnpm-lock.yaml'));
  }
  if (name === 'yarn') {
    return existsSync(join(rootDirectory, 'yarn.lock'));
  }
  return existsSync(join(rootDirectory, 'package-lock.json'));
}

function installArguments(name, hasLock) {
  if (name === 'pnpm') {
    return hasLock ? ['install', '--frozen-lockfile'] : ['install'];
  }
  if (name === 'yarn') {
    return hasLock ? ['install', '--frozen-lockfile'] : ['install'];
  }
  if (name === 'npm') {
    return hasLock ? ['ci'] : ['install'];
  }
  return ['install'];
}

async function installDependencies(manager) {
  const hasLock = lockExists(manager.name);
  const args = installArguments(manager.name, hasLock);
  try {
    const success = await execute(manager.name, args, `Install dependencies with ${manager.name}`);
    if (success) {
      const lockState = hasLock ? 'lock respected' : 'lock created';
      summary.push(`Dependencies installed with ${manager.name} (${lockState}).`);
      return true;
    }
    return false;
  } catch (error) {
    logWithTime(`❌ Installing dependencies with ${manager.name} failed: ${error.message}`);
    return false;
  }
}

async function installLefthook(manager) {
  try {
    let success = false;
    if (manager.name === 'pnpm') {
      success = await execute('pnpm', ['exec', 'lefthook', 'install'], 'Install Lefthook with pnpm');
    } else if (manager.name === 'yarn') {
      success = await execute('yarn', ['lefthook', 'install'], 'Install Lefthook with yarn');
    } else {
      success = await execute('npx', ['lefthook', 'install'], 'Install Lefthook with npx');
    }
    if (success) {
      summary.push('Lefthook installed with pre-commit configuration.');
      return true;
    }
    logWithTime('⚠️ Lefthook could not be installed, continuing without it.');
    return false;
  } catch (error) {
    logWithTime(`⚠️ Lefthook installation failed: ${error.message}, continuing without it.`);
    return false;
  }
}

async function installPlaywrightBrowsers() {
  const scriptPath = join(rootDirectory, 'scripts', 'dev', 'prepare-playwright.mjs');
  const success = await execute(process.execPath, [scriptPath], 'Prepare Playwright Chromium');
  if (success) {
    summary.push('Playwright Chromium ready.');
  }
  return success;
}

async function selectManager(packageManagerValue) {
  const parsed = parsePackageManager(packageManagerValue);
  const sequence = [
    {
      name: 'pnpm',
      version: parsed?.name === 'pnpm' ? parsed.version : null,
      requiresCorepack: true,
    },
    {
      name: 'yarn',
      version: parsed?.name === 'yarn' ? parsed.version : null,
      requiresCorepack: true,
    },
    {
      name: 'npm',
      version: parsed?.name === 'npm' ? parsed.version : null,
      requiresCorepack: false,
    },
  ];
  for (const manager of sequence) {
    logWithTime(`🔍 Trying ${manager.name}...`);
    if (!commandAvailable(manager.name)) {
      logWithTime(`ℹ️ ${manager.name} is not available, moving to the next option.`);
      continue;
    }
    if (manager.requiresCorepack && manager.version) {
      logWithTime(`🔄 Configuring ${manager.name}@${manager.version}...`);
      const corepackEnabled = await ensureCorepack();
      if (corepackEnabled) {
        const prepared = await prepareWithCorepack(manager.name, manager.version);
        if (!prepared) {
          logWithTime(`⚠️ ${manager.name}@${manager.version} could not be prepared with Corepack.`);
          continue;
        }
        summary.push(`${manager.name}@${manager.version} configured with Corepack.`);
      } else {
        logWithTime(`ℹ️ Using ${manager.name} without Corepack.`);
      }
    }
    logWithTime(`🔄 Installing dependencies with ${manager.name}...`);
    const depsInstalled = await installDependencies(manager);
    if (depsInstalled) {
      summary.push(`✅ Selected package manager: ${manager.name}.`);
      return manager;
    }
    logWithTime(`⚠️ Dependency installation with ${manager.name} failed, trying the next option.`);
  }
  return null;
}

async function run() {
  const startTime = logWithTime('🚀 Starting environment bootstrap');
  try {
    logWithTime('📦 Reading project configuration...');
    const pkg = readJsonFile('package.json');
    logWithTime('🔍 Validating Node.js requirements...');
    const engineRequirement = pkg.engines?.node;
    ensureNodeRequirement(engineRequirement);
    logWithTime('🛠️ Selecting package manager...');
    const managerStart = new Date();
    const manager = await selectManager(pkg.packageManager);
    if (!manager) {
      console.error('❌ No suitable package manager was found.');
      process.exit(1);
    }
    logElapsedTime(managerStart, `Package manager selection (${manager.name})`);
    logWithTime('🌐 Preparing Playwright Chromium...');
    const playwrightStart = new Date();
    const playwrightReady = await installPlaywrightBrowsers();
    if (!playwrightReady) {
      console.error('❌ Playwright Chromium could not be prepared.');
      process.exit(1);
    }
    logElapsedTime(playwrightStart, 'Playwright Chromium preparation');
    logWithTime('🔧 Configuring additional tooling...');
    const toolsStart = new Date();
    await Promise.allSettled([
      installLefthook(manager).catch((error) => {
        logWithTime(`⚠️ Lefthook setup failed: ${error.message}`);
      }),
    ]);
    logElapsedTime(toolsStart, 'Additional tooling configuration');
    console.log('\n📊 Installation summary:');
    console.log('='.repeat(50));
    console.log(summary.join('\n'));
    console.log('\n⏱️ Execution times:');
    console.log('='.repeat(50));
    timings.forEach(({ operation, duration }) => {
      console.log(`- ${operation}: ${duration} seconds`);
    });
    const totalTime = (new Date() - startTime) / 1000;
    console.log('='.repeat(50));
    console.log(`✨ Completed in ${totalTime.toFixed(2)} seconds`);
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:');
  console.error(reason);
  process.exit(1);
});

run().catch((error) => {
  console.error('❌ Unhandled fatal error:');
  console.error(error);
  process.exit(1);
});

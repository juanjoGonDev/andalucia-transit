import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = join(scriptDirectory, '..');
const summary = [];
let corepackAlreadyEnabled = false;

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

function execute(command, args) {
  const result = spawnSync(command, args, { cwd: rootDirectory, stdio: 'inherit' });
  return result.status === 0;
}

function ensureCorepack() {
  if (corepackAlreadyEnabled) {
    return;
  }
  const enabled = execute('corepack', ['enable']);
  if (!enabled) {
    console.error('Corepack enable failed. Please ensure Node.js includes Corepack support.');
    process.exit(1);
  }
  summary.push('Corepack enabled.');
  corepackAlreadyEnabled = true;
}

function prepareWithCorepack(name, version) {
  if (!version) {
    return true;
  }
  return execute('corepack', ['prepare', `${name}@${version}`, '--activate']);
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

function installDependencies(manager) {
  const hasLock = lockExists(manager.name);
  const args = installArguments(manager.name, hasLock);
  const success = execute(manager.name, args);
  if (success) {
    const lockState = hasLock ? 'lock respected' : 'lock created';
    summary.push(`Dependencies installed with ${manager.name} (${lockState}).`);
  }
  return success;
}

function installLefthook(manager) {
  if (manager.name === 'pnpm') {
    if (!execute('pnpm', ['exec', 'lefthook', 'install'])) {
      console.error('Lefthook installation failed via pnpm.');
      process.exit(1);
    }
  } else if (manager.name === 'yarn') {
    if (!execute('yarn', ['lefthook', 'install'])) {
      console.error('Lefthook installation failed via yarn.');
      process.exit(1);
    }
  } else {
    if (!execute('npx', ['lefthook', 'install'])) {
      console.error('Lefthook installation failed via npm.');
      process.exit(1);
    }
  }
  summary.push('Lefthook installed with pre-commit configuration.');
}

function selectManager(packageManagerValue) {
  const parsed = parsePackageManager(packageManagerValue);
  const sequence = [
    { name: 'pnpm', version: parsed && parsed.name === 'pnpm' ? parsed.version : null },
    { name: 'yarn', version: parsed && parsed.name === 'yarn' ? parsed.version : null },
    { name: 'npm', version: parsed && parsed.name === 'npm' ? parsed.version : null }
  ];
  for (const manager of sequence) {
    if (manager.name === 'pnpm' || manager.name === 'yarn') {
      ensureCorepack();
      if (manager.version) {
        const prepared = prepareWithCorepack(manager.name, manager.version);
        if (!prepared) {
          console.warn(`Corepack could not activate ${manager.name}@${manager.version}.`);
          continue;
        }
        summary.push(`${manager.name} activated through Corepack.`);
      }
    }
    if (!commandAvailable(manager.name)) {
      continue;
    }
    if (installDependencies(manager)) {
      summary.push(`Package manager selected: ${manager.name}.`);
      return manager;
    }
  }
  return null;
}

function run() {
  const packageJson = readJsonFile('package.json');
  ensureNodeRequirement(packageJson.engines && packageJson.engines.node);
  const manager = selectManager(packageJson.packageManager);
  if (!manager) {
    console.error('Dependency installation failed for all package managers.');
    process.exit(1);
  }
  installLefthook(manager);
  summary.push('ESLint autofix on staged files ready.');
  console.log('Bootstrap summary:');
  for (const item of summary) {
    console.log(`- ${item}`);
  }
  console.log('Next steps: review git status and proceed with development.');
  console.log(`SUCCESS | packageManager=${manager.name} | hook=lefthook | eslint=imports-sorted-unused-removed`);
}

run();

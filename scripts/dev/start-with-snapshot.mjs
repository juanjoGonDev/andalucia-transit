import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runtimeFlagsPath = resolve('src/assets/runtime-flags.js');
const packageJsonPath = resolve('package.json');
const runtimeFlagsProperty = '__ANDALUCIA_TRANSIT_FLAGS__';
const versionGlobalProperty = 'NG_APP_VERSION';

const readPackageVersion = async () => {
  const packageContent = await readFile(packageJsonPath, { encoding: 'utf-8' });
  const { version } = JSON.parse(packageContent);

  return version;
};

const resolveVersion = async () => {
  return process.env[versionGlobalProperty] ?? (await readPackageVersion());
};

const buildSnapshotFlags = async () => {
  const version = await resolveVersion();
  const versionLiteral = JSON.stringify(version);

  return `window.${runtimeFlagsProperty} = Object.freeze({ forceSnapshot: true });\nwindow.${versionGlobalProperty} = ${versionLiteral};\n`;
};

async function main() {
  const originalContent = await readFile(runtimeFlagsPath, 'utf-8');
  const snapshotFlags = await buildSnapshotFlags();

  await writeFile(runtimeFlagsPath, snapshotFlags, { encoding: 'utf-8' });

  const command = process.platform === 'win32' ? 'ng.cmd' : 'ng';
  const child = spawn(command, ['serve'], { stdio: 'inherit' });

  const restoreFlags = async () => {
    await writeFile(runtimeFlagsPath, originalContent, { encoding: 'utf-8' });
  };

  const handleExit = async (code: number | null) => {
    await restoreFlags();
    process.exit(code ?? 0);
  };

  child.on('exit', handleExit);

  process.on('SIGINT', async () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', async () => {
    child.kill('SIGTERM');
  });

  process.on('uncaughtException', async (error) => {
    console.error(error);
    await restoreFlags();
    process.exit(1);
  });
}

void main();

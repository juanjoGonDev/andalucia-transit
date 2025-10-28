import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runtimeFlagsPath = resolve('src/assets/runtime-flags.js');
const validModes = new Set(['data', 'empty']);
const [, , requestedMode, ...serveExtraArgs] = process.argv;

if (!requestedMode || !validModes.has(requestedMode)) {
  console.error('Usage: node scripts/dev/start-with-mock-mode.mjs <data|empty>');
  process.exit(1);
}

const mockFlags =
  `window.__ANDALUCIA_TRANSIT_FLAGS__ = Object.freeze({ forceSnapshot: false, mockDataMode: '${requestedMode}' });\n`;

async function main() {
  const originalContent = await readFile(runtimeFlagsPath, 'utf-8');
  await writeFile(runtimeFlagsPath, mockFlags, { encoding: 'utf-8' });

  const command = process.platform === 'win32' ? 'ng.cmd' : 'ng';
  const child = spawn(command, ['serve', ...serveExtraArgs], { stdio: 'inherit' });

  const restoreFlags = async () => {
    await writeFile(runtimeFlagsPath, originalContent, { encoding: 'utf-8' });
  };

  const handleExit = async (code) => {
    await restoreFlags();
    const exitCode = typeof code === 'number' ? code : 0;
    process.exit(exitCode);
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

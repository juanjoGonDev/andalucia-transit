import { spawn } from 'node:child_process';
import { installRuntimeFlagsBootstrap } from './runtime-flags-bootstrap.mjs';

const validModes = new Set(['data', 'empty']);
const routeSearchPreferencesStorageKey = 'andalucia-transit.routeSearchPreferences';
const routeSearchPreferencesValue = JSON.stringify({ previewEnabled: false });
const [, , requestedMode, ...serveExtraArgs] = process.argv;

if (!requestedMode || !validModes.has(requestedMode)) {
  console.error('Usage: node scripts/dev/start-with-mock-mode.mjs <data|empty>');
  process.exit(1);
}

const mockFlags = [
  `window.__ANDALUCIA_TRANSIT_FLAGS__ = Object.freeze({ forceSnapshot: false, mockDataMode: '${requestedMode}' });`,
  `window.localStorage.setItem(${JSON.stringify(routeSearchPreferencesStorageKey)}, ${JSON.stringify(routeSearchPreferencesValue)});`,
  '',
].join('\n');

async function main() {
  const restoreBootstrap = await installRuntimeFlagsBootstrap(mockFlags);
  const command = process.platform === 'win32' ? 'ng.cmd' : 'ng';
  const child = spawn(command, ['serve', ...serveExtraArgs], { stdio: 'inherit' });
  let shutdownPromise = null;

  const shutdown = (code) => {
    shutdownPromise ??= restoreBootstrap()
      .catch((error) => {
        console.error('Failed to restore runtime flag sources:', error);
        return undefined;
      })
      .then(() => {
        const exitCode = typeof code === 'number' ? code : 0;
        process.exit(exitCode);
      });

    return shutdownPromise;
  };

  child.on('exit', (code) => {
    void shutdown(code);
  });

  child.on('error', (error) => {
    console.error(error);
    void shutdown(1);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });

  process.on('uncaughtException', (error) => {
    console.error(error);
    child.kill('SIGTERM');
    void shutdown(1);
  });
}

void main();

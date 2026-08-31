import { spawn } from 'node:child_process';
import { installRuntimeFlagsBootstrap } from './runtime-flags-bootstrap.mjs';

const snapshotFlags =
  "window.__ANDALUCIA_TRANSIT_FLAGS__ = Object.freeze({ forceSnapshot: true, mockDataMode: null });\n";
const [, , ...serveExtraArgs] = process.argv;

async function main() {
  const restoreBootstrap = await installRuntimeFlagsBootstrap(snapshotFlags);
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

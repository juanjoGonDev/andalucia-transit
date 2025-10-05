import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';

if (!process.env.CHROME_BIN) {
  process.env.CHROME_BIN = puppeteer.executablePath();
}

const command = process.platform === 'win32' ? 'ng.cmd' : 'ng';
const incomingArgs = process.argv.slice(2);
const forwardedArgs = [];
for (let index = 0; index < incomingArgs.length; index += 1) {
  const value = incomingArgs[index];
  if (value === '--browsers' && incomingArgs[index + 1]) {
    forwardedArgs.push(value, incomingArgs[index + 1].replace('ChromeHeadless', 'ChromeHeadlessNoSandbox'));
    index += 1;
    continue;
  }
  if (value.startsWith('--browsers=')) {
    forwardedArgs.push(value.replace('ChromeHeadless', 'ChromeHeadlessNoSandbox'));
    continue;
  }
  forwardedArgs.push(value);
}
const args = ['test', ...forwardedArgs];
const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

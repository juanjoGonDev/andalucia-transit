import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';

const browserFlag = '--browsers';
const watchFlag = '--watch';
const disabledWatchValue = 'false';
const browsersDelimiter = ',';
const chromeHeadless = 'ChromeHeadless';
const chromeHeadlessNoSandbox = 'ChromeHeadlessNoSandbox';
const chromeIdentifier = 'chrome';
const chromeAutoInstallDisabled = 'false';
const defaultBrowsers = [chromeHeadlessNoSandbox];

if (!process.env.CHROME_BIN) {
  process.env.CHROME_BIN = puppeteer.executablePath();
}

const command = process.platform === 'win32' ? 'ng.cmd' : 'ng';
const incomingArgs = process.argv.slice(2);
const forwardedArgs = [];
const explicitBrowsers = [];
for (let index = 0; index < incomingArgs.length; index += 1) {
  const value = incomingArgs[index];
  if (value === browserFlag && incomingArgs[index + 1]) {
    const parsedBrowsers = normalizeBrowsers(incomingArgs[index + 1]);
    forwardedArgs.push(value, formatBrowsers(parsedBrowsers));
    explicitBrowsers.push(...parsedBrowsers);
    index += 1;
    continue;
  }
  if (value.startsWith(`${browserFlag}=`)) {
    const parsedBrowsers = normalizeBrowsers(value.slice(`${browserFlag}=`.length));
    forwardedArgs.push(`${browserFlag}=${formatBrowsers(parsedBrowsers)}`);
    explicitBrowsers.push(...parsedBrowsers);
    continue;
  }
  forwardedArgs.push(value);
}

const hasWatchArgument = incomingArgs.some((value) => value === watchFlag || value.startsWith(`${watchFlag}=`));
if (!hasWatchArgument) {
  forwardedArgs.push(watchFlag, disabledWatchValue);
}

if (explicitBrowsers.length === 0) {
  forwardedArgs.push(browserFlag, formatBrowsers(defaultBrowsers));
}

const desiredBrowsers = explicitBrowsers.length > 0 ? explicitBrowsers : defaultBrowsers;
const shouldProbeChrome = desiredBrowsers.some((browser) => browser.toLowerCase().includes(chromeIdentifier));

if (shouldProbeChrome && !ensureChromeCanLaunch()) {
  process.stderr.write(
    '\nChrome could not be started. Install the missing system libraries or rerun the tests with a different --browsers value.\n',
  );
  process.exit(1);
}

const args = ['test', ...forwardedArgs];
const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

function ensureChromeCanLaunch() {
  if (canRunChrome()) {
    return true;
  }

  if (process.env.CHROME_AUTO_INSTALL === chromeAutoInstallDisabled) {
    return false;
  }

  if (!installChromeDependencies()) {
    return false;
  }

  return canRunChrome();
}

function canRunChrome() {
  const probe = spawnSync(process.env.CHROME_BIN, ['--version'], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

function installChromeDependencies() {
  if (process.platform !== 'linux') {
    return false;
  }

  const aptGet = spawnSync('apt-get', ['--version'], { stdio: 'ignore' });
  if (aptGet.error || aptGet.status !== 0) {
    return false;
  }

  console.info('Attempting to install system libraries required for headless Chrome...');
  const update = spawnSync('apt-get', ['update'], { stdio: 'inherit' });
  if (update.status !== 0) {
    return false;
  }

  const packages = resolvePackageAlternatives([
    ['ca-certificates'],
    ['fonts-liberation'],
    ['libasound2', 'libasound2t64'],
    ['libatk-bridge2.0-0', 'libatk-bridge2.0-0t64'],
    ['libatk1.0-0', 'libatk1.0-0t64'],
    ['libcairo2'],
    ['libcups2', 'libcups2t64'],
    ['libdrm2'],
    ['libgbm1'],
    ['libgtk-3-0', 'libgtk-3-0t64'],
    ['libnspr4'],
    ['libnss3'],
    ['libpangocairo-1.0-0'],
    ['libx11-xcb1'],
    ['libxcomposite1'],
    ['libxdamage1'],
    ['libxfixes3'],
    ['libxkbcommon0'],
    ['libxrandr2'],
    ['libxshmfence1'],
    ['xdg-utils'],
  ]);

  if (packages.length === 0) {
    return false;
  }

  const install = spawnSync('apt-get', ['install', '-y', ...packages], { stdio: 'inherit' });
  return install.status === 0;
}

function resolvePackageAlternatives(groups) {
  const resolved = [];
  for (const group of groups) {
    let selected = null;
    for (const candidate of group) {
      const probe = spawnSync('apt-cache', ['policy', candidate], { encoding: 'utf8' });
      if (probe.status === 0 && !probe.stdout.includes('Candidate: (none)')) {
        selected = candidate;
        break;
      }
    }
    if (selected) {
      resolved.push(selected);
    }
  }
  return resolved;
}

function normalizeBrowsers(input) {
  return input
    .split(browsersDelimiter)
    .map((browser) => browser.trim())
    .filter(Boolean)
    .map((browser) => {
      if (browser === chromeHeadless) {
        return chromeHeadlessNoSandbox;
      }
      return browser;
    });
}

function formatBrowsers(browsers) {
  return browsers.join(browsersDelimiter);
}

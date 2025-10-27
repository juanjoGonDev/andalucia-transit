import { promises as fs } from 'fs';
import path from 'path';
import { Browser, BrowserContext, chromium } from 'playwright';
import { UploadSummary, uploadToFilebin } from './upload-to-filebin';

const CAPTURE_DIRECTORY = '.captures';
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 800;
const MOBILE_WIDTH = 414;
const MOBILE_HEIGHT = 896;
const NETWORK_IDLE_STATE = 'networkidle';
const MOBILE_DEVICE_SCALE_FACTOR = 2;
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

export interface SnapAndPublishOptions {
  url: string;
  label: string;
  bin?: string;
  fetchImplementation?: typeof fetch;
}

interface Viewport {
  width: number;
  height: number;
}

function ensureValue(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function parseArguments(argv: string[]): SnapAndPublishOptions {
  let url: string | undefined;
  let label: string | undefined;
  let bin: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--url') {
      url = ensureValue(argv[index + 1], 'Missing value for --url');
      index += 1;
    } else if (token === '--label') {
      label = ensureValue(argv[index + 1], 'Missing value for --label');
      index += 1;
    } else if (token === '--bin') {
      bin = ensureValue(argv[index + 1], 'Missing value for --bin');
      index += 1;
    }
  }
  if (!url || !label) {
    throw new Error('Both --url and --label are required');
  }
  return { url, label, bin };
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureDirectory(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
}

async function captureScreenshot(browser: Browser, viewport: Viewport, url: string, filePath: string, mobile: boolean): Promise<void> {
  const contextOptions: Parameters<typeof browser.newContext>[0] = {
    viewport,
  };
  if (mobile) {
    contextOptions.isMobile = true;
    contextOptions.deviceScaleFactor = MOBILE_DEVICE_SCALE_FACTOR;
    contextOptions.userAgent = MOBILE_USER_AGENT;
  }
  const context: BrowserContext = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: NETWORK_IDLE_STATE });
  await page.waitForLoadState(NETWORK_IDLE_STATE);
  await page.screenshot({ path: filePath, fullPage: true });
  await context.close();
}

function buildMarkdown(label: string, summary: UploadSummary, desktopName: string, mobileName: string): string {
  const desktopFile = summary.files.find((entry) => entry.name === desktopName);
  const mobileFile = summary.files.find((entry) => entry.name === mobileName);
  if (!desktopFile || !mobileFile) {
    throw new Error('Uploaded file list is incomplete');
  }
  return `${label} – AFTER\nafter (desktop): ${desktopFile.url}\nafter (mobile): ${mobileFile.url}`;
}

export async function snapAndPublish(options: SnapAndPublishOptions): Promise<string> {
  const captureDir = path.resolve(process.cwd(), CAPTURE_DIRECTORY);
  await ensureDirectory(captureDir);
  const stamp = timestamp();
  const desktopName = `${stamp}-desktop.png`;
  const mobileName = `${stamp}-mobile.png`;
  const desktopPath = path.join(captureDir, desktopName);
  const mobilePath = path.join(captureDir, mobileName);
  const browser = await chromium.launch();
  try {
    await captureScreenshot(browser, { width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT }, options.url, desktopPath, false);
    await captureScreenshot(browser, { width: MOBILE_WIDTH, height: MOBILE_HEIGHT }, options.url, mobilePath, true);
  } finally {
    await browser.close();
  }
  const summary = await uploadToFilebin([desktopPath, mobilePath], options.bin, options.fetchImplementation ?? fetch);
  return buildMarkdown(options.label, summary, desktopName, mobileName);
}

async function runCli(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const block = await snapAndPublish(options);
  console.log(block);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UploadSummary, uploadToFilebin } from './upload-to-filebin';

const CAPTURE_DIRECTORY = 'artifacts/screenshots';
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 800;
const MOBILE_WIDTH = 414;
const MOBILE_HEIGHT = 896;
const DEFAULT_LOCALE = 'es';
const DEFAULT_FULL_PAGE = true;
const BREAKPOINT_SEPARATOR = ',';
const DIMENSION_SEPARATOR = 'x';
const FLAG_PREFIX = '--';
const FLAG_VALUE_SEPARATOR = '=';
const PASS_THROUGH_MARKER = '--';
const SCREENSHOT_EVENT = 'screenshot';
const PATH_KEY = 'path';
const LOG_PREFIX = '[snap-and-publish]';
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const RECORD_SCRIPT = path.resolve(SCRIPT_DIRECTORY, 'record.js');

interface Breakpoint {
  width: number;
  height: number;
}

export interface SnapAndPublishOptions {
  url: string;
  label: string;
  bin?: string;
  recordArgs?: string[];
}

interface RecordConfig {
  url: string;
  baseName: string;
  outputDir: string;
  breakpoints: Breakpoint[];
  locale: string;
  fullPage: boolean;
  passThrough: string[];
}

interface RecordResult {
  screenshots: string[];
}

export interface SnapAndPublishDependencies {
  record: (config: RecordConfig) => Promise<RecordResult>;
  upload: (filePaths: string[], existingBin?: string) => Promise<UploadSummary>;
}

const DEFAULT_DEPENDENCIES: SnapAndPublishDependencies = {
  record: runRecordProcess,
  upload: (filePaths, existingBin) => uploadToFilebin(filePaths, existingBin),
};

function logInfo(message: string): void {
  process.stderr.write(`${LOG_PREFIX} ${message}\n`);
}

function parseCli(argv: string[]): SnapAndPublishOptions {
  const normalized = argv.length > 0 && argv[0] === PASS_THROUGH_MARKER ? argv.slice(1) : argv;
  const markerIndex = normalized.indexOf(PASS_THROUGH_MARKER);
  const baseArgs = markerIndex >= 0 ? normalized.slice(0, markerIndex) : normalized;
  const recordArgs = markerIndex >= 0 ? normalized.slice(markerIndex + 1) : [];
  let url: string | undefined;
  let label: string | undefined;
  let bin: string | undefined;
  for (let index = 0; index < baseArgs.length; index += 1) {
    const token = baseArgs[index];
    if (token.startsWith(`${FLAG_PREFIX}url${FLAG_VALUE_SEPARATOR}`)) {
      url = token.slice(`${FLAG_PREFIX}url${FLAG_VALUE_SEPARATOR}`.length);
      continue;
    }
    if (token === `${FLAG_PREFIX}url`) {
      url = readNextValue(baseArgs, index);
      index += 1;
      continue;
    }
    if (token.startsWith(`${FLAG_PREFIX}label${FLAG_VALUE_SEPARATOR}`)) {
      label = token.slice(`${FLAG_PREFIX}label${FLAG_VALUE_SEPARATOR}`.length);
      continue;
    }
    if (token === `${FLAG_PREFIX}label`) {
      label = readNextValue(baseArgs, index);
      index += 1;
      continue;
    }
    if (token.startsWith(`${FLAG_PREFIX}bin${FLAG_VALUE_SEPARATOR}`)) {
      bin = token.slice(`${FLAG_PREFIX}bin${FLAG_VALUE_SEPARATOR}`.length);
      continue;
    }
    if (token === `${FLAG_PREFIX}bin`) {
      bin = readNextValue(baseArgs, index);
      index += 1;
    }
  }
  if (!url) {
    throw new Error('Missing required --url value');
  }
  if (!label) {
    throw new Error('Missing required --label value');
  }
  return { url, label, bin, recordArgs };
}

function readNextValue(args: string[], index: number): string {
  const next = args[index + 1];
  if (!next) {
    throw new Error('Expected value after flag');
  }
  return next;
}

function sanitizeLabel(label: string): string {
  const normalized = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const cleaned = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned : 'surface';
}

function createBaseName(label: string): string {
  const slug = sanitizeLabel(label);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${slug}-${timestamp}`;
}

function formatBreakpoint({ width, height }: Breakpoint): string {
  return `${width}${DIMENSION_SEPARATOR}${height}`;
}

function hasFlag(args: string[], name: string): boolean {
  const direct = `${FLAG_PREFIX}${name}`;
  return args.some((value) => value === direct || value.startsWith(`${direct}${FLAG_VALUE_SEPARATOR}`));
}

function ensureFlag(args: string[], name: string, value: string): void {
  if (hasFlag(args, name)) {
    return;
  }
  args.push(`${FLAG_PREFIX}${name}${FLAG_VALUE_SEPARATOR}${value}`);
}

function buildRecordArgs(config: RecordConfig): string[] {
  const args = [...config.passThrough];
  ensureFlag(args, 'url', config.url);
  ensureFlag(args, 'outDir', config.outputDir);
  ensureFlag(args, 'name', config.baseName);
  ensureFlag(args, 'locale', config.locale);
  const breakpointValue = config.breakpoints.map(formatBreakpoint).join(BREAKPOINT_SEPARATOR);
  ensureFlag(args, 'breakpoints', breakpointValue);
  ensureFlag(args, 'headless', 'true');
  ensureFlag(args, 'fullPage', config.fullPage ? 'true' : 'false');
  return args;
}

function processStdout(buffer: string, collector: string[]): string {
  let remaining = buffer;
  while (true) {
    const newlineIndex = remaining.indexOf('\n');
    if (newlineIndex < 0) {
      return remaining;
    }
    const line = remaining.slice(0, newlineIndex).trim();
    remaining = remaining.slice(newlineIndex + 1);
    if (!line) {
      continue;
    }
    try {
      const payload = JSON.parse(line) as { event?: string; details?: Record<string, unknown> };
      if (payload.event === SCREENSHOT_EVENT && payload.details && typeof payload.details[PATH_KEY] === 'string') {
        collector.push(String(payload.details[PATH_KEY]));
      }
    } catch {
      continue;
    }
  }
}

async function runRecordProcess(config: RecordConfig): Promise<RecordResult> {
  const recordArgs = buildRecordArgs(config);
  logInfo(`Starting record.js with ${recordArgs.join(' ')}`);
  return new Promise<RecordResult>((resolve, reject) => {
    const child = spawn(process.execPath, [RECORD_SCRIPT, ...recordArgs], { stdio: ['ignore', 'pipe', 'pipe'] });
    const screenshots: string[] = [];
    let stdoutBuffer = '';
    let stderrBuffer = '';
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer = processStdout(stdoutBuffer + chunk, screenshots);
    });
    child.stderr.setEncoding('utf-8');
    child.stderr.on('data', (chunk: string) => {
      stderrBuffer += chunk;
    });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('close', (code) => {
      if (stdoutBuffer.length > 0) {
        stdoutBuffer = processStdout(`${stdoutBuffer}\n`, screenshots);
      }
      if (code !== 0) {
        reject(new Error(stderrBuffer.trim().length > 0 ? stderrBuffer.trim() : 'Record script failed'));
        return;
      }
      if (screenshots.length === 0) {
        reject(new Error('Record script produced no screenshots'));
        return;
      }
      resolve({ screenshots });
    });
  });
}

function matchesDimension(filePath: string, width: number, height: number): boolean {
  const token = `_${width}_${height}_`;
  if (filePath.includes(token)) {
    return true;
  }
  const suffixToken = `_${width}_${height}.`;
  return filePath.includes(suffixToken);
}

function selectScreenshots(paths: string[]): { desktop: string; mobile: string } {
  const desktopCandidate = paths.find((entry) => matchesDimension(entry, DESKTOP_WIDTH, DESKTOP_HEIGHT));
  const mobileCandidate = paths.find((entry) => matchesDimension(entry, MOBILE_WIDTH, MOBILE_HEIGHT));
  if (desktopCandidate && mobileCandidate && desktopCandidate !== mobileCandidate) {
    return { desktop: desktopCandidate, mobile: mobileCandidate };
  }
  if (paths.length >= 2) {
    return { desktop: paths[0], mobile: paths[1] };
  }
  throw new Error('Unable to identify desktop and mobile screenshots from record output');
}

async function ensureFileExists(target: string): Promise<void> {
  await fs.access(target);
}

function buildMarkdown(label: string, summary: UploadSummary, desktopName: string, mobileName: string): string {
  const desktopEntry = summary.files.find((file) => file.name === desktopName);
  const mobileEntry = summary.files.find((file) => file.name === mobileName);
  if (!desktopEntry || !mobileEntry) {
    throw new Error('Missing uploaded screenshot entries');
  }
  return `${label} – AFTER\nafter (desktop): ${desktopEntry.url}\nafter (mobile): ${mobileEntry.url}`;
}

export async function snapAndPublish(
  options: SnapAndPublishOptions,
  dependencies: SnapAndPublishDependencies = DEFAULT_DEPENDENCIES,
): Promise<string> {
  const captureDir = path.resolve(process.cwd(), CAPTURE_DIRECTORY);
  await fs.mkdir(captureDir, { recursive: true });
  logInfo(`Capturing screenshots in ${captureDir}`);
  const baseName = createBaseName(options.label);
  const recordConfig: RecordConfig = {
    url: options.url,
    baseName,
    outputDir: captureDir,
    breakpoints: [
      { width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT },
      { width: MOBILE_WIDTH, height: MOBILE_HEIGHT },
    ],
    locale: DEFAULT_LOCALE,
    fullPage: DEFAULT_FULL_PAGE,
    passThrough: options.recordArgs ?? [],
  };
  const recordResult = await dependencies.record(recordConfig);
  const { desktop, mobile } = selectScreenshots(recordResult.screenshots);
  await ensureFileExists(desktop);
  await ensureFileExists(mobile);
  logInfo('Uploading screenshots to Filebin');
  const uploadSummary = await dependencies.upload([desktop, mobile], options.bin);
  const desktopName = path.basename(desktop);
  const mobileName = path.basename(mobile);
  return buildMarkdown(options.label, uploadSummary, desktopName, mobileName);
}

async function runCli(): Promise<void> {
  const options = parseCli(process.argv.slice(2));
  logInfo(`Processing ${options.label}`);
  const block = await snapAndPublish(options);
  process.stdout.write(`${block}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

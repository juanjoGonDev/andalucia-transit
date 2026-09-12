import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, appendFile, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPROVED_ICON } from '../pwa-contract';
import { optimizePwaIconForDelivery, pwaIconSha256 } from '../pwa-icon-output';

type JsonValue = string | number | boolean | { [key: string]: JsonValue } | JsonValue[] | null;

const buildCommand = 'npx';
const buildArguments: readonly string[] = ['ng', 'build', '--configuration', 'production'];
const serviceWorkerCommand = 'pnpm';
const distDirectoryName = 'dist';
const projectDirectoryName = 'andalucia-transit';
const browserDirectoryName = 'browser';
const indexFileName = 'index.html';
const fallbackFileName = '404.html';
const pwaIconFileName = 'favicon.svg';
const serviceWorkerConfigFileName = 'ngsw-config.json';
const serviceWorkerManifestFileName = 'ngsw.json';
const packageFileName = 'package.json';
const distPathEnvKey = 'DIST_PATH';
const ngAppVersionKey = 'NG_APP_VERSION';
const githubEnvKey = 'GITHUB_ENV';
const logPrefix = '[deploy]';
const readingPackageMessage = `${logPrefix} Reading package version`;
const exportingVersionMessage = `${logPrefix} Exporting application version`;
const runningBuildMessage = `${logPrefix} Running production build`;
const optimizingIconMessage = `${logPrefix} Optimizing PWA icon delivery bytes`;
const regeneratingServiceWorkerMessage = `${logPrefix} Regenerating service worker manifest`;
const creatingFallbackMessage = `${logPrefix} Creating single page fallback`;
const missingVersionMessage = 'Package version is required to prepare the deploy output';
const versionTypeErrorMessage = 'Package version must be a string to prepare the deploy output';
const buildFailureMessage = 'Deploy build command failed';
const serviceWorkerGenerationFailureMessage = 'Service worker manifest generation failed';
const missingIndexMessage = 'Cannot create fallback because index file is missing at';
const missingBaseHrefMessage = 'Built index does not contain a base href';
const invalidOptimizedIconMessage = 'Optimized PWA icon does not match the reviewed delivery contract';
const invalidServiceWorkerManifestMessage =
  'Generated service worker manifest does not contain exactly one hashed PWA icon';
const invalidServiceWorkerIconHashMessage =
  'Generated service worker manifest does not match the deployed PWA icon';
const writingEnvMessage = `${logPrefix} Writing environment file`;

const currentDirectory = path.dirname(fileURLToPath(new URL(import.meta.url)));
const rootDirectory = path.resolve(currentDirectory, '..', '..');
const packageJsonPath = path.join(rootDirectory, packageFileName);

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readPackageVersion(): Promise<string> {
  console.log(readingPackageMessage);
  const fileContent = await readFile(packageJsonPath, 'utf8');
  const parsedContent: JsonValue = JSON.parse(fileContent);
  if (!isRecord(parsedContent)) {
    throw new Error(missingVersionMessage);
  }
  const versionValue = parsedContent.version;
  if (versionValue === undefined) {
    throw new Error(missingVersionMessage);
  }
  if (typeof versionValue !== 'string') {
    throw new Error(versionTypeErrorMessage);
  }
  return versionValue;
}

async function exportApplicationVersion(version: string): Promise<void> {
  console.log(exportingVersionMessage);
  process.env[ngAppVersionKey] = version;
  const environmentFilePath = process.env[githubEnvKey];
  if (!environmentFilePath || environmentFilePath.trim().length === 0) {
    return;
  }
  console.log(writingEnvMessage);
  await appendFile(environmentFilePath, `${ngAppVersionKey}=${version}\n`);
}

function resolveDistPath(): string {
  const configuredPath = process.env[distPathEnvKey];
  if (configuredPath && configuredPath.trim().length > 0) {
    return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(rootDirectory, configuredPath);
  }
  return path.join(rootDirectory, distDirectoryName, projectDirectoryName, browserDirectoryName);
}

function createBuildEnvironment(version: string): NodeJS.ProcessEnv {
  return { ...process.env, [ngAppVersionKey]: version };
}

async function runCommand(
  command: string,
  args: readonly string[],
  failureMessage: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDirectory,
      stdio: 'inherit',
      env,
    });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${failureMessage}: ${code ?? 'unknown'}`));
    });
  });
}

async function runBuild(envWithVersion: NodeJS.ProcessEnv): Promise<void> {
  console.log(runningBuildMessage);
  await runCommand(buildCommand, buildArguments, buildFailureMessage, envWithVersion);
}

async function optimizePwaIcon(distPath: string): Promise<void> {
  console.log(optimizingIconMessage);
  const iconPath = path.join(distPath, pwaIconFileName);
  const source = await readFile(iconPath, 'utf8');
  const optimized = optimizePwaIconForDelivery(source);
  const deployedBytes = Buffer.byteLength(optimized, 'utf8');
  const deployedSha256 = pwaIconSha256(optimized);

  if (
    deployedBytes > APPROVED_ICON.deployedMaxBytes ||
    deployedSha256 !== APPROVED_ICON.deployedSha256
  ) {
    throw new Error(
      `${invalidOptimizedIconMessage}: ${deployedBytes} bytes / ${deployedSha256}`,
    );
  }

  await writeFile(iconPath, optimized, 'utf8');
  console.log(`${logPrefix} PWA icon: ${deployedBytes} bytes / ${deployedSha256}`);
}

async function readBuiltBaseHref(distPath: string): Promise<string> {
  const index = await readFile(path.join(distPath, indexFileName), 'utf8');
  const baseHref = index.match(/<base\s+href=["']([^"']+)["'][^>]*>/i)?.[1];
  if (!baseHref) {
    throw new Error(missingBaseHrefMessage);
  }
  return baseHref;
}

async function verifyServiceWorkerIconHash(distPath: string): Promise<void> {
  const manifestContent = await readFile(path.join(distPath, serviceWorkerManifestFileName), 'utf8');
  const parsedManifest: JsonValue = JSON.parse(manifestContent);
  if (!isRecord(parsedManifest) || !isRecord(parsedManifest.hashTable)) {
    throw new Error(invalidServiceWorkerManifestMessage);
  }

  const iconHashes = Object.entries(parsedManifest.hashTable).filter(
    ([url, hash]) => url.endsWith(`/${pwaIconFileName}`) && typeof hash === 'string',
  );
  if (iconHashes.length !== 1) {
    throw new Error(invalidServiceWorkerManifestMessage);
  }

  const iconBytes = await readFile(path.join(distPath, pwaIconFileName));
  const actualSha1 = createHash('sha1').update(iconBytes).digest('hex');
  const expectedSha1 = iconHashes[0][1];
  if (expectedSha1 !== actualSha1) {
    throw new Error(
      `${invalidServiceWorkerIconHashMessage}: expected ${expectedSha1}, got ${actualSha1}`,
    );
  }

  console.log(`${logPrefix} PWA service-worker SHA-1: ${actualSha1}`);
}

async function regenerateServiceWorkerManifest(distPath: string): Promise<void> {
  console.log(regeneratingServiceWorkerMessage);
  const baseHref = await readBuiltBaseHref(distPath);
  const relativeDistPath = path.relative(rootDirectory, distPath) || '.';
  await runCommand(
    serviceWorkerCommand,
    ['exec', 'ngsw-config', relativeDistPath, serviceWorkerConfigFileName, baseHref],
    serviceWorkerGenerationFailureMessage,
  );
  await verifyServiceWorkerIconHash(distPath);
}

async function ensureIndexExists(indexPath: string): Promise<void> {
  try {
    await access(indexPath, fsConstants.F_OK);
  } catch {
    throw new Error(`${missingIndexMessage} ${indexPath}`);
  }
}

async function createFallback(distPath: string): Promise<void> {
  console.log(creatingFallbackMessage);
  const indexPath = path.join(distPath, indexFileName);
  const fallbackPath = path.join(distPath, fallbackFileName);
  await ensureIndexExists(indexPath);
  await copyFile(indexPath, fallbackPath);
}

async function main(): Promise<void> {
  const version = await readPackageVersion();
  await exportApplicationVersion(version);
  const distPath = resolveDistPath();
  const envWithVersion = createBuildEnvironment(version);
  await runBuild(envWithVersion);
  await optimizePwaIcon(distPath);
  await regenerateServiceWorkerManifest(distPath);
  await createFallback(distPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, appendFile, copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonValue = string | number | boolean | { [key: string]: JsonValue } | JsonValue[] | null;

const buildCommand = 'npx';
const buildArguments: readonly string[] = ['ng', 'build', '--configuration', 'production'];
const distDirectoryName = 'dist';
const projectDirectoryName = 'andalucia-transit';
const browserDirectoryName = 'browser';
const indexFileName = 'index.html';
const fallbackFileName = '404.html';
const packageFileName = 'package.json';
const distPathEnvKey = 'DIST_PATH';
const ngAppVersionKey = 'NG_APP_VERSION';
const githubEnvKey = 'GITHUB_ENV';
const logPrefix = '[deploy]';
const readingPackageMessage = `${logPrefix} Reading package version`;
const exportingVersionMessage = `${logPrefix} Exporting application version`;
const runningBuildMessage = `${logPrefix} Running production build`;
const creatingFallbackMessage = `${logPrefix} Creating single page fallback`;
const missingVersionMessage = 'Package version is required to prepare the deploy output';
const versionTypeErrorMessage = 'Package version must be a string to prepare the deploy output';
const buildFailureMessage = 'Deploy build command failed';
const missingIndexMessage = 'Cannot create fallback because index file is missing at';
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

async function runBuild(envWithVersion: NodeJS.ProcessEnv): Promise<void> {
  console.log(runningBuildMessage);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(buildCommand, buildArguments, {
      cwd: rootDirectory,
      stdio: 'inherit',
      env: envWithVersion,
    });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${buildFailureMessage}: ${code ?? 'unknown'}`));
    });
  });
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
  await createFallback(distPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

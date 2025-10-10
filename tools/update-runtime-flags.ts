import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const RUNTIME_FLAGS_PROPERTY = '__ANDALUCIA_TRANSIT_FLAGS__' as const;
const VERSION_GLOBAL_PROPERTY = 'NG_APP_VERSION' as const;
const RUNTIME_FLAGS_PATH = resolve('src/assets/runtime-flags.js');
const PACKAGE_JSON_PATH = resolve('package.json');
const FORCE_SNAPSHOT_ARGUMENT = '--forceSnapshot=' as const;

interface RuntimeFlagsOptions {
  readonly forceSnapshot: boolean;
}

interface PackageMetadata {
  readonly version: string;
}

const DEFAULT_FLAGS: RuntimeFlagsOptions = Object.freeze({ forceSnapshot: false });

const parseArguments = (argv: readonly string[]): RuntimeFlagsOptions => {
  const argument = argv.find((value) => value.startsWith(FORCE_SNAPSHOT_ARGUMENT));

  if (!argument) {
    return DEFAULT_FLAGS;
  }

  const value = argument.slice(FORCE_SNAPSHOT_ARGUMENT.length);
  const normalized = value.toLowerCase();

  return { forceSnapshot: normalized === 'true' };
};

const readPackageMetadata = async (): Promise<PackageMetadata> => {
  const packageContent = await readFile(PACKAGE_JSON_PATH, { encoding: 'utf-8' });
  const metadata = JSON.parse(packageContent) as PackageMetadata;

  return metadata;
};

const resolveVersion = async (): Promise<string> => {
  const environmentVersion = process.env[VERSION_GLOBAL_PROPERTY];

  if (environmentVersion) {
    return environmentVersion;
  }

  const metadata = await readPackageMetadata();

  return metadata.version;
};

const buildRuntimeFlagsContent = (version: string, options: RuntimeFlagsOptions): string => {
  const versionLiteral = JSON.stringify(version);
  const runtimeFlagsLine = `window.${RUNTIME_FLAGS_PROPERTY} = Object.freeze({ forceSnapshot: ${options.forceSnapshot} });`;
  const versionLine = `window.${VERSION_GLOBAL_PROPERTY} = ${versionLiteral};`;

  return `${runtimeFlagsLine}\n${versionLine}\n`;
};

const writeRuntimeFlags = async (content: string): Promise<void> => {
  await writeFile(RUNTIME_FLAGS_PATH, content, { encoding: 'utf-8' });
};

const main = async (): Promise<void> => {
  const options = parseArguments(process.argv.slice(2));
  const version = await resolveVersion();
  const content = buildRuntimeFlagsContent(version, options);
  await writeRuntimeFlags(content);
};

void main();

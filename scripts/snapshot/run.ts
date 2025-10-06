import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

import { SNAPSHOT_JOB_CONFIG } from './config';
import { buildSnapshotFile } from './snapshot-generator';
import { buildStopDirectory } from './stop-directory';

const JSON_SPACING = 2;
const NEW_LINE = '\n';
const SUCCESS_MESSAGE = 'Snapshot generation completed successfully.' as const;
const FAILURE_MESSAGE = 'Snapshot generation failed.' as const;
const CURL_BINARY = 'curl' as const;
const CURL_FLAGS = ['-sfL'] as const;

const execFileAsync = promisify(execFile);

void execute();

async function execute(): Promise<void> {
  try {
    const fetchJson = createJsonFetcher();
    const now = () => new Date();

    const snapshot = await buildSnapshotFile(SNAPSHOT_JOB_CONFIG.snapshotConfig, {
      now,
      fetchJson
    });

    await persistJson(SNAPSHOT_JOB_CONFIG.stopServicesOutput, snapshot);

    const directory = await buildStopDirectory(SNAPSHOT_JOB_CONFIG.directoryConfig, {
      fetchJson,
      now
    });

    await persistJson(SNAPSHOT_JOB_CONFIG.stopDirectoryOutput, directory);

    console.info(SUCCESS_MESSAGE);
  } catch (error) {
    console.error(FAILURE_MESSAGE, formatError(error));
    process.exitCode = 1;
  }
}

function createJsonFetcher() {
  return async <T>(url: string): Promise<T> => {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request to ${url} failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      const curlResult = await execFileAsync(CURL_BINARY, [...CURL_FLAGS, url]);
      return JSON.parse(curlResult.stdout) as T;
    }
  };
}

async function persistJson(path: string, data: unknown): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const serialized = JSON.stringify(data, null, JSON_SPACING) + NEW_LINE;
  await writeFile(path, serialized, { encoding: 'utf-8' });
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

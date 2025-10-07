import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { buildCatalog } from './catalog-generator';
import { loadConsortiumSummaries } from './consortiums';
import { SNAPSHOT_JOB_CONFIG } from './config';
import { buildSnapshotFile, SnapshotConfig, SnapshotTarget } from './snapshot-generator';
import { buildStopDirectory, StopDirectorySearchIndexEntry } from './stop-directory';

const JSON_SPACING = 2;
const NEW_LINE = '\n';
const SUCCESS_MESSAGE = 'Snapshot generation completed successfully.' as const;
const FAILURE_MESSAGE = 'Snapshot generation failed.' as const;
const CURL_BINARY = 'curl' as const;
const CURL_FLAGS = ['-sfL', '--max-time', '45'] as const;
const INDEX_FILENAME = 'index.json' as const;
const MUNICIPALITIES_FILENAME = 'municipalities.json' as const;
const NUCLEI_FILENAME = 'nuclei.json' as const;
const LINES_FILENAME = 'lines.json' as const;

const execFileAsync = promisify(execFile);

void execute();

async function execute(): Promise<void> {
  try {
    const fetchJson = createJsonFetcher();
    const now = () => new Date();

    const consortiums = await loadConsortiumSummaries(SNAPSHOT_JOB_CONFIG.baseUrl, {
      fetchJson
    });

    const directoryResult = await buildStopDirectory(
      { ...SNAPSHOT_JOB_CONFIG.directoryConfig, consortiums },
      {
        fetchJson,
        now
      }
    );

    await persistStopDirectory(directoryResult);

    const catalogResult = await buildCatalog(
      { ...SNAPSHOT_JOB_CONFIG.catalogConfig, consortiums },
      { fetchJson, now }
    );

    await persistCatalog(catalogResult);

    const snapshotTargets = buildSnapshotTargets(
      directoryResult.searchIndex,
      SNAPSHOT_JOB_CONFIG.snapshotLimits.stopsPerConsortium
    );

    const snapshotConfig: SnapshotConfig = {
      ...SNAPSHOT_JOB_CONFIG.snapshotConfig,
      targets: snapshotTargets
    } satisfies SnapshotConfig;

    const snapshot = await buildSnapshotFile(snapshotConfig, {
      now,
      fetchJson
    });

    await persistJson(SNAPSHOT_JOB_CONFIG.stopServicesOutput, snapshot);

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

async function persistStopDirectory(directory: StopDirectoryBuildResult): Promise<void> {
  const indexPath = SNAPSHOT_JOB_CONFIG.stopDirectory.indexOutput;
  const chunkDirectory = SNAPSHOT_JOB_CONFIG.stopDirectory.chunkDirectory;
  const chunkPath = SNAPSHOT_JOB_CONFIG.stopDirectory.chunkPath;

  const indexChunks = directory.chunks.map((chunk) => ({
    id: chunk.id,
    consortiumId: chunk.consortiumId,
    path: `${chunkPath}/${chunk.id}.json`,
    stopCount: chunk.file.metadata.stopCount
  }));

  const indexFile = {
    metadata: directory.metadata,
    chunks: indexChunks,
    searchIndex: directory.searchIndex
  };

  await persistJson(indexPath, indexFile);

  for (const chunk of directory.chunks) {
    const targetPath = join(chunkDirectory, `${chunk.id}.json`);
    await persistJson(targetPath, chunk.file);
  }
}

async function persistCatalog(catalog: Awaited<ReturnType<typeof buildCatalog>>): Promise<void> {
  const baseDirectory = SNAPSHOT_JOB_CONFIG.catalogDirectory;
  const indexFilePath = join(baseDirectory, INDEX_FILENAME);
  const generatedAt = catalog.metadata.generatedAt;
  const timezone = catalog.metadata.timezone;
  const providerName = catalog.metadata.providerName;
  const consortia = catalog.consortia.map((entry) => ({
    id: entry.summary.id,
    name: entry.summary.name,
    shortName: entry.summary.shortName,
    datasets: {
      municipalities: catalogPath(entry.summary.id, MUNICIPALITIES_FILENAME),
      nuclei: catalogPath(entry.summary.id, NUCLEI_FILENAME),
      lines: catalogPath(entry.summary.id, LINES_FILENAME)
    }
  }));

  await persistJson(indexFilePath, {
    metadata: catalog.metadata,
    consortia
  });

  for (const entry of catalog.consortia) {
    const consortiumDirectory = join(baseDirectory, `consortium-${entry.summary.id}`);

    await persistJson(join(consortiumDirectory, MUNICIPALITIES_FILENAME), {
      metadata: buildCatalogMetadata(
        generatedAt,
        timezone,
        providerName,
        entry.summary.id,
        entry.summary.name,
        entry.municipalities.length
      ),
      municipalities: entry.municipalities
    });

    await persistJson(join(consortiumDirectory, NUCLEI_FILENAME), {
      metadata: buildCatalogMetadata(
        generatedAt,
        timezone,
        providerName,
        entry.summary.id,
        entry.summary.name,
        entry.nuclei.length
      ),
      nuclei: entry.nuclei
    });

    await persistJson(join(consortiumDirectory, LINES_FILENAME), {
      metadata: buildCatalogMetadata(
        generatedAt,
        timezone,
        providerName,
        entry.summary.id,
        entry.summary.name,
        entry.lines.length
      ),
      lines: entry.lines
    });
  }
}

function buildCatalogMetadata(
  generatedAt: string,
  timezone: string,
  providerName: string,
  consortiumId: number,
  consortiumName: string,
  count: number
) {
  return {
    generatedAt,
    timezone,
    providerName,
    consortiumId,
    consortiumName,
    itemCount: count
  };
}

function catalogPath(consortiumId: number, filename: string): string {
  return `consortium-${consortiumId}/${filename}`;
}

function buildSnapshotTargets(
  searchIndex: readonly StopDirectorySearchIndexEntry[],
  limitPerConsortium: number
): readonly SnapshotTarget[] {
  const targets = new Map<number, StopDirectorySearchIndexEntry[]>();

  for (const entry of searchIndex) {
    const group = targets.get(entry.consortiumId) ?? [];

    if (group.length < limitPerConsortium) {
      group.push(entry);
      targets.set(entry.consortiumId, group);
    }
  }

  return Array.from(targets.values())
    .flat()
    .map((entry) => ({
      consortiumId: entry.consortiumId,
      stopId: entry.stopId
    } satisfies SnapshotTarget))
    .sort((first, second) => {
      if (first.consortiumId !== second.consortiumId) {
        return first.consortiumId - second.consortiumId;
      }

      return first.stopId.localeCompare(second.stopId);
    });
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

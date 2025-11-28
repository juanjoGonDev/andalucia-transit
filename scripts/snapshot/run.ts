import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { buildCatalog } from './catalog-generator';
import { SNAPSHOT_JOB_CONFIG } from './config';
import { loadConsortiumSummaries } from './consortiums';
import { SnapshotConfig, SnapshotTarget, buildSnapshotFile } from './snapshot-generator';
import {
  StopDirectoryBuildResult,
  StopDirectorySearchIndexEntry,
  buildStopDirectory
} from './stop-directory';

const JSON_SPACING = 2;
const NEW_LINE = '\n';
const SUCCESS_MESSAGE = 'Snapshot generation completed successfully.' as const;
const FAILURE_MESSAGE = 'Snapshot generation failed.' as const;
const PROGRESS_START_MESSAGE = 'Starting snapshot generation workflow.' as const;
const CONSORTIUM_PROGRESS_LABEL = 'Loading consortium summaries' as const;
const DIRECTORY_PROGRESS_LABEL = 'Building stop directory' as const;
const DIRECTORY_PERSIST_PROGRESS_LABEL = 'Persisting stop directory files' as const;
const CATALOG_PROGRESS_LABEL = 'Building catalog datasets' as const;
const CATALOG_PERSIST_PROGRESS_LABEL = 'Persisting catalog datasets' as const;
const SNAPSHOT_TARGET_PROGRESS_LABEL = 'Selecting snapshot targets' as const;
const SNAPSHOT_PROGRESS_LABEL = 'Generating stop service snapshot' as const;
const SNAPSHOT_PERSIST_PROGRESS_LABEL = 'Persisting snapshot output' as const;
const CURL_BINARY = 'curl' as const;
const CURL_FLAGS = ['-sfL', '--max-time', '45'] as const;
const INDEX_FILENAME = 'index.json' as const;
const MUNICIPALITIES_FILENAME = 'municipalities.json' as const;
const NUCLEI_FILENAME = 'nuclei.json' as const;
const LINES_FILENAME = 'lines.json' as const;

type ProgressStageId =
  | 'loadConsortiums'
  | 'buildStopDirectory'
  | 'persistStopDirectory'
  | 'buildCatalog'
  | 'persistCatalog'
  | 'buildTargets'
  | 'buildSnapshot'
  | 'persistSnapshot';

interface ProgressStage {
  readonly id: ProgressStageId;
  readonly label: string;
}

const PROGRESS_STAGES: readonly ProgressStage[] = [
  { id: 'loadConsortiums', label: CONSORTIUM_PROGRESS_LABEL },
  { id: 'buildStopDirectory', label: DIRECTORY_PROGRESS_LABEL },
  { id: 'persistStopDirectory', label: DIRECTORY_PERSIST_PROGRESS_LABEL },
  { id: 'buildCatalog', label: CATALOG_PROGRESS_LABEL },
  { id: 'persistCatalog', label: CATALOG_PERSIST_PROGRESS_LABEL },
  { id: 'buildTargets', label: SNAPSHOT_TARGET_PROGRESS_LABEL },
  { id: 'buildSnapshot', label: SNAPSHOT_PROGRESS_LABEL },
  { id: 'persistSnapshot', label: SNAPSHOT_PERSIST_PROGRESS_LABEL }
] as const;

type ProgressReporter = (stageId: ProgressStageId) => void;

const execFileAsync = promisify(execFile);

void execute();

async function execute(): Promise<void> {
  try {
    const fetchJson = createJsonFetcher();
    const now = () => new Date();
    const reportProgress = createProgressReporter(PROGRESS_STAGES);

    reportProgress('loadConsortiums');
    const consortiums = await loadConsortiumSummaries(SNAPSHOT_JOB_CONFIG.baseUrl, {
      fetchJson
    });
    console.info(`Loaded ${consortiums.length} consortium summaries.`);

    reportProgress('buildStopDirectory');
    const directoryResult = await buildStopDirectory(
      { ...SNAPSHOT_JOB_CONFIG.directoryConfig, consortiums },
      {
        fetchJson,
        now
      }
    );
    console.info(
      `Stop directory includes ${directoryResult.metadata.totalStops} stops across ${directoryResult.metadata.consortiums.length} consortia.`
    );

    reportProgress('persistStopDirectory');
    await persistStopDirectory(directoryResult);
    console.info(
      `Persisted ${directoryResult.chunks.length} stop directory chunk files to ${SNAPSHOT_JOB_CONFIG.stopDirectory.chunkDirectory}.`
    );

    reportProgress('buildCatalog');
    const catalogResult = await buildCatalog(
      { ...SNAPSHOT_JOB_CONFIG.catalogConfig, consortiums },
      { fetchJson, now }
    );
    console.info(
      `Catalog builder prepared datasets for ${catalogResult.consortia.length} consortia.`
    );

    reportProgress('persistCatalog');
    await persistCatalog(catalogResult);
    console.info(
      `Catalog datasets persisted under ${SNAPSHOT_JOB_CONFIG.catalogDirectory}.`
    );

    reportProgress('buildTargets');
    const snapshotTargets = buildSnapshotTargets(
      directoryResult.searchIndex,
      SNAPSHOT_JOB_CONFIG.snapshotLimits.stopsPerConsortium
    );
    console.info(`Selected ${snapshotTargets.length} snapshot targets.`);

    const snapshotConfig: SnapshotConfig = {
      ...SNAPSHOT_JOB_CONFIG.snapshotConfig,
      targets: snapshotTargets
    } satisfies SnapshotConfig;

    reportProgress('buildSnapshot');
    const snapshot = await buildSnapshotFile(snapshotConfig, {
      now,
      fetchJson
    });
    console.info(`Snapshot contains ${snapshot.stops.length} stops.`);

    reportProgress('persistSnapshot');
    await persistJson(SNAPSHOT_JOB_CONFIG.stopServicesOutput, snapshot);
    console.info(`Snapshot file written to ${SNAPSHOT_JOB_CONFIG.stopServicesOutput}.`);

    console.info(SUCCESS_MESSAGE);
  } catch (error) {
    console.error(FAILURE_MESSAGE, formatError(error));
    process.exitCode = 1;
  }
}

function createProgressReporter(stages: readonly ProgressStage[]): ProgressReporter {
  let index = 0;
  const total = stages.length;
  console.info(PROGRESS_START_MESSAGE);
  return (stageId) => {
    const stage = stages[index];
    if (!stage || stage.id !== stageId) {
      throw new Error(`Unexpected progress stage: ${stageId}`);
    }
    const position = index + 1;
    const percentage = Math.round((position / total) * 100);
    console.info(`${percentage}% | Step ${position}/${total} | ${stage.label}`);
    index += 1;
  };
}

function createJsonFetcher() {
  return async <T>(url: string): Promise<T> => {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request to ${url} failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch {
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

  const chunkWrites = directory.chunks.map((chunk) => {
    const targetPath = join(chunkDirectory, `${chunk.id}.json`);
    return persistJson(targetPath, chunk.file);
  });

  await Promise.all(chunkWrites);
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

  await Promise.all(
    catalog.consortia.map(async (entry) => {
      const consortiumDirectory = join(baseDirectory, `consortium-${entry.summary.id}`);
      const datasets: Promise<void>[] = [
        persistJson(join(consortiumDirectory, MUNICIPALITIES_FILENAME), {
          metadata: buildCatalogMetadata(
            generatedAt,
            timezone,
            providerName,
            entry.summary.id,
            entry.summary.name,
            entry.municipalities.length
          ),
          municipalities: entry.municipalities
        }),
        persistJson(join(consortiumDirectory, NUCLEI_FILENAME), {
          metadata: buildCatalogMetadata(
            generatedAt,
            timezone,
            providerName,
            entry.summary.id,
            entry.summary.name,
            entry.nuclei.length
          ),
          nuclei: entry.nuclei
        }),
        persistJson(join(consortiumDirectory, LINES_FILENAME), {
          metadata: buildCatalogMetadata(
            generatedAt,
            timezone,
            providerName,
            entry.summary.id,
            entry.summary.name,
            entry.lines.length
          ),
          lines: entry.lines
        })
      ];

      await Promise.all(datasets);
    })
  );
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

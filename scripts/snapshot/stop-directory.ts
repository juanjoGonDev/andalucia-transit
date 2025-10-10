export interface StopDirectoryConsortiumConfig {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
}

export interface StopDirectoryConfig {
  readonly baseUrl: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly consortiums: readonly StopDirectoryConsortiumConfig[];
}

export interface StopDirectoryDependencies {
  readonly fetchJson: <T>(url: string) => Promise<T>;
  readonly now?: () => Date;
}

export interface StopDirectoryMetadata {
  readonly generatedAt: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly consortiums: readonly StopDirectoryConsortiumConfig[];
  readonly totalStops: number;
}

export interface StopDirectorySearchIndexEntry {
  readonly stopId: string;
  readonly stopCode: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly consortiumId: number;
  readonly chunkId: string;
}

export interface StopDirectoryChunkMetadata {
  readonly generatedAt: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly consortiumId: number;
  readonly consortiumName: string;
  readonly stopCount: number;
}

export interface StopDirectoryEntry {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopCode: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly zone: string | null;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

export interface StopDirectoryChunkFile {
  readonly metadata: StopDirectoryChunkMetadata;
  readonly stops: readonly StopDirectoryEntry[];
}

export interface StopDirectoryChunkOutput {
  readonly id: string;
  readonly consortiumId: number;
  readonly file: StopDirectoryChunkFile;
}

export interface StopDirectoryBuildResult {
  readonly metadata: StopDirectoryMetadata;
  readonly searchIndex: readonly StopDirectorySearchIndexEntry[];
  readonly chunks: readonly StopDirectoryChunkOutput[];
}

interface ApiParadaEntry {
  readonly idParada: string;
  readonly idMunicipio: string;
  readonly idNucleo: string;
  readonly idZona?: string;
  readonly nombre: string;
  readonly latitud: string;
  readonly longitud: string;
  readonly municipio: string;
  readonly nucleo: string;
}

interface ApiParadasResponse {
  readonly paradas: readonly ApiParadaEntry[];
}

const CHUNK_ID_PREFIX = 'consortium-' as const;

export async function buildStopDirectory(
  config: StopDirectoryConfig,
  dependencies: StopDirectoryDependencies
): Promise<StopDirectoryBuildResult> {
  const generationInstant = dependencies.now?.() ?? new Date();
  const chunks: StopDirectoryChunkOutput[] = [];
  const searchIndex: StopDirectorySearchIndexEntry[] = [];

  for (const consortium of config.consortiums) {
    const entries = await loadConsortiumStops(config, dependencies, consortium);
    const mappedStops = entries
      .map((entry) => mapStop(consortium.id, entry))
      .filter((stop): stop is StopDirectoryEntry => stop !== null);
    const sortedStops = mappedStops.sort((first, second) =>
      first.name.localeCompare(second.name, 'es-ES')
    );
    const chunkId = buildChunkId(consortium.id);

    searchIndex.push(
      ...sortedStops.map((stop) =>
        toSearchIndex(stop, chunkId)
      )
    );

    const file: StopDirectoryChunkFile = {
      metadata: {
        generatedAt: generationInstant.toISOString(),
        timezone: config.timezone,
        providerName: config.providerName,
        consortiumId: consortium.id,
        consortiumName: consortium.name,
        stopCount: sortedStops.length
      },
      stops: Object.freeze(sortedStops)
    } satisfies StopDirectoryChunkFile;

    chunks.push({
      id: chunkId,
      consortiumId: consortium.id,
      file
    });
  }

  const orderedSearchIndex = searchIndex.sort((first, second) =>
    first.name.localeCompare(second.name, 'es-ES')
  );

  return {
    metadata: {
      generatedAt: generationInstant.toISOString(),
      timezone: config.timezone,
      providerName: config.providerName,
      consortiums: config.consortiums,
      totalStops: orderedSearchIndex.length
    },
    searchIndex: Object.freeze(orderedSearchIndex),
    chunks: Object.freeze(chunks)
  } satisfies StopDirectoryBuildResult;
}

async function loadConsortiumStops(
  config: StopDirectoryConfig,
  dependencies: StopDirectoryDependencies,
  consortium: StopDirectoryConsortiumConfig
): Promise<readonly ApiParadaEntry[]> {
  const url = `${config.baseUrl}/Consorcios/${consortium.id}/paradas`;

  try {
    const response = await dependencies.fetchJson<ApiParadasResponse>(url);
    return response.paradas ?? [];
  } catch (error) {
    throw new Error(`Unable to fetch stops for consortium ${consortium.id}: ${formatError(error)}`);
  }
}

function mapStop(consortiumId: number, entry: ApiParadaEntry): StopDirectoryEntry | null {
  const latitude = parseCoordinate(entry.latitud, entry.idParada, 'latitude');
  const longitude = parseCoordinate(entry.longitud, entry.idParada, 'longitude');

  if (latitude === null || longitude === null) {
    console.warn(`Skipping stop ${entry.idParada} due to invalid coordinates.`);
    return null;
  }

  return {
    consortiumId,
    stopId: entry.idParada,
    stopCode: entry.idParada,
    name: entry.nombre,
    municipality: entry.municipio,
    municipalityId: entry.idMunicipio,
    nucleus: entry.nucleo,
    nucleusId: entry.idNucleo,
    zone: entry.idZona ?? null,
    location: {
      latitude,
      longitude
    }
  } satisfies StopDirectoryEntry;
}

function toSearchIndex(
  stop: StopDirectoryEntry,
  chunkId: string
): StopDirectorySearchIndexEntry {
  return {
    stopId: stop.stopId,
    stopCode: stop.stopCode,
    name: stop.name,
    municipality: stop.municipality,
    municipalityId: stop.municipalityId,
    nucleus: stop.nucleus,
    nucleusId: stop.nucleusId,
    consortiumId: stop.consortiumId,
    chunkId
  } satisfies StopDirectorySearchIndexEntry;
}

function buildChunkId(consortiumId: number): string {
  return `${CHUNK_ID_PREFIX}${consortiumId}`;
}

function parseCoordinate(value: string, stopId: string, field: 'latitude' | 'longitude'): number | null {
  const parsed = Number.parseFloat(value);

  if (Number.isNaN(parsed)) {
    console.warn(`Invalid ${field} value for stop ${stopId}: ${value}`);
    return null;
  }

  return parsed;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

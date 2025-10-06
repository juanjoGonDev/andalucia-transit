export interface StopDirectoryConsortiumConfig {
  readonly id: number;
  readonly name: string;
}

export interface StopDirectoryConfig {
  readonly baseUrl: string;
  readonly timezone: string;
  readonly consortiums: readonly StopDirectoryConsortiumConfig[];
}

export interface StopDirectoryDependencies {
  readonly fetchJson: <T>(url: string) => Promise<T>;
  readonly now?: () => Date;
}

export interface StopDirectoryMetadata {
  readonly generatedAt: string;
  readonly timezone: string;
  readonly consortiums: readonly StopDirectoryConsortiumConfig[];
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

export interface StopDirectoryFile {
  readonly metadata: StopDirectoryMetadata;
  readonly stops: readonly StopDirectoryEntry[];
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

export async function buildStopDirectory(
  config: StopDirectoryConfig,
  dependencies: StopDirectoryDependencies
): Promise<StopDirectoryFile> {
  const now = dependencies.now?.() ?? new Date();
  const stops: StopDirectoryEntry[] = [];

  for (const consortium of config.consortiums) {
    const apiStops = await loadConsortiumStops(config, dependencies, consortium);
    const mapped = apiStops.map((entry) => mapStop(consortium.id, entry));
    stops.push(...mapped);
  }

  const sortedStops = stops.sort((first, second) => first.stopId.localeCompare(second.stopId));

  return {
    metadata: {
      generatedAt: now.toISOString(),
      timezone: config.timezone,
      consortiums: config.consortiums
    },
    stops: Object.freeze(sortedStops)
  } satisfies StopDirectoryFile;
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

function mapStop(consortiumId: number, entry: ApiParadaEntry): StopDirectoryEntry {
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
      latitude: parseCoordinate(entry.latitud, entry.idParada, 'latitude'),
      longitude: parseCoordinate(entry.longitud, entry.idParada, 'longitude')
    }
  } satisfies StopDirectoryEntry;
}

function parseCoordinate(value: string, stopId: string, field: 'latitude' | 'longitude'): number {
  const parsed = Number.parseFloat(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${field} value for stop ${stopId}: ${value}`);
  }

  return parsed;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

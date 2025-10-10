import { CatalogConfig } from './catalog-generator';
import { SnapshotConfig, SnapshotTarget } from './snapshot-generator';
import { StopDirectoryConfig } from './stop-directory';

const BASE_URL = 'https://api.ctan.es/v1' as const;
const TIMEZONE = 'Europe/Madrid' as const;
const PROVIDER_NAME =
  'Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía' as const;
const STOP_SERVICES_DATASET = 'stop-services' as const;
const STOP_SERVICES_OUTPUT = 'src/assets/data/snapshots/stop-services/latest.json' as const;
const STOP_DIRECTORY_INDEX_OUTPUT = 'src/assets/data/stop-directory/index.json' as const;
const STOP_DIRECTORY_CHUNK_DIRECTORY = 'src/assets/data/stop-directory/chunks' as const;
const STOP_DIRECTORY_CHUNK_PATH = 'chunks' as const;
const CATALOG_BASE_DIRECTORY = 'src/assets/data/catalog' as const;
const SNAPSHOT_STOPS_PER_CONSORTIUM = 5;

const INITIAL_SNAPSHOT_TARGETS: readonly SnapshotTarget[] = [];

export interface SnapshotJobConfig {
  readonly baseUrl: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly stopServicesDataset: string;
  readonly stopServicesOutput: string;
  readonly stopDirectory: {
    readonly indexOutput: string;
    readonly chunkDirectory: string;
    readonly chunkPath: string;
  };
  readonly catalogDirectory: string;
  readonly snapshotConfig: SnapshotConfig;
  readonly directoryConfig: StopDirectoryConfig;
  readonly catalogConfig: CatalogConfig;
  readonly snapshotLimits: {
    readonly stopsPerConsortium: number;
  };
}

export const SNAPSHOT_JOB_CONFIG: SnapshotJobConfig = {
  baseUrl: BASE_URL,
  timezone: TIMEZONE,
  providerName: PROVIDER_NAME,
  stopServicesDataset: STOP_SERVICES_DATASET,
  stopServicesOutput: STOP_SERVICES_OUTPUT,
  stopDirectory: {
    indexOutput: STOP_DIRECTORY_INDEX_OUTPUT,
    chunkDirectory: STOP_DIRECTORY_CHUNK_DIRECTORY,
    chunkPath: STOP_DIRECTORY_CHUNK_PATH
  },
  catalogDirectory: CATALOG_BASE_DIRECTORY,
  snapshotConfig: {
    baseUrl: BASE_URL,
    timezone: TIMEZONE,
    providerName: PROVIDER_NAME,
    datasetName: STOP_SERVICES_DATASET,
    targets: INITIAL_SNAPSHOT_TARGETS,
    queryTime: {
      hour: 12,
      minute: 0
    }
  },
  directoryConfig: {
    baseUrl: BASE_URL,
    timezone: TIMEZONE,
    providerName: PROVIDER_NAME,
    consortiums: []
  },
  catalogConfig: {
    baseUrl: BASE_URL,
    timezone: TIMEZONE,
    providerName: PROVIDER_NAME,
    consortiums: []
  },
  snapshotLimits: {
    stopsPerConsortium: SNAPSHOT_STOPS_PER_CONSORTIUM
  }
} as const;

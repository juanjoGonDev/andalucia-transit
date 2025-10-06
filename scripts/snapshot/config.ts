import { SnapshotConfig, SnapshotTarget } from './snapshot-generator';
import { StopDirectoryConfig } from './stop-directory';

const BASE_URL = 'https://api.ctan.es/v1' as const;
const TIMEZONE = 'Europe/Madrid' as const;
const PROVIDER_NAME =
  'Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía' as const;
const DATASET_NAME = 'stop-services' as const;
const STOP_SERVICES_OUTPUT = 'src/assets/data/snapshots/stop-services/latest.json' as const;
const STOP_DIRECTORY_OUTPUT = 'src/assets/data/stop-directory.json' as const;

const SNAPSHOT_TARGETS: readonly SnapshotTarget[] = [
  { consortiumId: 7, stopId: '119' },
  { consortiumId: 7, stopId: '96' },
  { consortiumId: 7, stopId: '58' },
  { consortiumId: 7, stopId: '54' },
  { consortiumId: 7, stopId: '55' },
  { consortiumId: 7, stopId: '51' },
  { consortiumId: 7, stopId: '87' },
  { consortiumId: 7, stopId: '42' },
  { consortiumId: 7, stopId: '49' },
  { consortiumId: 7, stopId: '32' }
] as const;

export interface SnapshotJobConfig {
  readonly baseUrl: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly datasetName: string;
  readonly stopServicesOutput: string;
  readonly stopDirectoryOutput: string;
  readonly snapshotConfig: SnapshotConfig;
  readonly directoryConfig: StopDirectoryConfig;
}

export const SNAPSHOT_JOB_CONFIG: SnapshotJobConfig = {
  baseUrl: BASE_URL,
  timezone: TIMEZONE,
  providerName: PROVIDER_NAME,
  datasetName: DATASET_NAME,
  stopServicesOutput: STOP_SERVICES_OUTPUT,
  stopDirectoryOutput: STOP_DIRECTORY_OUTPUT,
  snapshotConfig: {
    baseUrl: BASE_URL,
    timezone: TIMEZONE,
    providerName: PROVIDER_NAME,
    datasetName: DATASET_NAME,
    targets: SNAPSHOT_TARGETS,
    queryTime: {
      hour: 12,
      minute: 0
    }
  },
  directoryConfig: {
    baseUrl: BASE_URL,
    timezone: TIMEZONE,
    consortiums: [
      {
        id: 7,
        name: 'Consorcio de Transporte Metropolitano del Área de Jaén'
      }
    ]
  }
} as const;

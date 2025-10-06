import { DateTime } from 'luxon';

export interface SnapshotTarget {
  readonly consortiumId: number;
  readonly stopId: string;
}

export interface SnapshotConfig {
  readonly baseUrl: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly datasetName: string;
  readonly targets: readonly SnapshotTarget[];
  readonly queryTime?: SnapshotQueryTime;
}

export interface SnapshotQueryTime {
  readonly hour: number;
  readonly minute: number;
}

export interface SnapshotDependencies {
  readonly now: () => Date;
  readonly fetchJson: <T>(url: string) => Promise<T>;
}

export interface SnapshotFileMetadata {
  readonly generatedAt: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly datasetName: string;
}

export interface StopServiceSnapshot {
  readonly lineId: string;
  readonly lineCode: string;
  readonly lineName: string;
  readonly destination: string;
  readonly scheduledTime: string;
  readonly direction: number;
  readonly stopType: number;
}

export interface StopSnapshotQuery {
  readonly requestedAt: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface StopSnapshot {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopCode: string;
  readonly stopName: string;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly municipality: string;
  readonly nucleus: string;
  readonly services: readonly StopServiceSnapshot[];
  readonly query: StopSnapshotQuery;
}

export interface SnapshotFile {
  readonly metadata: SnapshotFileMetadata;
  readonly stops: readonly StopSnapshot[];
}

interface ApiStopResponse {
  readonly idParada: string;
  readonly nombre: string;
  readonly latitud: string;
  readonly longitud: string;
  readonly municipio: string;
  readonly nucleo: string;
  readonly idZona?: string;
  readonly correspondecias?: string;
}

interface ApiServiceEntry {
  readonly idParada: string;
  readonly idLinea: string;
  readonly servicio: string;
  readonly nombre: string;
  readonly linea: string;
  readonly sentido: string;
  readonly destino: string;
  readonly tipo: string;
}

interface ApiServicesResponse {
  readonly servicios: readonly ApiServiceEntry[];
  readonly horaIni: string;
  readonly horaFin: string;
}

const API_DATE_FORMAT = 'dd-LL-yyyy+HH:mm' as const;
const API_RESPONSE_DATE_FORMAT = 'yyyy-LL-dd HH:mm' as const;
const ZERO_OFFSET = 0;

export async function buildSnapshotFile(
  config: SnapshotConfig,
  dependencies: SnapshotDependencies
): Promise<SnapshotFile> {
  const generationInstant = dependencies.now();
  const queryInstant = determineQueryInstant(config, generationInstant);
  const generatedAt = generationInstant.toISOString();
  const targets = [...config.targets];
  const stops: StopSnapshot[] = [];

  for (const target of targets) {
    const stopInfo = await loadStopInformation(config, dependencies, target);
    const services = await loadStopServices(config, dependencies, target, queryInstant);
    stops.push(
      buildStopSnapshot(
        config,
        stopInfo,
        services,
        target,
        generationInstant
      )
    );
  }

  return {
    metadata: {
      generatedAt,
      timezone: config.timezone,
      providerName: config.providerName,
      datasetName: config.datasetName
    },
    stops: Object.freeze(stops)
  } satisfies SnapshotFile;
}

function buildStopSnapshot(
  config: SnapshotConfig,
  stopInfo: ApiStopResponse,
  servicesResponse: ApiServicesResponse,
  target: SnapshotTarget,
  generationInstant: Date
): StopSnapshot {
  const startDateTime = DateTime.fromFormat(servicesResponse.horaIni, API_RESPONSE_DATE_FORMAT, {
    zone: config.timezone
  });
  const endDateTime = DateTime.fromFormat(servicesResponse.horaFin, API_RESPONSE_DATE_FORMAT, {
    zone: config.timezone
  });

  if (!startDateTime.isValid || !endDateTime.isValid) {
    throw new Error(
      `Invalid schedule window for stop ${target.stopId} (${servicesResponse.horaIni} - ${servicesResponse.horaFin})`
    );
  }

  const services = servicesResponse.servicios
    .map((entry) =>
      buildServiceSnapshot(config, entry, startDateTime)
    )
    .sort((first, second) => first.scheduledTime.localeCompare(second.scheduledTime));

  return {
    consortiumId: target.consortiumId,
    stopId: stopInfo.idParada,
    stopCode: stopInfo.idParada,
    stopName: stopInfo.nombre,
    location: {
      latitude: parseNumber(stopInfo.latitud, 'latitude', target.stopId),
      longitude: parseNumber(stopInfo.longitud, 'longitude', target.stopId)
    },
    municipality: stopInfo.municipio,
    nucleus: stopInfo.nucleo,
    services,
    query: {
      requestedAt: generationInstant.toISOString(),
      startTime: startDateTime.toUTC().toISO(),
      endTime: endDateTime.toUTC().toISO()
    }
  } satisfies StopSnapshot;
}

function buildServiceSnapshot(
  config: SnapshotConfig,
  entry: ApiServiceEntry,
  startDateTime: DateTime
): StopServiceSnapshot {
  const serviceDateTime = createServiceDateTime(config, entry.servicio, startDateTime);

  return {
    lineId: entry.idLinea,
    lineCode: entry.linea,
    lineName: entry.nombre,
    destination: entry.destino,
    scheduledTime: serviceDateTime.toUTC().toISO(),
    direction: parseInt(entry.sentido, 10) || ZERO_OFFSET,
    stopType: parseInt(entry.tipo, 10) || ZERO_OFFSET
  } satisfies StopServiceSnapshot;
}

function createServiceDateTime(
  config: SnapshotConfig,
  serviceTime: string,
  startDateTime: DateTime
): DateTime {
  const tentative = DateTime.fromFormat(
    `${startDateTime.toFormat('yyyy-LL-dd')} ${serviceTime}`,
    API_RESPONSE_DATE_FORMAT,
    { zone: config.timezone }
  );

  if (!tentative.isValid) {
    throw new Error(`Invalid service time "${serviceTime}" for stop ${startDateTime.toISO()}`);
  }

  if (tentative < startDateTime) {
    return tentative.plus({ days: 1 });
  }

  return tentative;
}

function parseNumber(value: string, field: string, stopId: string): number {
  const parsed = Number.parseFloat(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${field} value for stop ${stopId}: ${value}`);
  }

  return parsed;
}

async function loadStopInformation(
  config: SnapshotConfig,
  dependencies: SnapshotDependencies,
  target: SnapshotTarget
): Promise<ApiStopResponse> {
  const url = `${config.baseUrl}/Consorcios/${target.consortiumId}/paradas/${target.stopId}`;

  try {
    return await dependencies.fetchJson<ApiStopResponse>(url);
  } catch (error) {
    throw new Error(`Unable to fetch stop ${target.stopId} information: ${formatError(error)}`);
  }
}

async function loadStopServices(
  config: SnapshotConfig,
  dependencies: SnapshotDependencies,
  target: SnapshotTarget,
  queryInstant: Date
): Promise<ApiServicesResponse> {
  const query = buildQueryTimestamp(queryInstant, config.timezone);
  const url = `${config.baseUrl}/Consorcios/${target.consortiumId}/paradas/${target.stopId}/servicios?horaIni=${query}`;

  try {
    return await dependencies.fetchJson<ApiServicesResponse>(url);
  } catch (error) {
    throw new Error(`Unable to fetch services for stop ${target.stopId}: ${formatError(error)}`);
  }
}

export function buildQueryTimestamp(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: timezone }).toFormat(API_DATE_FORMAT);
}

function determineQueryInstant(config: SnapshotConfig, generationInstant: Date): Date {
  if (!config.queryTime) {
    return generationInstant;
  }

  const zoned = DateTime.fromJSDate(generationInstant, { zone: config.timezone }).set({
    hour: config.queryTime.hour,
    minute: config.queryTime.minute,
    second: 0,
    millisecond: 0
  });

  if (!zoned.isValid) {
    return generationInstant;
  }

  return zoned.toJSDate();
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

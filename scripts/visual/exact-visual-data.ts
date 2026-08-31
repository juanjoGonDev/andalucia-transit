export const FIXED_VISUAL_TIME_ISO = '2026-08-28T21:50:00+02:00';

const EXACT_STOP_DETAIL_ENTRY = Object.freeze({
  consortiumId: 1,
  stopId: '2528',
  stopCode: '2528',
  stopName: 'ACEITES LA ESPANOLA',
  location: Object.freeze({
    latitude: 37.29927140721956,
    longitude: -5.9577226638793945,
  }),
  municipality: 'DOS HERMANAS',
  nucleus: 'FUENTE DEL REY (Dos Hermanas) zonaC',
  services: Object.freeze([
    Object.freeze({
      lineId: '242',
      lineCode: '1320',
      lineName: 'M-132 Dos Hermanas - Sevilla (Barriadas)',
      destination: 'SEVILLA',
      scheduledTime: '2026-08-28T19:40:00.000Z',
      direction: 1,
      stopType: 0,
    }),
    Object.freeze({
      lineId: 'visual-132',
      lineCode: '1320',
      lineName: 'M-132 Dos Hermanas - Sevilla (Barriadas)',
      destination: 'SEVILLA',
      scheduledTime: '2026-08-28T20:10:00.000Z',
      direction: 1,
      stopType: 0,
    }),
  ]),
  query: Object.freeze({
    requestedAt: '2026-08-28T19:45:00.000Z',
    startTime: '2026-08-28T19:00:00.000Z',
    endTime: '2026-08-28T21:00:00.000Z',
  }),
});

export interface VisualStopServicesSnapshotEntry {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopName: string;
  readonly services: readonly unknown[];
  readonly [key: string]: unknown;
}

interface VisualStopServicesSnapshot {
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly stops: readonly VisualStopServicesSnapshotEntry[];
}

export function buildExactStopServicesSnapshot(): VisualStopServicesSnapshot {
  return {
    metadata: {
      generatedAt: '2026-08-28T19:45:00.000Z',
      timezone: 'Europe/Madrid',
      providerName:
        'Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía',
      datasetName: 'stop-services',
    },
    stops: [
      {
        ...EXACT_STOP_DETAIL_ENTRY,
        location: { ...EXACT_STOP_DETAIL_ENTRY.location },
        services: EXACT_STOP_DETAIL_ENTRY.services.map((service) => ({ ...service })),
        query: { ...EXACT_STOP_DETAIL_ENTRY.query },
      },
    ],
  };
}

export function buildExactNewsList(consortiumId: number): readonly Record<string, unknown>[] {
  if (consortiumId === 6) {
    return [
      ...Array.from({ length: 10 }, (_, index) => ({
        idNoticia: 600 + index,
        titulo: `Aviso Almería ${index + 1}`,
        resumen: `Información de servicio de Almería ${index + 1}`,
        categoria: index % 2 === 0 ? 'Avisos' : 'Tarifas',
        fechaInicio: `2026-08-${String(28 - index).padStart(2, '0')}T09:00:00+02:00`,
        orden: index,
      })),
      {
        idNoticia: 699,
        titulo: 'Noticia CTAN sin contenido',
        resumen: '__',
        texto: '<p>&nbsp;</p>',
        categoria: 'Avisos',
        fechaInicio: '2026-08-29T09:00:00+02:00',
        orden: 99,
      },
    ];
  }

  if (consortiumId === 9) {
    return [
      {
        idNoticia: 901,
        titulo: 'Aviso Costa de Huelva',
        resumen: 'Información de servicio de Huelva',
        categoria: 'Avisos',
        fechaInicio: '2026-08-18T09:00:00+02:00',
        orden: 0,
      },
      {
        idNoticia: 902,
        titulo: 'Tarifa Costa de Huelva',
        resumen: 'Información tarifaria de Huelva',
        categoria: 'Tarifas',
        fechaInicio: '2026-08-17T09:00:00+02:00',
        orden: 1,
      },
    ];
  }

  return [];
}

export function selectVisualStopDetailEntry(
  payload: unknown,
  exactVisualRegression: boolean,
): VisualStopServicesSnapshotEntry | null {
  if (exactVisualRegression) {
    return buildExactStopServicesSnapshot().stops[0] ?? null;
  }

  const root = readRecord(payload);
  if (!root || !Array.isArray(root['stops'])) {
    return null;
  }

  for (const value of root['stops']) {
    const stop = readRecord(value);
    if (!stop) {
      continue;
    }

    const consortiumId = stop['consortiumId'];
    const stopId = stop['stopId'];
    const stopName = stop['stopName'];
    const services = stop['services'];
    if (
      Number.isSafeInteger(consortiumId) &&
      Number(consortiumId) > 0 &&
      typeof stopId === 'string' &&
      stopId.trim().length > 0 &&
      typeof stopName === 'string' &&
      stopName.trim().length > 0 &&
      Array.isArray(services) &&
      services.length > 0
    ) {
      return {
        ...stop,
        consortiumId: Number(consortiumId),
        stopId,
        stopName,
        services,
      };
    }
  }

  return null;
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

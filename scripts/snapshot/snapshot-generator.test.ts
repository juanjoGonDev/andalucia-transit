import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  buildSnapshotFile,
  SnapshotConfig,
  SnapshotDependencies,
  SnapshotTarget
} from './snapshot-generator';

describe('snapshot generator', () => {
  it('builds a snapshot file from API responses', async () => {
    const config: SnapshotConfig = {
      baseUrl: 'https://api.example.test/v1',
      timezone: 'Europe/Madrid',
      providerName: 'Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía',
      datasetName: 'stop-services',
      targets: [
        {
          consortiumId: 7,
          stopId: '55'
        }
      ]
    } satisfies SnapshotConfig;

    const now = new Date('2025-01-10T09:00:00.000Z');

    const stopInfoResponse = {
      idParada: '55',
      idNucleo: '27',
      idMunicipio: '8',
      idZona: 'B',
      nombre: 'Apeadero Torredonjimeno',
      latitud: '37.764640',
      longitud: '-3.949370',
      municipio: 'Torredonjimeno',
      nucleo: 'Torredonjimeno',
      correspondecias: 'M2-1'
    };

    const servicesResponse = {
      servicios: [
        {
          idParada: '55',
          idLinea: '24',
          servicio: '10:15',
          nombre: 'Jaén - Martos',
          linea: 'M2-1',
          sentido: '2',
          destino: 'Jaén',
          tipo: '0'
        },
        {
          idParada: '55',
          idLinea: '28',
          servicio: '10:45',
          nombre: 'Jaén - Córdoba',
          linea: 'M2-12',
          sentido: '1',
          destino: 'Córdoba',
          tipo: '0'
        }
      ],
      horaIni: '2025-01-10 10:00',
      horaFin: '2025-01-10 12:00'
    };

    const expectedUrls = new Map<string, unknown>([
      [
        'https://api.example.test/v1/Consorcios/7/paradas/55',
        stopInfoResponse
      ],
      [
        'https://api.example.test/v1/Consorcios/7/paradas/55/servicios?horaIni=10-01-2025+10:00',
        servicesResponse
      ]
    ]);

    const dependencies: SnapshotDependencies = {
      now: () => now,
      fetchJson: async (url: string) => {
        if (!expectedUrls.has(url)) {
          throw new Error(`Unexpected url ${url}`);
        }

        return expectedUrls.get(url);
      }
    } satisfies SnapshotDependencies;

    const result = await buildSnapshotFile(config, dependencies);

    assert.equal(result.metadata.providerName, config.providerName);
    assert.equal(result.metadata.generatedAt, now.toISOString());
    assert.equal(result.metadata.datasetName, 'stop-services');
    assert.equal(result.metadata.timezone, 'Europe/Madrid');
    assert.equal(result.stops.length, 1);

    const [stopSnapshot] = result.stops;
    assert.equal(stopSnapshot.stopId, '55');
    assert.equal(stopSnapshot.consortiumId, 7);
    assert.equal(stopSnapshot.stopCode, '55');
    assert.equal(stopSnapshot.stopName, 'Apeadero Torredonjimeno');
    assert.equal(stopSnapshot.location.latitude, 37.76464);
    assert.equal(stopSnapshot.location.longitude, -3.94937);
    assert.equal(stopSnapshot.municipality, 'Torredonjimeno');
    assert.equal(stopSnapshot.nucleus, 'Torredonjimeno');
    assert.equal(stopSnapshot.services.length, 2);
    assert.equal(stopSnapshot.query.startTime, '2025-01-10T09:00:00.000Z');
    assert.equal(stopSnapshot.query.endTime, '2025-01-10T11:00:00.000Z');

    const [firstService, secondService] = stopSnapshot.services;
    assert.equal(firstService.lineId, '24');
    assert.equal(firstService.lineCode, 'M2-1');
    assert.equal(firstService.lineName, 'Jaén - Martos');
    assert.equal(firstService.destination, 'Jaén');
    assert.equal(firstService.direction, 2);
    assert.equal(firstService.stopType, 0);
    assert.equal(firstService.scheduledTime, '2025-01-10T09:15:00.000Z');

    assert.equal(secondService.lineId, '28');
    assert.equal(secondService.lineCode, 'M2-12');
    assert.equal(secondService.lineName, 'Jaén - Córdoba');
    assert.equal(secondService.destination, 'Córdoba');
    assert.equal(secondService.direction, 1);
    assert.equal(secondService.stopType, 0);
    assert.equal(secondService.scheduledTime, '2025-01-10T09:45:00.000Z');
  });

  it('throws a descriptive error when a stop is missing', async () => {
    const config: SnapshotConfig = {
      baseUrl: 'https://api.example.test/v1',
      timezone: 'Europe/Madrid',
      providerName: 'Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía',
      datasetName: 'stop-services',
      targets: [
        {
          consortiumId: 7,
          stopId: '999'
        }
      ]
    } satisfies SnapshotConfig;

    const dependencies: SnapshotDependencies = {
      now: () => new Date('2025-01-10T09:00:00.000Z'),
      fetchJson: async () => {
        throw new Error('404');
      }
    } satisfies SnapshotDependencies;

    await assert.rejects(
      () => buildSnapshotFile(config, dependencies),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /stop 999/i);
        return true;
      }
    );
  });
});

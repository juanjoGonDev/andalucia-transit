import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  StopDirectoryConfig,
  StopDirectoryDependencies,
  buildStopDirectory
} from './stop-directory';

describe('stop directory generator', () => {
  it('creates search index and chunk files per consortium', async () => {
    const config: StopDirectoryConfig = {
      baseUrl: 'https://api.example.test/v1',
      timezone: 'Europe/Madrid',
      providerName: 'CTAN',
      consortiums: [
        { id: 7, name: 'Jaén', shortName: 'CTJA' }
      ]
    } satisfies StopDirectoryConfig;

    const dependencies: StopDirectoryDependencies = {
      now: () => new Date('2025-02-01T05:00:00.000Z'),
      fetchJson: async (url) => {
        assert.equal(url, 'https://api.example.test/v1/Consorcios/7/paradas');
        return {
          paradas: [
            {
              idParada: '55',
              idMunicipio: '8',
              idNucleo: '27',
              nombre: 'Apeadero Torredonjimeno',
              latitud: '37.764640',
              longitud: '-3.949370',
              municipio: 'Torredonjimeno',
              nucleo: 'Torredonjimeno',
              idZona: 'B'
            },
            {
              idParada: '96',
              idMunicipio: '10',
              idNucleo: '4',
              nombre: 'Apeadero Mancha Real',
              latitud: '37.788432',
              longitud: '-3.608815',
              municipio: 'Mancha Real',
              nucleo: 'Mancha Real',
              idZona: 'BC'
            }
          ]
        };
      }
    } satisfies StopDirectoryDependencies;

    const result = await buildStopDirectory(config, dependencies);

    assert.deepEqual(result.metadata, {
      generatedAt: '2025-02-01T05:00:00.000Z',
      timezone: 'Europe/Madrid',
      providerName: 'CTAN',
      consortiums: [{ id: 7, name: 'Jaén', shortName: 'CTJA' }],
      totalStops: 2
    });

    assert.equal(result.searchIndex.length, 2);
    const torredonjimeno = result.searchIndex.find((entry) => entry.stopId === '55');
    const manchaReal = result.searchIndex.find((entry) => entry.stopId === '96');

    assert.deepEqual(torredonjimeno, {
      stopId: '55',
      stopCode: '55',
      name: 'Apeadero Torredonjimeno',
      municipality: 'Torredonjimeno',
      municipalityId: '8',
      nucleus: 'Torredonjimeno',
      nucleusId: '27',
      consortiumId: 7,
      chunkId: 'consortium-7'
    });

    assert.deepEqual(manchaReal, {
      stopId: '96',
      stopCode: '96',
      name: 'Apeadero Mancha Real',
      municipality: 'Mancha Real',
      municipalityId: '10',
      nucleus: 'Mancha Real',
      nucleusId: '4',
      consortiumId: 7,
      chunkId: 'consortium-7'
    });

    assert.equal(result.chunks.length, 1);
    const chunk = result.chunks[0];
    assert.equal(chunk.id, 'consortium-7');
    assert.equal(chunk.consortiumId, 7);
    assert.deepEqual(chunk.file.metadata, {
      generatedAt: '2025-02-01T05:00:00.000Z',
      timezone: 'Europe/Madrid',
      providerName: 'CTAN',
      consortiumId: 7,
      consortiumName: 'Jaén',
      stopCount: 2
    });

    assert.equal(chunk.file.stops.length, 2);
    const stopIds = chunk.file.stops.map((stop) => stop.stopId).sort();
    assert.deepEqual(stopIds, ['55', '96']);
  });
});

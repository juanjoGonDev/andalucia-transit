import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  buildStopDirectory,
  StopDirectoryConfig,
  StopDirectoryDependencies
} from './stop-directory';

describe('stop directory generator', () => {
  it('creates a directory dataset from consortium responses', async () => {
    const config: StopDirectoryConfig = {
      baseUrl: 'https://api.example.test/v1',
      timezone: 'Europe/Madrid',
      consortiums: [
        {
          id: 7,
          name: 'Consorcio Jaén'
        }
      ]
    } satisfies StopDirectoryConfig;

    const dependencies: StopDirectoryDependencies = {
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

    assert.equal(result.metadata.generatedAt.length > 0, true);
    assert.equal(result.metadata.timezone, 'Europe/Madrid');
    assert.equal(result.metadata.consortiums.length, 1);
    assert.equal(result.metadata.consortiums[0].id, 7);
    assert.equal(result.stops.length, 2);

    const [first, second] = result.stops;
    assert.deepEqual(first, {
      consortiumId: 7,
      stopId: '55',
      stopCode: '55',
      name: 'Apeadero Torredonjimeno',
      municipality: 'Torredonjimeno',
      municipalityId: '8',
      nucleus: 'Torredonjimeno',
      nucleusId: '27',
      zone: 'B',
      location: {
        latitude: 37.76464,
        longitude: -3.94937
      }
    });

    assert.deepEqual(second, {
      consortiumId: 7,
      stopId: '96',
      stopCode: '96',
      name: 'Apeadero Mancha Real',
      municipality: 'Mancha Real',
      municipalityId: '10',
      nucleus: 'Mancha Real',
      nucleusId: '4',
      zone: 'BC',
      location: {
        latitude: 37.788432,
        longitude: -3.608815
      }
    });
  });
});

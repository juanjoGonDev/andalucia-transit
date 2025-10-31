import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CatalogConfig, CatalogDependencies, buildCatalog } from './catalog-generator';

describe('catalog generator', () => {
  it('collects municipalities, nuclei and lines for every consortium', async () => {
    const config: CatalogConfig = {
      baseUrl: 'https://api.example.test/v1',
      timezone: 'Europe/Madrid',
      providerName: 'CTAN',
      consortiums: [
        { id: 7, name: 'Jaén', shortName: 'CTJA' }
      ]
    } satisfies CatalogConfig;

    const dependencies: CatalogDependencies = {
      now: () => new Date('2025-02-01T05:00:00.000Z'),
      fetchJson: async (url) => {
        if (url.endsWith('/municipios')) {
          return {
            municipios: [
              { idMunicipio: '01', datos: 'Alcalá' },
              { idMunicipio: '02', datos: 'Baños' }
            ]
          };
        }

        if (url.endsWith('/nucleos')) {
          return {
            nucleos: [
              { idNucleo: 'A', idMunicipio: '01', nombre: 'Centro', idZona: '1' },
              { idNucleo: 'B', idMunicipio: '02', nombre: 'Norte' }
            ]
          };
        }

        if (url.endsWith('/lineas')) {
          return {
            lineas: [
              { idLinea: '205', codigo: 'L-205', nombre: 'Circular', modo: 'Bus', operadores: 'CTJA' }
            ]
          };
        }

        throw new Error(`Unexpected url ${url}`);
      }
    } satisfies CatalogDependencies;

    const result = await buildCatalog(config, dependencies);

    assert.deepEqual(result.metadata, {
      generatedAt: '2025-02-01T05:00:00.000Z',
      timezone: 'Europe/Madrid',
      providerName: 'CTAN',
      consortiums: [{ id: 7, name: 'Jaén', shortName: 'CTJA' }]
    });

    assert.equal(result.consortia.length, 1);
    const consortium = result.consortia[0];
    assert.equal(consortium.summary.id, 7);
    assert.deepEqual(consortium.municipalities, [
      { id: '01', name: 'Alcalá' },
      { id: '02', name: 'Baños' }
    ]);
    assert.deepEqual(consortium.nuclei, [
      { id: 'A', municipalityId: '01', zone: '1', name: 'Centro' },
      { id: 'B', municipalityId: '02', zone: null, name: 'Norte' }
    ]);
    assert.equal(consortium.lines.length, 1);
    assert.deepEqual(consortium.lines[0], {
      id: '205',
      code: 'L-205',
      name: 'Circular',
      mode: 'Bus',
      modeId: null,
      operators: ['CTJA'],
      hasNews: false,
      concession: null,
      notes: null,
      modeNotes: null,
      accessibility: null,
      thickness: null,
      color: null,
      outboundThermometerUrl: null,
      inboundThermometerUrl: null,
      hasOutbound: false,
      hasInbound: false,
      path: [],
      outboundPath: [],
      inboundPath: []
    });
  });
});

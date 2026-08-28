import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { ConsortiumDependencies, loadConsortiumSummaries } from './consortiums';

describe('loadConsortiumSummaries', () => {
  it('maps consortium responses into ordered summaries with canonical provinces', async () => {
    const requestedUrls: string[] = [];
    const dependencies: ConsortiumDependencies = {
      fetchJson: async (url) => {
        requestedUrls.push(url);

        if (url.endsWith('/Consorcios/consorcios')) {
          return {
            consorcios: [
              { idConsorcio: '7', nombre: 'Jaén', nombreCorto: 'CTJA' },
              { idConsorcio: '1', nombre: 'Sevilla', nombreCorto: 'CTAS' }
            ]
          };
        }

        if (url.endsWith('/Consorcios/1/consorcio')) {
          return { idConsorcio: '1', provincia: 'Sevilla' };
        }

        if (url.endsWith('/Consorcios/7/consorcio')) {
          return { idConsorcio: '7', provincia: 'Jaén' };
        }

        throw new Error(`Unexpected url ${url}`);
      }
    } satisfies ConsortiumDependencies;

    const result = await loadConsortiumSummaries('https://api.example.test/v1', dependencies);

    assert.deepEqual(result, [
      { id: 1, name: 'Sevilla', shortName: 'CTAS', province: 'Sevilla' },
      { id: 7, name: 'Jaén', shortName: 'CTJA', province: 'Jaén' }
    ]);
    assert.deepEqual(new Set(requestedUrls), new Set([
      'https://api.example.test/v1/Consorcios/consorcios',
      'https://api.example.test/v1/Consorcios/1/consorcio',
      'https://api.example.test/v1/Consorcios/7/consorcio'
    ]));
  });

  it('throws a descriptive error when the consortium list fetch fails', async () => {
    const dependencies: ConsortiumDependencies = {
      fetchJson: async () => {
        throw new Error('Network timeout');
      }
    } satisfies ConsortiumDependencies;

    await assert.rejects(
      () => loadConsortiumSummaries('https://api.example.test/v1', dependencies),
      /Unable to fetch consortium list: Network timeout/
    );
  });

  it('rejects consortium detail responses without an authoritative province', async () => {
    const dependencies: ConsortiumDependencies = {
      fetchJson: async (url) => {
        if (url.endsWith('/Consorcios/consorcios')) {
          return {
            consorcios: [{ idConsorcio: '7', nombre: 'Jaén', nombreCorto: 'CTJA' }]
          };
        }

        return { idConsorcio: '7', provincia: '   ' };
      }
    } satisfies ConsortiumDependencies;

    await assert.rejects(
      () => loadConsortiumSummaries('https://api.example.test/v1', dependencies),
      /Consortium 7 detail is missing provincia/
    );
  });
});

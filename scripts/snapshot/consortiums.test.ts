import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { ConsortiumDependencies, loadConsortiumSummaries } from './consortiums';

describe('loadConsortiumSummaries', () => {
  it('maps consortium responses into ordered summaries', async () => {
    const dependencies: ConsortiumDependencies = {
      fetchJson: async () => ({
        consorcios: [
          { idConsorcio: '7', nombre: 'Jaén', nombreCorto: 'CTJA' },
          { idConsorcio: '1', nombre: 'Sevilla', nombreCorto: 'CTAS' }
        ]
      })
    } satisfies ConsortiumDependencies;

    const result = await loadConsortiumSummaries('https://api.example.test/v1', dependencies);

    assert.deepEqual(result, [
      { id: 1, name: 'Sevilla', shortName: 'CTAS' },
      { id: 7, name: 'Jaén', shortName: 'CTJA' }
    ]);
  });

  it('throws a descriptive error when fetch fails', async () => {
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
});

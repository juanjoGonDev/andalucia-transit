import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPwaBranchCoverage,
  readPwaBranchCoverage,
} from './pwa-coverage-gate.mjs';

const sourcePath = '/workspace/src/app/core/services/pwa-update.service.ts';

function summaryWithBranchCoverage(percentage) {
  return {
    total: { branches: { pct: percentage } },
    [sourcePath]: { branches: { pct: percentage } },
  };
}

test('reads branch coverage for the PWA update service', () => {
  assert.equal(readPwaBranchCoverage(summaryWithBranchCoverage(100)), 100);
});

test('accepts Windows coverage paths', () => {
  const summary = {
    'C:\\workspace\\src\\app\\core\\services\\pwa-update.service.ts': {
      branches: { pct: 100 },
    },
  };

  assert.equal(readPwaBranchCoverage(summary), 100);
});

test('accepts exactly 100 percent PWA branch coverage', () => {
  assert.doesNotThrow(() => assertPwaBranchCoverage(summaryWithBranchCoverage(100)));
});

test('rejects PWA branch coverage below 100 percent', () => {
  assert.throws(
    () => assertPwaBranchCoverage(summaryWithBranchCoverage(99.99)),
    /PWA branch coverage must be 100%; received 99.99%/,
  );
});

test('rejects coverage summaries without the PWA update source', () => {
  assert.throws(
    () => assertPwaBranchCoverage({ total: { branches: { pct: 100 } } }),
    /PWA coverage summary is missing/,
  );
});

test('rejects invalid PWA branch coverage values', () => {
  assert.throws(
    () =>
      assertPwaBranchCoverage({
        [sourcePath]: { branches: { pct: '100' } },
      }),
    /PWA branch coverage is invalid/,
  );
});

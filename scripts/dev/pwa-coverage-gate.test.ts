import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFocusedPwaBranchCoverage,
  readFocusedPwaBranchCoverage,
} from './pwa-coverage-gate.mjs';

const completeSummary = `
=============================== Coverage summary ===============================
Statements   : 97.5% ( 39/40 )
Branches     : 100% ( 7/7 )
Functions    : 90% ( 9/10 )
Lines        : 97.36% ( 37/38 )
================================================================================
`;

test('reads branch coverage from the focused PWA summary', () => {
  assert.deepEqual(readFocusedPwaBranchCoverage(completeSummary), {
    percentage: 100,
    covered: 7,
    total: 7,
  });
});

test('accepts ANSI-decorated focused output', () => {
  const output = '\u001b[32mBranches     : 100% ( 7/7 )\u001b[39m';

  assert.deepEqual(readFocusedPwaBranchCoverage(output), {
    percentage: 100,
    covered: 7,
    total: 7,
  });
});

test('accepts exactly 100 percent focused PWA branch coverage', () => {
  assert.doesNotThrow(() => assertFocusedPwaBranchCoverage(completeSummary));
});

test('rejects focused PWA branch coverage below 100 percent', () => {
  assert.throws(
    () => assertFocusedPwaBranchCoverage('Branches : 99.99% ( 6/7 )'),
    /PWA branch coverage must be 100%; received 99.99% \(6\/7\)/,
  );
});

test('rejects output without a branch summary', () => {
  assert.throws(
    () => assertFocusedPwaBranchCoverage('TOTAL: 15 SUCCESS'),
    /must contain exactly one branch summary; received 0/,
  );
});

test('rejects ambiguous output with multiple branch summaries', () => {
  assert.throws(
    () =>
      assertFocusedPwaBranchCoverage(
        'Branches : 100% ( 7/7 )\nBranches : 100% ( 7/7 )',
      ),
    /must contain exactly one branch summary; received 2/,
  );
});

test('rejects a zero-branch summary', () => {
  assert.throws(
    () => assertFocusedPwaBranchCoverage('Branches : 100% ( 0/0 )'),
    /branch coverage summary is invalid/,
  );
});

test('rejects non-string focused output', () => {
  assert.throws(
    () => readFocusedPwaBranchCoverage(null),
    /Focused PWA coverage output must be a string/,
  );
});

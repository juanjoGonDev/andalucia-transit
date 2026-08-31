import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCoverageGate, findCoverageEntry } from './coverage-gates.mjs';

const TARGET = 'src/app/core/services/pwa-update.service.ts';

function completeCoverage(percentage = 100) {
  return {
    branches: { pct: percentage },
    functions: { pct: percentage },
    lines: { pct: percentage },
    statements: { pct: percentage },
  };
}

test('findCoverageEntry accepts absolute Istanbul summary paths', () => {
  const entry = completeCoverage();
  const summary = {
    [`/workspace/andalucia-transit/${TARGET}`]: entry,
  };

  assert.equal(findCoverageEntry(summary, TARGET), entry);
});

test('assertCoverageGate accepts complete critical coverage', () => {
  assert.doesNotThrow(() => {
    assertCoverageGate({ [TARGET]: completeCoverage() }, TARGET);
  });
});

test('assertCoverageGate rejects a missing critical file', () => {
  assert.throws(
    () => assertCoverageGate({}, TARGET),
    new Error(`Coverage summary is missing critical file: ${TARGET}`),
  );
});

test('assertCoverageGate rejects every metric below 100 percent', () => {
  for (const metric of ['branches', 'functions', 'lines', 'statements'] as const) {
    const entry = completeCoverage() as Record<string, { pct: number }>;
    entry[metric] = { pct: 99.99 };

    assert.throws(
      () => assertCoverageGate({ [TARGET]: entry }, TARGET),
      new Error(`${TARGET} ${metric} coverage is 99.99%; required 100%`),
    );
  }
});

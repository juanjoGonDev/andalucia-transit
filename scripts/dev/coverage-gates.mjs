import { readFile } from 'node:fs/promises';
import { normalize } from 'node:path';

const REQUIRED_PERCENT = 100;
const COVERAGE_METRICS = ['branches', 'functions', 'lines', 'statements'];

export const CRITICAL_COVERAGE_GATES = [
  'src/app/core/services/pwa-update.service.ts',
];

function normalizePath(value) {
  return normalize(value).replaceAll('\\', '/');
}

export function findCoverageEntry(summary, targetPath) {
  const normalizedTarget = normalizePath(targetPath);
  const entry = Object.entries(summary).find(([key]) => {
    const normalizedKey = normalizePath(key);
    return normalizedKey === normalizedTarget || normalizedKey.endsWith(`/${normalizedTarget}`);
  });

  return entry?.[1];
}

export function assertCoverageGate(summary, targetPath) {
  const entry = findCoverageEntry(summary, targetPath);
  if (!entry) {
    throw new Error(`Coverage summary is missing critical file: ${targetPath}`);
  }

  for (const metric of COVERAGE_METRICS) {
    const percentage = entry[metric]?.pct;
    if (percentage !== REQUIRED_PERCENT) {
      throw new Error(
        `${targetPath} ${metric} coverage is ${String(percentage)}%; required ${REQUIRED_PERCENT}%`,
      );
    }
  }
}

export async function enforceCoverageGates(summaryPath) {
  const content = await readFile(summaryPath, 'utf8');
  const summary = JSON.parse(content);

  for (const targetPath of CRITICAL_COVERAGE_GATES) {
    assertCoverageGate(summary, targetPath);
  }
}

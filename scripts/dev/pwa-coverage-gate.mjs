const PWA_UPDATE_SOURCE_SUFFIX = 'src/app/core/services/pwa-update.service.ts';
const REQUIRED_PWA_BRANCH_COVERAGE = 100;

function normalizeCoveragePath(path) {
  return path.replaceAll('\\', '/');
}

export function readPwaBranchCoverage(coverageSummary) {
  if (coverageSummary === null || typeof coverageSummary !== 'object') {
    throw new Error('PWA coverage summary must be an object');
  }

  const sourceEntry = Object.entries(coverageSummary).find(([path]) =>
    normalizeCoveragePath(path).endsWith(PWA_UPDATE_SOURCE_SUFFIX),
  );
  if (!sourceEntry) {
    throw new Error(`PWA coverage summary is missing ${PWA_UPDATE_SOURCE_SUFFIX}`);
  }

  const branches = sourceEntry[1]?.branches;
  const percentage = branches?.pct;
  if (typeof percentage !== 'number' || !Number.isFinite(percentage)) {
    throw new Error(`PWA branch coverage is invalid for ${PWA_UPDATE_SOURCE_SUFFIX}`);
  }

  return percentage;
}

export function assertPwaBranchCoverage(coverageSummary) {
  const percentage = readPwaBranchCoverage(coverageSummary);
  if (percentage < REQUIRED_PWA_BRANCH_COVERAGE) {
    throw new Error(
      `PWA branch coverage must be ${REQUIRED_PWA_BRANCH_COVERAGE}%; received ${percentage}%`,
    );
  }
}

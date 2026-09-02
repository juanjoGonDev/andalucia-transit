const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const REQUIRED_PWA_BRANCH_COVERAGE = 100;

function stripAnsi(value) {
  return value.replace(ANSI_ESCAPE_PATTERN, '');
}

export function readFocusedPwaBranchCoverage(output) {
  if (typeof output !== 'string') {
    throw new Error('Focused PWA coverage output must be a string');
  }

  const matches = [
    ...stripAnsi(output).matchAll(
      /^Branches\s*:\s*(\d+(?:\.\d+)?)%\s*\(\s*(\d+)\s*\/\s*(\d+)\s*\)\s*$/gm,
    ),
  ];
  if (matches.length !== 1) {
    throw new Error(
      `Focused PWA coverage output must contain exactly one branch summary; received ${matches.length}`,
    );
  }

  const percentage = Number(matches[0][1]);
  const covered = Number(matches[0][2]);
  const total = Number(matches[0][3]);
  if (
    !Number.isFinite(percentage) ||
    !Number.isSafeInteger(covered) ||
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    covered < 0 ||
    covered > total
  ) {
    throw new Error('Focused PWA branch coverage summary is invalid');
  }

  return { percentage, covered, total };
}

export function assertFocusedPwaBranchCoverage(output) {
  const coverage = readFocusedPwaBranchCoverage(output);
  if (
    coverage.percentage !== REQUIRED_PWA_BRANCH_COVERAGE ||
    coverage.covered !== coverage.total
  ) {
    throw new Error(
      `PWA branch coverage must be ${REQUIRED_PWA_BRANCH_COVERAGE}%; received ${coverage.percentage}% (${coverage.covered}/${coverage.total})`,
    );
  }
}

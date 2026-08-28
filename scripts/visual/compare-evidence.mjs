import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { MAX_EVIDENCE_FILE_BYTES, VISUAL_EVIDENCE_ASSETS } from './evidence-assets.mjs';

const DIFF_RED = Object.freeze([255, 0, 0, 255]);

async function readPng(path) {
  const file = await readFile(path);
  return PNG.sync.read(file);
}

function pixelsDiffer(left, leftOffset, right, rightOffset) {
  for (let channel = 0; channel < 4; channel += 1) {
    if (left[leftOffset + channel] !== right[rightOffset + channel]) {
      return true;
    }
  }
  return false;
}

function countExactDiffPixels(expected, actual) {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return null;
  }

  let count = 0;
  const pixelCount = expected.width * expected.height;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (pixelsDiffer(expected.data, offset, actual.data, offset)) {
      count += 1;
    }
  }
  return count;
}

function writeMismatchPixel(diff, offset) {
  for (let channel = 0; channel < 4; channel += 1) {
    diff.data[offset + channel] = DIFF_RED[channel];
  }
}

function createDimensionMismatchDiff(expected, actual) {
  const width = Math.max(expected.width, actual.width);
  const height = Math.max(expected.height, actual.height);
  const diff = new PNG({ width, height });
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const diffOffset = (y * width + x) * 4;
      const inExpected = x < expected.width && y < expected.height;
      const inActual = x < actual.width && y < actual.height;

      if (!inExpected || !inActual) {
        writeMismatchPixel(diff, diffOffset);
        count += 1;
        continue;
      }

      const expectedOffset = (y * expected.width + x) * 4;
      const actualOffset = (y * actual.width + x) * 4;
      if (pixelsDiffer(expected.data, expectedOffset, actual.data, actualOffset)) {
        writeMismatchPixel(diff, diffOffset);
        count += 1;
      }
    }
  }

  return { diff, count };
}

async function verifyEvidenceFile(path) {
  const metadata = await stat(path);
  if (!metadata.isFile() || metadata.size === 0) {
    throw new Error(`Visual evidence file is empty: ${path}`);
  }
  if (metadata.size > MAX_EVIDENCE_FILE_BYTES) {
    throw new Error(
      `Visual evidence file exceeds ${MAX_EVIDENCE_FILE_BYTES} bytes: ${path} (${metadata.size})`,
    );
  }
}

async function compareFile({ expectedPath, actualPath, diffPath, file }) {
  let expected;
  let actual;

  try {
    await verifyEvidenceFile(expectedPath);
    expected = await readPng(expectedPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { file, status: 'missing-expected', diffPixels: null };
    }
    throw error;
  }

  try {
    await verifyEvidenceFile(actualPath);
    actual = await readPng(actualPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { file, status: 'missing-actual', diffPixels: null };
    }
    throw error;
  }

  const exactDiffPixels = countExactDiffPixels(expected, actual);
  if (exactDiffPixels === null) {
    const { diff, count } = createDimensionMismatchDiff(expected, actual);
    await writeFile(diffPath, PNG.sync.write(diff));
    return {
      file,
      status: 'dimension-mismatch',
      diffPixels: count,
      expected: { width: expected.width, height: expected.height },
      actual: { width: actual.width, height: actual.height },
    };
  }

  const diff = new PNG({ width: expected.width, height: expected.height });
  pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, {
    threshold: 0,
    includeAA: true,
    diffMask: true,
  });
  await writeFile(diffPath, PNG.sync.write(diff));

  return {
    file,
    status: exactDiffPixels === 0 ? 'match' : 'different',
    diffPixels: exactDiffPixels,
    expected: { width: expected.width, height: expected.height },
    actual: { width: actual.width, height: actual.height },
  };
}

export async function compareEvidence({
  expectedDir,
  actualDir,
  diffDir,
  files = VISUAL_EVIDENCE_ASSETS,
}) {
  const expectedRoot = resolve(expectedDir);
  const actualRoot = resolve(actualDir);
  const diffRoot = resolve(diffDir);
  await mkdir(diffRoot, { recursive: true });

  const results = [];
  for (const file of files) {
    results.push(
      await compareFile({
        expectedPath: resolve(expectedRoot, file),
        actualPath: resolve(actualRoot, file),
        diffPath: resolve(diffRoot, file),
        file,
      }),
    );
  }

  const changedFiles = results.filter((result) => result.status !== 'match');
  const totalDiffPixels = results.reduce(
    (total, result) => total + (typeof result.diffPixels === 'number' ? result.diffPixels : 0),
    0,
  );
  const summary = {
    version: 1,
    passed: changedFiles.length === 0,
    comparedFiles: results.length,
    changedFiles: changedFiles.length,
    totalDiffPixels,
    results,
  };

  await writeFile(resolve(diffRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

function formatResult(result) {
  if (result.status === 'match') {
    return `MATCH ${result.file}`;
  }
  if (result.diffPixels === null) {
    return `FAIL  ${result.file}: ${result.status}`;
  }
  return `FAIL  ${result.file}: ${result.status}, ${result.diffPixels} differing pixels`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      expected: { type: 'string' },
      actual: { type: 'string' },
      diff: { type: 'string' },
    },
    strict: true,
  });

  if (!values.expected || !values.actual || !values.diff) {
    throw new Error('Usage: compare-evidence.mjs --expected <dir> --actual <dir> --diff <dir>');
  }

  const summary = await compareEvidence({
    expectedDir: values.expected,
    actualDir: values.actual,
    diffDir: values.diff,
  });

  for (const result of summary.results) {
    console.log(formatResult(result));
  }
  console.log(
    `Visual regression summary: ${summary.changedFiles}/${summary.comparedFiles} changed files, ${summary.totalDiffPixels} differing pixels.`,
  );

  if (!summary.passed) {
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

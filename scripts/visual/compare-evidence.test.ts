import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';
import { compareEvidence } from './compare-evidence.mjs';

async function writePng(
  path: string,
  width: number,
  height: number,
  pixels: readonly (readonly [number, number, number, number])[],
): Promise<void> {
  const png = new PNG({ width, height });
  assert.equal(pixels.length, width * height);
  pixels.forEach((pixel, index) => {
    const offset = index * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      png.data[offset + channel] = pixel[channel];
    }
  });
  await writeFile(path, PNG.sync.write(png));
}

async function makeFixture(t: test.TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'visual-evidence-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const expectedDir = join(root, 'expected');
  const actualDir = join(root, 'actual');
  const diffDir = join(root, 'diff');
  await Promise.all([mkdir(expectedDir), mkdir(actualDir)]);
  return { expectedDir, actualDir, diffDir };
}

const opaqueWhite = [255, 255, 255, 255] as const;
const opaqueBlack = [0, 0, 0, 255] as const;

test('passes only when every rendered pixel matches exactly', async (t) => {
  const fixture = await makeFixture(t);
  await writePng(join(fixture.expectedDir, 'screen.png'), 2, 1, [opaqueWhite, opaqueBlack]);
  await writePng(join(fixture.actualDir, 'screen.png'), 2, 1, [opaqueWhite, opaqueBlack]);

  const summary = await compareEvidence({ ...fixture, files: ['screen.png'] });

  assert.equal(summary.passed, true);
  assert.equal(summary.changedFiles, 0);
  assert.equal(summary.totalDiffPixels, 0);
  assert.equal(summary.results[0]?.status, 'match');
  await readFile(join(fixture.diffDir, 'screen.png'));
  await readFile(join(fixture.diffDir, 'summary.json'));
});

test('fails when one rendered pixel changes and emits a diff image', async (t) => {
  const fixture = await makeFixture(t);
  await writePng(join(fixture.expectedDir, 'screen.png'), 2, 1, [opaqueWhite, opaqueBlack]);
  await writePng(join(fixture.actualDir, 'screen.png'), 2, 1, [opaqueWhite, opaqueWhite]);

  const summary = await compareEvidence({ ...fixture, files: ['screen.png'] });

  assert.equal(summary.passed, false);
  assert.equal(summary.changedFiles, 1);
  assert.equal(summary.totalDiffPixels, 1);
  assert.equal(summary.results[0]?.status, 'different');
  await readFile(join(fixture.diffDir, 'screen.png'));
});

test('fails dimension changes and counts pixels outside the shared canvas', async (t) => {
  const fixture = await makeFixture(t);
  await writePng(join(fixture.expectedDir, 'screen.png'), 1, 1, [opaqueWhite]);
  await writePng(join(fixture.actualDir, 'screen.png'), 2, 1, [opaqueWhite, opaqueBlack]);

  const summary = await compareEvidence({ ...fixture, files: ['screen.png'] });

  assert.equal(summary.passed, false);
  assert.equal(summary.totalDiffPixels, 1);
  assert.equal(summary.results[0]?.status, 'dimension-mismatch');
  assert.deepEqual(summary.results[0]?.expected, { width: 1, height: 1 });
  assert.deepEqual(summary.results[0]?.actual, { width: 2, height: 1 });
});

test('fails closed when expected or actual evidence is missing', async (t) => {
  const fixture = await makeFixture(t);
  await writePng(join(fixture.actualDir, 'screen.png'), 1, 1, [opaqueWhite]);

  const summary = await compareEvidence({ ...fixture, files: ['screen.png'] });

  assert.equal(summary.passed, false);
  assert.equal(summary.changedFiles, 1);
  assert.equal(summary.results[0]?.status, 'missing-expected');
  assert.equal(summary.results[0]?.diffPixels, null);
});

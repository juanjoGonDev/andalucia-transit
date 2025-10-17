import { defineConfig } from 'cypress';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

interface CompareSnapshotPayload {
  readonly specName: string;
  readonly snapshotName: string;
  readonly threshold?: number;
}

interface CompareSnapshotResult {
  readonly diffPixels: number;
  readonly diffPath: string;
  readonly baselineCreated: boolean;
}

const PNG_EXTENSION = '.png';
const CYPRESS_DIRECTORY_NAME = 'cypress';
const SCREENSHOTS_DIRECTORY_NAME = 'screenshots';
const VISUAL_BASELINE_DIRECTORY_NAME = 'visual-baseline';
const VISUAL_DIFF_DIRECTORY_NAME = 'visual-diff';
const ZERO_DIFF_THRESHOLD = 0;
const SPEC_EXTENSION_PATTERN = /\.[^.]+$/u;

const createCompareSnapshotTask = () => {
  const cypressRoot = path.resolve(__dirname, CYPRESS_DIRECTORY_NAME);
  const baselineRoot = path.join(cypressRoot, VISUAL_BASELINE_DIRECTORY_NAME);
  const diffRoot = path.join(cypressRoot, VISUAL_DIFF_DIRECTORY_NAME);

  return async ({
    specName,
    snapshotName,
    threshold = ZERO_DIFF_THRESHOLD
  }: CompareSnapshotPayload): Promise<CompareSnapshotResult> => {
    const specDirectory = specName.replace(SPEC_EXTENSION_PATTERN, '');
    const baselineDirectory = path.join(baselineRoot, specDirectory);
    const diffDirectory = path.join(diffRoot, specDirectory);
    await mkdir(baselineDirectory, { recursive: true });
    await mkdir(diffDirectory, { recursive: true });

    const screenshotPath = path.join(
      cypressRoot,
      SCREENSHOTS_DIRECTORY_NAME,
      specName,
      `${snapshotName}${PNG_EXTENSION}`
    );
    const baselinePath = path.join(baselineDirectory, `${snapshotName}${PNG_EXTENSION}`);
    const diffPath = path.join(diffDirectory, `${snapshotName}${PNG_EXTENSION}`);

    if (!existsSync(screenshotPath)) {
      throw new Error(`Screenshot not found at ${screenshotPath}`);
    }

    if (!existsSync(baselinePath)) {
      await copyFile(screenshotPath, baselinePath);
      return {
        diffPixels: 0,
        diffPath,
        baselineCreated: true
      };
    }

    const [baselineBuffer, screenshotBuffer] = await Promise.all([
      readFile(baselinePath),
      readFile(screenshotPath)
    ]);
    const baselinePng = PNG.sync.read(baselineBuffer);
    const screenshotPng = PNG.sync.read(screenshotBuffer);

    if (baselinePng.width !== screenshotPng.width || baselinePng.height !== screenshotPng.height) {
      throw new Error('Baseline and screenshot dimensions do not match.');
    }

    const diffPng = new PNG({ width: baselinePng.width, height: baselinePng.height });
    const diffPixels = pixelmatch(
      baselinePng.data,
      screenshotPng.data,
      diffPng.data,
      baselinePng.width,
      baselinePng.height,
      { threshold }
    );
    await writeFile(diffPath, PNG.sync.write(diffPng));

    return {
      diffPixels,
      diffPath,
      baselineCreated: false
    };
  };
};

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    setupNodeEvents(on) {
      on('task', {
        compareSnapshot: createCompareSnapshotTask()
      });
      return undefined;
    }
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack'
    },
    specPattern: '**/*.cy.ts'
  }
});

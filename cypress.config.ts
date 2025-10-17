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

const createCompareSnapshotTask = () => {
  const baselineRoot = path.resolve(__dirname, 'cypress', 'visual-baseline');
  const diffRoot = path.resolve(__dirname, 'cypress', 'visual-diff');

  return async ({ specName, snapshotName, threshold = 0 }: CompareSnapshotPayload): Promise<CompareSnapshotResult> => {
    const specDirectory = specName.replace(/\.[^.]+$/u, '');
    const baselineDirectory = path.join(baselineRoot, specDirectory);
    const diffDirectory = path.join(diffRoot, specDirectory);
    await mkdir(baselineDirectory, { recursive: true });
    await mkdir(diffDirectory, { recursive: true });

    const screenshotPath = path.resolve(
      __dirname,
      'cypress',
      'screenshots',
      specName,
      `${snapshotName}.png`
    );
    const baselinePath = path.join(baselineDirectory, `${snapshotName}.png`);
    const diffPath = path.join(diffDirectory, `${snapshotName}.png`);

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

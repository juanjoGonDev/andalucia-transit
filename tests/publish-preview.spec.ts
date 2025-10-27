import 'tsx/esm';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { SnapAndPublishDependencies, SnapAndPublishOptions } from '../scripts/snap-and-publish';
import { UploadSummary } from '../scripts/upload-to-filebin';

const TEST_BIN = 'playwright-preview-bin';
const DESKTOP_SAMPLE = 'sample_es_1280_800_viewport.png';
const MOBILE_SAMPLE = 'sample_es_414_896_viewport.png';
const CAPTURE_DIRECTORY = path.resolve('artifacts/screenshots');

async function prepareSampleFiles(): Promise<{ desktop: string; mobile: string }> {
  await fs.mkdir(CAPTURE_DIRECTORY, { recursive: true });
  const desktopPath = path.join(CAPTURE_DIRECTORY, DESKTOP_SAMPLE);
  const mobilePath = path.join(CAPTURE_DIRECTORY, MOBILE_SAMPLE);
  await fs.writeFile(desktopPath, Buffer.from('desktop'));
  await fs.writeFile(mobilePath, Buffer.from('mobile'));
  return { desktop: desktopPath, mobile: mobilePath };
}

function createDependencies(sample: { desktop: string; mobile: string }): SnapAndPublishDependencies {
  return {
    record: async () => ({ screenshots: [sample.desktop, sample.mobile] }),
    upload: async (filePaths: string[]): Promise<UploadSummary> => ({
      bin: TEST_BIN,
      files: filePaths.map((filePath) => {
        const name = path.basename(filePath);
        return { name, url: `https://filebin.net/${TEST_BIN}/${name}` };
      }),
    }),
  };
}

test('publishes route detail preview', async () => {
  const { desktop, mobile } = await prepareSampleFiles();
  const dependencies = createDependencies({ desktop, mobile });
  const module = await import('../scripts/snap-and-publish.ts');
  const { snapAndPublish } = module;
  const options: SnapAndPublishOptions = {
    url: 'https://example.com',
    label: 'Route Detail Preview',
  };
  const block = await snapAndPublish(options, dependencies);
  expect(block).toContain(`after (desktop): https://filebin.net/${TEST_BIN}/`);
  expect(block).toContain(`after (mobile): https://filebin.net/${TEST_BIN}/`);
});

import 'tsx/esm';
import { expect, test } from '@playwright/test';
import { MultipartRequester } from '../scripts/upload-to-filebin';

const TEST_BIN = 'playwright-preview-bin';

function createMockRequester(): MultipartRequester {
  return async (_endpoint, body) => {
    const bodyText = body.toString('utf-8');
    const match = bodyText.match(/filename="([^"]+)"/);
    const fileName = match ? match[1] : `capture-${Date.now().toString(16)}`;
    const headers = {};
    const responsePayload = {
      bin: TEST_BIN,
      files: [
        {
          filename: fileName,
          url: `https://filebin.net/${TEST_BIN}/${fileName}`,
        },
      ],
    };
    return {
      status: 200,
      headers,
      body: JSON.stringify(responsePayload),
    };
  };
}

test('publishes route detail preview', async () => {
  const module = await import('../scripts/snap-and-publish.ts');
  const { snapAndPublish } = module;
  const block = await snapAndPublish({
    url: 'https://example.com',
    label: 'Route Detail Preview',
    requestImplementation: createMockRequester(),
  });
  expect(block).toContain(`after (desktop): https://filebin.net/${TEST_BIN}/`);
  expect(block).toContain(`after (mobile): https://filebin.net/${TEST_BIN}/`);
});

import 'tsx/esm';
import { expect, test } from '@playwright/test';

const TEST_BIN = 'playwright-preview-bin';

function createMockFetch(): typeof fetch {
  return async () => {
    const headers = new Headers({ 'content-type': 'application/json' });
    const body = JSON.stringify({ bin: TEST_BIN });
    return new Response(body, { status: 200, headers });
  };
}

test('publishes route detail preview', async () => {
  const module = await import('../scripts/snap-and-publish.ts');
  const { snapAndPublish } = module;
  const block = await snapAndPublish({
    url: 'https://example.com',
    label: 'Route Detail Preview',
    fetchImplementation: createMockFetch(),
  });
  expect(block).toContain(`after (desktop): https://filebin.net/${TEST_BIN}/`);
  expect(block).toContain(`after (mobile): https://filebin.net/${TEST_BIN}/`);
});

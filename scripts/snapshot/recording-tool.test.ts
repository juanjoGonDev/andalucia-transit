import { strict as assert } from 'node:assert';
import path from 'node:path';
import { describe, it } from 'node:test';
import * as recordTool from '../record.js';

describe('record tool CLI', () => {
  it('infers screenshot format from extension', () => {
    const target = recordTool.resolveMediaTarget(
      '/tmp',
      'sample.JPG',
      'fallback',
      '.png',
      recordTool.SCREENSHOT_FORMATS,
      'Screenshot'
    );

    assert.equal(path.extname(target.path).toLowerCase(), '.jpg');
    assert.equal(target.format.type, 'jpeg');
  });

  it('prints help without launching the browser', async () => {
    const chromiumStub = {
      launch: async () => {
        throw new Error('launch should not run');
      }
    } as unknown as import('playwright').ChromiumBrowserType;

    let output = '';
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void) => {
      const value = typeof chunk === 'string' ? chunk : chunk.toString();
      output += value;
      if (typeof encoding === 'function') {
        encoding();
        return true;
      }
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    }) as typeof process.stdout.write;

    try {
      const code = await recordTool.executeCli(['node', 'record', '--help'], 'record', { chromium: chromiumStub });
      assert.equal(code, 0);
      assert.match(output, /Usage:/);
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});

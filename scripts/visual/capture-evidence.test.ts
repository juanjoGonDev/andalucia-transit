import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVerifyProductChecks } from './capture-evidence.mjs';

test('enables product checks by default', () => {
  assert.equal(parseVerifyProductChecks(), true);
  assert.equal(parseVerifyProductChecks('true'), true);
});

test('allows reviewed-baseline capture to skip current product checks explicitly', () => {
  assert.equal(parseVerifyProductChecks('false'), false);
});

test('fails closed for an invalid product-check flag', () => {
  assert.throws(
    () => parseVerifyProductChecks('disabled'),
    /verifyProductChecks must be "true" or "false"/u,
  );
});

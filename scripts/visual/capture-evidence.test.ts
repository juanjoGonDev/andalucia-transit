import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVerifyProductChecks, selectPopulatedSpecs } from './capture-evidence.mjs';

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

test('keeps evidence-producing specs while excluding head-only product checks from baseline capture', () => {
  const baselineSpecs = selectPopulatedSpecs(false);

  assert.ok(baselineSpecs.includes('tests/playwright/deterministic-visual-states.spec.ts'));
  assert.ok(baselineSpecs.includes('tests/playwright/lines-directory.layout.spec.ts'));
  assert.ok(baselineSpecs.includes('tests/playwright/visual-interaction-states.spec.ts'));
  assert.ok(!baselineSpecs.includes('tests/playwright/map-exploration.spec.ts'));
  assert.ok(!baselineSpecs.includes('tests/playwright/theme.contrast.spec.ts'));
});

test('runs the complete current-head product harness when product checks are enabled', () => {
  const headSpecs = selectPopulatedSpecs(true);

  assert.ok(headSpecs.includes('tests/playwright/map-exploration.spec.ts'));
  assert.ok(headSpecs.includes('tests/playwright/theme.contrast.spec.ts'));
});

import { createPluralRules, selectPluralizedTranslationKey } from './pluralization';

const ONE_KEY = 'translation.one' as const;
const OTHER_KEY = 'translation.other' as const;

describe('pluralization utilities', () => {
  it('selects the plural category key for singular values', () => {
    const rules = createPluralRules('en');
    const key = selectPluralizedTranslationKey(1, { one: ONE_KEY, other: OTHER_KEY }, rules);

    expect(key).toBe(ONE_KEY);
  });

  it('falls back to the other category when specific keys are not provided', () => {
    const rules = createPluralRules('en');
    const key = selectPluralizedTranslationKey(2, { one: ONE_KEY, other: OTHER_KEY }, rules);

    expect(key).toBe(OTHER_KEY);
  });
});

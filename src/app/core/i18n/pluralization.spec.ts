import {
  createPluralRules,
  resolveLanguage,
  selectPluralizedTranslationKey,
  selectPluralizedTranslationKeyForLanguage
} from './pluralization';

const ONE_KEY = 'translation.one' as const;
const OTHER_KEY = 'translation.other' as const;
const ZERO_KEY = 'translation.zero' as const;
const FALLBACK_LANGUAGE = 'es' as const;

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

  it('selects plural keys directly from the language code', () => {
    const key = selectPluralizedTranslationKeyForLanguage(0, { zero: ZERO_KEY, other: OTHER_KEY }, 'ar');

    expect(key).toBe(ZERO_KEY);
  });

  it('returns the current language when available', () => {
    const language = resolveLanguage({ current: 'en', defaultLanguage: 'fr', fallback: FALLBACK_LANGUAGE });

    expect(language).toBe('en');
  });

  it('returns the default language when the current value is missing', () => {
    const language = resolveLanguage({ current: undefined, defaultLanguage: 'fr', fallback: FALLBACK_LANGUAGE });

    expect(language).toBe('fr');
  });

  it('returns the fallback language when both current and default are empty', () => {
    const language = resolveLanguage({ current: null, defaultLanguage: '', fallback: FALLBACK_LANGUAGE });

    expect(language).toBe(FALLBACK_LANGUAGE);
  });
});

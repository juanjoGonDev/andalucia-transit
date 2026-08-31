export type PluralCategory = ReturnType<Intl.PluralRules['select']>;

export type PluralizedTranslationKeys = Partial<Record<PluralCategory, string>> & {
  readonly other: string;
};

const isLanguageValue = (value?: string | null): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export interface ResolveLanguageOptions {
  readonly current?: string | null;
  readonly fallback: string;
  readonly defaultLanguage?: string | null;
}

export function resolveLanguage(options: ResolveLanguageOptions): string {
  if (isLanguageValue(options.current)) {
    return options.current.trim();
  }

  if (isLanguageValue(options.defaultLanguage)) {
    return options.defaultLanguage.trim();
  }

  return options.fallback;
}

export function createPluralRules(language: string): Intl.PluralRules {
  return new Intl.PluralRules(language);
}

export function selectPluralizedTranslationKey(
  count: number,
  translations: PluralizedTranslationKeys,
  pluralRules: Intl.PluralRules
): string {
  const category = pluralRules.select(count);

  return translations[category] ?? translations.other;
}

export function selectPluralizedTranslationKeyForLanguage(
  count: number,
  translations: PluralizedTranslationKeys,
  language: string
): string {
  const rules = createPluralRules(language);

  return selectPluralizedTranslationKey(count, translations, rules);
}

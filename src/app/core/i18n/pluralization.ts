export type PluralCategory = ReturnType<Intl.PluralRules['select']>;

export type PluralizedTranslationKeys = Partial<Record<PluralCategory, string>> & {
  readonly other: string;
};

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

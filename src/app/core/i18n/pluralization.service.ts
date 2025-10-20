import { Injectable, InjectionToken, inject } from '@angular/core';

import {
  PluralizedTranslationKeys,
  ResolveLanguageOptions,
  createPluralRules,
  resolveLanguage,
  selectPluralizedTranslationKey
} from './pluralization';

export type PluralRulesFactory = (language: string) => Intl.PluralRules;

export const PLURAL_RULES_FACTORY = new InjectionToken<PluralRulesFactory>('PLURAL_RULES_FACTORY', {
  factory: () => (language: string) => createPluralRules(language)
});

@Injectable({ providedIn: 'root' })
export class PluralizationService {
  private readonly rules = new Map<string, Intl.PluralRules>();
  private readonly createRules = inject(PLURAL_RULES_FACTORY);

  resolveLanguage(options: ResolveLanguageOptions): string {
    return resolveLanguage(options);
  }

  selectKey(
    count: number,
    translations: PluralizedTranslationKeys,
    language: string
  ): string {
    const pluralRules = this.obtainRules(language);

    return selectPluralizedTranslationKey(count, translations, pluralRules);
  }

  private obtainRules(language: string): Intl.PluralRules {
    const cached = this.rules.get(language);

    if (cached) {
      return cached;
    }

    const created = this.createRules(language);
    this.rules.set(language, created);

    return created;
  }
}

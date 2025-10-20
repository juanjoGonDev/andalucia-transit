import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

import { APP_CONFIG } from '../config';
import { PluralizedTranslationKeys, createPluralRules, selectPluralizedTranslationKey } from './pluralization';

@Injectable({ providedIn: 'root' })
export class PluralizationService {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = signal(this.resolveLanguage(this.translate.currentLang));
  private readonly rulesCache = new Map<string, Intl.PluralRules>();

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lang }) => {
        this.language.set(this.resolveLanguage(lang));
      });
  }

  selectTranslationKey(count: number, translations: PluralizedTranslationKeys): string {
    const language = this.language();
    const rules = this.resolvePluralRules(language);

    return selectPluralizedTranslationKey(count, translations, rules);
  }

  private resolvePluralRules(language: string): Intl.PluralRules {
    const cached = this.rulesCache.get(language);

    if (cached) {
      return cached;
    }

    const rules = createPluralRules(language);
    this.rulesCache.set(language, rules);

    return rules;
  }

  private resolveLanguage(language: string | undefined): string {
    if (language) {
      return language;
    }

    return this.translate.defaultLang ?? APP_CONFIG.locales.default;
  }
}

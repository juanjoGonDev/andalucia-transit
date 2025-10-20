import { Injectable, Signal, inject, signal } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import { APP_CONFIG, AppConfig, SupportedLanguage } from '@core/config';
import { LanguageOption } from '@core/interfaces/language-option.interface';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { resolveLanguage } from '@domain/utils/language.util';

const storageAvailable = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translateService = inject(TranslateService);
  private readonly dateAdapter: DateAdapter<Date> | null = inject(DateAdapter, {
    optional: true
  });
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly languageSignal = signal<SupportedLanguage>(APP_CONFIG.locales.default);
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.translateService.addLangs([...this.config.locales.supported]);
    this.translateService.setDefaultLang(this.config.locales.default);
    const storedLanguage = this.readStoredLanguage();
    const preferredLanguage = this.resolvePreferredLanguage(storedLanguage);
    this.setLanguage(preferredLanguage, false);
    this.initialized = true;
  }

  get currentLanguage(): Signal<SupportedLanguage> {
    return this.languageSignal.asReadonly();
  }

  get options(): LanguageOption[] {
    return this.config.locales.supported.map((code) => ({
      code,
      labelKey: this.config.translationKeys.languages[code],
    }));
  }

  setLanguage(language: SupportedLanguage, persist = true): void {
    if (!this.config.locales.supported.includes(language)) {
      return;
    }

    if (this.translateService.currentLang !== language) {
      this.translateService.use(language);
    }

    this.updateDateLocale(language);
    this.languageSignal.set(language);

    if (persist) {
      this.storeLanguage(language);
    }
  }

  private resolvePreferredLanguage(storedLanguage: string | null): SupportedLanguage {
    if (storedLanguage && this.config.locales.supported.includes(storedLanguage as SupportedLanguage)) {
      return storedLanguage as SupportedLanguage;
    }

    const navigatorLanguage = typeof window !== 'undefined' ? window.navigator.language : null;
    const resolved = resolveLanguage(
      this.config.locales.supported,
      this.config.locales.fallback,
      navigatorLanguage,
    );

    return this.config.locales.supported.includes(resolved as SupportedLanguage)
      ? (resolved as SupportedLanguage)
      : this.config.locales.default;
  }

  private readStoredLanguage(): string | null {
    if (!storageAvailable()) {
      return null;
    }

    return window.localStorage.getItem(this.config.locales.storageKey);
  }

  private storeLanguage(language: SupportedLanguage): void {
    if (!storageAvailable()) {
      return;
    }

    window.localStorage.setItem(this.config.locales.storageKey, language);
  }

  private updateDateLocale(language: SupportedLanguage): void {
    if (!this.dateAdapter) {
      return;
    }

    const fallbackLanguage = this.config.locales.default;
    const localeMap = this.config.locales.dateLocales;
    const resolvedLocale = localeMap[language] ?? localeMap[fallbackLanguage];

    this.dateAdapter.setLocale(resolvedLocale);
  }
}

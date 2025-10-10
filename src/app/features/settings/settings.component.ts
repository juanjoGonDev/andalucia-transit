import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG, SupportedLanguage } from '../../core/config';
import { LanguageService } from '../../core/services/language.service';
import { LanguageOption } from '../../core/interfaces/language-option.interface';
import { APP_VERSION_TOKEN } from '../../core/tokens/app-version.token';

const VERSION_VARIABLE_KEY = 'version' as const;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly languageService = inject(LanguageService);
  private readonly versionValue = inject(APP_VERSION_TOKEN);
  private readonly translations = APP_CONFIG.translationKeys.settings;

  protected readonly titleKey = this.translations.title;
  protected readonly descriptionKey = this.translations.description;
  protected readonly languageTitleKey = this.translations.language.title;
  protected readonly languageDescriptionKey = this.translations.language.description;
  protected readonly versionTitleKey = this.translations.version.title;
  protected readonly versionLabelKey = this.translations.version.label;

  protected readonly languageOptions: readonly LanguageOption[] = this.languageService.options;
  protected readonly currentLanguage: Signal<SupportedLanguage> = this.languageService.currentLanguage;
  protected readonly version = this.versionValue;
  protected readonly versionTemplateVariables = { [VERSION_VARIABLE_KEY]: this.version } as const;

  protected onLanguageSelected(language: SupportedLanguage): void {
    if (this.currentLanguage() === language) {
      return;
    }

    this.languageService.setLanguage(language);
  }
}

import { ChangeDetectionStrategy, Component, TrackByFunction, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { SectionComponent } from '../../shared/ui/section/section.component';
import { LanguageService } from '../../core/services/language.service';
import { APP_CONFIG, SupportedLanguage } from '../../core/config';
import { LanguageOption } from '../../core/interfaces/language-option.interface';
import { APP_VERSION } from '../../core/tokens/app-version.token';

interface LanguageItem extends LanguageOption {
  readonly isActive: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslateModule, SectionComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly languageService = inject(LanguageService);
  private readonly appVersion = inject(APP_VERSION);

  private readonly translation = APP_CONFIG.translationKeys.settings;

  protected readonly languageSectionTitleKey = this.translation.sections.language.title;
  protected readonly languageDescriptionKey = this.translation.sections.language.description;
  protected readonly languageActionLabelKey = this.translation.sections.language.actionLabel;
  protected readonly languageActiveLabelKey = this.translation.sections.language.activeLabel;
  protected readonly applicationSectionTitleKey = this.translation.sections.application.title;
  protected readonly applicationVersionLabelKey = this.translation.sections.application.versionLabel;
  protected readonly version = this.appVersion;

  protected readonly languageOptions: readonly LanguageOption[] = this.languageService.options;
  protected readonly currentLanguage = this.languageService.currentLanguage;
  protected readonly languageItems = computed<readonly LanguageItem[]>(() =>
    this.languageOptions.map((option) => ({
      ...option,
      isActive: this.currentLanguage() === option.code
    }))
  );

  protected readonly languageTrackBy: TrackByFunction<LanguageItem> = (_: number, item: LanguageItem) => item.code;

  protected onLanguageSelected(language: SupportedLanguage): void {
    if (this.currentLanguage() === language) {
      return;
    }
    this.languageService.setLanguage(language);
  }
}

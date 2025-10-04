import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG, SupportedLanguage } from '../../../core/config';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, TranslateModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageSwitcherComponent {
  private readonly languageService = inject(LanguageService);
  protected readonly translationKeys = APP_CONFIG.translationKeys.navigation;
  protected readonly options = this.languageService.options;
  protected readonly currentLanguage = this.languageService.currentLanguage;

  changeLanguage(language: SupportedLanguage): void {
    this.languageService.setLanguage(language);
  }
}

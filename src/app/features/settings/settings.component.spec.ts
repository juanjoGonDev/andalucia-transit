import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Signal, signal } from '@angular/core';
import { of } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { SettingsComponent } from './settings.component';
import { LanguageService } from '../../core/services/language.service';
import { LanguageOption } from '../../core/interfaces/language-option.interface';
import { SupportedLanguage, APP_CONFIG } from '../../core/config';
import { APP_VERSION_TOKEN } from '../../core/tokens/app-version.token';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      'settings.title': 'Settings',
      'settings.description': 'Manage preferences',
      'settings.language.title': 'Language',
      'settings.language.description': 'Choose language',
      'settings.version.title': 'Application version',
      'settings.version.label': 'Version {{ version }}',
      'languages.es': 'Spanish',
      'languages.en': 'English'
    });
  }
}

class LanguageServiceStub {
  private readonly languageSignal = signal<SupportedLanguage>('es');
  readonly options: readonly LanguageOption[] = APP_CONFIG.locales.supported.map((code) => ({
    code,
    labelKey: APP_CONFIG.translationKeys.languages[code]
  }));
  readonly setLanguage = jasmine.createSpy<(language: SupportedLanguage, persist?: boolean) => void>(
    'setLanguage'
  );

  get currentLanguage(): Signal<SupportedLanguage> {
    return this.languageSignal.asReadonly();
  }
}

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let languageService: LanguageServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SettingsComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: LanguageService, useClass: LanguageServiceStub },
        { provide: APP_VERSION_TOKEN, useValue: '1.2.3' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    languageService = TestBed.inject(LanguageService) as unknown as LanguageServiceStub;
    fixture.detectChanges();
  });

  it('changes the application language when selecting an option', () => {
    const buttonNodes = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const buttons = Array.from(buttonNodes);
    const englishButton = buttons.find((buttonElement) => buttonElement.textContent?.trim() === 'English');

    expect(englishButton).toBeDefined();

    englishButton?.click();

    expect(languageService.setLanguage).toHaveBeenCalledWith('en');
  });

  it('renders the application version', () => {
    const versionElement = fixture.nativeElement.querySelector('.settings__version');

    expect(versionElement?.textContent?.trim()).toBe('Version 1.2.3');
  });
});

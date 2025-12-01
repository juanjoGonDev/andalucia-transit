import { TestBed } from '@angular/core/testing';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { LanguageService } from '@core/services/language.service';

class EmptyTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('LanguageService', () => {
  let service: LanguageService;
  let dateAdapter: DateAdapter<Date>;
  const defaultLanguage = APP_CONFIG.locales.default;
  const alternateLanguage = APP_CONFIG.locales.supported.find(
    (code) => code !== defaultLanguage
  ) ?? defaultLanguage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        }),
        MatNativeDateModule
      ]
    });

    service = TestBed.inject(LanguageService);
    dateAdapter = TestBed.inject(DateAdapter);
    service.initialize();
  });

  it('updates the date adapter locale when selecting the alternate language', () => {
    const setLocaleSpy = spyOn(dateAdapter, 'setLocale').and.callThrough();

    service.setLanguage(alternateLanguage);

    expect(setLocaleSpy).toHaveBeenCalledWith(APP_CONFIG.locales.dateLocales[alternateLanguage]);
  });

  it('updates the date adapter locale when selecting the default language', () => {
    const setLocaleSpy = spyOn(dateAdapter, 'setLocale').and.callThrough();

    service.setLanguage(defaultLanguage);

    expect(setLocaleSpy).toHaveBeenCalledWith(APP_CONFIG.locales.dateLocales[defaultLanguage]);
  });
});

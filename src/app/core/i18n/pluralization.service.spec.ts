import { TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom, of } from 'rxjs';

import { PluralizationService } from './pluralization.service';
import { PluralizedTranslationKeys } from './pluralization';

class TestTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

const SINGULAR_KEY = 'translation.one' as const;
const PLURAL_KEY = 'translation.other' as const;
const ZERO_KEY = 'translation.zero' as const;

function buildTranslations(): PluralizedTranslationKeys {
  return {
    one: SINGULAR_KEY,
    other: PLURAL_KEY
  } as const;
}

describe('PluralizationService', () => {
  let service: PluralizationService;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TestTranslateLoader }
        })
      ]
    });

    translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('es');
    service = TestBed.inject(PluralizationService);
  });

  it('selects the singular translation key for counts of one', () => {
    const translations = buildTranslations();

    const key = service.selectTranslationKey(1, translations);

    expect(key).toBe(SINGULAR_KEY);
  });

  it('selects the plural translation key for counts greater than one', () => {
    const translations = buildTranslations();

    const key = service.selectTranslationKey(3, translations);

    expect(key).toBe(PLURAL_KEY);
  });

  it('updates the selected key when the active language changes', async () => {
    const translations: PluralizedTranslationKeys = {
      one: SINGULAR_KEY,
      other: PLURAL_KEY,
      zero: ZERO_KEY
    };

    const initialKey = service.selectTranslationKey(0, translations);

    expect(initialKey).toBe(PLURAL_KEY);

    await firstValueFrom(translate.use('ar'));

    const updatedKey = service.selectTranslationKey(0, translations);

    expect(updatedKey).toBe(ZERO_KEY);
  });
});

import { TestBed } from '@angular/core/testing';
import * as pluralizationModule from './pluralization';
import { PluralizedTranslationKeys } from './pluralization';
import {
  PLURAL_RULES_FACTORY,
  PluralRulesFactory,
  PluralizationService
} from './pluralization.service';

describe('PluralizationService', () => {
  let service: PluralizationService;
  let factory: jasmine.Spy<PluralRulesFactory>;

  beforeEach(() => {
    factory = jasmine
      .createSpy<PluralRulesFactory>('factory', (language: string) =>
        pluralizationModule.createPluralRules(language)
      )
      .and.callThrough();

    TestBed.configureTestingModule({
      providers: [{ provide: PLURAL_RULES_FACTORY, useValue: factory }]
    });
    service = TestBed.inject(PluralizationService);
  });

  it('resolves the preferred language from provided options', () => {
    const language = service.resolveLanguage({
      current: null,
      defaultLanguage: 'en',
      fallback: 'es'
    });

    expect(language).toBe('en');
  });

  it('falls back to the provided fallback language when others are missing', () => {
    const language = service.resolveLanguage({
      current: undefined,
      defaultLanguage: null,
      fallback: 'es'
    });

    expect(language).toBe('es');
  });

  it('selects pluralized translation keys with cached rules per language', () => {
    const translations: PluralizedTranslationKeys = { one: 'one', other: 'other' };

    const first = service.selectKey(1, translations, 'es');
    const second = service.selectKey(2, translations, 'es');

    expect(first).toBe('one');
    expect(second).toBe('other');
    expect(factory).toHaveBeenCalledTimes(1);

    service.selectKey(1, translations, 'en');

    expect(factory).toHaveBeenCalledTimes(2);
  });
});

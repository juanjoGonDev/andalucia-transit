import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { HolidayCalendarService } from './holiday-calendar.service';
import { HolidayCalendarApiService, ApiPublicHoliday } from './holiday-calendar.api-service';
import { APP_CONFIG } from '../../core/config';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';

class HolidayCalendarApiServiceStub {
  constructor(private readonly entries: readonly ApiPublicHoliday[], private readonly spy?: jasmine.Spy) {}

  loadPublicHolidays(year: number) {
    this.spy?.(year);
    return of(this.entries);
  }
}

describe('HolidayCalendarService', () => {
  function setup(entries: readonly ApiPublicHoliday[], spy?: jasmine.Spy): HolidayCalendarService {
    TestBed.configureTestingModule({
      providers: [
        HolidayCalendarService,
        { provide: HolidayCalendarApiService, useValue: new HolidayCalendarApiServiceStub(entries, spy) },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });

    return TestBed.inject(HolidayCalendarService);
  }

  it('returns a holiday match for Andalusian regional holidays', (done) => {
    const entries: ApiPublicHoliday[] = [
      buildHoliday('2025-02-28', false, ['ES-AN'], 'Día de Andalucía'),
      buildHoliday('2025-05-01', true, null, 'Día del Trabajo')
    ];
    const service = setup(entries);

    service.getHoliday(new Date('2025-02-28T12:00:00Z')).subscribe((match) => {
      expect(match?.localName).toBe('Día de Andalucía');
      expect(match?.englishName).toBe('Día de Andalucía');
      done();
    });
  });

  it('returns null when the date is not a holiday', (done) => {
    const entries: ApiPublicHoliday[] = [
      buildHoliday('2025-02-28', false, ['ES-AN'], 'Día de Andalucía')
    ];
    const service = setup(entries);

    service.getHoliday(new Date('2025-03-03T12:00:00Z')).subscribe((match) => {
      expect(match).toBeNull();
      done();
    });
  });

  it('reuses cached data for multiple queries in the same year', (done) => {
    const spy = jasmine.createSpy('loadPublicHolidays');
    const entries: ApiPublicHoliday[] = [
      buildHoliday('2025-02-28', false, ['ES-AN'], 'Día de Andalucía')
    ];
    const service = setup(entries, spy);

    service.isHoliday(new Date('2025-02-28T10:00:00Z')).subscribe(() => {
      service.isHoliday(new Date('2025-05-01T10:00:00Z')).subscribe(() => {
        expect(spy).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  function buildHoliday(
    date: string,
    isGlobal: boolean,
    regions: readonly string[] | null,
    name: string
  ): ApiPublicHoliday {
    return {
      date,
      localName: name,
      name,
      countryCode: 'ES',
      fixed: false,
      global: isGlobal,
      counties: regions,
      launchYear: null,
      types: ['Public']
    } satisfies ApiPublicHoliday;
  }
});

import { TestBed } from '@angular/core/testing';
import { DateTime } from 'luxon';
import { of } from 'rxjs';

import { RouteTimetableService, RouteTimetableRequest } from './route-timetable.service';
import { RouteTimetableApiService, ApiRouteTimetableResponse } from './route-timetable.api-service';
import { APP_CONFIG } from '../../core/config';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';

class RouteTimetableApiServiceStub {
  constructor(private readonly response: ApiRouteTimetableResponse) {}

  loadTimetable() {
    return of(this.response);
  }
}

class HolidayCalendarServiceStub {
  constructor(private readonly holiday: boolean) {}

  isHoliday() {
    return of(this.holiday);
  }
}

describe('RouteTimetableService', () => {
  const request: RouteTimetableRequest = {
    consortiumId: 6,
    originNucleusId: '74',
    destinationNucleusId: '10',
    queryDate: new Date('2025-10-06T00:00:00Z')
  };

  function setup(response: ApiRouteTimetableResponse, holiday = false): RouteTimetableService {
    TestBed.configureTestingModule({
      providers: [
        RouteTimetableService,
        { provide: RouteTimetableApiService, useValue: new RouteTimetableApiServiceStub(response) },
        { provide: HolidayCalendarService, useValue: new HolidayCalendarServiceStub(holiday) },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });

    return TestBed.inject(RouteTimetableService);
  }

  it('maps timetable entries to departure and arrival dates within the configured timezone', (done) => {
    const response = buildResponse([
      buildApiEntry('17', 'M-301', ['08:15', '09:00'], 'L-V', 'Anotación'),
      buildApiEntry('17', 'M-301', ['07:30', '08:05'], 'L-V', '')
    ]);

    const service = setup(response);

    service.loadTimetable(request).subscribe((entries) => {
      expect(entries.length).toBe(2);
      const [first, second] = entries;
      expect(first.departureTime.toISOString()).toBe('2025-10-06T05:30:00.000Z');
      expect(first.arrivalTime.toISOString()).toBe('2025-10-06T06:05:00.000Z');
      expect(first.notes).toBeNull();
      expect(second.departureTime.toISOString()).toBe('2025-10-06T06:15:00.000Z');
      expect(second.arrivalTime.toISOString()).toBe('2025-10-06T07:00:00.000Z');
      expect(second.notes).toBe('Anotación');
      done();
    });
  });

  it('filters timetable entries whose frequency does not match the query date', (done) => {
    const response = buildResponse(
      [
        buildApiEntry('17', 'M-301', ['08:15', '09:00'], 'S', ''),
        buildApiEntry('40', 'M-380', ['09:30', '10:20'], 'L-V', '')
      ],
      [
        { idfrecuencia: '1', acronimo: 'L-V', nombre: 'Lunes a viernes' },
        { idfrecuencia: '2', acronimo: 'S', nombre: 'Sábados' }
      ]
    );

    const service = setup(response);

    service.loadTimetable(request).subscribe((entries) => {
      expect(entries.length).toBe(1);
      expect(entries[0].lineId).toBe('40');
      done();
    });
  });

  it('rolls arrival times that cross midnight into the next day', (done) => {
    const response = buildResponse([
      buildApiEntry('32', 'M-370', ['23:50', '00:20'], 'L-V', '')
    ]);

    const service = setup(response);

    service.loadTimetable(request).subscribe((entries) => {
      expect(entries.length).toBe(1);
      const entry = entries[0];
      const arrivalLocal = DateTime.fromJSDate(entry.arrivalTime, {
        zone: APP_CONFIG.data.timezone,
      });
      expect(arrivalLocal.day).toBe(7);
      done();
    });
  });

  it('sorts entries by departure time', (done) => {
    const response = buildResponse([
      buildApiEntry('17', 'M-301', ['10:30', '11:15'], 'L-V', ''),
      buildApiEntry('40', 'M-380', ['07:45', '08:35'], 'L-V', ''),
      buildApiEntry('47', 'M-383', ['09:10', '09:45'], 'L-V', '')
    ]);

    const service = setup(response);

    service.loadTimetable(request).subscribe((entries) => {
      expect(entries.map((entry) => entry.lineId)).toEqual(['40', '47', '17']);
      done();
    });
  });

  it('includes holiday services when the query date is a holiday', (done) => {
    const response = buildResponse(
      [
        buildApiEntry('90', 'M-999', ['08:00', '08:45'], 'S-D-F', ''),
        buildApiEntry('17', 'M-301', ['09:00', '09:40'], 'L-V', '')
      ],
      [
        { idfrecuencia: '9', acronimo: 'S-D-F', nombre: 'Sábados, domingos y festivos' },
        { idfrecuencia: '1', acronimo: 'L-V', nombre: 'Lunes a viernes' }
      ]
    );

    const service = setup(response, true);

    service.loadTimetable(request).subscribe((entries) => {
      expect(entries.map((entry) => entry.lineId)).toEqual(['90', '17']);
      done();
    });
  });

  it('excludes holiday-only services when the query date is not a holiday', (done) => {
    const response = buildResponse(
      [
        buildApiEntry('90', 'M-999', ['08:00', '08:45'], 'F', ''),
        buildApiEntry('17', 'M-301', ['09:00', '09:40'], 'L-V', '')
      ],
      [
        { idfrecuencia: '99', acronimo: 'F', nombre: 'Festivos' },
        { idfrecuencia: '1', acronimo: 'L-V', nombre: 'Lunes a viernes' }
      ]
    );

    const service = setup(response, false);

    service.loadTimetable(request).subscribe((entries) => {
      expect(entries.map((entry) => entry.lineId)).toEqual(['17']);
      done();
    });
  });

  function buildResponse(
    entries: ApiRouteTimetableResponse['horario'],
    frequencies?: ApiRouteTimetableResponse['frecuencias']
  ): ApiRouteTimetableResponse {
    const resolvedFrequencies =
      frequencies ?? [
        { idfrecuencia: '1', acronimo: 'L-V', nombre: 'Lunes a viernes' },
        { idfrecuencia: '2', acronimo: 'S', nombre: 'Sábados' },
        { idfrecuencia: '9', acronimo: 'S-D-F', nombre: 'Sábados, domingos y festivos' },
        { idfrecuencia: '99', acronimo: 'F', nombre: 'Festivos' }
      ];

    return {
      bloques: [],
      horario: entries,
      frecuencias: resolvedFrequencies
    } satisfies ApiRouteTimetableResponse;
  }

  function buildApiEntry(
    idlinea: string,
    codigo: string,
    horas: readonly string[],
    dias: string,
    observaciones: string
  ): ApiRouteTimetableResponse['horario'][number] {
    return {
      idlinea,
      codigo,
      horas,
      dias,
      observaciones,
      demandahoras: ''
    };
  }
});

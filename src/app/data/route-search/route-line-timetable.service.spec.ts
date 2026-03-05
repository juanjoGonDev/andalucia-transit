import { TestBed } from '@angular/core/testing';
import { DateTime } from 'luxon';
import { of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { HolidayCalendarService } from '@data/holidays/holiday-calendar.service';
import {
  ApiRouteLineFrequency,
  ApiRouteLinePlanner,
  ApiRouteLineTimetableResponse,
  RouteLineTimetableApiService
} from '@data/route-search/route-line-timetable.api-service';
import {
  RouteLineTimetableRequest,
  RouteLineTimetableService
} from '@data/route-search/route-line-timetable.service';

class RouteLineTimetableApiServiceStub {
  constructor(private readonly response: ApiRouteLineTimetableResponse) {}

  loadLineTimetable() {
    return of(this.response);
  }
}

class HolidayCalendarServiceStub {
  constructor(private readonly holiday: boolean) {}

  isHoliday() {
    return of(this.holiday);
  }
}

describe('RouteLineTimetableService', () => {
  const request: RouteLineTimetableRequest = {
    consortiumId: 6,
    lineId: '31',
    lineCode: 'M-356',
    queryDate: new Date('2025-01-02T00:00:00Z'),
    originNames: ['La Gangosa - Av. Prado'],
    destinationNames: ['Estacion Intermodal']
  };

  function setup(
    response: ApiRouteLineTimetableResponse,
    holiday = false
  ): RouteLineTimetableService {
    TestBed.configureTestingModule({
      providers: [
        RouteLineTimetableService,
        { provide: RouteLineTimetableApiService, useValue: new RouteLineTimetableApiServiceStub(response) },
        { provide: HolidayCalendarService, useValue: new HolidayCalendarServiceStub(holiday) },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });

    return TestBed.inject(RouteLineTimetableService);
  }

  it('maps line timetable entries using matching blocks', (done) => {
    const planner = buildPlanner({
      bloquesIda: [buildBlock('LA GANGOSA - AV. PRADO'), buildBlock('ESTACION INTERMODAL')],
      horarioIda: [buildSchedule(['08:00', '08:30'], 'L-V', '')]
    });
    const response = buildResponse([planner]);
    const service = setup(response);

    service.loadLineTimetable(request).subscribe((entries) => {
      expect(entries.length).toBe(1);
      const entry = entries[0];
      const departureLocal = DateTime.fromJSDate(entry.departureTime, {
        zone: APP_CONFIG.data.timezone
      });
      const arrivalLocal = DateTime.fromJSDate(entry.arrivalTime, {
        zone: APP_CONFIG.data.timezone
      });
      expect(departureLocal.hour).toBe(8);
      expect(departureLocal.minute).toBe(0);
      expect(arrivalLocal.hour).toBe(8);
      expect(arrivalLocal.minute).toBe(30);
      expect(entry.lineId).toBe('31');
      expect(entry.lineCode).toBe('M-356');
      expect(entry.notes).toBeNull();
      done();
    });
  });

  it('excludes holiday-only schedules when the query date is not a holiday', (done) => {
    const response = buildResponse(
      [
        buildPlanner({
          bloquesIda: [buildBlock('LA GANGOSA - AV. PRADO'), buildBlock('ESTACION INTERMODAL')],
          horarioIda: [buildSchedule(['08:00', '08:30'], 'F', '')]
        })
      ],
      [{ idfrecuencia: '9', acronimo: 'F', nombre: 'Festivos' }]
    );
    const service = setup(response, false);

    service.loadLineTimetable(request).subscribe((entries) => {
      expect(entries.length).toBe(0);
      done();
    });
  });

  it('includes holiday-only schedules when the query date is a holiday', (done) => {
    const response = buildResponse(
      [
        buildPlanner({
          bloquesIda: [buildBlock('LA GANGOSA - AV. PRADO'), buildBlock('ESTACION INTERMODAL')],
          horarioIda: [buildSchedule(['08:00', '08:30'], 'F', '')]
        })
      ],
      [{ idfrecuencia: '9', acronimo: 'F', nombre: 'Festivos' }]
    );
    const service = setup(response, true);

    service.loadLineTimetable(request).subscribe((entries) => {
      expect(entries.length).toBe(1);
      expect(entries[0].isHolidayOnly).toBeTrue();
      done();
    });
  });

  function buildResponse(
    planners: readonly ApiRouteLinePlanner[],
    frequencies?: readonly ApiRouteLineFrequency[]
  ): ApiRouteLineTimetableResponse {
    return {
      frecuencias: frequencies ?? [
        { idfrecuencia: '1', acronimo: 'L-V', nombre: 'Lunes a viernes' },
        { idfrecuencia: '9', acronimo: 'S-D-F', nombre: 'Sabados, domingos y festivos' }
      ],
      planificadores: planners
    } satisfies ApiRouteLineTimetableResponse;
  }

  function buildPlanner(
    overrides: Partial<ApiRouteLinePlanner>
  ): ApiRouteLinePlanner {
    return {
      idPlani: 'plan-1',
      fechaInicio: '2024-01-01',
      fechaFin: '2025-12-31',
      muestraFechaFin: '1',
      bloquesIda: [],
      bloquesVuelta: [],
      horarioIda: [],
      horarioVuelta: [],
      ...overrides
    } satisfies ApiRouteLinePlanner;
  }

  function buildBlock(nombre: string): ApiRouteLinePlanner['bloquesIda'][number] {
    return {
      nombre,
      color: '#000000',
      tipo: '0'
    };
  }

  function buildSchedule(
    horas: readonly string[],
    frecuencia: string,
    observaciones: string
  ): ApiRouteLinePlanner['horarioIda'][number] {
    return {
      horas,
      frecuencia,
      observaciones
    };
  }
});

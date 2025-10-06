import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { StopScheduleService } from './stop-schedule.service';
import { StopDirectoryService, StopDirectoryRecord } from '../stops/stop-directory.service';
import {
  StopScheduleSnapshotRepository,
  StopScheduleSnapshotRecord
} from './stop-schedule-snapshot.repository';
import { StopScheduleApiService, ApiStopInformation, ApiStopServicesResponse } from './stop-schedule.api-service';
import { RuntimeFlagsService } from '../../core/runtime/runtime-flags.service';
import { StopScheduleResult } from '../../domain/stop-schedule/stop-schedule.model';

class StopDirectoryStub {
  constructor(private readonly record: StopDirectoryRecord | null) {}

  getStopById() {
    return of(this.record);
  }
}

class RuntimeFlagsStub {
  constructor(private readonly forceSnapshot: boolean) {}

  shouldForceSnapshot(): boolean {
    return this.forceSnapshot;
  }
}

class SnapshotRepositoryStub {
  constructor(private readonly record: StopScheduleSnapshotRecord | null) {}

  getSnapshotForStop() {
    return of(this.record);
  }
}

class ApiServiceStub {
  constructor(
    private readonly info: ApiStopInformation,
    private readonly services: ApiStopServicesResponse,
    private readonly shouldFail: boolean
  ) {}

  loadStopInformation() {
    if (this.shouldFail) {
      return throwError(() => new Error('api failure'));
    }

    return of(this.info);
  }

  loadStopServices() {
    if (this.shouldFail) {
      return throwError(() => new Error('api failure'));
    }

    return of(this.services);
  }
}

describe('StopScheduleService', () => {
  const metadata: StopDirectoryRecord = {
    consortiumId: 7,
    stopId: '55',
    stopCode: '55',
    name: 'Apeadero Torredonjimeno',
    municipality: 'Torredonjimeno',
    municipalityId: '8',
    nucleus: 'Torredonjimeno',
    nucleusId: '27',
    zone: 'B',
    location: { latitude: 37.76464, longitude: -3.94937 }
  };

  const apiInfo: ApiStopInformation = {
    idParada: '55',
    nombre: 'Apeadero Torredonjimeno',
    latitud: '37.764640',
    longitud: '-3.949370',
    municipio: 'Torredonjimeno',
    nucleo: 'Torredonjimeno'
  };

  const apiServices: ApiStopServicesResponse = {
    servicios: [
      {
        idParada: '55',
        idLinea: '24',
        servicio: '12:15',
        nombre: 'Jaén - Martos',
        linea: 'M2-1',
        sentido: '2',
        destino: 'Jaén',
        tipo: '0'
      }
    ],
    horaIni: '2025-01-10 12:00',
    horaFin: '2025-01-10 13:00'
  };

  const snapshotRecord: StopScheduleSnapshotRecord = {
    metadata: {
      generatedAt: new Date('2025-01-10T05:00:00Z'),
      timezone: 'Europe/Madrid'
    },
    stop: {
      consortiumId: 7,
      stopId: '55',
      stopCode: '55',
      stopName: 'Apeadero Torredonjimeno',
      municipality: 'Torredonjimeno',
      nucleus: 'Torredonjimeno',
      location: { latitude: 37.76464, longitude: -3.94937 },
      services: [
        {
          lineId: '24',
          lineCode: 'M2-1',
          lineName: 'Jaén - Martos',
          destination: 'Jaén',
          scheduledTime: new Date('2025-01-10T11:15:00.000Z'),
          direction: 2,
          stopType: 0
        }
      ],
      query: {
        requestedAt: new Date('2025-01-10T05:00:00Z'),
        startTime: new Date('2025-01-10T11:00:00Z'),
        endTime: new Date('2025-01-10T12:00:00Z')
      }
    }
  };

  function setup(
    options: {
      apiShouldFail?: boolean;
      forceSnapshot?: boolean;
      snapshot?: StopScheduleSnapshotRecord | null;
    } = {}
  ): StopScheduleService {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StopScheduleService,
        { provide: StopDirectoryService, useValue: new StopDirectoryStub(metadata) },
        {
          provide: StopScheduleSnapshotRepository,
          useValue: new SnapshotRepositoryStub(options.snapshot ?? snapshotRecord)
        },
        {
          provide: StopScheduleApiService,
          useValue: new ApiServiceStub(apiInfo, apiServices, options.apiShouldFail === true)
        },
        {
          provide: RuntimeFlagsService,
          useValue: new RuntimeFlagsStub(options.forceSnapshot ?? false)
        }
      ]
    });

    return TestBed.inject(StopScheduleService);
  }

  it('returns live schedule data when the API succeeds', (done) => {
    const service = setup();

    service.getStopSchedule('55').subscribe({
      next: (result: StopScheduleResult) => {
        expect(result.dataSource.type).toBe('api');
        expect(result.schedule.services.length).toBe(1);
        expect(result.schedule.services[0].destination).toBe('Jaén');
        done();
      },
      error: done.fail
    });
  });

  it('falls back to the snapshot when the API fails', (done) => {
    const service = setup({ apiShouldFail: true });

    service.getStopSchedule('55').subscribe({
      next: (result: StopScheduleResult) => {
        expect(result.dataSource.type).toBe('snapshot');
        expect(result.schedule.services.length).toBe(1);
        expect(result.schedule.services[0].lineCode).toBe('M2-1');
        done();
      },
      error: done.fail
    });
  });

  it('uses the snapshot when runtime flags force it', (done) => {
    const service = setup({ forceSnapshot: true });

    service.getStopSchedule('55').subscribe({
      next: (result: StopScheduleResult) => {
        expect(result.dataSource.type).toBe('snapshot');
        expect(result.schedule.stopName).toBe('Apeadero Torredonjimeno');
        done();
      },
      error: done.fail
    });
  });

  it('reports a descriptive error when live data fails and no snapshot exists', (done) => {
    const service = setup({ apiShouldFail: true, snapshot: null });

    service.getStopSchedule('55').subscribe({
      next: () => done.fail('Expected an error'),
      error: (error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Unable to retrieve live schedules');
        expect(error.message).toContain('Portal de Datos Abiertos');
        done();
      }
    });
  });
});

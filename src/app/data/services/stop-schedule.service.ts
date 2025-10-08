import { Injectable, inject } from '@angular/core';
import { DateTime } from 'luxon';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';

import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';
import { RuntimeFlagsService } from '../../core/runtime/runtime-flags.service';
import { StopSchedule, StopScheduleResult, StopService } from '../../domain/stop-schedule/stop-schedule.model';
import {
  StopScheduleSnapshotRepository,
  StopScheduleSnapshotRecord,
  StopScheduleSnapshotService
} from './stop-schedule-snapshot.repository';
import { StopDirectoryService, StopDirectoryRecord } from '../stops/stop-directory.service';
import {
  ApiStopInformation,
  ApiStopServicesResponse,
  ApiStopServiceEntry,
  StopScheduleApiService
} from './stop-schedule.api-service';

const API_RESPONSE_DATE_FORMAT = 'yyyy-LL-dd HH:mm' as const;

@Injectable({ providedIn: 'root' })
export class StopScheduleService {
  private readonly directory = inject(StopDirectoryService);
  private readonly api = inject(StopScheduleApiService);
  private readonly snapshotRepository = inject(StopScheduleSnapshotRepository);
  private readonly runtimeFlags = inject(RuntimeFlagsService);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  getStopSchedule(stopId: string): Observable<StopScheduleResult> {
    return this.directory.getStopById(stopId).pipe(
      switchMap((metadata) => {
        if (!metadata) {
          return throwError(() => new Error(`Unknown stop identifier: ${stopId}`));
        }

        if (this.runtimeFlags.shouldForceSnapshot()) {
          return this.loadFromSnapshot(metadata, null);
        }

        return this.loadFromApi(metadata).pipe(
          catchError((error) => this.loadFromSnapshot(metadata, error))
        );
      })
    );
  }

  private loadFromApi(metadata: StopDirectoryRecord): Observable<StopScheduleResult> {
    const queryTime = new Date();

    return forkJoin({
      info: this.api.loadStopInformation(metadata.consortiumId, metadata.stopId),
      services: this.api.loadStopServices(metadata.consortiumId, metadata.stopId, queryTime)
    }).pipe(map(({ info, services }) => this.buildApiResult(metadata, info, services)));
  }

  private loadFromSnapshot(
    metadata: StopDirectoryRecord,
    apiError: unknown
  ): Observable<StopScheduleResult> {
    return this.snapshotRepository.getSnapshotForStop(metadata.stopId).pipe(
      switchMap((record) => {
        if (!record) {
          if (apiError) {
            return throwError(() =>
              buildApiUnavailableError(
                metadata,
                this.config.data.providerName,
                apiError
              )
            );
          }

          return throwError(() => new Error(`Snapshot not available for stop ${metadata.stopId}`));
        }

        return of(this.buildSnapshotResult(record));
      })
    );
  }

  private buildApiResult(
    metadata: StopDirectoryRecord,
    info: ApiStopInformation,
    response: ApiStopServicesResponse
  ): StopScheduleResult {
    const startDateTime = DateTime.fromFormat(response.horaIni, API_RESPONSE_DATE_FORMAT, {
      zone: this.config.data.timezone
    });

    const services = response.servicios.map((entry, index) =>
      mapApiService(entry, startDateTime, metadata.stopId, index)
    );

    const schedule: StopSchedule = {
      stopId: metadata.stopId,
      stopCode: metadata.stopCode,
      stopName: info.nombre ?? metadata.name,
      queryDate: startDateTime.isValid ? startDateTime.toJSDate() : new Date(),
      generatedAt: new Date(),
      services: Object.freeze(services)
    } satisfies StopSchedule;

    return {
      schedule,
      dataSource: {
        type: 'api',
        providerName: this.config.data.providerName,
        queryTime: schedule.queryDate,
        snapshotTime: null
      }
    } satisfies StopScheduleResult;
  }

  private buildSnapshotResult(record: StopScheduleSnapshotRecord): StopScheduleResult {
    const services = record.stop.services.map((service, index) =>
      mapSnapshotService(service, record.stop.stopId, index)
    );

    const schedule: StopSchedule = {
      stopId: record.stop.stopId,
      stopCode: record.stop.stopCode,
      stopName: record.stop.stopName,
      queryDate: new Date(record.stop.query.startTime),
      generatedAt: new Date(record.stop.query.requestedAt),
      services: Object.freeze(services)
    } satisfies StopSchedule;

    return {
      schedule,
      dataSource: {
        type: 'snapshot',
        providerName: this.config.data.providerName,
        queryTime: schedule.queryDate,
        snapshotTime: new Date(record.metadata.generatedAt)
      }
    } satisfies StopScheduleResult;
  }
}

function mapApiService(
  entry: ApiStopServiceEntry,
  startDateTime: DateTime,
  stopId: string,
  index: number
): StopService {
  const scheduledDateTime = createServiceDateTime(startDateTime, entry.servicio);

  return {
    serviceId: `${stopId}-${entry.idLinea}-${index}`,
    lineId: entry.idLinea,
    lineCode: entry.linea,
    direction: Number(entry.sentido),
    destination: entry.destino,
    arrivalTime: scheduledDateTime.toJSDate(),
    isAccessible: hasFeature(entry.tipo, SERVICE_FEATURE_FLAG.Accessible),
    isUniversityOnly: hasFeature(entry.tipo, SERVICE_FEATURE_FLAG.University)
  } satisfies StopService;
}

function mapSnapshotService(
  service: StopScheduleSnapshotService,
  stopId: string,
  index: number
): StopService {
  return {
    serviceId: `${stopId}-${service.lineId}-${index}`,
    lineId: service.lineId,
    lineCode: service.lineCode,
    direction: service.direction,
    destination: service.destination,
    arrivalTime: new Date(service.scheduledTime),
    isAccessible: hasFeature(service.stopType, SERVICE_FEATURE_FLAG.Accessible),
    isUniversityOnly: hasFeature(service.stopType, SERVICE_FEATURE_FLAG.University)
  } satisfies StopService;
}

function createServiceDateTime(startDateTime: DateTime, time: string): DateTime {
  const candidate = DateTime.fromFormat(`${startDateTime.toFormat('yyyy-LL-dd')} ${time}`, API_RESPONSE_DATE_FORMAT, {
    zone: startDateTime.zone
  });

  if (!candidate.isValid) {
    return startDateTime;
  }

  if (candidate < startDateTime) {
    return candidate.plus({ days: 1 });
  }

  return candidate;
}

function buildApiUnavailableError(
  metadata: StopDirectoryRecord,
  providerName: string,
  cause: unknown
): Error {
  const reason = formatError(cause);
  const message = `Unable to retrieve live schedules for stop ${metadata.stopCode} (${metadata.name}) from ${providerName}. Last error: ${reason}`;

  return new Error(message);
}

const SERVICE_FEATURE_FLAG = {
  Accessible: 1,
  University: 2
} as const;

function hasFeature(value: string | number, flag: number): boolean {
  const numeric = typeof value === 'string' ? Number(value) : value;

  if (Number.isNaN(numeric)) {
    return false;
  }

  return (numeric & flag) === flag;
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

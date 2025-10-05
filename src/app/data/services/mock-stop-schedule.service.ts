import { Injectable } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';

import { StopSchedule, StopService } from '../../domain/stop-schedule/stop-schedule.model';
import { addMinutesToDate, startOfMinute } from '../../domain/utils/time.util';

interface MockServiceDefinition {
  readonly serviceId: string;
  readonly lineCode: string;
  readonly destination: string;
  readonly minutesFromNow: number;
  readonly isAccessible: boolean;
  readonly isUniversityOnly: boolean;
}

interface MockStopDefinition {
  readonly stopId: string;
  readonly stopCode: string;
  readonly stopName: string;
  readonly services: readonly MockServiceDefinition[];
}

export const MOCK_STOP_ID = 'stop-1234';
const DEFAULT_STOP_CODE = '1234';
const DEFAULT_STOP_NAME = 'Avenida de la Innovación - Campus Universitario';
const RESPONSE_DELAY_MS = 320;

const MOCK_STOP_DEFINITION: MockStopDefinition = {
  stopId: MOCK_STOP_ID,
  stopCode: DEFAULT_STOP_CODE,
  stopName: DEFAULT_STOP_NAME,
  services: [
    {
      serviceId: 'service-001',
      lineCode: 'M-101',
      destination: 'Prado de San Sebastián',
      minutesFromNow: -12,
      isAccessible: true,
      isUniversityOnly: false
    },
    {
      serviceId: 'service-002',
      lineCode: 'M-202',
      destination: 'Campus Universitario',
      minutesFromNow: -3,
      isAccessible: false,
      isUniversityOnly: true
    },
    {
      serviceId: 'service-003',
      lineCode: 'M-301',
      destination: 'San Bernardo',
      minutesFromNow: 4,
      isAccessible: true,
      isUniversityOnly: false
    },
    {
      serviceId: 'service-004',
      lineCode: 'M-405',
      destination: 'Parque Tecnológico',
      minutesFromNow: 11,
      isAccessible: true,
      isUniversityOnly: true
    },
    {
      serviceId: 'service-005',
      lineCode: 'M-512',
      destination: 'Pino Montano',
      minutesFromNow: 24,
      isAccessible: false,
      isUniversityOnly: false
    },
    {
      serviceId: 'service-006',
      lineCode: 'M-602',
      destination: 'Campus Universitario',
      minutesFromNow: 38,
      isAccessible: true,
      isUniversityOnly: true
    }
  ]
} as const;

@Injectable({ providedIn: 'root' })
export class MockStopScheduleService {
  getStopSchedule(stopId: string = MOCK_STOP_ID): Observable<StopSchedule> {
    return of(MOCK_STOP_DEFINITION).pipe(
      map((definition) => createSchedule(definition, stopId)),
      delay(RESPONSE_DELAY_MS)
    );
  }
}

function createSchedule(definition: MockStopDefinition, requestedStopId: string): StopSchedule {
  const now = startOfMinute(new Date());
  const services = definition.services.map((service) => createService(now, service));
  const orderedServices = [...services].sort((first, second) => first.arrivalTime.getTime() - second.arrivalTime.getTime());

  return {
    stopId: requestedStopId,
    stopCode: definition.stopCode,
    stopName: definition.stopName,
    queryDate: now,
    generatedAt: now,
    services: Object.freeze(orderedServices)
  } satisfies StopSchedule;
}

function createService(reference: Date, definition: MockServiceDefinition): StopService {
  return {
    serviceId: definition.serviceId,
    lineCode: definition.lineCode,
    destination: definition.destination,
    arrivalTime: addMinutesToDate(reference, definition.minutesFromNow),
    isAccessible: definition.isAccessible,
    isUniversityOnly: definition.isUniversityOnly
  } satisfies StopService;
}

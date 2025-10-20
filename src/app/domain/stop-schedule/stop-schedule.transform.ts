import { calculateUpcomingProgress } from '../utils/progress.util';
import { differenceInMinutes } from '../utils/time.util';
import {
  StopScheduleDataSource,
  StopScheduleDataSourceType,
  StopScheduleResult,
  StopService
} from './stop-schedule.model';

export interface StopScheduleUpcomingItem {
  readonly serviceId: string;
  readonly lineCode: string;
  readonly destination: string;
  readonly arrivalTime: Date;
  readonly minutesUntilArrival: number;
  readonly isNext: boolean;
  readonly isAccessible: boolean;
  readonly isUniversityOnly: boolean;
  readonly progressPercentage: number;
}

export interface StopSchedulePastItem {
  readonly serviceId: string;
  readonly lineCode: string;
  readonly destination: string;
  readonly arrivalTime: Date;
  readonly minutesSinceDeparture: number;
  readonly isAccessible: boolean;
  readonly isUniversityOnly: boolean;
}

export interface StopScheduleUiModel {
  readonly stopName: string;
  readonly stopCode: string;
  readonly scheduleDate: Date;
  readonly generatedAt: Date;
  readonly availableDestinations: readonly string[];
  readonly upcoming: readonly StopScheduleUpcomingItem[];
  readonly past: readonly StopSchedulePastItem[];
  readonly dataSource: StopScheduleSourceUiModel;
}

export interface StopScheduleSourceUiModel {
  readonly type: StopScheduleDataSourceType;
  readonly providerName: string;
  readonly queryTime: Date;
  readonly snapshotTime: Date | null;
}

export function buildStopScheduleUiModel(
  result: StopScheduleResult,
  currentTime: Date,
  destinationFilter: string | null
): StopScheduleUiModel {
  const schedule = result.schedule;
  const availableDestinations = buildDestinationList(schedule.services);
  const filteredServices = destinationFilter
    ? schedule.services.filter((service) => service.destination === destinationFilter)
    : schedule.services;

  const sortedServices = [...filteredServices].sort(compareByArrivalTime);
  const upcoming: StopScheduleUpcomingItem[] = [];
  const past: StopSchedulePastItem[] = [];

  for (const service of sortedServices) {
    const minutesDifference = differenceInMinutes(service.arrivalTime, currentTime);

    if (minutesDifference >= 0) {
      upcoming.push({
        serviceId: service.serviceId,
        lineCode: service.lineCode,
        destination: service.destination,
        arrivalTime: service.arrivalTime,
        minutesUntilArrival: minutesDifference,
        isNext: false,
        isAccessible: service.isAccessible,
        isUniversityOnly: service.isUniversityOnly,
        progressPercentage: calculateUpcomingProgress(minutesDifference)
      });
      continue;
    }

    past.push({
      serviceId: service.serviceId,
      lineCode: service.lineCode,
      destination: service.destination,
      arrivalTime: service.arrivalTime,
      minutesSinceDeparture: Math.abs(minutesDifference),
      isAccessible: service.isAccessible,
      isUniversityOnly: service.isUniversityOnly
    });
  }

  if (upcoming.length > 0) {
    upcoming[0] = {
      ...upcoming[0],
      isNext: true
    };
  }

  const orderedPast = [...past].sort((first, second) => second.arrivalTime.getTime() - first.arrivalTime.getTime());

  return {
    stopName: schedule.stopName,
    stopCode: schedule.stopCode,
    scheduleDate: schedule.queryDate,
    generatedAt: schedule.generatedAt,
    availableDestinations,
    upcoming,
    past: orderedPast,
    dataSource: mapDataSource(result.dataSource)
  } satisfies StopScheduleUiModel;
}

function mapDataSource(source: StopScheduleDataSource): StopScheduleSourceUiModel {
  return {
    type: source.type,
    providerName: source.providerName,
    queryTime: source.queryTime,
    snapshotTime: source.snapshotTime
  } satisfies StopScheduleSourceUiModel;
}

function buildDestinationList(services: readonly StopService[]): readonly string[] {
  const destinationSet = new Set<string>();

  for (const service of services) {
    destinationSet.add(service.destination);
  }

  return [...destinationSet].sort((first, second) => first.localeCompare(second));
}

function compareByArrivalTime(first: StopService, second: StopService): number {
  return first.arrivalTime.getTime() - second.arrivalTime.getTime();
}

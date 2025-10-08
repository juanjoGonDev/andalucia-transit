import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';

import { StopScheduleService } from '../../data/services/stop-schedule.service';
import { RouteSearchLineMatch, RouteSearchSelection } from './route-search-state.service';
import { StopScheduleResult, StopService } from '../stop-schedule/stop-schedule.model';
import { calculatePastProgress, calculateUpcomingProgress } from '../utils/progress.util';

const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_MINUTE = 60_000;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;
const PAST_WINDOW_MINUTES = 30;

export interface RouteSearchResultsViewModel {
  readonly lines: readonly RouteSearchLineView[];
}

export interface RouteSearchLineView {
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly items: readonly RouteSearchLineItem[];
  readonly hasUpcoming: boolean;
}

export interface RouteSearchLineItem {
  readonly id: string;
  readonly originStopId: string;
  readonly arrivalTime: Date;
  readonly relativeLabel: string;
  readonly waitTimeSeconds: number;
  readonly kind: 'past' | 'upcoming';
  readonly isNext: boolean;
  readonly isAccessible: boolean;
  readonly isUniversityOnly: boolean;
  readonly progressPercentage: number;
  readonly pastProgressPercentage: number;
  readonly destinationArrivalTime: Date | null;
  readonly travelDurationLabel: string | null;
}

@Injectable({ providedIn: 'root' })
export class RouteSearchResultsService {
  private readonly stopSchedule = inject(StopScheduleService);

  loadResults(
    selection: RouteSearchSelection,
    options?: { readonly currentTime?: Date }
  ): Observable<RouteSearchResultsViewModel> {
    const referenceTime = resolveReferenceTime(selection.queryDate, options?.currentTime ?? new Date());
    const stopIds = collectUniqueStopIds(selection.lineMatches);

    if (!stopIds.length) {
      return of({ lines: [] });
    }

    const scheduleRequests = stopIds.map((stopId) =>
      this.stopSchedule
        .getStopSchedule(stopId, { queryDate: selection.queryDate })
        .pipe(map((result) => [stopId, result] as const))
    );

    return forkJoin(scheduleRequests).pipe(
      map((entries) => new Map(entries)),
      map((scheduleMap) => buildResults(selection, scheduleMap, referenceTime))
    );
  }
}

function buildResults(
  selection: RouteSearchSelection,
  scheduleMap: ReadonlyMap<string, StopScheduleResult>,
  currentTime: Date
): RouteSearchResultsViewModel {
  const lines = selection.lineMatches.map((match) =>
    buildLineView(match, scheduleMap, currentTime)
  );

  return { lines } satisfies RouteSearchResultsViewModel;
}

function resolveReferenceTime(queryDate: Date, currentTime: Date): Date {
  const queryStart = toStartOfDay(queryDate);
  const currentStart = toStartOfDay(currentTime);

  return queryStart.getTime() === currentStart.getTime() ? currentTime : queryStart;
}

function buildLineView(
  match: RouteSearchLineMatch,
  scheduleMap: ReadonlyMap<string, StopScheduleResult>,
  currentTime: Date
): RouteSearchLineView {
  const originOrder = buildOriginOrder(match.originStopIds);
  const candidates = new Map<string, RouteSearchLineItemCandidate>();

  for (const originStopId of match.originStopIds) {
    const schedule = scheduleMap.get(originStopId);

    if (!schedule) {
      continue;
    }

    const relevantServices = schedule.schedule.services.filter(
      (service) => service.lineId === match.lineId && service.direction === match.direction
    );

    for (const service of relevantServices) {
      const candidate = createCandidate(service, originStopId, currentTime, match, scheduleMap);

      if (!candidate) {
        continue;
      }

      const key = buildServiceKey(service);
      const existing = candidates.get(key);

      if (!existing || shouldReplace(existing, candidate, originOrder)) {
        candidates.set(key, candidate);
      }
    }
  }

  const sorted = Array.from(candidates.values()).sort((first, second) =>
    first.arrivalTime.getTime() - second.arrivalTime.getTime()
  );

  const upcomingIndex = sorted.findIndex((item) => item.kind === 'upcoming');

  const items = sorted.map((item, index) => ({
    id: item.id,
    originStopId: item.originStopId,
    arrivalTime: item.arrivalTime,
    relativeLabel: item.relativeLabel,
    waitTimeSeconds: item.waitTimeSeconds,
    kind: item.kind,
    isNext: upcomingIndex === index,
    isAccessible: item.isAccessible,
    isUniversityOnly: item.isUniversityOnly,
    progressPercentage: item.kind === 'upcoming' ? item.progressPercentage : 0,
    pastProgressPercentage: item.kind === 'past' ? item.pastProgressPercentage : 0,
    destinationArrivalTime: item.destinationArrivalTime,
    travelDurationLabel: item.travelDurationLabel
  }));

  return {
    lineId: match.lineId,
    lineCode: match.lineCode,
    direction: match.direction,
    items,
    hasUpcoming: items.some((item) => item.kind === 'upcoming')
  } satisfies RouteSearchLineView;
}

function collectUniqueStopIds(matches: readonly RouteSearchLineMatch[]): readonly string[] {
  const set = new Set<string>();

  for (const match of matches) {
    match.originStopIds.forEach((id) => set.add(id));
    match.destinationStopIds.forEach((id) => set.add(id));
  }

  return Array.from(set.values());
}

interface RouteSearchLineItemCandidate {
  readonly id: string;
  readonly originStopId: string;
  readonly arrivalTime: Date;
  readonly relativeLabel: string;
  readonly waitTimeSeconds: number;
  readonly kind: 'past' | 'upcoming';
  readonly isAccessible: boolean;
  readonly isUniversityOnly: boolean;
  readonly progressPercentage: number;
  readonly pastProgressPercentage: number;
  readonly destinationArrivalTime: Date | null;
  readonly travelDurationLabel: string | null;
}

function createCandidate(
  service: StopService,
  originStopId: string,
  currentTime: Date,
  match: RouteSearchLineMatch,
  scheduleMap: ReadonlyMap<string, StopScheduleResult>
): RouteSearchLineItemCandidate | null {
  const differenceMs = service.arrivalTime.getTime() - currentTime.getTime();
  const kind: 'past' | 'upcoming' = differenceMs >= 0 ? 'upcoming' : 'past';
  const waitSeconds = Math.max(0, Math.round(Math.abs(differenceMs) / MILLISECONDS_PER_SECOND));

  if (kind === 'past') {
    const elapsedMinutes = waitSeconds / SECONDS_PER_MINUTE;

    if (elapsedMinutes > PAST_WINDOW_MINUTES) {
      return null;
    }
  }

  const minutesUntilArrival = Math.max(0, differenceMs / MILLISECONDS_PER_MINUTE);
  const minutesSinceDeparture = Math.max(0, -differenceMs / MILLISECONDS_PER_MINUTE);
  const timeParts = decomposeSeconds(waitSeconds);
  const relativeLabel = formatDurationLabel(timeParts);
  const destinationInfo = findDestinationArrival(
    service.serviceId,
    match.destinationStopIds,
    scheduleMap,
    service.arrivalTime
  );
  const travelDurationLabel = destinationInfo && destinationInfo.travelSeconds > 0
    ? formatDurationLabel(decomposeSeconds(destinationInfo.travelSeconds))
    : null;

  return {
    id: service.serviceId,
    originStopId,
    arrivalTime: service.arrivalTime,
    relativeLabel,
    waitTimeSeconds: waitSeconds,
    kind,
    isAccessible: service.isAccessible,
    isUniversityOnly: service.isUniversityOnly,
    progressPercentage: calculateUpcomingProgress(minutesUntilArrival),
    pastProgressPercentage: calculatePastProgress(minutesSinceDeparture),
    destinationArrivalTime: destinationInfo?.arrivalTime ?? null,
    travelDurationLabel
  } satisfies RouteSearchLineItemCandidate;
}

interface DestinationArrivalInfo {
  readonly arrivalTime: Date;
  readonly travelSeconds: number;
}

function findDestinationArrival(
  serviceId: string,
  destinationStopIds: readonly string[],
  scheduleMap: ReadonlyMap<string, StopScheduleResult>,
  originArrivalTime: Date
): DestinationArrivalInfo | null {
  for (const stopId of destinationStopIds) {
    const schedule = scheduleMap.get(stopId);

    if (!schedule) {
      continue;
    }

    const matchingService = schedule.schedule.services.find((entry) => entry.serviceId === serviceId);

    if (!matchingService) {
      continue;
    }

    const travelSeconds = Math.max(
      0,
      Math.round((matchingService.arrivalTime.getTime() - originArrivalTime.getTime()) / MILLISECONDS_PER_SECOND)
    );

    return {
      arrivalTime: matchingService.arrivalTime,
      travelSeconds
    } satisfies DestinationArrivalInfo;
  }

  return null;
}

function buildServiceKey(service: StopService): string {
  const arrivalMinute = Math.floor(service.arrivalTime.getTime() / MILLISECONDS_PER_MINUTE);
  return `${service.lineId}|${service.direction}|${arrivalMinute}|${service.destination}`;
}

function shouldReplace(
  existing: RouteSearchLineItemCandidate,
  candidate: RouteSearchLineItemCandidate,
  originOrder: ReadonlyMap<string, number>
): boolean {
  const existingOrder = originOrder.get(existing.originStopId) ?? Number.MAX_SAFE_INTEGER;
  const candidateOrder = originOrder.get(candidate.originStopId) ?? Number.MAX_SAFE_INTEGER;

  if (candidateOrder < existingOrder) {
    return true;
  }

  if (candidateOrder > existingOrder) {
    return false;
  }

  return candidate.arrivalTime.getTime() < existing.arrivalTime.getTime();
}

function buildOriginOrder(originStopIds: readonly string[]): ReadonlyMap<string, number> {
  const entries = originStopIds.map((id, index) => [id, index] as const);
  return new Map(entries);
}

interface DurationParts {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

function decomposeSeconds(totalSeconds: number): DurationParts {
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const remainingAfterHours = totalSeconds - hours * SECONDS_PER_HOUR;
  const minutes = Math.floor(remainingAfterHours / SECONDS_PER_MINUTE);
  const seconds = remainingAfterHours - minutes * SECONDS_PER_MINUTE;

  return { hours, minutes, seconds };
}

function formatDurationLabel(parts: DurationParts): string {
  const segments: string[] = [];

  if (parts.hours > 0) {
    segments.push(`${parts.hours}h`);
  }

  if (parts.minutes > 0) {
    segments.push(`${parts.minutes}m`);
  }

  if (parts.hours === 0 && parts.seconds > 0) {
    segments.push(`${parts.seconds}s`);
  }

  if (!segments.length) {
    return '0s';
  }

  return segments.join(' ');
}

function toStartOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

import { Injectable, inject } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { RouteTimetableService, RouteTimetableRequest } from '../../data/route-search/route-timetable.service';
import { RouteTimetableEntry } from '../../data/route-search/route-timetable.mapper';
import { RouteSearchLineMatch, RouteSearchSelection } from './route-search-state.service';
import { calculatePastProgress, calculateUpcomingProgress } from '../utils/progress.util';

const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_MINUTE = 60_000;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;
const PAST_WINDOW_MINUTES = 30;

export interface RouteSearchResultsViewModel {
  readonly departures: readonly RouteSearchDepartureView[];
  readonly hasUpcoming: boolean;
  readonly nextDepartureId: string | null;
}

export interface RouteSearchDepartureView {
  readonly id: string;
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly destination: string;
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
  private readonly timetable = inject(RouteTimetableService);

  loadResults(
    selection: RouteSearchSelection,
    options?: { readonly currentTime?: Date }
  ): Observable<RouteSearchResultsViewModel> {
    const referenceTime = resolveReferenceTime(selection.queryDate, options?.currentTime ?? new Date());
    if (!selection.lineMatches.length) {
      return of({ departures: [], hasUpcoming: false, nextDepartureId: null });
    }
    const request: RouteTimetableRequest = {
      consortiumId: selection.origin.consortiumId,
      originNucleusId: selection.origin.nucleusId,
      destinationNucleusId: selection.destination.nucleusId,
      queryDate: selection.queryDate
    };

    return this.timetable
      .loadTimetable(request)
      .pipe(map((entries) => buildResults(selection, entries, referenceTime)));
  }
}

function buildResults(
  selection: RouteSearchSelection,
  timetableEntries: readonly RouteTimetableEntry[],
  currentTime: Date
): RouteSearchResultsViewModel {
  const candidateMap = new Map<string, RouteSearchDepartureCandidate>();
  const lineMatchMap = buildLineMatchMap(selection.lineMatches);
  const originPriorityCache = new Map<RouteSearchLineMatch, ReadonlyMap<string, number>>();

  for (const entry of timetableEntries) {
    const match = lineMatchMap.get(entry.lineId);

    if (!match) {
      continue;
    }

    const originOrder =
      originPriorityCache.get(match) ?? cacheOriginOrder(match, originPriorityCache);
    const candidate = createCandidate(
      entry,
      match,
      selection.destination.name,
      originOrder,
      currentTime
    );

    if (!candidate) {
      continue;
    }

    const key = buildTimetableKey(entry, match);
    const existing = candidateMap.get(key);

    if (!existing || shouldReplace(existing, candidate)) {
      candidateMap.set(key, candidate);
    }
  }

  const sorted = Array.from(candidateMap.values()).sort((first, second) =>
    first.arrivalTime.getTime() - second.arrivalTime.getTime()
  );

  const upcomingIndex = sorted.findIndex((item) => item.kind === 'upcoming');

  const departures = sorted.map((item, index) => ({
    id: item.id,
    lineId: item.lineId,
    lineCode: item.lineCode,
    direction: item.direction,
    destination: item.destination,
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
  } satisfies RouteSearchDepartureView));

  return {
    departures,
    hasUpcoming: upcomingIndex !== -1,
    nextDepartureId: upcomingIndex === -1 ? null : departures[upcomingIndex].id
  } satisfies RouteSearchResultsViewModel;
}

function resolveReferenceTime(queryDate: Date, currentTime: Date): Date {
  const queryStart = toStartOfDay(queryDate);
  const currentStart = toStartOfDay(currentTime);

  return queryStart.getTime() === currentStart.getTime() ? currentTime : queryStart;
}

interface RouteSearchDepartureCandidate {
  readonly id: string;
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly destination: string;
  readonly originStopId: string;
  readonly originPriority: number;
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
  entry: RouteTimetableEntry,
  match: RouteSearchLineMatch,
  destinationName: string,
  originOrder: ReadonlyMap<string, number>,
  currentTime: Date
): RouteSearchDepartureCandidate | null {
  const originStopId = match.originStopIds[0] ?? null;

  if (!originStopId) {
    return null;
  }

  const differenceMs = entry.departureTime.getTime() - currentTime.getTime();
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
  const destinationArrivalTime = entry.arrivalTime;
  const travelSeconds = Math.max(
    0,
    Math.round((entry.arrivalTime.getTime() - entry.departureTime.getTime()) / MILLISECONDS_PER_SECOND)
  );
  const travelDurationLabel = travelSeconds > 0
    ? formatDurationLabel(decomposeSeconds(travelSeconds))
    : null;
  const originPriority = originOrder.get(originStopId) ?? Number.MAX_SAFE_INTEGER;

  return {
    id: buildCandidateId(entry, match),
    lineId: match.lineId,
    lineCode: match.lineCode,
    direction: match.direction,
    destination: buildDestinationLabel(destinationName, entry.notes),
    originStopId,
    originPriority,
    arrivalTime: entry.departureTime,
    relativeLabel,
    waitTimeSeconds: waitSeconds,
    kind,
    isAccessible: false,
    isUniversityOnly: false,
    progressPercentage: calculateUpcomingProgress(minutesUntilArrival),
    pastProgressPercentage: calculatePastProgress(minutesSinceDeparture),
    destinationArrivalTime,
    travelDurationLabel
  } satisfies RouteSearchDepartureCandidate;
}

function buildTimetableKey(entry: RouteTimetableEntry, match: RouteSearchLineMatch): string {
  const departureMinute = Math.floor(entry.departureTime.getTime() / MILLISECONDS_PER_MINUTE);
  const arrivalMinute = Math.floor(entry.arrivalTime.getTime() / MILLISECONDS_PER_MINUTE);
  return `${match.lineId}|${match.direction}|${departureMinute}|${arrivalMinute}`;
}

function buildCandidateId(entry: RouteTimetableEntry, match: RouteSearchLineMatch): string {
  return `${match.lineId}-${match.direction}-${entry.departureTime.getTime()}`;
}

function buildDestinationLabel(base: string, notes: string | null): string {
  if (!notes) {
    return base;
  }

  return `${base}${DESTINATION_NOTE_SEPARATOR}${notes}`;
}

function buildLineMatchMap(
  matches: readonly RouteSearchLineMatch[]
): ReadonlyMap<string, RouteSearchLineMatch> {
  const map = new Map<string, RouteSearchLineMatch>();

  for (const match of matches) {
    if (!map.has(match.lineId)) {
      map.set(match.lineId, match);
    }
  }

  return map;
}

function cacheOriginOrder(
  match: RouteSearchLineMatch,
  cache: Map<RouteSearchLineMatch, ReadonlyMap<string, number>>
): ReadonlyMap<string, number> {
  const order = buildOriginOrder(match.originStopIds);
  cache.set(match, order);
  return order;
}

function shouldReplace(
  existing: RouteSearchDepartureCandidate,
  candidate: RouteSearchDepartureCandidate
): boolean {
  if (candidate.originPriority < existing.originPriority) {
    return true;
  }

  if (candidate.originPriority > existing.originPriority) {
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

  return { hours, minutes, seconds } satisfies DurationParts;
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

const DESTINATION_NOTE_SEPARATOR = ' • ' as const;

import { Injectable, inject } from '@angular/core';
import { DateTime } from 'luxon';
import { Observable, catchError, forkJoin, map, of, switchMap, timer } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { RouteLineTimetableService } from '@data/route-search/route-line-timetable.service';
import { RouteLineStop, RouteLinesApiService } from '@data/route-search/route-lines-api.service';
import { RouteTimetableEntry } from '@data/route-search/route-timetable.mapper';
import { RouteTimetableRequest, RouteTimetableService } from '@data/route-search/route-timetable.service';
import { RouteSearchLineMatch, RouteSearchSelection } from '@domain/route-search/route-search-state.service';
import {
  ARRIVAL_PROGRESS_WINDOW_MINUTES,
  calculatePastProgress,
  calculateUpcomingProgress
} from '@domain/utils/progress.util';

const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_MINUTE = 60_000;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;
const PAST_WINDOW_MINUTES = 30;
const RESULTS_REFRESH_INTERVAL_MS = 1_000;
const MIN_ENTRIES_FOR_LINE_FALLBACK = 1;

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
  readonly relativeLabel: string | null;
  readonly waitTimeSeconds: number;
  readonly kind: 'past' | 'upcoming';
  readonly isNext: boolean;
  readonly isMostRecentPast: boolean;
  readonly isAccessible: boolean;
  readonly isUniversityOnly: boolean;
  readonly isHolidayService: boolean;
  readonly showUpcomingProgress: boolean;
  readonly progressPercentage: number;
  readonly pastProgressPercentage: number;
  readonly destinationArrivalTime: Date | null;
  readonly travelDurationLabel: string | null;
}

interface RouteSearchResultsOptions {
  readonly nowProvider?: () => Date;
  readonly refreshIntervalMs?: number;
}

@Injectable({ providedIn: 'root' })
export class RouteSearchResultsService {
  private readonly timetable = inject(RouteTimetableService);
  private readonly linesApi = inject(RouteLinesApiService);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly lineTimetable = inject(RouteLineTimetableService);

  loadResults(
    selection: RouteSearchSelection,
    options?: RouteSearchResultsOptions
  ): Observable<RouteSearchResultsViewModel> {
    const nowProvider = options?.nowProvider ?? (() => new Date());
    const refreshInterval = options?.refreshIntervalMs ?? RESULTS_REFRESH_INTERVAL_MS;
    const timezone = this.config.data.timezone;
    const request: RouteTimetableRequest = {
      consortiumId: selection.origin.consortiumId,
      originNucleusId: selection.origin.nucleusId,
      destinationNucleusId: selection.destination.nucleusId,
      queryDate: selection.queryDate
    };

    return this.timetable
      .loadTimetable(request)
      .pipe(
        switchMap((entries) =>
          this.resolveLineMatches(selection, entries).pipe(
            switchMap((lineMatches) =>
              this.mergeFallbackTimetables(selection, entries, lineMatches).pipe(
                switchMap((mergedEntries) =>
                  timer(0, refreshInterval).pipe(
                    map(() => {
                      const actualNow = nowProvider();
                      const referenceContext = resolveReferenceContext(
                        selection.queryDate,
                        actualNow,
                        timezone
                      );
                      return buildResults(
                        { ...selection, lineMatches },
                        mergedEntries,
                        actualNow,
                        referenceContext
                      );
                    })
                  )
                )
              )
            )
          )
        )
      );
  }

  private resolveLineMatches(
    selection: RouteSearchSelection,
    entries: readonly RouteTimetableEntry[]
  ): Observable<readonly RouteSearchLineMatch[]> {
    const existing = selection.lineMatches;

    if (!entries.length) {
      return of(existing);
    }

    const originStopIds = selection.origin.stopIds;
    const destinationStopIds = selection.destination.stopIds;

    if (!originStopIds.length || !destinationStopIds.length) {
      return of(existing);
    }

    const lineCodeMap = new Map<string, string>();

    for (const entry of entries) {
      if (!lineCodeMap.has(entry.lineId)) {
        lineCodeMap.set(entry.lineId, entry.lineCode);
      }
    }

    const existingLineIds = new Set(existing.map((match) => match.lineId));
    const missing: LineDescriptor[] = [];

    lineCodeMap.forEach((lineCode, lineId) => {
      if (!existingLineIds.has(lineId)) {
        missing.push({ lineId, lineCode });
      }
    });

    if (!missing.length) {
      return of(existing);
    }

    const requests = missing.map(({ lineId, lineCode }) =>
      this.linesApi
        .getLineStops(selection.origin.consortiumId, lineId)
        .pipe(
          map((stops) =>
            buildLineMatchFromStops(lineId, lineCode, stops, originStopIds, destinationStopIds)
          ),
          catchError(() => of(null))
        )
    );

    return forkJoin(requests).pipe(
      map((matches) => {
        const merged = [...existing];

        for (const match of matches) {
          if (match) {
            merged.push(match);
          }
        }

        return Object.freeze(merged);
      })
    );
  }

  private mergeFallbackTimetables(
    selection: RouteSearchSelection,
    entries: readonly RouteTimetableEntry[],
    lineMatches: readonly RouteSearchLineMatch[]
  ): Observable<readonly RouteTimetableEntry[]> {
    if (!lineMatches.length) {
      return of(entries);
    }

    const entryCounts = new Map<string, number>();

    for (const entry of entries) {
      entryCounts.set(entry.lineId, (entryCounts.get(entry.lineId) ?? 0) + 1);
    }

    const fallbackMatches = lineMatches.filter((match) =>
      (entryCounts.get(match.lineId) ?? 0) <= MIN_ENTRIES_FOR_LINE_FALLBACK
    );

    if (!fallbackMatches.length) {
      return of(entries);
    }

    const originNames = buildStopNameCandidates(selection.origin.name);
    const destinationNames = buildStopNameCandidates(selection.destination.name);

    if (!originNames.length || !destinationNames.length) {
      return of(entries);
    }

    const requests = fallbackMatches.map((match) =>
      this.lineTimetable
        .loadLineTimetable({
          consortiumId: selection.origin.consortiumId,
          lineId: match.lineId,
          lineCode: match.lineCode,
          queryDate: selection.queryDate,
          originNames,
          destinationNames
        })
        .pipe(catchError(() => of([])))
    );

    return forkJoin(requests).pipe(
      map((fallbackEntries) => Object.freeze([...entries, ...fallbackEntries.flat()]))
    );
  }
}

function buildResults(
  selection: RouteSearchSelection,
  timetableEntries: readonly RouteTimetableEntry[],
  actualNow: Date,
  context: ReferenceContext
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
    const candidate = createCandidate(entry, match, selection.destination.name, originOrder, {
      actualNow,
      referenceTime: context.referenceTime,
      relation: context.relation
    });

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
  const lastPastIndex = upcomingIndex === -1 ? sorted.length - 1 : upcomingIndex - 1;

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
    isMostRecentPast: item.kind === 'past' && index === lastPastIndex,
    isAccessible: item.isAccessible,
    isUniversityOnly: item.isUniversityOnly,
    isHolidayService: item.isHolidayService,
    showUpcomingProgress: item.showUpcomingProgress,
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

function resolveReferenceContext(
  queryDate: Date,
  currentTime: Date,
  timezone: string
): ReferenceContext {
  const queryStart = DateTime.fromJSDate(queryDate, { zone: timezone }).startOf('day');
  const currentStart = DateTime.fromJSDate(currentTime, { zone: timezone }).startOf('day');
  const queryStartMillis = queryStart.toMillis();
  const currentStartMillis = currentStart.toMillis();

  if (queryStartMillis === currentStartMillis) {
    return { referenceTime: currentTime, relation: 'today' } satisfies ReferenceContext;
  }

  if (queryStartMillis < currentStartMillis) {
    return { referenceTime: queryStart.toJSDate(), relation: 'past' } satisfies ReferenceContext;
  }

  return { referenceTime: queryStart.toJSDate(), relation: 'future' } satisfies ReferenceContext;
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
  readonly relativeLabel: string | null;
  readonly waitTimeSeconds: number;
  readonly kind: 'past' | 'upcoming';
  readonly isAccessible: boolean;
  readonly isUniversityOnly: boolean;
  readonly isHolidayService: boolean;
  readonly showUpcomingProgress: boolean;
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
  context: CandidateContext
): RouteSearchDepartureCandidate | null {
  const originStopId = match.originStopIds[0] ?? null;

  if (!originStopId) {
    return null;
  }

  const referenceDifferenceMs = entry.departureTime.getTime() - context.referenceTime.getTime();
  let kind: 'past' | 'upcoming' = referenceDifferenceMs >= 0 ? 'upcoming' : 'past';

  if (context.relation === 'past') {
    kind = 'past';
  }

  if (kind === 'past' && context.relation === 'today') {
    const elapsedMinutes = Math.abs(referenceDifferenceMs) / MILLISECONDS_PER_MINUTE;

    if (elapsedMinutes > PAST_WINDOW_MINUTES) {
      return null;
    }
  }

  const minutesUntilArrival = Math.max(0, referenceDifferenceMs / MILLISECONDS_PER_MINUTE);
  const minutesSinceDeparture = Math.max(0, -referenceDifferenceMs / MILLISECONDS_PER_MINUTE);
  const actualDifferenceMs = entry.departureTime.getTime() - context.actualNow.getTime();
  const actualWaitSeconds = Math.max(
    0,
    Math.round(Math.abs(actualDifferenceMs) / MILLISECONDS_PER_SECOND)
  );
  const relativeLabel = Math.abs(actualDifferenceMs) > MILLISECONDS_PER_DAY
    ? null
    : formatDurationLabel(decomposeSeconds(actualWaitSeconds));
  const destinationArrivalTime = entry.arrivalTime;
  const travelSeconds = Math.max(
    0,
    Math.round((entry.arrivalTime.getTime() - entry.departureTime.getTime()) / MILLISECONDS_PER_SECOND)
  );
  const travelDurationLabel = travelSeconds > 0
    ? formatDurationLabel(decomposeSeconds(travelSeconds))
    : null;
  const originPriority = originOrder.get(originStopId) ?? Number.MAX_SAFE_INTEGER;
  const upcomingProgressPercentage =
    kind === 'upcoming' ? calculateUpcomingProgress(minutesUntilArrival) : 0;
  const pastProgressPercentage =
    kind === 'past' ? calculatePastProgress(minutesSinceDeparture) : 0;
  const showUpcomingProgress =
    kind === 'upcoming' && minutesUntilArrival <= ARRIVAL_PROGRESS_WINDOW_MINUTES;
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
    waitTimeSeconds: actualWaitSeconds,
    kind,
    isAccessible: false,
    isUniversityOnly: false,
    isHolidayService: entry.isHolidayOnly,
    showUpcomingProgress,
    progressPercentage: upcomingProgressPercentage,
    pastProgressPercentage,
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

interface LineDescriptor {
  readonly lineId: string;
  readonly lineCode: string;
}

interface DirectionMatch {
  readonly direction: number;
  readonly originStops: readonly RouteLineStop[];
  readonly destinationStops: readonly RouteLineStop[];
  readonly gap: number;
}

function buildLineMatchFromStops(
  lineId: string,
  lineCode: string,
  stops: readonly RouteLineStop[],
  originStopIds: readonly string[],
  destinationStopIds: readonly string[]
): RouteSearchLineMatch | null {
  if (!stops.length) {
    return null;
  }

  const originSet = new Set(originStopIds);
  const destinationSet = new Set(destinationStopIds);
  const groupedStops = groupStopsByDirection(stops);
  const matches: DirectionMatch[] = [];

  groupedStops.forEach((directionStops, direction) => {
    const originStops = directionStops.filter((stop) => originSet.has(stop.stopId));
    const destinationStops = directionStops.filter((stop) => destinationSet.has(stop.stopId));

    if (!originStops.length || !destinationStops.length) {
      return;
    }

    const orderedOrigins = [...originStops].sort((first, second) => first.order - second.order);
    const orderedDestinations = [...destinationStops].sort(
      (first, second) => first.order - second.order
    );
    const gap = calculateShortestGap(orderedOrigins, orderedDestinations);

    if (!Number.isFinite(gap)) {
      return;
    }

    matches.push({
      direction,
      originStops: orderedOrigins,
      destinationStops: orderedDestinations,
      gap
    });
  });

  if (!matches.length) {
    return null;
  }

  const bestMatch = matches.reduce((currentBest, candidate) =>
    candidate.gap < currentBest.gap ? candidate : currentBest
  );

  return {
    lineId,
    lineCode,
    direction: bestMatch.direction,
    originStopIds: Object.freeze(bestMatch.originStops.map((stop) => stop.stopId)),
    destinationStopIds: Object.freeze(bestMatch.destinationStops.map((stop) => stop.stopId))
  } satisfies RouteSearchLineMatch;
}

function groupStopsByDirection(
  stops: readonly RouteLineStop[]
): Map<number, RouteLineStop[]> {
  const grouped = new Map<number, RouteLineStop[]>();

  for (const stop of stops) {
    const bucket = grouped.get(stop.direction);

    if (bucket) {
      bucket.push(stop);
    } else {
      grouped.set(stop.direction, [stop]);
    }
  }

  return grouped;
}

function calculateShortestGap(
  origins: readonly RouteLineStop[],
  destinations: readonly RouteLineStop[]
): number {
  let best = Number.POSITIVE_INFINITY;

  for (const origin of origins) {
    for (const destination of destinations) {
      if (destination.order <= origin.order) {
        continue;
      }

      const gap = destination.order - origin.order;

      if (gap < best) {
        best = gap;
      }
    }
  }

  return best;
}

const DESTINATION_NOTE_SEPARATOR = ' • ' as const;
const MILLISECONDS_PER_DAY = 86_400_000;

function buildStopNameCandidates(name: string): readonly string[] {
  const trimmed = name.trim();

  if (!trimmed) {
    return [];
  }

  const candidates = new Set<string>();
  const addCandidate = (value: string): void => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized) {
      candidates.add(normalized);
    }
  };

  addCandidate(trimmed);

  const withoutParentheses = trimmed
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  addCandidate(withoutParentheses);

  const dashSegments = trimmed.split(/\s*-\s*/).map((segment) => segment.trim()).filter(Boolean);
  if (dashSegments.length > 1) {
    dashSegments.forEach(addCandidate);
  }

  const slashSegments = trimmed.split(/\s*\/\s*/).map((segment) => segment.trim()).filter(Boolean);
  if (slashSegments.length > 1) {
    slashSegments.forEach(addCandidate);
  }

  const replacements: readonly { readonly pattern: RegExp; readonly replacement: string }[] = [
    { pattern: /\bav(?:da|d)?\.?\b/gi, replacement: 'avenida' },
    { pattern: /\bctra\.?\b/gi, replacement: 'carretera' },
    { pattern: /\best\.?\b/gi, replacement: 'estacion' }
  ];

  for (const value of Array.from(candidates)) {
    for (const replacement of replacements) {
      const updated = value.replace(replacement.pattern, replacement.replacement);
      if (updated !== value) {
        addCandidate(updated);
      }
    }
  }

  return Object.freeze(Array.from(candidates));
}

interface CandidateContext {
  readonly actualNow: Date;
  readonly referenceTime: Date;
  readonly relation: QueryTemporalRelation;
}

interface ReferenceContext {
  readonly referenceTime: Date;
  readonly relation: QueryTemporalRelation;
}

type QueryTemporalRelation = 'past' | 'today' | 'future';

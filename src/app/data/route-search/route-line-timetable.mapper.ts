import { DateTime } from 'luxon';
import {
  ApiRouteLineBlock,
  ApiRouteLineFrequency,
  ApiRouteLinePlanner,
  ApiRouteLineScheduleEntry,
  ApiRouteLineTimetableResponse
} from '@data/route-search/route-line-timetable.api-service';
import {
  RouteTimetableEntry,
  RouteTimetableFrequency,
  isHolidayOnlyFrequency,
  shouldIncludeFrequency
} from '@data/route-search/route-timetable.mapper';

export interface RouteLineTimetableMapperOptions {
  readonly lineId: string;
  readonly lineCode: string;
  readonly originNames: readonly string[];
  readonly destinationNames: readonly string[];
  readonly queryDate: Date;
  readonly timezone: string;
  readonly isHoliday?: boolean;
}

export function mapRouteLineTimetableResponse(
  response: ApiRouteLineTimetableResponse,
  options: RouteLineTimetableMapperOptions
): readonly RouteTimetableEntry[] {
  const frequencyMap = buildFrequencyMap(response.frecuencias ?? []);
  const workingDate = DateTime.fromJSDate(options.queryDate, { zone: options.timezone });
  const weekday = workingDate.weekday;
  const originNames = buildNameSet(options.originNames);
  const destinationNames = buildNameSet(options.destinationNames);
  const entries: RouteTimetableEntry[] = [];
  const includeHoliday = options.isHoliday ?? false;
  const planners = response.planificadores ?? [];

  for (const planner of planners) {
    if (!isPlannerActive(planner, workingDate, options.timezone)) {
      continue;
    }

    const idaContext = buildDirectionContext(planner.bloquesIda, originNames, destinationNames);
    if (idaContext) {
      entries.push(...mapScheduleEntries(planner.horarioIda ?? [], idaContext, {
        lineId: options.lineId,
        lineCode: options.lineCode,
        workingDate,
        weekday,
        includeHoliday,
        frequencyMap
      }));
    }

    const vueltaContext = buildDirectionContext(planner.bloquesVuelta, originNames, destinationNames);
    if (vueltaContext) {
      entries.push(...mapScheduleEntries(planner.horarioVuelta ?? [], vueltaContext, {
        lineId: options.lineId,
        lineCode: options.lineCode,
        workingDate,
        weekday,
        includeHoliday,
        frequencyMap
      }));
    }
  }

  return entries.sort((first, second) => first.departureTime.getTime() - second.departureTime.getTime());
}

interface DirectionContext {
  readonly originIndices: readonly number[];
  readonly destinationIndices: readonly number[];
}

interface ScheduleMapContext {
  readonly lineId: string;
  readonly lineCode: string;
  readonly workingDate: DateTime;
  readonly weekday: number;
  readonly includeHoliday: boolean;
  readonly frequencyMap: ReadonlyMap<string, RouteTimetableFrequency>;
}

function mapScheduleEntries(
  schedules: readonly ApiRouteLineScheduleEntry[],
  direction: DirectionContext,
  context: ScheduleMapContext
): readonly RouteTimetableEntry[] {
  if (!schedules.length) {
    return [];
  }

  const results: RouteTimetableEntry[] = [];

  for (const schedule of schedules) {
    const frequencyCode = schedule.frecuencia ?? schedule.dias ?? '';
    const frequency = context.frequencyMap.get(frequencyCode) ?? createFallbackFrequency(frequencyCode);

    if (!shouldIncludeFrequency(frequency, context.weekday, context.includeHoliday)) {
      continue;
    }

    const resolvedTimes = resolveEntryTimes(
      schedule.horas ?? [],
      direction.originIndices,
      direction.destinationIndices
    );

    if (!resolvedTimes) {
      continue;
    }

    const departureDateTime = buildDateTime(context.workingDate, resolvedTimes.departureText);
    let arrivalDateTime = buildDateTime(context.workingDate, resolvedTimes.arrivalText);

    if (arrivalDateTime < departureDateTime) {
      arrivalDateTime = arrivalDateTime.plus({ days: 1 });
    }

    results.push({
      lineId: context.lineId,
      lineCode: context.lineCode,
      departureTime: departureDateTime.toJSDate(),
      arrivalTime: arrivalDateTime.toJSDate(),
      frequency,
      notes: normalizeNotes(schedule.observaciones),
      isHolidayOnly: isHolidayOnlyFrequency(frequency)
    } satisfies RouteTimetableEntry);
  }

  return results;
}

function buildDirectionContext(
  blocks: readonly ApiRouteLineBlock[],
  originNames: ReadonlySet<string>,
  destinationNames: ReadonlySet<string>
): DirectionContext | null {
  if (!originNames.size || !destinationNames.size) {
    return null;
  }

  const originIndices = resolveBlockIndices(blocks, originNames);
  const destinationIndices = resolveBlockIndices(blocks, destinationNames);

  if (!originIndices.length || !destinationIndices.length) {
    return null;
  }

  if (!hasValidIndexPair(originIndices, destinationIndices)) {
    return null;
  }

  return {
    originIndices,
    destinationIndices
  } satisfies DirectionContext;
}

function resolveBlockIndices(
  blocks: readonly ApiRouteLineBlock[],
  nameSet: ReadonlySet<string>
): readonly number[] {
  const matches: number[] = [];

  blocks.forEach((block, index) => {
    const normalized = normalizeStopName(block?.nombre ?? '');
    if (normalized && nameSet.has(normalized)) {
      matches.push(index);
    }
  });

  return matches;
}

function resolveEntryTimes(
  hours: readonly string[],
  originIndices: readonly number[],
  destinationIndices: readonly number[]
): { readonly departureText: string; readonly arrivalText: string } | null {
  let best: { gap: number; departureText: string; arrivalText: string } | null = null;

  for (const originIndex of originIndices) {
    const departureText = extractTimeText(hours[originIndex]);
    if (!departureText) {
      continue;
    }

    for (const destinationIndex of destinationIndices) {
      if (destinationIndex <= originIndex) {
        continue;
      }

      const arrivalText = extractTimeText(hours[destinationIndex]);
      if (!arrivalText) {
        continue;
      }

      const gap = destinationIndex - originIndex;
      if (!best || gap < best.gap) {
        best = { gap, departureText, arrivalText };
      }
    }
  }

  return best ? { departureText: best.departureText, arrivalText: best.arrivalText } : null;
}

function hasValidIndexPair(
  originIndices: readonly number[],
  destinationIndices: readonly number[]
): boolean {
  for (const originIndex of originIndices) {
    for (const destinationIndex of destinationIndices) {
      if (destinationIndex > originIndex) {
        return true;
      }
    }
  }

  return false;
}

function buildFrequencyMap(
  entries: readonly ApiRouteLineFrequency[]
): ReadonlyMap<string, RouteTimetableFrequency> {
  const mapped = entries.map((entry) => ({
    id: entry.idfrecuencia,
    code: entry.acronimo,
    name: entry.nombre
  } satisfies RouteTimetableFrequency));

  return new Map(mapped.map((entry) => [entry.code, entry] as const));
}

function createFallbackFrequency(code: string): RouteTimetableFrequency {
  return {
    id: FALLBACK_FREQUENCY_ID,
    code,
    name: code
  } satisfies RouteTimetableFrequency;
}

function buildDateTime(reference: DateTime, timeText: string): DateTime {
  const [hourText, minuteText] = timeText.split(TIME_SEPARATOR, 2);
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return reference.startOf('day');
  }

  return reference.set({ hour, minute, second: 0, millisecond: 0 });
}

function normalizeNotes(notes: string): string | null {
  const trimmed = notes.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function normalizeStopName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildNameSet(values: readonly string[]): ReadonlySet<string> {
  const normalized = values
    .map((value) => normalizeStopName(value))
    .filter((value) => value.length > 0);

  return new Set(normalized);
}

function extractTimeText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = TIME_TEXT_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  return match[0];
}

function isPlannerActive(
  planner: ApiRouteLinePlanner,
  queryDate: DateTime,
  timezone: string
): boolean {
  const start = DateTime.fromISO(planner.fechaInicio, { zone: timezone }).startOf('day');

  if (start.isValid && queryDate < start) {
    return false;
  }

  const endDateText = planner.fechaFin?.trim();

  if (!endDateText) {
    return true;
  }

  const end = DateTime.fromISO(endDateText, { zone: timezone }).startOf('day');

  if (!end.isValid) {
    return true;
  }

  return queryDate <= end;
}

const FALLBACK_FREQUENCY_ID = 'fallback' as const;
const TIME_SEPARATOR = ':' as const;
const TIME_TEXT_PATTERN = /\d{1,2}:\d{2}/;

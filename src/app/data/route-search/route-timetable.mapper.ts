import { DateTime } from 'luxon';

import { ApiRouteTimetableResponse } from './route-timetable.api-service';

export interface RouteTimetableEntry {
  readonly lineId: string;
  readonly lineCode: string;
  readonly departureTime: Date;
  readonly arrivalTime: Date;
  readonly frequency: RouteTimetableFrequency;
  readonly notes: string | null;
}

export interface RouteTimetableFrequency {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface RouteTimetableMapperOptions {
  readonly timezone: string;
}

export function mapRouteTimetableResponse(
  response: ApiRouteTimetableResponse,
  queryDate: Date,
  options: RouteTimetableMapperOptions
): readonly RouteTimetableEntry[] {
  const frequencyMap = buildFrequencyMap(response.frecuencias ?? []);
  const workingDate = DateTime.fromJSDate(queryDate, { zone: options.timezone });
  const weekday = workingDate.weekday;
  const entries: RouteTimetableEntry[] = [];
  const scheduleEntries = response.horario ?? [];

  for (const item of scheduleEntries) {
    if (!shouldIncludeFrequency(item.dias, weekday)) {
      continue;
    }

    const departureTimeText = item.horas[0] ?? null;
    const arrivalTimeText = item.horas[1] ?? null;

    if (!departureTimeText || !arrivalTimeText) {
      continue;
    }

    const departureDateTime = buildDateTime(workingDate, departureTimeText);
    let arrivalDateTime = buildDateTime(workingDate, arrivalTimeText);

    if (arrivalDateTime < departureDateTime) {
      arrivalDateTime = arrivalDateTime.plus({ days: 1 });
    }

    const frequency = frequencyMap.get(item.dias) ?? createFallbackFrequency(item.dias);
    const notes = normalizeNotes(item.observaciones);

    entries.push({
      lineId: item.idlinea,
      lineCode: item.codigo,
      departureTime: departureDateTime.toJSDate(),
      arrivalTime: arrivalDateTime.toJSDate(),
      frequency,
      notes
    });
  }

  return entries.sort((first, second) => first.departureTime.getTime() - second.departureTime.getTime());
}

function buildFrequencyMap(entries: readonly RouteTimetableFrequencyApi[]): ReadonlyMap<string, RouteTimetableFrequency> {
  const mapped = entries.map((entry) => ({
    id: entry.idfrecuencia,
    code: entry.acronimo,
    name: entry.nombre
  } satisfies RouteTimetableFrequency));

  return new Map(mapped.map((entry) => [entry.code, entry] as const));
}

function shouldIncludeFrequency(frequencyCode: string, weekday: number): boolean {
  const allowedDays = FREQUENCY_DAY_MAP.get(frequencyCode);

  if (!allowedDays) {
    return true;
  }

  return allowedDays.has(weekday);
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

function createFallbackFrequency(code: string): RouteTimetableFrequency {
  return {
    id: FALLBACK_FREQUENCY_ID,
    code,
    name: code
  } satisfies RouteTimetableFrequency;
}

function normalizeNotes(notes: string): string | null {
  const trimmed = notes.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

interface RouteTimetableFrequencyApi {
  readonly idfrecuencia: string;
  readonly acronimo: string;
  readonly nombre: string;
}

const TIME_SEPARATOR = ':' as const;
const FALLBACK_FREQUENCY_ID = 'fallback';

const WEEKDAY = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7
} as const;

const FREQUENCY_DAY_MAP = new Map<string, ReadonlySet<number>>([
  ['L-V', new Set([WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday])],
  ['L-S', new Set([WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday, WEEKDAY.Saturday])],
  ['S', new Set([WEEKDAY.Saturday])],
  ['D', new Set([WEEKDAY.Sunday])],
  ['L-D', new Set([WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday, WEEKDAY.Saturday, WEEKDAY.Sunday])],
  ['S-D-F', new Set([WEEKDAY.Saturday, WEEKDAY.Sunday])],
  ['L-VDF', new Set([WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday, WEEKDAY.Sunday])]
]);

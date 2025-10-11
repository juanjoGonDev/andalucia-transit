import { DateTime } from 'luxon';

import { ApiRouteTimetableResponse } from './route-timetable.api-service';

export interface RouteTimetableEntry {
  readonly lineId: string;
  readonly lineCode: string;
  readonly departureTime: Date;
  readonly arrivalTime: Date;
  readonly frequency: RouteTimetableFrequency;
  readonly notes: string | null;
  readonly isHolidayOnly: boolean;
}

export interface RouteTimetableFrequency {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface RouteTimetableMapperOptions {
  readonly timezone: string;
  readonly isHoliday?: boolean;
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
  const includeHoliday = options.isHoliday ?? false;

  for (const item of scheduleEntries) {
    const frequency = frequencyMap.get(item.dias) ?? createFallbackFrequency(item.dias);

    if (!shouldIncludeFrequency(frequency, weekday, includeHoliday)) {
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

    const notes = normalizeNotes(item.observaciones);

    entries.push({
      lineId: item.idlinea,
      lineCode: item.codigo,
      departureTime: departureDateTime.toJSDate(),
      arrivalTime: arrivalDateTime.toJSDate(),
      frequency,
      notes,
      isHolidayOnly: isHolidayOnlyFrequency(frequency)
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

function shouldIncludeFrequency(
  frequency: RouteTimetableFrequency,
  weekday: number,
  isHoliday: boolean
): boolean {
  const rule = getFrequencyRule(frequency);

  if (!rule) {
    return true;
  }

  if (isHoliday && rule.includeHoliday) {
    return true;
  }

  return rule.allowedDays.has(weekday);
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

function isHolidayOnlyFrequency(frequency: RouteTimetableFrequency): boolean {
  const rule = getFrequencyRule(frequency);

  if (rule) {
    if (rule.allowedDays.size === 0) {
      return rule.includeHoliday;
    }

    if (!rule.includeHoliday) {
      return false;
    }
  }

  const normalizedName = normalizeFrequencyText(frequency.name);

  if (!normalizedName) {
    return false;
  }

  if (containsWeekdayKeyword(normalizedName)) {
    return false;
  }

  return hasHolidayIndicator(frequency, normalizedName, sanitizeFrequencyCode(frequency.code));
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

interface FrequencyRule {
  readonly allowedDays: ReadonlySet<number>;
  readonly includeHoliday: boolean;
}

const FREQUENCY_RULE_CACHE = new Map<string, FrequencyRule | null>();
const HOLIDAY_NAME_KEYWORDS = ['festivo', 'festivos', 'festividad', 'festividades', 'festivo.', 'festivos.'];
const HOLIDAY_EVENT_KEYWORDS = ['santo', 'navidad', 'nochebuena', 'nochevieja', 'reyes', 'ano nuevo'];
const DAILY_KEYWORDS = ['diario', 'diaria', 'diarios', 'diarias', 'diar'];
const LABORABLE_KEYWORDS = ['laborable', 'laborables', 'lectivo', 'lectivos', 'lectiva', 'lectivas'];
const RANGE_CONNECTORS = ['a', 'al', 'hasta'];
const WEEKDAY_KEYWORDS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const CODE_RANGE_OVERRIDES = new Map<string, readonly number[]>([
  [
    'LV',
    [WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday]
  ],
  ['LJ', [WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday]],
  [
    'LS',
    [WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday, WEEKDAY.Saturday]
  ],
  [
    'LD',
    [
      WEEKDAY.Monday,
      WEEKDAY.Tuesday,
      WEEKDAY.Wednesday,
      WEEKDAY.Thursday,
      WEEKDAY.Friday,
      WEEKDAY.Saturday,
      WEEKDAY.Sunday
    ]
  ],
  [
    'LVSA',
    [WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday, WEEKDAY.Saturday]
  ],
  [
    'LVSDF',
    [
      WEEKDAY.Monday,
      WEEKDAY.Tuesday,
      WEEKDAY.Wednesday,
      WEEKDAY.Thursday,
      WEEKDAY.Friday,
      WEEKDAY.Saturday,
      WEEKDAY.Sunday
    ]
  ],
  ['LVDF', [WEEKDAY.Monday, WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday, WEEKDAY.Sunday]],
  ['MV', [WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday]],
  ['MJ', [WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday]],
  ['MS', [WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday, WEEKDAY.Saturday]],
  ['MAD', [WEEKDAY.Tuesday, WEEKDAY.Wednesday, WEEKDAY.Thursday, WEEKDAY.Friday, WEEKDAY.Saturday, WEEKDAY.Sunday]],
  ['VD', [WEEKDAY.Friday, WEEKDAY.Saturday, WEEKDAY.Sunday]]
]);

function getFrequencyRule(frequency: RouteTimetableFrequency): FrequencyRule | null {
  const cacheKey = `${frequency.code}|${frequency.name}`;
  const cached = FREQUENCY_RULE_CACHE.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const rule = computeFrequencyRule(frequency);
  FREQUENCY_RULE_CACHE.set(cacheKey, rule);
  return rule;
}

function computeFrequencyRule(frequency: RouteTimetableFrequency): FrequencyRule | null {
  const normalizedText = normalizeFrequencyText(`${frequency.code} ${frequency.name}`);
  const tokens = normalizedText ? normalizedText.split(' ') : [];
  const sanitizedCode = sanitizeFrequencyCode(frequency.code);
  const allowedDays = new Set<number>();

  collectDaysFromTokens(tokens, allowedDays);
  addDaysFromCodeSymbols(sanitizedCode, allowedDays, allowedDays.size > 0);

  const includeHoliday = hasHolidayIndicator(frequency, normalizedText, sanitizedCode);

  if (allowedDays.size === 0 && !includeHoliday) {
    return null;
  }

  return { allowedDays, includeHoliday } satisfies FrequencyRule;
}

function collectDaysFromTokens(tokens: readonly string[], target: Set<number>): void {
  let lastDay: number | null = null;
  let awaitingRange = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token) {
      continue;
    }

    if (RANGE_CONNECTORS.includes(token)) {
      if (lastDay !== null) {
        awaitingRange = true;
      }
      continue;
    }

    if (token === 'fin' && tokens[index + 1] === 'de' && tokens[index + 2] === 'semana') {
      target.add(WEEKDAY.Saturday);
      target.add(WEEKDAY.Sunday);
      index += 2;
      lastDay = WEEKDAY.Sunday;
      awaitingRange = false;
      continue;
    }

    if (DAILY_KEYWORDS.includes(token)) {
      addAllDays(target);
      lastDay = null;
      awaitingRange = false;
      continue;
    }

    if (LABORABLE_KEYWORDS.includes(token)) {
      if (target.size === 0) {
        addWeekdays(target);
      }
      lastDay = null;
      awaitingRange = false;
      continue;
    }

    const day = decodeDayToken(token);

    if (day !== null) {
      target.add(day);

      if (awaitingRange && lastDay !== null) {
        addRangeDays(target, lastDay, day);
      }

      lastDay = day;
      awaitingRange = false;
      continue;
    }

    awaitingRange = false;
  }
}

function addDaysFromCodeSymbols(code: string, target: Set<number>, hasTokenDays: boolean): void {
  if (!code) {
    return;
  }

  let lastDay: number | null = null;
  let awaitingRange = false;

  for (const char of code) {
    if (char === 'A') {
      if (lastDay !== null) {
        awaitingRange = true;
      }
      continue;
    }

    if (char === 'Y' || char === 'I') {
      continue;
    }

    const day = decodeDayLetter(char);

    if (day !== null) {
      target.add(day);

      if (awaitingRange && lastDay !== null) {
        addRangeDays(target, lastDay, day);
      }

      lastDay = day;
      awaitingRange = false;
    } else {
      awaitingRange = false;
    }
  }

  if (!hasTokenDays) {
    const override = CODE_RANGE_OVERRIDES.get(code);

    if (override) {
      for (const day of override) {
        target.add(day);
      }
    }
  }
}

function addAllDays(target: Set<number>): void {
  addRangeDays(target, WEEKDAY.Monday, WEEKDAY.Sunday);
}

function addWeekdays(target: Set<number>): void {
  addRangeDays(target, WEEKDAY.Monday, WEEKDAY.Friday);
}

function addRangeDays(target: Set<number>, start: number, end: number): void {
  let current = start;
  target.add(current);

  while (current !== end) {
    current = current === WEEKDAY.Sunday ? WEEKDAY.Monday : (current + 1);
    target.add(current);
  }
}

function decodeDayToken(token: string): number | null {
  if (DAY_TOKEN_MAP.has(token)) {
    return DAY_TOKEN_MAP.get(token) ?? null;
  }

  return null;
}

function decodeDayLetter(letter: string): number | null {
  switch (letter) {
    case 'L':
      return WEEKDAY.Monday;
    case 'M':
      return WEEKDAY.Tuesday;
    case 'X':
      return WEEKDAY.Wednesday;
    case 'J':
      return WEEKDAY.Thursday;
    case 'V':
      return WEEKDAY.Friday;
    case 'S':
      return WEEKDAY.Saturday;
    case 'D':
      return WEEKDAY.Sunday;
    default:
      return null;
  }
}

function hasHolidayIndicator(
  frequency: RouteTimetableFrequency,
  normalizedText: string,
  sanitizedCode: string
): boolean {
  const lowerName = frequency.name.toLowerCase();

  if (normalizedText) {
    const normalizedTokens = normalizedText.split(' ');

    if (normalizedTokens.some((token) => HOLIDAY_NAME_KEYWORDS.includes(token))) {
      return true;
    }

    if (HOLIDAY_EVENT_KEYWORDS.some((keyword) => normalizedText.includes(keyword))) {
      return true;
    }
  }

  if (lowerName.includes('fest.')) {
    return true;
  }

  if (!sanitizedCode) {
    return false;
  }

  if (sanitizedCode.startsWith('FER')) {
    return false;
  }

  if (sanitizedCode === 'F' || sanitizedCode === 'FE' || sanitizedCode === 'FES' || sanitizedCode === 'FEST') {
    return true;
  }

  if (sanitizedCode === 'FEL' || sanitizedCode === 'DF' || sanitizedCode === 'SDF' || sanitizedCode === 'SADF') {
    return true;
  }

  if (sanitizedCode.endsWith('F')) {
    return true;
  }

  return false;
}

function normalizeFrequencyText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function sanitizeFrequencyCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z]/gi, '')
    .toUpperCase();
}

const DAY_TOKEN_MAP = new Map<string, number>([
  ['lunes', WEEKDAY.Monday],
  ['lun', WEEKDAY.Monday],
  ['l', WEEKDAY.Monday],
  ['martes', WEEKDAY.Tuesday],
  ['mar', WEEKDAY.Tuesday],
  ['m', WEEKDAY.Tuesday],
  ['miercoles', WEEKDAY.Wednesday],
  ['mier', WEEKDAY.Wednesday],
  ['mie', WEEKDAY.Wednesday],
  ['mi', WEEKDAY.Wednesday],
  ['x', WEEKDAY.Wednesday],
  ['jueves', WEEKDAY.Thursday],
  ['juev', WEEKDAY.Thursday],
  ['jue', WEEKDAY.Thursday],
  ['j', WEEKDAY.Thursday],
  ['viernes', WEEKDAY.Friday],
  ['vier', WEEKDAY.Friday],
  ['vie', WEEKDAY.Friday],
  ['v', WEEKDAY.Friday],
  ['sabado', WEEKDAY.Saturday],
  ['sabados', WEEKDAY.Saturday],
  ['sab', WEEKDAY.Saturday],
  ['s', WEEKDAY.Saturday],
  ['domingo', WEEKDAY.Sunday],
  ['domingos', WEEKDAY.Sunday],
  ['dom', WEEKDAY.Sunday],
  ['d', WEEKDAY.Sunday]
]);

function containsWeekdayKeyword(text: string): boolean {
  if (!text) {
    return false;
  }

  const normalized = normalizeFrequencyText(text);

  if (!normalized) {
    return false;
  }

  return WEEKDAY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

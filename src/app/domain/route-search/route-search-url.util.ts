import { StopDirectoryOption } from '@data/stops/stop-directory.service';

export interface RouteSearchSegments {
  readonly base: string;
  readonly connector: string;
  readonly date: string;
}

const SLUG_SEPARATOR = '--';
const WORD_SEPARATOR = '-';
const MAX_SLUG_LENGTH = 120;
const CONSORTIUM_PREFIX = 'c';
const STOP_PREFIX = 's';

export function buildStopSlug(option: StopDirectoryOption): string {
  const primaryStopId = option.stopIds[0] ?? option.id;
  const normalizedName = normalizeSlugValue(option.name);
  const metadata = `${CONSORTIUM_PREFIX}${option.consortiumId}${STOP_PREFIX}${primaryStopId}`;
  return `${normalizedName}${SLUG_SEPARATOR}${metadata}`;
}

export function parseStopSlug(
  slug: string
): { readonly consortiumId: number | null; readonly stopId: string } | null {
  if (!slug) {
    return null;
  }

  const separatorIndex = slug.lastIndexOf(SLUG_SEPARATOR);

  if (separatorIndex === -1 || separatorIndex === slug.length - SLUG_SEPARATOR.length) {
    return null;
  }

  const metadata = slug.slice(separatorIndex + SLUG_SEPARATOR.length);

  if (!metadata) {
    return null;
  }

  const consortiumMatch = new RegExp(
    `^${CONSORTIUM_PREFIX}([0-9]+)${STOP_PREFIX}(.+)$`
  ).exec(metadata);

  if (consortiumMatch) {
    const [, consortiumText, stopId] = consortiumMatch;
    const consortiumId = Number(consortiumText);

    if (Number.isNaN(consortiumId) || !stopId) {
      return null;
    }

    return { consortiumId, stopId };
  }

  return { consortiumId: null, stopId: metadata };
}

export function buildRouteSearchPath(
  origin: StopDirectoryOption,
  destination: StopDirectoryOption,
  date: Date,
  segments: RouteSearchSegments
): readonly string[] {
  const originSlug = buildStopSlug(origin);
  const destinationSlug = buildStopSlug(destination);
  const formattedDate = buildDateSlug(date);

  return [
    '',
    segments.base,
    originSlug,
    segments.connector,
    destinationSlug,
    segments.date,
    formattedDate
  ] as const;
}

export function buildDateSlug(date: Date): string {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}-${month}-${day}`;
}

export function parseDateSlug(slug: string): Date | null {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/u.exec(slug);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeSlugValue(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, WORD_SEPARATOR)
    .replace(new RegExp(`${WORD_SEPARATOR}{2,}`, 'g'), WORD_SEPARATOR)
    .replace(new RegExp(`^${WORD_SEPARATOR}|${WORD_SEPARATOR}$`, 'g'), '');

  const trimmed = normalized.slice(0, MAX_SLUG_LENGTH);
  return trimmed || 'stop';
}

function padNumber(value: number): string {
  return value.toString().padStart(2, '0');
}

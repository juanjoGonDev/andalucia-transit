import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AppConfig, SupportedLanguage } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

interface StopInfoApiResponse {
  readonly idParada: string;
  readonly idNucleo: string | null;
  readonly idMunicipio: string | null;
  readonly idZona: string | null;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly observaciones: string | null;
  readonly principal: string | null;
  readonly inactiva: string | null;
  readonly municipio: string | null;
  readonly nucleo: string | null;
  readonly latitud: string | null;
  readonly longitud: string | null;
  readonly correspondecias: string | null;
}

export interface StopInfoRecord {
  readonly stopNumber: string;
  readonly consortiumId: number;
  readonly nucleusId: string | null;
  readonly municipalityId: string | null;
  readonly zoneId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly observations: string | null;
  readonly isMain: boolean | null;
  readonly isInactive: boolean | null;
  readonly municipality: string | null;
  readonly nucleus: string | null;
  readonly location: { readonly latitude: number; readonly longitude: number } | null;
  readonly correspondences: readonly string[];
}

const STOP_INFO_API_VERSION = 'v1' as const;
const STOP_INFO_CONSORTIUM_SEGMENT = 'Consorcios' as const;
const STOP_INFO_RESOURCE_SEGMENT = 'paradas' as const;
const LANGUAGE_QUERY_PARAM = 'lang' as const;
const BOOLEAN_FLAG_ACTIVE = '1' as const;
const CORRESPONDENCE_PREFIX_SEPARATOR = ':' as const;
const CORRESPONDENCE_VALUE_SEPARATOR = ',' as const;

const LANGUAGE_QUERY_MAP: Record<SupportedLanguage, string> = {
  es: 'ES',
  en: 'EN'
} as const;

const toBooleanFlag = (value: string | null): boolean | null => {
  if (value === null) {
    return null;
  }

  return value === BOOLEAN_FLAG_ACTIVE;
};

const toNullableString = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

const toCoordinate = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const extractCorrespondenceValues = (value: string | null): readonly string[] => {
  const normalized = toNullableString(value);

  if (!normalized) {
    return [];
  }

  const segments = normalized.split(CORRESPONDENCE_PREFIX_SEPARATOR);
  const rawList = segments[segments.length - 1]?.trim() ?? '';

  if (rawList.length === 0) {
    return [];
  }

  return rawList
    .split(CORRESPONDENCE_VALUE_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const toStopInfoRecord = (
  response: StopInfoApiResponse,
  consortiumId: number
): StopInfoRecord => ({
  stopNumber: response.idParada,
  consortiumId,
  nucleusId: toNullableString(response.idNucleo),
  municipalityId: toNullableString(response.idMunicipio),
  zoneId: toNullableString(response.idZona),
  name: response.nombre,
  description: toNullableString(response.descripcion),
  observations: toNullableString(response.observaciones),
  isMain: toBooleanFlag(response.principal),
  isInactive: toBooleanFlag(response.inactiva),
  municipality: toNullableString(response.municipio),
  nucleus: toNullableString(response.nucleo),
  location: buildLocation(response.latitud, response.longitud),
  correspondences: extractCorrespondenceValues(response.correspondecias)
});

const buildLocation = (
  latitude: string | null,
  longitude: string | null
): { readonly latitude: number; readonly longitude: number } | null => {
  const parsedLatitude = toCoordinate(latitude);
  const parsedLongitude = toCoordinate(longitude);

  if (parsedLatitude === null || parsedLongitude === null) {
    return null;
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
};

const resolveLanguageQuery = (language: SupportedLanguage): string =>
  LANGUAGE_QUERY_MAP[language] ?? LANGUAGE_QUERY_MAP.es;

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/u, '');

const trimLeadingSlashes = (value: string): string => value.replace(/^\/+/, '');

const buildEndpoint = (baseUrl: string, consortiumId: number, stopNumber: string): string => {
  const normalizedBase = trimTrailingSlashes(baseUrl);
  const segments = [
    STOP_INFO_API_VERSION,
    STOP_INFO_CONSORTIUM_SEGMENT,
    `${consortiumId}`,
    STOP_INFO_RESOURCE_SEGMENT,
    stopNumber
  ].map((segment) => trimLeadingSlashes(segment));

  return `${normalizedBase}/${segments.join('/')}`;
};

@Injectable({ providedIn: 'root' })
export class StopInfoService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  loadStopInformation(
    consortiumId: number,
    stopNumber: string,
    language: SupportedLanguage
  ): Observable<StopInfoRecord> {
    const endpoint = buildEndpoint(this.config.apiBaseUrl, consortiumId, stopNumber);
    const params = new HttpParams().set(LANGUAGE_QUERY_PARAM, resolveLanguageQuery(language));

    return this.http
      .get<StopInfoApiResponse>(endpoint, { params })
      .pipe(map((response) => toStopInfoRecord(response, consortiumId)));
  }
}

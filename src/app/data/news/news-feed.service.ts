import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { AppConfig, SupportedLanguage } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

export interface NewsFeedArticle {
  readonly consortiumId: number;
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly category: string | null;
  readonly categoryId: string | null;
  readonly publishedAt: string;
  readonly endsAt: string | null;
  readonly isNew: boolean;
  readonly order: number;
}

export interface NewsArticleDetail extends NewsFeedArticle {
  readonly contentHtml: string;
}

interface ConsortiumFeedResult {
  readonly success: boolean;
  readonly articles: readonly NewsFeedArticle[];
}

const API_VERSION = 'v1' as const;
const CONSORTIA_SEGMENT = 'Consorcios' as const;
const NEWS_SEGMENT = 'noticias' as const;
const PATH_SEPARATOR = '/' as const;
const SUPPORTED_CONSORTIUM_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9] as const);
const EMPTY_ARTICLES: readonly NewsFeedArticle[] = Object.freeze([]);
const HTML_TAG_PATTERN = /<[^>]*>/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const NEWS_TITLE_KEYS: Readonly<Record<SupportedLanguage, readonly string[]>> = Object.freeze({
  es: Object.freeze(['titulo', 'tituloEs', 'tituloES', 'titulo_es', 'tituloESP']),
  en: Object.freeze(['titulo', 'tituloEn', 'tituloEN', 'titulo_en', 'tituloENG'])
});
const NEWS_SUMMARY_KEYS = Object.freeze([
  'resumen',
  'entradilla',
  'subTitulo',
  'subtitulo',
  'descripcion'
] as const);
const NEWS_CONTENT_KEYS = Object.freeze(['texto', 'contenido', 'cuerpo', 'descripcion'] as const);

@Injectable({ providedIn: 'root' })
export class NewsFeedService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly apiBaseUrl = buildApiBaseUrl(this.config.apiBaseUrl);

  loadFeed(language: SupportedLanguage): Observable<readonly NewsFeedArticle[]> {
    const languageCode = toApiLanguage(language);
    const requests = SUPPORTED_CONSORTIUM_IDS.map((consortiumId) =>
      this.http.get<unknown>(this.buildNewsListUrl(consortiumId), {
        params: { lang: languageCode }
      }).pipe(
        map((payload) => ({
          success: true,
          articles: mapNewsList(payload, consortiumId, language)
        }) satisfies ConsortiumFeedResult),
        catchError(() =>
          of<ConsortiumFeedResult>({ success: false, articles: EMPTY_ARTICLES })
        )
      )
    );

    return forkJoin(requests).pipe(
      switchMap((results) => {
        if (!results.some((result) => result.success)) {
          return throwError(() => new Error('CTAN news is unavailable for every consortium'));
        }

        const articles = results.flatMap((result) => result.articles);
        articles.sort(compareByPublishedAtDescending);
        return of(Object.freeze(articles));
      })
    );
  }

  loadArticle(
    consortiumId: number,
    articleId: string,
    language: SupportedLanguage
  ): Observable<NewsArticleDetail> {
    validateConsortiumId(consortiumId);
    const normalizedArticleId = articleId.trim();

    if (!normalizedArticleId) {
      return throwError(() => new Error('articleId must not be empty'));
    }

    return this.http
      .get<unknown>(this.buildNewsDetailUrl(consortiumId, normalizedArticleId), {
        params: { lang: toApiLanguage(language) }
      })
      .pipe(
        map((payload) => mapNewsDetail(payload, consortiumId, normalizedArticleId, language)),
        switchMap((detail) =>
          detail
            ? of(detail)
            : throwError(() => new Error('CTAN news detail response is invalid'))
        )
      );
  }

  private buildNewsListUrl(consortiumId: number): string {
    return `${this.apiBaseUrl}/${CONSORTIA_SEGMENT}/${consortiumId}/${NEWS_SEGMENT}`;
  }

  private buildNewsDetailUrl(consortiumId: number, articleId: string): string {
    return `${this.buildNewsListUrl(consortiumId)}/${encodeURIComponent(articleId)}`;
  }
}

function buildApiBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.endsWith(PATH_SEPARATOR)
    ? rawBaseUrl.slice(0, rawBaseUrl.length - 1)
    : rawBaseUrl;
  return `${trimmed}/${API_VERSION}`;
}

function toApiLanguage(language: SupportedLanguage): string {
  return language.toUpperCase();
}

function validateConsortiumId(consortiumId: number): void {
  if (!Number.isSafeInteger(consortiumId) || consortiumId <= 0) {
    throw new RangeError('consortiumId must be a positive safe integer');
  }
}

function mapNewsList(
  payload: unknown,
  consortiumId: number,
  language: SupportedLanguage
): readonly NewsFeedArticle[] {
  const entries = readCollection(payload);
  const articles = entries
    .map((entry) => mapNewsSummary(entry, consortiumId, language))
    .filter((article): article is NewsFeedArticle => article !== null);
  return Object.freeze(articles);
}

function mapNewsDetail(
  payload: unknown,
  consortiumId: number,
  fallbackArticleId: string,
  language: SupportedLanguage
): NewsArticleDetail | null {
  const entry = readObject(payload);

  if (!entry) {
    return null;
  }

  const summary = mapNewsSummary(entry, consortiumId, language, fallbackArticleId);

  if (!summary) {
    return null;
  }

  const rawContent = readString(entry, NEWS_CONTENT_KEYS) ?? summary.summary;

  return {
    ...summary,
    contentHtml: rawContent
  };
}

function mapNewsSummary(
  entry: Readonly<Record<string, unknown>>,
  consortiumId: number,
  language: SupportedLanguage,
  fallbackArticleId?: string
): NewsFeedArticle | null {
  const id = readIdentifier(entry, ['idNoticia', 'id', 'noticiaId']) ?? fallbackArticleId ?? null;

  if (!id) {
    return null;
  }

  const rawTitle = readString(entry, NEWS_TITLE_KEYS[language]);
  const rawSummary = readString(entry, NEWS_SUMMARY_KEYS);
  const title = normalizePlainText(rawTitle ?? '');
  const summary = normalizePlainText(rawSummary ?? '');

  if (!title) {
    return null;
  }

  return {
    consortiumId,
    id,
    title,
    summary,
    category: readCategoryName(entry['categoria']),
    categoryId: readIdentifier(entry, ['idCategoria', 'categoriaId']),
    publishedAt: readString(entry, ['fechaInicio', 'fechaPublicacion', 'fecha']) ?? '',
    endsAt: readString(entry, ['fechaFin']) ?? null,
    isNew: readBoolean(entry, ['novedad']),
    order: readNumber(entry, ['orden']) ?? 0
  };
}

function readCollection(payload: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (Array.isArray(payload)) {
    return payload.map(readObject).filter(isRecordValue);
  }

  const object = readObject(payload);

  if (!object) {
    return Object.freeze([]);
  }

  for (const key of ['noticias', 'data', 'items']) {
    const value = object[key];

    if (Array.isArray(value)) {
      return value.map(readObject).filter(isRecordValue);
    }
  }

  return Object.freeze([]);
}

function isRecordValue(
  value: Readonly<Record<string, unknown>> | null
): value is Readonly<Record<string, unknown>> {
  return value !== null;
}

function readObject(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function readString(
  entry: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const value = entry[key];

    if (typeof value === 'string') {
      const normalized = value.trim();

      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function readIdentifier(
  entry: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const value = entry[key];

    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();

      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function readNumber(
  entry: Readonly<Record<string, unknown>>,
  keys: readonly string[]
): number | null {
  for (const key of keys) {
    const value = entry[key];
    const numeric = typeof value === 'number' ? value : Number(value);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
}

function readBoolean(entry: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  for (const key of keys) {
    const value = entry[key];

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 1 || value === '1' || value === 'true') {
      return true;
    }
  }

  return false;
}

function readCategoryName(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = normalizePlainText(value);
    return normalized || null;
  }

  const object = readObject(value);
  return object ? readString(object, ['nombre', 'descripcion', 'categoria']) : null;
}

function normalizePlainText(value: string): string {
  return value.replace(HTML_TAG_PATTERN, ' ').replace(WHITESPACE_PATTERN, ' ').trim();
}

function compareByPublishedAtDescending(left: NewsFeedArticle, right: NewsFeedArticle): number {
  const leftTimestamp = parseTimestamp(left.publishedAt);
  const rightTimestamp = parseTimestamp(right.publishedAt);
  return rightTimestamp - leftTimestamp || left.order - right.order;
}

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

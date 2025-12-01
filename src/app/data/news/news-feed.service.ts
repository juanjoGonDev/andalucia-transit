import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, defer, map, shareReplay } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

interface NewsFeedFileMetadata {
  readonly generatedAt: string;
  readonly timezone: string;
  readonly providerName: string;
}

interface NewsFeedFileArticle {
  readonly id: string;
  readonly titleKey: string;
  readonly summaryKey: string;
  readonly link: string;
  readonly publishedAt: string;
}

interface NewsFeedFile {
  readonly metadata: NewsFeedFileMetadata;
  readonly articles: readonly NewsFeedFileArticle[];
}

export interface NewsFeedArticle {
  readonly id: string;
  readonly titleKey: string;
  readonly summaryKey: string;
  readonly link: string;
  readonly publishedAt: string;
}

const FEED_CACHE_CONFIGURATION = { bufferSize: 1, refCount: true } as const;
const TRAILING_SLASHES_PATTERN = /\/+$/u;
const LEADING_SLASHES_PATTERN = /^\/+/u;

const trimTrailingSlashes = (value: string): string => value.replace(TRAILING_SLASHES_PATTERN, '');

const trimLeadingSlashes = (value: string): string => value.replace(LEADING_SLASHES_PATTERN, '');

const buildFeedEndpoint = (baseUrl: string, path: string): string => {
  const normalizedBase = trimTrailingSlashes(baseUrl);
  const normalizedPath = trimLeadingSlashes(path);

  if (normalizedPath.length === 0) {
    return normalizedBase;
  }

  if (normalizedBase.length === 0) {
    return normalizedPath;
  }

  return `${normalizedBase}/${normalizedPath}`;
};

const toFeedArticle = (article: NewsFeedFileArticle): NewsFeedArticle => ({
  id: article.id,
  titleKey: article.titleKey,
  summaryKey: article.summaryKey,
  link: article.link,
  publishedAt: article.publishedAt
});

const toTimestamp = (value: string): number => Date.parse(value);

const compareByPublishedAtDescending = (left: NewsFeedArticle, right: NewsFeedArticle): number => {
  const leftTimestamp = toTimestamp(left.publishedAt);
  const rightTimestamp = toTimestamp(right.publishedAt);

  return rightTimestamp - leftTimestamp;
};

const parseFeed = (file: NewsFeedFile): readonly NewsFeedArticle[] =>
  [...file.articles].map(toFeedArticle).sort(compareByPublishedAtDescending);

@Injectable({ providedIn: 'root' })
export class NewsFeedService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  private readonly feedEndpoint = buildFeedEndpoint(
    this.config.apiBaseUrl,
    this.config.data.news.feedApiPath
  );

  private readonly remoteFeed$ = defer(() =>
    this.http
      .get<NewsFeedFile>(this.feedEndpoint)
      .pipe(map(parseFeed))
  );

  private readonly snapshotFeed$ = defer(() =>
    this.http
      .get<NewsFeedFile>(this.config.data.news.feedSnapshotPath)
      .pipe(map(parseFeed))
  );

  private readonly feed$ = this.remoteFeed$.pipe(
    catchError(() => this.snapshotFeed$),
    shareReplay(FEED_CACHE_CONFIGURATION)
  );

  loadFeed(): Observable<readonly NewsFeedArticle[]> {
    return this.feed$;
  }
}

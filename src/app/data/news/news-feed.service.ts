import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { AppConfig } from '../../core/config';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';

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

  private readonly feed$ = this.http
    .get<NewsFeedFile>(this.config.data.news.feedPath)
    .pipe(map(parseFeed), shareReplay(FEED_CACHE_CONFIGURATION));

  loadFeed(): Observable<readonly NewsFeedArticle[]> {
    return this.feed$;
  }
}

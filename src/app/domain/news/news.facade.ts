import { Injectable, inject } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  concat,
  distinctUntilChanged,
  map,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';
import { NewsFeedArticle, NewsFeedService } from '@data/news/news-feed.service';

export interface NewsArticle {
  readonly id: string;
  readonly titleKey: string;
  readonly summaryKey: string;
  readonly link: string;
  readonly publishedAt: string;
}

export type NewsState =
  | { readonly status: 'loading'; readonly articles: readonly NewsArticle[] }
  | { readonly status: 'refreshing'; readonly articles: readonly NewsArticle[] }
  | { readonly status: 'ready'; readonly articles: readonly NewsArticle[] }
  | { readonly status: 'stale'; readonly articles: readonly NewsArticle[] }
  | { readonly status: 'error'; readonly articles: readonly NewsArticle[] };

type NewsEvent =
  | { readonly type: 'request' }
  | { readonly type: 'success'; readonly articles: readonly NewsArticle[] }
  | { readonly type: 'error' };

const EMPTY_ARTICLES: readonly NewsArticle[] = Object.freeze([]);
const INITIAL_STATE: NewsState = { status: 'loading', articles: EMPTY_ARTICLES };

const mapArticle = (article: NewsFeedArticle): NewsArticle => ({
  id: article.id,
  titleKey: article.titleKey,
  summaryKey: article.summaryKey,
  link: article.link,
  publishedAt: article.publishedAt
});

const reduceNewsState = (state: NewsState, event: NewsEvent): NewsState => {
  switch (event.type) {
    case 'request':
      return state.articles.length > 0
        ? { status: 'refreshing', articles: state.articles }
        : INITIAL_STATE;
    case 'success':
      return { status: 'ready', articles: event.articles };
    case 'error':
      return state.articles.length > 0
        ? { status: 'stale', articles: state.articles }
        : { status: 'error', articles: EMPTY_ARTICLES };
  }
};

const areArticleListsEqual = (
  left: readonly NewsArticle[],
  right: readonly NewsArticle[]
): boolean => {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((article, index) => article.id === right[index]?.id);
};

@Injectable({ providedIn: 'root' })
export class NewsFacade {
  private readonly newsFeed = inject(NewsFeedService);
  private readonly refreshTrigger = new Subject<void>();

  readonly state$: Observable<NewsState> = this.refreshTrigger.pipe(
    startWith(undefined),
    switchMap(() =>
      concat(
        of<NewsEvent>({ type: 'request' }),
        this.newsFeed.loadFeed().pipe(
          map((articles) => ({
            type: 'success',
            articles: articles.map(mapArticle)
          }) as const),
          catchError(() => of<NewsEvent>({ type: 'error' }))
        )
      )
    ),
    scan(reduceNewsState, INITIAL_STATE),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly articles$ = this.state$.pipe(
    map((state) => state.articles),
    distinctUntilChanged(areArticleListsEqual),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.refreshTrigger.next();
  }
}

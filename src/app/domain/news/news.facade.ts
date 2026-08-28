import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  concat,
  distinctUntilChanged,
  map,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';
import { LanguageService } from '@core/services/language.service';
import { NewsFeedArticle, NewsFeedService } from '@data/news/news-feed.service';

export type NewsArticle = NewsFeedArticle;

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

  return left.every(
    (article, index) =>
      article.id === right[index]?.id && article.consortiumId === right[index]?.consortiumId
  );
};

@Injectable({ providedIn: 'root' })
export class NewsFacade {
  private readonly newsFeed = inject(NewsFeedService);
  private readonly language = inject(LanguageService);
  private readonly refreshTrigger = new Subject<void>();
  private readonly language$ = toObservable(this.language.currentLanguage);

  readonly state$: Observable<NewsState> = combineLatest([
    this.refreshTrigger.pipe(startWith(undefined)),
    this.language$
  ]).pipe(
    switchMap(([, language]) =>
      concat(
        of<NewsEvent>({ type: 'request' }),
        this.newsFeed.loadFeed(language).pipe(
          map((articles) => ({ type: 'success', articles }) as const),
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

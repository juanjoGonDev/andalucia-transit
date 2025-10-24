import { Injectable, inject } from '@angular/core';
import { Observable, Subject, shareReplay, startWith, switchMap } from 'rxjs';
import { NewsFeedArticle, NewsFeedService } from '@data/news/news-feed.service';

export type NewsArticle = NewsFeedArticle;

const REFRESH_SIGNAL: void = undefined;
const FEED_SHARE_CONFIGURATION = { bufferSize: 1, refCount: true } as const;

@Injectable({ providedIn: 'root' })
export class NewsFacade {
  private readonly newsFeed = inject(NewsFeedService);
  private readonly refreshTrigger = new Subject<void>();

  readonly articles$: Observable<readonly NewsArticle[]> = this.refreshTrigger.pipe(
    startWith(REFRESH_SIGNAL),
    switchMap(() => this.newsFeed.loadFeed()),
    shareReplay(FEED_SHARE_CONFIGURATION)
  );

  refresh(): void {
    this.refreshTrigger.next();
  }
}

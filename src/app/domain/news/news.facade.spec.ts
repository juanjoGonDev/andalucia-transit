import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SupportedLanguage } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import { NewsFeedArticle, NewsFeedService } from '@data/news/news-feed.service';
import { NewsFacade, NewsState } from '@domain/news/news.facade';

class NewsFeedServiceStub {
  readonly responses: Subject<readonly NewsFeedArticle[]>[] = [];

  readonly loadFeed = jasmine.createSpy('loadFeed').and.callFake((_language: SupportedLanguage) => {
    const subject = new Subject<readonly NewsFeedArticle[]>();
    this.responses.push(subject);
    return subject.asObservable();
  });
}

class LanguageServiceStub {
  private readonly current = signal<SupportedLanguage>('es');

  get currentLanguage(): Signal<SupportedLanguage> {
    return this.current.asReadonly();
  }
}

describe('NewsFacade', () => {
  let facade: NewsFacade;
  let feedService: NewsFeedServiceStub;

  beforeEach(() => {
    feedService = new NewsFeedServiceStub();

    TestBed.configureTestingModule({
      providers: [
        { provide: NewsFeedService, useValue: feedService },
        { provide: LanguageService, useClass: LanguageServiceStub }
      ]
    });

    facade = TestBed.inject(NewsFacade);
  });

  it('emits loading before the initial feed arrives', () => {
    const states: NewsState[] = [];
    const subscription = facade.state$.subscribe((state) => states.push(state));

    expect(states.at(-1)).toEqual({ status: 'loading', articles: [] });
    expect(feedService.loadFeed).toHaveBeenCalledOnceWith('es');

    subscription.unsubscribe();
  });

  it('emits articles from the news feed service', () => {
    const emissions: NewsFeedArticle[][] = [];
    const subscription = facade.articles$.subscribe((articles) => emissions.push([...articles]));
    const initialArticles: readonly NewsFeedArticle[] = [createArticle('initial')];

    feedService.responses[0].next(initialArticles);

    expect(emissions.at(-1)).toEqual([...initialArticles]);
    subscription.unsubscribe();
  });

  it('preserves rendered articles while a refresh is pending', () => {
    const states: NewsState[] = [];
    const subscription = facade.state$.subscribe((state) => states.push(state));
    const initialArticles: readonly NewsFeedArticle[] = [createArticle('first')];

    feedService.responses[0].next(initialArticles);
    facade.refresh();

    expect(feedService.loadFeed).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toEqual({ status: 'refreshing', articles: initialArticles });
    subscription.unsubscribe();
  });

  it('marks preserved articles as stale when a refresh fails', () => {
    const states: NewsState[] = [];
    const subscription = facade.state$.subscribe((state) => states.push(state));
    const initialArticles: readonly NewsFeedArticle[] = [createArticle('first')];

    feedService.responses[0].next(initialArticles);
    facade.refresh();
    feedService.responses[1].error(new Error('offline'));

    expect(states.at(-1)).toEqual({ status: 'stale', articles: initialArticles });
    subscription.unsubscribe();
  });

  it('emits an error when the initial feed cannot be loaded', () => {
    const states: NewsState[] = [];
    const subscription = facade.state$.subscribe((state) => states.push(state));

    feedService.responses[0].error(new Error('offline'));

    expect(states.at(-1)).toEqual({ status: 'error', articles: [] });
    subscription.unsubscribe();
  });
});

function createArticle(id: string): NewsFeedArticle {
  return {
    consortiumId: 7,
    id,
    title: `Title ${id}`,
    summary: `Summary ${id}`,
    category: 'Avisos',
    categoryId: '3',
    publishedAt: '2026-08-28T09:00:00+02:00',
    endsAt: null,
    isNew: false,
    order: 0
  };
}

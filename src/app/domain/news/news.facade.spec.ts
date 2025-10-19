import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { NewsFeedArticle, NewsFeedService } from '../../data/news/news-feed.service';
import { NewsFacade } from './news.facade';

class NewsFeedServiceStub {
  readonly responses: Subject<readonly NewsFeedArticle[]>[] = [];

  readonly loadFeed = jasmine.createSpy('loadFeed').and.callFake(() => {
    const subject = new Subject<readonly NewsFeedArticle[]>();
    this.responses.push(subject);
    return subject.asObservable();
  });
}

describe('NewsFacade', () => {
  let facade: NewsFacade;
  let feedService: NewsFeedServiceStub;

  beforeEach(() => {
    feedService = new NewsFeedServiceStub();

    TestBed.configureTestingModule({
      providers: [{ provide: NewsFeedService, useValue: feedService }]
    });

    facade = TestBed.inject(NewsFacade);
  });

  it('emits articles from the news feed service', () => {
    const emissions: NewsFeedArticle[][] = [];
    const subscription = facade.articles$.subscribe((articles) => {
      emissions.push([...articles]);
    });

    expect(feedService.loadFeed).toHaveBeenCalledTimes(1);

    const initialResponse = feedService.responses[0];
    const initialArticles: readonly NewsFeedArticle[] = [
      {
        id: 'initial',
        titleKey: 'news.feed.initial.title',
        summaryKey: 'news.feed.initial.summary',
        link: 'https://www.ctan.es/noticias/initial',
        publishedAt: '2024-05-01T09:00:00+02:00'
      }
    ];

    initialResponse.next(initialArticles);

    expect(emissions.at(-1)).toEqual([...initialArticles]);

    subscription.unsubscribe();
  });

  it('refreshes the feed on demand', () => {
    const emissions: NewsFeedArticle[][] = [];
    const subscription = facade.articles$.subscribe((articles) => {
      emissions.push([...articles]);
    });

    expect(feedService.loadFeed).toHaveBeenCalledTimes(1);

    const firstResponse = feedService.responses[0];
    const initialArticles: readonly NewsFeedArticle[] = [
      {
        id: 'first',
        titleKey: 'news.feed.first.title',
        summaryKey: 'news.feed.first.summary',
        link: 'https://www.ctan.es/noticias/first',
        publishedAt: '2024-05-01T09:00:00+02:00'
      }
    ];
    firstResponse.next(initialArticles);

    facade.refresh();

    expect(feedService.loadFeed).toHaveBeenCalledTimes(2);

    const secondResponse = feedService.responses[1];
    const refreshedArticles: readonly NewsFeedArticle[] = [
      {
        id: 'refreshed',
        titleKey: 'news.feed.refreshed.title',
        summaryKey: 'news.feed.refreshed.summary',
        link: 'https://www.ctan.es/noticias/refreshed',
        publishedAt: '2024-06-01T09:00:00+02:00'
      }
    ];
    secondResponse.next(refreshedArticles);

    expect(emissions.at(-1)).toEqual([...refreshedArticles]);

    subscription.unsubscribe();
  });
});

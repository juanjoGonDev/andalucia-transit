import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config';
import { NewsFeedArticle, NewsFeedService } from '@data/news/news-feed.service';

interface TestFeedResponseArticle {
  readonly id: string;
  readonly titleKey: string;
  readonly summaryKey: string;
  readonly link: string;
  readonly publishedAt: string;
}

interface TestFeedResponse {
  readonly metadata: {
    readonly generatedAt: string;
    readonly timezone: string;
    readonly providerName: string;
  };
  readonly articles: readonly TestFeedResponseArticle[];
}

const buildResponse = (articles: readonly TestFeedResponseArticle[]): TestFeedResponse => ({
  metadata: {
    generatedAt: '2025-10-22T08:00:00+02:00',
    timezone: 'Europe/Madrid',
    providerName: 'Portal de Datos Abiertos de la Red de Consorcios de Transporte de Andalucía'
  },
  articles
});

describe('NewsFeedService', () => {
  let service: NewsFeedService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(NewsFeedService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('requests the news feed snapshot and sorts articles by published date', () => {
    const emissions: NewsFeedArticle[][] = [];

    service.loadFeed().subscribe((articles) => {
      emissions.push([...articles]);
    });

    const request = httpTestingController.expectOne(APP_CONFIG.data.news.feedPath);

    expect(request.request.method).toBe('GET');

    request.flush(
      buildResponse([
        {
          id: 'older-update',
          titleKey: 'news.feed.olderUpdate.title',
          summaryKey: 'news.feed.olderUpdate.summary',
          link: 'https://www.ctan.es/noticias/older',
          publishedAt: '2024-05-01T09:00:00+02:00'
        },
        {
          id: 'latest-update',
          titleKey: 'news.feed.latestUpdate.title',
          summaryKey: 'news.feed.latestUpdate.summary',
          link: 'https://www.ctan.es/noticias/latest',
          publishedAt: '2024-06-15T10:00:00+02:00'
        }
      ])
    );

    const firstEmission = emissions.at(0);

    if (!firstEmission) {
      throw new Error('Feed not loaded');
    }

    expect(firstEmission.map((article: NewsFeedArticle) => article.id)).toEqual([
      'latest-update',
      'older-update'
    ]);
  });

  it('shares the same feed request across multiple subscribers', () => {
    const firstSubscription = service.loadFeed().subscribe();
    const secondSubscription = service.loadFeed().subscribe();

    const request = httpTestingController.expectOne(APP_CONFIG.data.news.feedPath);

    request.flush(
      buildResponse([
        {
          id: 'single-update',
          titleKey: 'news.feed.singleUpdate.title',
          summaryKey: 'news.feed.singleUpdate.summary',
          link: 'https://www.ctan.es/noticias/single',
          publishedAt: '2024-05-01T09:00:00+02:00'
        }
      ])
    );

    firstSubscription.unsubscribe();
    secondSubscription.unsubscribe();
  });
});

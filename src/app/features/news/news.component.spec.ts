import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { NewsArticle, NewsFacade, NewsState } from '@domain/news/news.facade';
import { NewsComponent } from '@features/news/news.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class NewsFacadeStub {
  private readonly subject = new BehaviorSubject<NewsState>({ status: 'loading', articles: [] });
  readonly state$ = this.subject.asObservable();
  readonly refresh = jasmine.createSpy('refresh');

  emit(state: NewsState): void {
    this.subject.next(state);
  }
}

describe('NewsComponent', () => {
  let fixture: ComponentFixture<NewsComponent>;
  let facade: NewsFacadeStub;

  beforeEach(async () => {
    facade = new NewsFacadeStub();

    await TestBed.configureTestingModule({
      imports: [
        NewsComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [{ provide: NewsFacade, useValue: facade }]
    }).compileComponents();

    fixture = TestBed.createComponent(NewsComponent);
  });

  it('renders skeletons while the initial feed is loading', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card--skeleton').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.news__content')?.getAttribute('aria-busy')).toBe(
      'true'
    );
  });

  it('renders the list of news articles', () => {
    const articles = createArticles();

    facade.emit({ status: 'ready', articles });
    fixture.detectChanges();

    const titleElements = fixture.nativeElement.querySelectorAll('.news__card-title') as NodeListOf<HTMLElement>;
    const titles = Array.from(titleElements).map((element) => element.textContent?.trim());

    expect(titles).toEqual([
      'news.feed.sevillaMetroUpdates.title',
      'news.feed.malagaNightRoutes.title'
    ]);
  });

  it('keeps articles visible while a refresh is pending', () => {
    const articles = createArticles();

    facade.emit({ status: 'refreshing', articles });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card').length).toBe(articles.length);
    expect(fixture.nativeElement.querySelector('.news__refresh')?.getAttribute('aria-busy')).toBe(
      'true'
    );
  });

  it('keeps stale articles visible with a retry action after refresh failure', () => {
    const articles = createArticles();

    facade.emit({ status: 'stale', articles });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card').length).toBe(articles.length);
    expect(fixture.nativeElement.querySelector('.app-async-status--warning')).not.toBeNull();
  });

  it('requests a refresh when the action button is activated', () => {
    facade.emit({ status: 'ready', articles: [] });
    fixture.detectChanges();

    const refreshButton = fixture.nativeElement.querySelector('.news__refresh') as HTMLElement | null;

    if (!refreshButton) {
      throw new Error('Refresh button not found');
    }

    refreshButton.dispatchEvent(new MouseEvent('click'));

    expect(facade.refresh).toHaveBeenCalled();
  });
});

function createArticles(): readonly NewsArticle[] {
  return [
    {
      id: 'sevilla-metro',
      titleKey: 'news.feed.sevillaMetroUpdates.title',
      summaryKey: 'news.feed.sevillaMetroUpdates.summary',
      link: 'https://www.ctan.es/noticias/sevilla-metro',
      publishedAt: '2025-09-28T07:45:00+02:00'
    },
    {
      id: 'malaga-night-routes',
      titleKey: 'news.feed.malagaNightRoutes.title',
      summaryKey: 'news.feed.malagaNightRoutes.summary',
      link: 'https://www.ctan.es/noticias/malaga-night',
      publishedAt: '2025-09-15T10:30:00+02:00'
    }
  ];
}

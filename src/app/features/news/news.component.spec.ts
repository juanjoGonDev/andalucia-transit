import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { NewsArticle, NewsFacade } from '../../domain/news/news.facade';
import { NewsComponent } from './news.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class NewsFacadeStub {
  private readonly subject = new BehaviorSubject<readonly NewsArticle[]>([]);
  readonly articles$ = this.subject.asObservable();
  readonly refresh = jasmine.createSpy('refresh');

  emit(articles: readonly NewsArticle[]): void {
    this.subject.next(articles);
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

  it('renders the list of news articles', () => {
    const articles: readonly NewsArticle[] = [
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

    facade.emit(articles);
    fixture.detectChanges();

    const titleElements = fixture.nativeElement.querySelectorAll('.news__card-title') as NodeListOf<HTMLElement>;
    const titles = Array.from(titleElements).map((element) => element.textContent?.trim());

    expect(titles).toEqual([
      'news.feed.sevillaMetroUpdates.title',
      'news.feed.malagaNightRoutes.title'
    ]);
  });

  it('requests a refresh when the action button is activated', () => {
    fixture.detectChanges();

    const refreshButton = fixture.nativeElement.querySelector('.news__refresh') as HTMLElement | null;

    if (!refreshButton) {
      throw new Error('Refresh button not found');
    }

    refreshButton.dispatchEvent(new MouseEvent('click'));

    expect(facade.refresh).toHaveBeenCalled();
  });
});

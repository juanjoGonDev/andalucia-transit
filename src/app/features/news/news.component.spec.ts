import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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
  let router: Router;

  beforeEach(async () => {
    facade = new NewsFacadeStub();

    await TestBed.configureTestingModule({
      imports: [
        NewsComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [{ provide: NewsFacade, useValue: facade }, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(NewsComponent);
    router = TestBed.inject(Router);
  });

  it('renders skeletons while the initial feed is loading', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card--skeleton').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.news__content')?.getAttribute('aria-busy')).toBe('true');
  });

  it('renders CTAN article titles and categories without translation-key placeholders', () => {
    const articles = createArticles();

    facade.emit({ status: 'ready', articles });
    fixture.detectChanges();

    const titleElements = fixture.nativeElement.querySelectorAll('.news__card-title') as NodeListOf<HTMLElement>;
    const titles = Array.from(titleElements).map((element) => element.textContent?.trim());

    expect(titles).toEqual(['Cambio de servicio', 'Nueva tarifa']);
    expect(fixture.nativeElement.querySelectorAll('.news__filter').length).toBe(3);
  });

  it('filters visible news by CTAN category', () => {
    facade.emit({ status: 'ready', articles: createArticles() });
    fixture.detectChanges();

    const categoryButtons = fixture.nativeElement.querySelectorAll('.news__filter') as NodeListOf<HTMLButtonElement>;
    categoryButtons[1]?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card').length).toBe(1);
  });

  it('navigates to the internal CTAN news detail instead of opening an external link', () => {
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    facade.emit({ status: 'ready', articles: createArticles() });
    fixture.detectChanges();

    const readButton = fixture.nativeElement.querySelector('.news__card-link') as HTMLButtonElement;
    readButton.click();

    expect(navigate).toHaveBeenCalledOnceWith(['/', 'news', '7', '134']);
  });

  it('keeps articles visible while a refresh is pending', () => {
    const articles = createArticles();

    facade.emit({ status: 'refreshing', articles });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card').length).toBe(articles.length);
    expect(fixture.nativeElement.querySelector('.news__refresh')?.getAttribute('aria-busy')).toBe('true');
  });

  it('requests a refresh when the action button is activated', () => {
    facade.emit({ status: 'ready', articles: [] });
    fixture.detectChanges();

    const refreshButton = fixture.nativeElement.querySelector('.news__refresh') as HTMLElement;
    refreshButton.dispatchEvent(new MouseEvent('click'));

    expect(facade.refresh).toHaveBeenCalled();
  });
});

function createArticles(): readonly NewsArticle[] {
  return [
    {
      consortiumId: 7,
      id: '134',
      title: 'Cambio de servicio',
      summary: 'Aviso para varias líneas.',
      category: 'Avisos',
      categoryId: '3',
      publishedAt: '2026-08-28T09:00:00+02:00',
      endsAt: null,
      isNew: true,
      order: 0
    },
    {
      consortiumId: 6,
      id: '99',
      title: 'Nueva tarifa',
      summary: 'Información tarifaria.',
      category: 'Tarifas',
      categoryId: '5',
      publishedAt: '2026-08-27T09:00:00+02:00',
      endsAt: null,
      isNew: false,
      order: 0
    }
  ];
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  ConsortiumCatalogEntry,
  ConsortiumCatalogService
} from '@data/catalog/consortium-catalog.service';
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

class ConsortiumCatalogStub {
  readonly entries: readonly ConsortiumCatalogEntry[] = [
    { id: 6, name: 'Área de Almería', shortName: 'CTAL' },
    { id: 7, name: 'Área de Jaén', shortName: 'CTJA' },
    { id: 9, name: 'Costa de Huelva', shortName: 'CTHU' }
  ];

  loadConsortiums(): Observable<readonly ConsortiumCatalogEntry[]> {
    return of(this.entries);
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
      providers: [
        { provide: NewsFacade, useValue: facade },
        { provide: ConsortiumCatalogService, useClass: ConsortiumCatalogStub },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewsComponent);
    router = TestBed.inject(Router);
  });

  it('renders skeletons while the initial feed is loading', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card--skeleton').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.news__content')?.getAttribute('aria-busy')).toBe('true');
  });

  it('uses compact select filters instead of a horizontally scrolling category rail', () => {
    facade.emit({ status: 'ready', articles: createArticles() });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__filter').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.news__select').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.news__toolbar')).not.toBeNull();
  });

  it('keeps every catalog area selectable even when an area has no current news', () => {
    facade.emit({ status: 'ready', articles: createArticles() });
    fixture.detectChanges();

    const areaSelect = fixture.nativeElement.querySelector('.news__select--area') as HTMLSelectElement;
    const options = Array.from(areaSelect.options).map((option) => option.textContent?.trim());

    expect(options).toContain('Área de Almería');
    expect(options).toContain('Área de Jaén');
    expect(options).toContain('Costa de Huelva');
  });

  it('shows an explicit empty state for an area without current news', () => {
    facade.emit({ status: 'ready', articles: createArticles() });
    fixture.detectChanges();

    const areaSelect = fixture.nativeElement.querySelector('.news__select--area') as HTMLSelectElement;
    areaSelect.selectedIndex = 3;
    areaSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card-title').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay noticias para los filtros seleccionados.'
    );
  });

  it('filters news by traveler-readable transport area', () => {
    facade.emit({ status: 'ready', articles: createArticles() });
    fixture.detectChanges();

    const areaSelect = fixture.nativeElement.querySelector('.news__select--area') as HTMLSelectElement;
    areaSelect.selectedIndex = 1;
    areaSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.news__card-title') as NodeListOf<HTMLElement>;
    expect(Array.from(cards).map((card) => card.textContent?.trim())).toEqual(['Nueva tarifa']);
    expect(fixture.nativeElement.textContent).toContain('Área de Almería');
  });

  it('sorts oldest first when the order control changes', () => {
    facade.emit({ status: 'ready', articles: createArticles() });
    fixture.detectChanges();

    const orderSelect = fixture.nativeElement.querySelector('.news__select--order') as HTMLSelectElement;
    orderSelect.selectedIndex = 1;
    orderSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const firstTitle = fixture.nativeElement.querySelector('.news__card-title') as HTMLElement;
    expect(firstTitle.textContent?.trim()).toBe('Nueva tarifa');
  });

  it('paginates the feed with controls before and after the desktop list', () => {
    facade.emit({ status: 'ready', articles: createManyArticles(10) });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card').length).toBe(8);
    expect(fixture.nativeElement.querySelectorAll('.news__pagination').length).toBe(2);

    const nextButton = fixture.nativeElement.querySelector(
      '.news__pagination-slot--bottom .news__page-action:last-child'
    ) as HTMLButtonElement;
    nextButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.news__card').length).toBe(2);
    const previousButton = fixture.nativeElement.querySelector(
      '.news__pagination-slot--bottom .news__page-action:first-child'
    ) as HTMLButtonElement;
    expect(previousButton.disabled).toBeFalse();
  });

  it('writes filters, ordering and pagination to query parameters', () => {
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    facade.emit({ status: 'ready', articles: createManyArticles(10) });
    fixture.detectChanges();

    const areaSelect = fixture.nativeElement.querySelector('.news__select--area') as HTMLSelectElement;
    areaSelect.selectedIndex = 1;
    areaSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({ area: 6, page: null }),
        queryParamsHandling: 'merge',
        replaceUrl: true
      })
    );

    navigate.calls.reset();
    const nextButton = fixture.nativeElement.querySelector(
      '.news__pagination-slot--bottom .news__page-action:last-child'
    ) as HTMLButtonElement;
    nextButton.click();

    expect(navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({ area: 6, page: 2 }),
        queryParamsHandling: 'merge',
        replaceUrl: true
      })
    );
  });

  it('restores filters, ordering and page from the URL', async () => {
    facade.emit({ status: 'ready', articles: createAreaArticles(18) });
    fixture.detectChanges();

    await router.navigateByUrl('/?area=6&category=Tarifas&order=oldest&page=2');
    await fixture.whenStable();
    fixture.detectChanges();

    const areaSelect = fixture.nativeElement.querySelector('.news__select--area') as HTMLSelectElement;
    const categorySelect = fixture.nativeElement.querySelector(
      '.news__select--category'
    ) as HTMLSelectElement;
    const orderSelect = fixture.nativeElement.querySelector('.news__select--order') as HTMLSelectElement;

    expect(areaSelect.selectedOptions[0]?.textContent?.trim()).toBe('Área de Almería');
    expect(categorySelect.selectedOptions[0]?.textContent?.trim()).toBe('Tarifas');
    expect(orderSelect.value).toContain('oldest');
    expect(fixture.nativeElement.querySelector('.news__page-status')?.textContent).toContain(
      'Página 2 de 3'
    );
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
    createArticle({
      consortiumId: 7,
      id: '134',
      title: 'Cambio de servicio',
      summary: 'Aviso para varias líneas.',
      category: 'Avisos',
      publishedAt: '2026-08-28T09:00:00+02:00'
    }),
    createArticle({
      consortiumId: 6,
      id: '99',
      title: 'Nueva tarifa',
      summary: 'Información tarifaria.',
      category: 'Tarifas',
      publishedAt: '2026-08-27T09:00:00+02:00'
    })
  ];
}

function createManyArticles(count: number): readonly NewsArticle[] {
  return Array.from({ length: count }, (_, index) =>
    createArticle({
      consortiumId: index % 2 === 0 ? 6 : 9,
      id: String(index + 1),
      title: `Noticia ${index + 1}`,
      summary: `Resumen ${index + 1}`,
      category: index % 2 === 0 ? 'Avisos' : 'Tarifas',
      publishedAt: new Date(Date.UTC(2026, 7, 28 - index, 9)).toISOString()
    })
  );
}

function createAreaArticles(count: number): readonly NewsArticle[] {
  return Array.from({ length: count }, (_, index) =>
    createArticle({
      consortiumId: 6,
      id: String(index + 1),
      title: `Noticia Almería ${index + 1}`,
      summary: `Resumen Almería ${index + 1}`,
      category: 'Tarifas',
      publishedAt: new Date(Date.UTC(2026, 7, 28 - index, 9)).toISOString()
    })
  );
}

function createArticle(
  overrides: Pick<
    NewsArticle,
    'consortiumId' | 'id' | 'title' | 'summary' | 'category' | 'publishedAt'
  >
): NewsArticle {
  return {
    ...overrides,
    categoryId: null,
    endsAt: null,
    isNew: false,
    order: 0
  };
}

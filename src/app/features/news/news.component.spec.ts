import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
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

class ActivatedRouteStub {
  private readonly queryParams = new BehaviorSubject(convertToParamMap({}));
  readonly queryParamMap = this.queryParams.asObservable();
  readonly snapshot = { queryParamMap: this.queryParams.value };

  setQueryParams(params: Record<string, string>): void {
    const paramMap = convertToParamMap(params);
    this.snapshot.queryParamMap = paramMap;
    this.queryParams.next(paramMap);
  }
}

class RouterStub {
  navigate(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('NewsComponent', () => {
  let fixture: ComponentFixture<NewsComponent>;
  let facade: NewsFacadeStub;
  let router: Router;
  let route: ActivatedRouteStub;

  beforeEach(async () => {
    facade = new NewsFacadeStub();
    route = new ActivatedRouteStub();

    await TestBed.configureTestingModule({
      imports: [
        NewsComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: NewsFacade, useValue: facade },
        { provide: ConsortiumCatalogService, useClass: ConsortiumCatalogStub },
        { provide: Router, useClass: RouterStub },
        { provide: ActivatedRoute, useValue: route }
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
    facade.emit({ status: 'ready', articles: createAreaArticles(10) });
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

  it('restores filters, ordering and page from the URL', () => {
    facade.emit({ status: 'ready', articles: createAreaArticles(18) });
    fixture.detectChanges();

    route.setQueryParams({ area: '6', category: 'Tarifas', order: 'oldest', page: '2' });
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
      title: 'Servicio especial',
      summary: 'Información sobre refuerzos',
      category: 'Avisos',
      publishedAt: '2026-08-26T09:00:00+02:00',
      order: 0
    }),
    createArticle({
      consortiumId: 6,
      id: '220',
      title: 'Nueva tarifa',
      summary: 'Actualización tarifaria',
      category: 'Tarifas',
      publishedAt: '2026-08-20T09:00:00+02:00',
      order: 1
    })
  ];
}

function createManyArticles(count: number): readonly NewsArticle[] {
  return Array.from({ length: count }, (_, index) =>
    createArticle({
      consortiumId: index % 2 === 0 ? 6 : 7,
      id: String(index + 1),
      title: `Noticia ${index + 1}`,
      publishedAt: `2026-08-${String(28 - index).padStart(2, '0')}T09:00:00+02:00`,
      order: index
    })
  );
}

function createAreaArticles(count: number): readonly NewsArticle[] {
  return Array.from({ length: count }, (_, index) =>
    createArticle({
      consortiumId: 6,
      id: String(index + 1),
      title: `Tarifa ${index + 1}`,
      category: 'Tarifas',
      publishedAt: `2026-08-${String(28 - (index % 20)).padStart(2, '0')}T09:00:00+02:00`,
      order: index
    })
  );
}

function createArticle(overrides: Partial<NewsArticle>): NewsArticle {
  return {
    consortiumId: 7,
    id: '1',
    title: 'Noticia',
    summary: 'Resumen',
    category: null,
    categoryId: null,
    publishedAt: '2026-08-28T09:00:00+02:00',
    endsAt: null,
    isNew: false,
    order: 0,
    ...overrides
  };
}

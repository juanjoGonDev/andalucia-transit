import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, DefaultUrlSerializer, NavigationEnd, NavigationExtras, Router, UrlTree, convertToParamMap } from '@angular/router';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import { HomeTabStorage } from '@data/home/home-tab.storage';
import {
  FavoriteCollectionFacade,
  FavoriteCollectionSnapshot
} from '@domain/favorites/favorite-collection.facade';
import { LineFavorite } from '@domain/lines/line-favorites.facade';
import { RouteSearchExecutionService } from '@domain/route-search/route-search-execution.service';
import { RouteSearchSelection, RouteSearchStateService } from '@domain/route-search/route-search-state.service';
import { StopFavorite } from '@domain/stops/favorites.facade';
import { StopDirectoryOption } from '@domain/stops/stop-directory.facade';
import { HomeComponent } from '@features/home/home.component';
import { HomeTabId } from '@features/home/home.types';
import { HomeRecentSearchesComponent } from '@features/home/recent-searches/home-recent-searches.component';
import { RouteSearchFormComponent } from '@features/route-search/route-search-form/route-search-form.component';
import { AppLayoutNavigationKey } from '@shared/layout/app-layout-context.token';

class ImmediateIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: readonly number[] = [0];
  private readonly observedTargets = new Set<Element>();

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element): void {
    this.observedTargets.add(target);
    queueMicrotask(() => {
      const rect = target.getBoundingClientRect();
      const entry: IntersectionObserverEntry = {
        time: 0,
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: rect,
        rootBounds: null,
        intersectionRect: rect
      };

      this.callback([entry], this);
    });
  }

  unobserve(target: Element): void {
    this.observedTargets.delete(target);
  }

  disconnect(): void {
    this.observedTargets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      favorites: {
        title: 'Favorites',
        empty: 'No favorites yet',
        actions: { open: 'Open favorites' },
        list: { code: 'Code', nucleus: 'District' }
      }
    });
  }
}

class RouteSearchStateStub {
  selection: RouteSearchSelection | null = null;
  selection$ = of<RouteSearchSelection | null>(null);

  setSelection(selection: RouteSearchSelection): void {
    this.selection = selection;
  }
}

class RouteSearchExecutionStub {
  prepare = jasmine.createSpy('prepare').and.returnValue(['', 'routes']);
}

class FavoriteCollectionFacadeStub {
  private readonly subject = new BehaviorSubject<FavoriteCollectionSnapshot>({
    stops: [],
    lines: [],
    total: 0
  });
  readonly favorites$ = this.subject.asObservable();

  emit(stops: readonly StopFavorite[], lines: readonly LineFavorite[]): void {
    this.subject.next({ stops, lines, total: stops.length + lines.length });
  }
}

class HomeTabStorageStub {
  value: HomeTabId | null = null;
  read = jasmine.createSpy('read').and.callFake(() => this.value);
  write = jasmine.createSpy('write').and.callFake((tab: HomeTabId) => {
    this.value = tab;
  });
  clear = jasmine.createSpy('clear').and.callFake(() => {
    this.value = null;
  });
}

class RouterStub {
  url = `/${APP_CONFIG.routes.home}`;
  navigate = jasmine.createSpy('navigate').and.resolveTo(true);
  private readonly serializer = new DefaultUrlSerializer();
  private readonly eventsSubject = new Subject<NavigationEnd>();
  readonly events = this.eventsSubject.asObservable();

  emitNavigation(path: string): void {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    this.url = normalized;
    this.eventsSubject.next(new NavigationEnd(1, normalized, normalized));
  }

  parseUrl(url: string): UrlTree {
    return this.serializer.parse(url);
  }

  serializeUrl(url: UrlTree): string {
    return this.serializer.serialize(url);
  }

  createUrlTree(commands: unknown[], navigationExtras?: NavigationExtras): UrlTree {
    const primary = commands.filter((command) => command !== '').join('/');
    return this.serializer.parse(`/${primary}${buildQuery(navigationExtras?.queryParams ?? {})}`);
  }
}

@Component({
  selector: 'app-route-search-form',
  standalone: true,
  template: ''
})
class RouteSearchFormStubComponent {
  @Input() origin: StopDirectoryOption | null = null;
  @Input() destination: StopDirectoryOption | null = null;
  @Input() selectedDate: string | null = null;
  @Input() searchFormId: string | null = null;
  @Output() readonly routeSearch = new EventEmitter<RouteSearchSelection>();
  @Output() readonly selectionChange = new EventEmitter<RouteSearchSelection>();
}

@Component({
  selector: 'app-home-recent-searches',
  standalone: true,
  template: ''
})
class HomeRecentSearchesStubComponent {
  @Input() mode: 'section' | 'summary' = 'section';
  @Output() readonly searchAgain = new EventEmitter<RouteSearchSelection>();
}

const languageService = {
  currentLanguage: signal<'es' | 'en'>('en').asReadonly()
};

const activatedRouteStub = {
  queryParamMap: of(convertToParamMap({})),
  snapshot: { queryParamMap: convertToParamMap({}) }
};

function buildQuery(queryParams: NavigationExtras['queryParams']): string {
  if (!queryParams) {
    return '';
  }

  const entries = Object.entries(queryParams).filter(([, value]) => value !== null && value !== undefined);
  if (!entries.length) {
    return '';
  }

  const params = new URLSearchParams(entries.map(([key, value]) => [key, String(value)]));
  return `?${params.toString()}`;
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let router: RouterStub;
  let tabStorage: HomeTabStorageStub;
  let favoriteCollection: FavoriteCollectionFacadeStub;

  beforeEach(async () => {
    router = new RouterStub();
    tabStorage = new HomeTabStorageStub();
    favoriteCollection = new FavoriteCollectionFacadeStub();

    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: RouteSearchStateService, useClass: RouteSearchStateStub },
        { provide: RouteSearchExecutionService, useClass: RouteSearchExecutionStub },
        { provide: HomeTabStorage, useValue: tabStorage },
        { provide: FavoriteCollectionFacade, useValue: favoriteCollection },
        { provide: LanguageService, useValue: languageService }
      ]
    })
      .overrideComponent(HomeComponent, {
        remove: { imports: [RouteSearchFormComponent, HomeRecentSearchesComponent] },
        add: { imports: [RouteSearchFormStubComponent, HomeRecentSearchesStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders the aggregate favorites panel with translated copy', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    tick();
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('app-home-favorites-panel'));
    expect(panel).not.toBeNull();
    const text = panel.nativeElement.textContent as string;
    expect(text).toContain('Favorites');
    expect(text).toContain('Open favorites');
  }));

  it('keeps aggregate favorites deferred until the panel enters the viewport', fakeAsync(() => {
    const originalObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = ImmediateIntersectionObserver;

    try {
      fixture.detectChanges();
      flushMicrotasks();
      tick();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('app-home-favorites-panel'))).not.toBeNull();
    } finally {
      globalThis.IntersectionObserver = originalObserver;
    }
  }));

  it('navigates to aggregate favorites from the deferred panel action', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    tick();
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('app-home-favorites-panel'));
    panel.componentInstance.openFavorites.emit();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/', APP_CONFIG.routes.favorites]);
  }));

  it('renders line and stop favorites in the aggregate preview', fakeAsync(() => {
    favoriteCollection.emit(
      [
        {
          id: '7:100',
          code: '100',
          name: 'Stop 100',
          municipality: 'Sevilla',
          municipalityId: 'sevilla',
          nucleus: 'Centro',
          nucleusId: 'centro',
          consortiumId: 7,
          stopIds: ['100']
        }
      ],
      [
        {
          id: '7|200',
          consortiumId: 7,
          lineId: '200',
          code: 'M-200',
          name: 'Line 200',
          mode: 'Bus'
        }
      ]
    );
    fixture.detectChanges();
    flushMicrotasks();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Stop 100');
    expect(fixture.nativeElement.textContent).toContain('Line 200');
  }));

  it('restores the saved tab when the URL does not select one', fakeAsync(() => {
    tabStorage.value = 'favorites';
    fixture.detectChanges();
    tick();

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      relativeTo: activatedRouteStub,
      queryParams: { tab: 'favorites' },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }));
  }));

  it('persists a selected tab through router navigation', fakeAsync(() => {
    fixture.detectChanges();
    component['selectTab']('recent');
    tick();

    expect(tabStorage.write).toHaveBeenCalledWith('recent');
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      relativeTo: activatedRouteStub,
      queryParams: { tab: 'recent' },
      queryParamsHandling: 'merge'
    }));
  }));

  it('clears an invalid stored tab', fakeAsync(() => {
    tabStorage.value = 'invalid' as HomeTabId;
    fixture.detectChanges();
    tick();

    expect(tabStorage.clear).toHaveBeenCalled();
  }));
});

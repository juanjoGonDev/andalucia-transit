import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, DefaultUrlSerializer, NavigationEnd, NavigationExtras, Router, UrlTree, convertToParamMap } from '@angular/router';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { Subject, of } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { HomeTabStorage } from '@data/home/home-tab.storage';
import { RouteSearchExecutionService } from '@domain/route-search/route-search-execution.service';
import { RouteSearchSelection, RouteSearchStateService } from '@domain/route-search/route-search-state.service';
import { FavoritesFacade, StopFavorite } from '@domain/stops/favorites.facade';
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
    return of({});
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

class FavoritesFacadeStub {
  readonly favorites$ = of<readonly StopFavorite[]>([]);
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
}

class ActivatedRouteStub {
  private currentPath: string = APP_CONFIG.routes.home;
  private readonly params = new Map<string, string>();
  snapshot: ActivatedRoute['snapshot'] = this.createSnapshot();

  setPath(path: string): void {
    this.currentPath = path;
    this.snapshot = this.createSnapshot();
  }

  setQueryParam(key: string, value: string | null): void {
    if (value === null) {
      this.params.delete(key);
    } else {
      this.params.set(key, value);
    }

    this.snapshot = this.createSnapshot();
  }

  private createSnapshot(): ActivatedRoute['snapshot'] {
    const entries = Object.fromEntries(this.params);
    return {
      routeConfig: { path: this.currentPath },
      queryParamMap: convertToParamMap(entries)
    } as ActivatedRoute['snapshot'];
  }
}

@Component({
  selector: 'app-route-search-form',
  standalone: true,
  template: ''
})
class RouteSearchFormStubComponent {
  @Input() initialSelection: RouteSearchSelection | null = null;
  @Input() originDraft: StopDirectoryOption | null = null;
  @Output() readonly selectionConfirmed = new EventEmitter<RouteSearchSelection>();
}

@Component({
  selector: 'app-home-recent-searches',
  standalone: true,
  template: ''
})
class HomeRecentSearchesStubComponent {}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let router: RouterStub;
  let execution: RouteSearchExecutionStub;
  let routeStub: ActivatedRouteStub;
  let tabStorage: HomeTabStorageStub;
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;
  const originOption: StopDirectoryOption = {
    id: 'origin',
    code: '001',
    name: 'Origin Stop',
    municipality: 'Origin',
    municipalityId: 'origin-mun',
    nucleus: 'Origin',
    nucleusId: 'origin-nuc',
    consortiumId: 7,
    stopIds: ['origin-stop']
  };
  const destinationOption: StopDirectoryOption = {
    id: 'destination',
    code: '002',
    name: 'Destination Stop',
    municipality: 'Destination',
    municipalityId: 'destination-mun',
    nucleus: 'Destination',
    nucleusId: 'destination-nuc',
    consortiumId: 7,
    stopIds: ['destination-stop']
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        RouteSearchFormStubComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        { provide: Router, useClass: RouterStub },
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: RouteSearchStateService, useClass: RouteSearchStateStub },
        { provide: RouteSearchExecutionService, useClass: RouteSearchExecutionStub },
        { provide: FavoritesFacade, useClass: FavoritesFacadeStub },
        { provide: HomeTabStorage, useClass: HomeTabStorageStub }
      ]
    })
      .overrideComponent(HomeComponent, {
        remove: { imports: [RouteSearchFormComponent, HomeRecentSearchesComponent] },
        add: { imports: [RouteSearchFormStubComponent, HomeRecentSearchesStubComponent] }
      })
      .compileComponents();

    originalIntersectionObserver = window.IntersectionObserver;
    (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      ImmediateIntersectionObserver;

    fixture = TestBed.createComponent(HomeComponent);
    router = TestBed.inject(Router) as unknown as RouterStub;
    execution = TestBed.inject(RouteSearchExecutionService) as unknown as RouteSearchExecutionStub;
    routeStub = TestBed.inject(ActivatedRoute) as unknown as ActivatedRouteStub;
    tabStorage = TestBed.inject(HomeTabStorage) as unknown as HomeTabStorageStub;
    tabStorage.value = null;
    tabStorage.read.calls.reset();
    tabStorage.write.calls.reset();
  });

  afterEach(() => {
    if (originalIntersectionObserver) {
      (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
        originalIntersectionObserver;
    } else {
      delete (window as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    }
  });

  it('navigates to the route results page when the form emits a selection', fakeAsync(() => {
    fixture.detectChanges();
    router.navigate.calls.reset();
    const navigateSpy = router.navigate.and.resolveTo(true);
    const selection: RouteSearchSelection = {
      origin: originOption,
      destination: destinationOption,
      queryDate: new Date('2025-10-07T00:00:00Z'),
      lineMatches: []
    };

    (fixture.componentInstance as unknown as HomeComponentTestingApi).onSelectionConfirmed(selection);
    tick();

    expect(execution.prepare).toHaveBeenCalledWith(selection);
    expect(navigateSpy).toHaveBeenCalled();
  }));

  it('renders the recent searches component', async () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    router.navigate.calls.reset();
    component.selectTab('recent');
    await fixture.whenStable();
    fixture.detectChanges();
    const recent = fixture.debugElement.queryAll(By.directive(HomeRecentSearchesStubComponent));
    expect(recent.length).toBeGreaterThan(0);
  });

  it('activates the requested tab when the route path changes', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    routeStub.setPath(APP_CONFIG.routes.homeRecent);
    router.emitNavigation(APP_CONFIG.routes.homeRecent);
    fixture.detectChanges();
    expect(component.isTabActive('recent')).toBeTrue();
  });

  it('navigates to the recent route when selecting the recent tab', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    router.navigate.calls.reset();
    tabStorage.write.calls.reset();

    component.selectTab('recent');

    const [commands, extras] = router.navigate.calls.mostRecent().args as [readonly string[], NavigationExtras | undefined];
    expect(commands).toEqual(['/', APP_CONFIG.routes.homeRecent]);
    expect(extras?.queryParams).toEqual({ [APP_CONFIG.homeData.tabs.queryParam]: 'recent' });
    expect(extras?.queryParamsHandling).toBe('merge');
    expect(extras?.replaceUrl ?? false).toBeFalse();
    expect(tabStorage.write.calls.mostRecent().args[0]).toBe('recent');
  });

  it('navigates to the favorites route when selecting the favorites tab', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    router.navigate.calls.reset();
    tabStorage.write.calls.reset();

    component.selectTab('favorites');

    const [commands, extras] = router.navigate.calls.mostRecent().args as [readonly string[], NavigationExtras | undefined];
    expect(commands).toEqual(['/', APP_CONFIG.routes.homeFavorites]);
    expect(extras?.queryParams).toEqual({ [APP_CONFIG.homeData.tabs.queryParam]: 'favorites' });
    expect(extras?.queryParamsHandling).toBe('merge');
    expect(extras?.replaceUrl ?? false).toBeFalse();
    expect(tabStorage.write.calls.mostRecent().args[0]).toBe('favorites');
  });

  it('updates the layout navigation key when selecting a tab', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;

    expect(component.layoutNavigationKey()).toBe(APP_CONFIG.routes.home);

    component.selectTab('recent');

    expect(component.layoutNavigationKey()).toBe(APP_CONFIG.routes.homeRecent);
  });

  it('applies roving tabindex to tabs', () => {
    fixture.detectChanges();
    const tabs = fixture.debugElement.queryAll(By.css('.home__tab'));

    expect(tabs.length).toBe(3);
    expect((tabs[0].nativeElement as HTMLElement).getAttribute('tabindex')).toBe('0');
    expect((tabs[1].nativeElement as HTMLElement).getAttribute('tabindex')).toBe('-1');
    expect((tabs[2].nativeElement as HTMLElement).getAttribute('tabindex')).toBe('-1');
  });

  it('handles keyboard navigation between tabs', fakeAsync(() => {
    fixture.detectChanges();
    const tabs = fixture.debugElement.queryAll(By.css('.home__tab'));
    const firstTab = tabs[0].nativeElement as HTMLElement;

    router.navigate.calls.reset();
    tabStorage.write.calls.reset();

    const arrowRightEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true
    });
    firstTab.dispatchEvent(arrowRightEvent);
    fixture.detectChanges();
    flushMicrotasks();

    const [commands, extras] = router.navigate.calls.mostRecent().args as [readonly string[], NavigationExtras | undefined];
    expect(commands).toEqual(['/', APP_CONFIG.routes.homeRecent]);
    expect(extras?.queryParams).toEqual({ [APP_CONFIG.homeData.tabs.queryParam]: 'recent' });
    expect(extras?.queryParamsHandling).toBe('merge');
    expect(extras?.replaceUrl ?? false).toBeFalse();
    expect(tabStorage.write.calls.mostRecent().args[0]).toBe('recent');

    const updatedTabs = fixture.debugElement.queryAll(By.css('.home__tab'));
    const secondTabElement = updatedTabs[1].nativeElement as HTMLElement;

    expect(secondTabElement.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(secondTabElement);
  }));

  it('handles home and end keys within the tablist', fakeAsync(() => {
    fixture.detectChanges();
    const tabs = fixture.debugElement.queryAll(By.css('.home__tab'));
    const firstTab = tabs[0].nativeElement as HTMLElement;

    router.navigate.calls.reset();
    tabStorage.write.calls.reset();

    const endEvent = new KeyboardEvent('keydown', {
      key: 'End',
      bubbles: true,
      cancelable: true
    });
    firstTab.dispatchEvent(endEvent);
    fixture.detectChanges();
    flushMicrotasks();

    let [commands, extras] = router.navigate.calls.mostRecent().args as [readonly string[], NavigationExtras | undefined];
    expect(commands).toEqual(['/', APP_CONFIG.routes.homeFavorites]);
    expect(extras?.queryParams).toEqual({ [APP_CONFIG.homeData.tabs.queryParam]: 'favorites' });
    expect(extras?.queryParamsHandling).toBe('merge');
    expect(extras?.replaceUrl ?? false).toBeFalse();
    expect(tabStorage.write.calls.mostRecent().args[0]).toBe('favorites');

    router.navigate.calls.reset();
    tabStorage.write.calls.reset();

    const latestTabs = fixture.debugElement.queryAll(By.css('.home__tab'));
    const lastTab = latestTabs[2].nativeElement as HTMLElement;

    const homeEvent = new KeyboardEvent('keydown', {
      key: 'Home',
      bubbles: true,
      cancelable: true
    });
    lastTab.dispatchEvent(homeEvent);
    fixture.detectChanges();
    flushMicrotasks();

    [commands, extras] = router.navigate.calls.mostRecent().args as [readonly string[], NavigationExtras | undefined];
    expect(commands).toEqual(['/']);
    expect(extras?.queryParams).toEqual({ [APP_CONFIG.homeData.tabs.queryParam]: 'search' });
    expect(extras?.queryParamsHandling).toBe('merge');
    expect(extras?.replaceUrl ?? false).toBeFalse();
    expect(tabStorage.write.calls.mostRecent().args[0]).toBe('search');
    expect(document.activeElement).toBe(fixture.debugElement.queryAll(By.css('.home__tab'))[0].nativeElement);
  }));

  it('selects the tab defined in query params on initial load', fakeAsync(() => {
    fixture.destroy();
    router.navigate.calls.reset();
    tabStorage.write.calls.reset();
    tabStorage.read.calls.reset();
    tabStorage.value = null;
    routeStub.setPath(APP_CONFIG.routes.home);
    routeStub.setQueryParam(APP_CONFIG.homeData.tabs.queryParam, 'favorites');
    router.url = '/?tab=favorites';

    const localFixture = TestBed.createComponent(HomeComponent);
    localFixture.detectChanges();
    flushMicrotasks();

    const component = localFixture.componentInstance as unknown as HomeComponentTestingApi;
    const [commands, extras] = router.navigate.calls.mostRecent().args as [readonly string[], NavigationExtras | undefined];
    expect(component.isTabActive('favorites')).toBeTrue();
    expect(commands).toEqual(['/', APP_CONFIG.routes.homeFavorites]);
    expect(extras?.queryParams).toEqual({ [APP_CONFIG.homeData.tabs.queryParam]: 'favorites' });
    expect(extras?.queryParamsHandling).toBe('merge');
    expect(extras?.replaceUrl ?? false).toBeTrue();
    expect(tabStorage.write.calls.mostRecent().args[0]).toBe('favorites');

    localFixture.destroy();
  }));

  it('canonicalizes the home route using the stored tab when returning without query params', fakeAsync(() => {
    tabStorage.value = 'favorites';
    tabStorage.read.and.callFake(() => tabStorage.value);
    routeStub.setPath(APP_CONFIG.routes.home);
    routeStub.setQueryParam(APP_CONFIG.homeData.tabs.queryParam, null);
    router.url = '/';
    router.navigate.calls.reset();
    fixture.detectChanges();
    flushMicrotasks();

    router.navigate.calls.reset();
    tabStorage.write.calls.reset();

    routeStub.setPath(APP_CONFIG.routes.home);
    routeStub.setQueryParam(APP_CONFIG.homeData.tabs.queryParam, null);
    router.url = '/';
    router.emitNavigation(APP_CONFIG.routes.home);
    fixture.detectChanges();
    flushMicrotasks();

    const [commands, extras] = router.navigate.calls.mostRecent().args as [readonly string[], NavigationExtras | undefined];
    expect(commands).toEqual(['/', APP_CONFIG.routes.homeFavorites]);
    expect(extras?.queryParams).toEqual({ [APP_CONFIG.homeData.tabs.queryParam]: 'favorites' });
    expect(extras?.queryParamsHandling).toBe('merge');
    expect(extras?.replaceUrl ?? false).toBeTrue();
    expect(tabStorage.write.calls.mostRecent().args[0]).toBe('favorites');
  }));

  it('restores focus to the active tab after navigating away and returning', fakeAsync(() => {
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    const favorite: StopFavorite = {
      id: 'favorite-1',
      code: '001',
      name: 'Favorite Stop',
      municipality: 'Seville',
      municipalityId: 'sev',
      nucleus: 'Centro',
      nucleusId: 'sev-centro',
      consortiumId: 1,
      stopIds: ['stop-1']
    };

    component.selectTab('favorites');
    fixture.detectChanges();
    flushMicrotasks();

    router.navigate.calls.reset();

    component.openFavorite(favorite);
    fixture.detectChanges();
    flushMicrotasks();

    expect(router.navigate).toHaveBeenCalledWith(['/', APP_CONFIG.routes.stopDetailBase, 'stop-1']);

    router.emitNavigation(APP_CONFIG.routes.homeFavorites);
    fixture.detectChanges();
    flushMicrotasks();

    const favoritesTab = fixture.debugElement.queryAll(By.css('.home__tab'))[2].nativeElement as HTMLElement;

    expect(favoritesTab.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(favoritesTab);
  }));
});

interface HomeComponentTestingApi {
  onSelectionConfirmed(selection: RouteSearchSelection): Promise<void>;
  isTabActive(tab: HomeTabId): boolean;
  selectTab(tab: HomeTabId): void;
  openFavorite(favorite: StopFavorite): Promise<void>;
  layoutNavigationKey(): AppLayoutNavigationKey;
}

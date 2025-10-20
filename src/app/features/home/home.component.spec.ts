import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { Subject, of } from 'rxjs';
import { APP_CONFIG } from '../../core/config';
import { RouteSearchExecutionService } from '../../domain/route-search/route-search-execution.service';
import { RouteSearchSelection, RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import { FavoritesFacade, StopFavorite } from '../../domain/stops/favorites.facade';
import { StopDirectoryOption } from '../../domain/stops/stop-directory.facade';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';
import { HomeComponent } from './home.component';
import { HomeTabId } from './home.types';
import { HomeRecentSearchesComponent } from './recent-searches/home-recent-searches.component';

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

class RouterStub {
  navigate = jasmine.createSpy('navigate').and.resolveTo(true);
  private readonly eventsSubject = new Subject<NavigationEnd>();
  readonly events = this.eventsSubject.asObservable();

  emitNavigation(path: string): void {
    this.eventsSubject.next(new NavigationEnd(1, path, path));
  }
}

class ActivatedRouteStub {
  private currentPath: string = APP_CONFIG.routes.home;
  snapshot: { routeConfig: { path: string } } = { routeConfig: { path: this.currentPath } };

  setPath(path: string): void {
    this.currentPath = path;
    this.snapshot = { routeConfig: { path } };
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
        { provide: FavoritesFacade, useClass: FavoritesFacadeStub }
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
    fixture.detectChanges();
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
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    router.navigate.calls.reset();
    component.selectTab('recent');
    await fixture.whenStable();
    fixture.detectChanges();
    const recent = fixture.debugElement.queryAll(By.directive(HomeRecentSearchesStubComponent));
    expect(recent.length).toBeGreaterThan(0);
  });

  it('activates the requested tab when the route path changes', () => {
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    routeStub.setPath(APP_CONFIG.routes.homeRecent);
    router.emitNavigation(APP_CONFIG.routes.homeRecent);
    fixture.detectChanges();
    expect(component.isTabActive('recent')).toBeTrue();
  });

  it('navigates to the recent route when selecting the recent tab', () => {
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    router.navigate.calls.reset();
    component.selectTab('recent');
    expect(router.navigate).toHaveBeenCalledWith(['/', APP_CONFIG.routes.homeRecent]);
  });

  it('navigates to the favorites route when selecting the favorites tab', () => {
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    router.navigate.calls.reset();
    component.selectTab('favorites');
    expect(router.navigate).toHaveBeenCalledWith(['/', APP_CONFIG.routes.homeFavorites]);
  });
});

interface HomeComponentTestingApi {
  onSelectionConfirmed(selection: RouteSearchSelection): Promise<void>;
  isTabActive(tab: HomeTabId): boolean;
  selectTab(tab: HomeTabId): void;
}

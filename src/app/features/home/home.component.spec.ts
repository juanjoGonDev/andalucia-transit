import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { MatDatepicker, MatDatepickerInput } from '@angular/material/datepicker';
import { of } from 'rxjs';
import { FormControl } from '@angular/forms';

import { APP_CONFIG } from '../../core/config';
import { CardListItemComponent } from '../../shared/ui/card-list-item/card-list-item.component';
import { StopNavigationItemComponent } from '../../shared/ui/stop-navigation-item/stop-navigation-item.component';
import { HomeComponent } from './home.component';
import {
  StopDirectoryOption,
  StopDirectoryService,
  StopSearchRequest
} from '../../data/stops/stop-directory.service';
import {
  StopConnection,
  StopConnectionsService,
  STOP_CONNECTION_DIRECTION,
  StopConnectionDirection
} from '../../data/route-search/stop-connections.service';
import {
  RouteSearchSelection,
  RouteSearchStateService
} from '../../domain/route-search/route-search-state.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

const STUB_STOPS: readonly StopDirectoryOption[] = [
  buildStop('alpha', 'Alpha Station', ['alpha', 'alpha-secondary']),
  buildStop('beta', 'Beta Terminal'),
  buildStop('gamma', 'Gamma Center'),
  buildStop('delta', 'Delta Park')
];

class DirectoryStub {
  public lastRequest: StopSearchRequest | null = null;
  private readonly stops = STUB_STOPS;

  searchStops(request: StopSearchRequest) {
    this.lastRequest = request;
    const normalizedQuery = request.query.trim().toLocaleLowerCase('es-ES');
    const includeSet = request.includeStopIds ? new Set(request.includeStopIds) : null;

    const results = this.stops.filter((stop) => {
      const matchesQuery = normalizedQuery
        ? stop.name.toLocaleLowerCase('es-ES').includes(normalizedQuery) ||
          stop.municipality.toLocaleLowerCase('es-ES').includes(normalizedQuery)
        : false;
      const isIncluded = includeSet
        ? stop.stopIds.some((id) => includeSet.has(id))
        : false;

      if (!normalizedQuery && includeSet) {
        return isIncluded;
      }

      if (!normalizedQuery) {
        return false;
      }

      return matchesQuery || isIncluded;
    })
      .filter((stop) =>
        request.excludeStopId
          ? !stop.stopIds.includes(request.excludeStopId)
          : true
      )
      .slice(0, request.limit);

    return of(results);
  }

  getStopById() {
    return of(null);
  }
}

class ConnectionsStub {
  private readonly responses = new Map<string, Map<string, StopConnection>>();

  setResponse(
    stopIds: readonly string[],
    direction: StopConnectionDirection,
    connections: Map<string, StopConnection>
  ): void {
    this.responses.set(this.buildKey(stopIds, direction), connections);
  }

  setBidirectionalResponse(
    stopIds: readonly string[],
    forward: Map<string, StopConnection>,
    backward: Map<string, StopConnection> = forward
  ): void {
    this.setResponse(stopIds, STOP_CONNECTION_DIRECTION.Forward, forward);
    this.setResponse(stopIds, STOP_CONNECTION_DIRECTION.Backward, backward);
  }

  getConnections(
    stopIds: readonly string[],
    direction: StopConnectionDirection = STOP_CONNECTION_DIRECTION.Forward
  ) {
    const key = this.buildKey(stopIds, direction);
    const response = this.responses.get(key) ?? new Map<string, StopConnection>();
    return of(response);
  }

  private buildKey(stopIds: readonly string[], direction: StopConnectionDirection): string {
    return `${direction}|${[...stopIds].sort().join('|')}`;
  }
}

class RouteSearchStateStub {
  public lastSelection: RouteSearchSelection | null = null;

  setSelection(selection: RouteSearchSelection): void {
    this.lastSelection = selection;
  }
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let router: Router;
  let connections: ConnectionsStub;
  let routeSearchState: RouteSearchStateStub;

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  const dialogStub = { open: jasmine.createSpy('open') };

  beforeEach(async () => {
    dialogStub.open.calls.reset();

    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: dialogStub },
        { provide: StopDirectoryService, useClass: DirectoryStub },
        { provide: StopConnectionsService, useClass: ConnectionsStub },
        { provide: RouteSearchStateService, useClass: RouteSearchStateStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    connections = TestBed.inject(StopConnectionsService) as unknown as ConnectionsStub;
    routeSearchState = TestBed.inject(RouteSearchStateService) as unknown as RouteSearchStateStub;
    fixture.detectChanges();
  });

  it('initializes the date field with today and enforces the minimum date attribute', async () => {
    await fixture.whenStable();

    const dateControl = component['searchForm'].controls.date;
    const expectedToday = new Date();
    expectedToday.setHours(0, 0, 0, 0);

    const datepickerInput = fixture.debugElement
      .query(By.directive(MatDatepickerInput))
      .injector.get(MatDatepickerInput<Date>);

    expect(dateControl.value?.getTime()).toBe(expectedToday.getTime());
    expect(datepickerInput.min?.getTime()).toBe(expectedToday.getTime());
  });

  it('prevents searching with a date earlier than today', async () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const form = component['searchForm'];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    form.setValue({
      origin: STUB_STOPS[0],
      destination: STUB_STOPS[1],
      date: yesterday
    });
    form.updateValueAndValidity();

    component['onSearch']();

    expect(form.invalid).toBeTrue();
    expect(form.get('date')?.hasError('minDate')).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('opens the date picker when focusing the date field and blocks manual typing', async () => {
    await fixture.whenStable();

    const datepickerDebug = fixture.debugElement.query(By.directive(MatDatepicker));
    const datepicker = datepickerDebug.componentInstance as MatDatepicker<Date>;
    const openSpy = spyOn(datepicker, 'open');
    const dateInput = fixture.debugElement.query(
      By.css(`#${APP_CONFIG.homeData.search.dateFieldId}`)
    ).nativeElement as HTMLInputElement;

    dateInput.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(openSpy).toHaveBeenCalled();
    expect(dateInput.readOnly).toBeTrue();
  });

  it('renders the configured recent stops with a scrollable list', () => {
    const expectedStops = APP_CONFIG.homeData.recentStops.items.slice(
      0,
      APP_CONFIG.homeData.recentStops.maxItems
    );

    const recentList = fixture.debugElement.query(By.css('.home__recent-list'));
    const navigationItems = recentList.queryAll(By.directive(StopNavigationItemComponent));
    const cardItems = recentList.queryAll(By.directive(CardListItemComponent));

    expect(navigationItems.length).toBe(expectedStops.length);
    expect(cardItems.length).toBe(expectedStops.length);
    expect(recentList.nativeElement.classList.contains('home__list--scroll')).toBeTrue();

    navigationItems.forEach((debugElement, index) => {
      const navigationInstance = debugElement.componentInstance as StopNavigationItemComponent;
      expect(navigationInstance.stopId).toBe(expectedStops[index].id);
    });

    cardItems.forEach((item) => {
      const instance = item.componentInstance as CardListItemComponent;
      expect(instance.leadingIcon).toBe(APP_CONFIG.homeData.recentStops.icon);
    });
  });

  it('excludes the selected destination from origin search requests', fakeAsync(() => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopDirectoryOption | string | null>;
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopDirectoryOption | string | null>;
    const directory = TestBed.inject(StopDirectoryService) as unknown as DirectoryStub;
    const debounce = APP_CONFIG.homeData.search.debounceMs;
    const subscription = component['originOptions$'].subscribe();

    connections.setBidirectionalResponse(
      STUB_STOPS[2].stopIds,
      new Map<string, StopConnection>()
    );
    connections.setBidirectionalResponse(
      STUB_STOPS[0].stopIds,
      new Map<string, StopConnection>()
    );
    connections.setBidirectionalResponse(
      STUB_STOPS[1].stopIds,
      new Map<string, StopConnection>()
    );

    destinationControl.setValue(STUB_STOPS[0]);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    expect(directory.lastRequest?.excludeStopId).toBe(STUB_STOPS[0].id);

    originControl.setValue(STUB_STOPS[1]);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    expect(directory.lastRequest?.excludeStopId).toBe(STUB_STOPS[1].id);

    subscription.unsubscribe();
  }));

  it('filters destination options to stops reachable from the selected origin', fakeAsync(() => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopDirectoryOption | string | null>;
    const destinationOptions: StopDirectoryOption[][] = [];
    const debounce = APP_CONFIG.homeData.search.debounceMs;
    const subscription = component['destinationOptions$'].subscribe((options) => {
      destinationOptions.push([...options]);
    });

    connections.setResponse(
      STUB_STOPS[0].stopIds,
      STOP_CONNECTION_DIRECTION.Forward,
      new Map<string, StopConnection>([
        ['beta', buildConnection('beta', ['alpha'], [['L1', 0]])],
        ['gamma', buildConnection('gamma', ['alpha'], [['L2', 1]])]
      ])
    );

    originControl.setValue(STUB_STOPS[0]);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    const latest = destinationOptions[destinationOptions.length - 1] ?? [];
    expect(latest.map((option) => option.id)).toEqual(['beta', 'gamma']);

    subscription.unsubscribe();
  }));

  it('filters origin options when the destination is selected first', fakeAsync(() => {
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopDirectoryOption | string | null>;
    const originOptions: StopDirectoryOption[][] = [];
    const debounce = APP_CONFIG.homeData.search.debounceMs;
    const subscription = component['originOptions$'].subscribe((options) => {
      originOptions.push([...options]);
    });

    connections.setResponse(
      STUB_STOPS[1].stopIds,
      STOP_CONNECTION_DIRECTION.Backward,
      new Map<string, StopConnection>([
        ['alpha', buildConnection('alpha', ['beta'], [['L1', 0]])]
      ])
    );

    destinationControl.setValue(STUB_STOPS[1]);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    const latest = originOptions[originOptions.length - 1] ?? [];
    expect(latest.map((option) => option.id)).toEqual(['alpha']);

    subscription.unsubscribe();
  }));

  it('stores the selected stops and line matches before navigating to results', fakeAsync(() => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopDirectoryOption | string | null>;
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopDirectoryOption | string | null>;
    const dateControl = component['searchForm'].controls.date;
    const debounce = APP_CONFIG.homeData.search.debounceMs;
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    connections.setResponse(
      STUB_STOPS[0].stopIds,
      STOP_CONNECTION_DIRECTION.Forward,
      new Map<string, StopConnection>([
        ['beta', buildConnection('beta', ['alpha'], [['L1', 0]])]
      ])
    );
    connections.setResponse(
      STUB_STOPS[1].stopIds,
      STOP_CONNECTION_DIRECTION.Backward,
      new Map<string, StopConnection>([
        ['alpha', buildConnection('alpha', ['beta'], [['L1', 0]])]
      ])
    );

    originControl.setValue(STUB_STOPS[0]);
    destinationControl.setValue(STUB_STOPS[1]);
    const minimumDate = component['minSearchDate'];
    const validDate = new Date(minimumDate.getTime());
    validDate.setDate(validDate.getDate() + 1);
    dateControl.setValue(validDate);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    component['onSearch']();
    flush();

    expect(routeSearchState.lastSelection).not.toBeNull();
    expect(routeSearchState.lastSelection?.origin.id).toBe('alpha');
    expect(routeSearchState.lastSelection?.destination.id).toBe('beta');
    expect(routeSearchState.lastSelection?.lineMatches).toEqual([
      {
        lineId: 'L1',
        direction: 0,
        originStopIds: ['alpha'],
        destinationStopIds: ['beta']
      }
    ]);
    expect(navigateSpy).toHaveBeenCalled();
  }));

  it('shows the no routes feedback when no shared lines are found', fakeAsync(() => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopDirectoryOption | string | null>;
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopDirectoryOption | string | null>;
    const dateControl = component['searchForm'].controls.date;
    const debounce = APP_CONFIG.homeData.search.debounceMs;
    const feedbackStates: boolean[] = [];
    const subscription = component['showNoRoutes$'].subscribe((state) => {
      feedbackStates.push(state);
    });

    connections.setResponse(
      STUB_STOPS[0].stopIds,
      STOP_CONNECTION_DIRECTION.Forward,
      new Map<string, StopConnection>()
    );
    connections.setResponse(
      STUB_STOPS[1].stopIds,
      STOP_CONNECTION_DIRECTION.Backward,
      new Map<string, StopConnection>()
    );

    originControl.setValue(STUB_STOPS[0]);
    destinationControl.setValue(STUB_STOPS[1]);
    const minimumDate = component['minSearchDate'];
    const validDate = new Date(minimumDate.getTime());
    validDate.setDate(validDate.getDate() + 1);
    dateControl.setValue(validDate);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    component['onSearch']();
    flush();

    expect(feedbackStates[feedbackStates.length - 1]).toBeTrue();

    subscription.unsubscribe();
  }));

  it('clears the no routes feedback when selections change after a failed search', fakeAsync(() => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopDirectoryOption | string | null>;
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopDirectoryOption | string | null>;
    const dateControl = component['searchForm'].controls.date;
    const debounce = APP_CONFIG.homeData.search.debounceMs;
    const feedbackStates: boolean[] = [];
    const subscription = component['showNoRoutes$'].subscribe((state) => {
      feedbackStates.push(state);
    });

    connections.setResponse(
      STUB_STOPS[0].stopIds,
      STOP_CONNECTION_DIRECTION.Forward,
      new Map<string, StopConnection>()
    );
    connections.setResponse(
      STUB_STOPS[1].stopIds,
      STOP_CONNECTION_DIRECTION.Backward,
      new Map<string, StopConnection>()
    );

    originControl.setValue(STUB_STOPS[0]);
    destinationControl.setValue(STUB_STOPS[1]);
    const minimumDate = component['minSearchDate'];
    const validDate = new Date(minimumDate.getTime());
    validDate.setDate(validDate.getDate() + 1);
    dateControl.setValue(validDate);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    component['onSearch']();
    flush();

    originControl.setValue(STUB_STOPS[2]);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    expect(feedbackStates[feedbackStates.length - 1]).toBeFalse();

    subscription.unsubscribe();
  }));

  it('clears a duplicated destination when the same stop is selected as the origin', fakeAsync(() => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopDirectoryOption | string | null>;
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopDirectoryOption | string | null>;
    const debounce = APP_CONFIG.homeData.search.debounceMs;

    destinationControl.setValue(STUB_STOPS[2]);
    originControl.setValue(STUB_STOPS[2]);
    tick(debounce + 1);
    fixture.detectChanges();
    flush();

    expect(destinationControl.value).toBeNull();
  }));

  it('swaps selected stops when the swap action is triggered', () => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopDirectoryOption | string | null>;
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopDirectoryOption | string | null>;

    originControl.setValue(STUB_STOPS[0]);
    destinationControl.setValue(STUB_STOPS[2]);

    component['swapStops']();

    expect(originControl.value).toEqual(STUB_STOPS[2]);
    expect(destinationControl.value).toEqual(STUB_STOPS[0]);
  });

  it('groups autocomplete options by nucleus for display', () => {
    const alpha = buildStop('alpha', 'Alpha Station');
    const sibling = {
      ...buildStop('alpha-2', 'Alpha Station'),
      nucleus: alpha.nucleus,
      nucleusId: alpha.nucleusId,
      municipality: alpha.municipality,
      municipalityId: alpha.municipalityId
    } satisfies StopDirectoryOption;
    const beta = buildStop('beta', 'Beta Terminal');

    const groups = (
      component as unknown as {
        groupOptionsByNucleus: (
          options: readonly StopDirectoryOption[]
        ) => readonly {
          id: string;
          label: string;
          options: readonly StopDirectoryOption[];
        }[];
      }
    ).groupOptionsByNucleus([alpha, sibling, beta]);

    expect(groups.length).toBe(2);
    expect(groups[0].options.length).toBe(2);
    expect(groups[0].label).toBe(alpha.nucleus);
    expect(groups[1].options.length).toBe(1);
    expect(groups[1].label).toBe(beta.nucleus);
  });
});

function buildStop(
  id: string,
  name: string,
  stopIds: readonly string[] = [id]
): StopDirectoryOption {
  return {
    id,
    code: id,
    name,
    municipality: `${name} City`,
    municipalityId: `mun-${id}`,
    nucleus: name,
    nucleusId: `nuc-${id}`,
    consortiumId: 7,
    stopIds: [...stopIds]
  } satisfies StopDirectoryOption;
}

function buildConnection(
  stopId: string,
  originStopIds: readonly string[],
  signatures: readonly [string, number][]
): StopConnection {
  return {
    stopId,
    originStopIds: [...originStopIds],
    lineSignatures: signatures.map(([lineId, direction]) => ({
      lineId,
      direction
    }))
  } satisfies StopConnection;
}

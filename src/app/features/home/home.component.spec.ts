import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
import { HomeComponent } from './home.component';
import {
  MockTransitNetworkService,
  StopOption,
  StopSearchRequest
} from '../../data/stops/mock-transit-network.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

const STUB_STOPS: readonly StopOption[] = [
  { id: 'alpha', name: 'Alpha Station', lineIds: ['line-a', 'line-b'] },
  { id: 'beta', name: 'Beta Terminal', lineIds: ['line-a'] },
  { id: 'gamma', name: 'Gamma Center', lineIds: ['line-b'] },
  { id: 'delta', name: 'Delta Park', lineIds: ['line-c'] }
] as const;

const ALPHA_REACHABLE_STOP_IDS: readonly string[] = ['beta', 'gamma'];

class TransitNetworkStub {
  private readonly stops = STUB_STOPS;
  private readonly reachability = new Map<string, readonly string[]>([
    ['alpha', ['beta', 'gamma']],
    ['beta', ['alpha']],
    ['gamma', ['alpha']],
    ['delta', []]
  ]);

  searchStops(request: StopSearchRequest) {
    const normalizedQuery = request.query.trim().toLocaleLowerCase();
    let results = this.stops.filter((stop) =>
      request.includeStopIds ? request.includeStopIds.includes(stop.id) : true
    );

    if (normalizedQuery) {
      results = results.filter((stop) =>
        stop.name.toLocaleLowerCase().includes(normalizedQuery)
      );
    }

    if (request.excludeStopId) {
      results = results.filter((stop) => stop.id !== request.excludeStopId);
    }

    return of(results.slice(0, request.limit));
  }

  getReachableStopIds(stopId: string): readonly string[] {
    return this.reachability.get(stopId) ?? [];
  }

  getStopById(stopId: string): StopOption | null {
    return this.stops.find((stop) => stop.id === stopId) ?? null;
  }
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let router: Router;

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
        { provide: MockTransitNetworkService, useClass: TransitNetworkStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
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
    const recentItems = recentList.queryAll(By.directive(CardListItemComponent));

    expect(recentItems.length).toBe(expectedStops.length);
    expect(recentList.nativeElement.classList.contains('home__list--scroll')).toBeTrue();

    for (const item of recentItems) {
      const instance = item.componentInstance as CardListItemComponent;
      expect(instance.leadingIcon).toBe(APP_CONFIG.homeData.recentStops.icon);
    }
  });

  it('filters destination options to those reachable from the selected origin', fakeAsync(() => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopOption | string | null>;
    const destinationOptions$ = component['destinationOptions$'];
    const debounce = APP_CONFIG.homeData.search.debounceMs;
    let latestOptions: StopOption[] = [];

    const subscription = destinationOptions$.subscribe((value) => {
      latestOptions = [...value];
    });

    tick();
    const initialOptionIds = latestOptions.map((option) => option.id);

    originControl.setValue(STUB_STOPS[0]);
    tick(debounce + 1);
    fixture.detectChanges();
    tick();

    const reachableOptionIds = latestOptions.map((option) => option.id);

    expect(reachableOptionIds.length).toBeGreaterThan(0);
    expect(reachableOptionIds).not.toEqual(initialOptionIds);
    expect(
      reachableOptionIds.every((stopId: string) => ALPHA_REACHABLE_STOP_IDS.includes(stopId))
    ).toBeTrue();

    subscription.unsubscribe();
  }));

  it('clears an incompatible destination when the origin changes', fakeAsync(() => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopOption | string | null>;
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopOption | string | null>;
    const debounce = APP_CONFIG.homeData.search.debounceMs;

    originControl.setValue(STUB_STOPS[0]);
    destinationControl.setValue(STUB_STOPS[1]);
    tick(debounce);

    originControl.setValue(STUB_STOPS[3]);
    tick(debounce);

    expect(destinationControl.value).toBeNull();
  }));

  it('swaps selected stops when the swap action is triggered', () => {
    const originControl = component['searchForm'].controls
      .origin as FormControl<StopOption | string | null>;
    const destinationControl = component['searchForm'].controls
      .destination as FormControl<StopOption | string | null>;

    originControl.setValue(STUB_STOPS[0]);
    destinationControl.setValue(STUB_STOPS[2]);

    component['swapStops']();

    expect(originControl.value).toEqual(STUB_STOPS[2]);
    expect(destinationControl.value).toEqual(STUB_STOPS[0]);
  });
});

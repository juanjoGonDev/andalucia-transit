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

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

const STUB_STOPS: readonly StopDirectoryOption[] = [
  buildStop('alpha', 'Alpha Station'),
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

    let results = this.stops.filter((stop) =>
      includeSet ? includeSet.has(stop.id) : true
    );

    if (normalizedQuery) {
      results = results.filter((stop) =>
        stop.name.toLocaleLowerCase('es-ES').includes(normalizedQuery) ||
        stop.municipality.toLocaleLowerCase('es-ES').includes(normalizedQuery)
      );
    }

    if (request.excludeStopId) {
      results = results.filter((stop) => stop.id !== request.excludeStopId);
    }

    return of(results.slice(0, request.limit));
  }

  getStopById() {
    return of(null);
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
        { provide: StopDirectoryService, useClass: DirectoryStub }
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
});

function buildStop(id: string, name: string): StopDirectoryOption {
  return {
    id,
    code: id,
    name,
    municipality: `${name} City`,
    nucleus: name,
    consortiumId: 7
  } satisfies StopDirectoryOption;
}

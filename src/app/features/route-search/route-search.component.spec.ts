import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslateCompiler, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { BehaviorSubject, of } from 'rxjs';
import { LineRouteWorkspaceService } from '@domain/lines/line-route-workspace.service';
import { PinnedDepartureService } from '@domain/route-search/pinned-departure.service';
import { PinnedDepartureView } from '@domain/route-search/pinned-departure.service';
import {
  RouteSearchDepartureView,
  RouteSearchResultsService,
  RouteSearchResultsViewModel
} from '@domain/route-search/route-search-results.service';
import { RouteSearchSelectionResolverService } from '@domain/route-search/route-search-selection-resolver.service';
import { RouteSearchSelection, RouteSearchStateService } from '@domain/route-search/route-search-state.service';
import { buildDateSlug, buildStopSlug } from '@domain/route-search/route-search-url.util';
import { StopAlarmsService } from '@domain/stop-alarms/stop-alarms.service';
import { StopDirectoryFacade, StopDirectoryOption } from '@domain/stops/stop-directory.facade';
import { TripSessionStorage } from '@domain/trip/trip-session.storage';
import { RouteSearchDepartureRoutePreviewComponent } from '@features/route-search/departure-route-preview/route-search-departure-route-preview.component';
import { RouteSearchFormComponent } from '@features/route-search/route-search-form/route-search-form.component';
import { RouteSearchComponent } from '@features/route-search/route-search.component';
import { StopAlarmDialogComponent, StopAlarmDialogData } from '@features/stop-detail/stop-alarm-dialog/stop-alarm-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '@shared/ui/confirm-dialog/confirm-dialog.component';
import { OverlayDialogService } from '@shared/ui/dialog/overlay-dialog.service';

class TranslateTestingLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      'routeSearch.scheduleAccuracyWarning': 'Schedules may change',
      'routeSearch.emptyResults': 'No routes found',
      'routeSearch.emptyResultsDescription': 'Try another combination',
      'routeSearch.emptyResultsAction': 'Adjust search',
      'routeSearch.arrivalAt': 'Arrives at {time}'
    });
  }
}

class PinnedDepartureServiceStub {
  readonly pin = signal<PinnedDepartureView | null>(null);
  pinDeparture = jasmine.createSpy('pinDeparture');
  unpin = jasmine.createSpy('unpin');
  open = jasmine.createSpy('open').and.resolveTo(undefined);
}

class RouteSearchResultsServiceStub {
  public viewModel: RouteSearchResultsViewModel = {
    departures: [],
    hasUpcoming: false,
    nextDepartureId: null
  };

  loadResults(): ReturnType<RouteSearchResultsService['loadResults']> {
    return of(this.viewModel);
  }
}

class LineRouteWorkspaceServiceStub {
  load(): ReturnType<LineRouteWorkspaceService['load']> {
    return of({
      detail: {
        lineId: 'line-1',
        code: '001',
        name: 'Line One',
        mode: 'Bus',
        coordinates: []
      },
      stops: [],
      coordinates: [],
      resolvedDirection: 0,
      originStopIds: [],
      destinationStopIds: []
    });
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
  focusOriginField = jasmine.createSpy('focusOriginField');
}

class RouteSearchSelectionResolverServiceStub {
  resolveFromSlugs = jasmine
    .createSpy<
      RouteSearchSelectionResolverService['resolveFromSlugs']
    >('resolveFromSlugs')
    .and.returnValue(of(null));
}

class StopDirectoryFacadeStub {
  private readonly options = new Map<string, StopDirectoryOption>();

  setOptions(...options: StopDirectoryOption[]): void {
    for (const option of options) {
      this.options.set(option.id, option);
    }
  }

  getOptionByStopId(id: string) {
    return of(this.options.get(id) ?? null);
  }

  getOptionByStopSignature(consortiumId: number, stopId: string) {
    const option = Array.from(this.options.values()).find(
      (candidate) =>
        candidate.consortiumId === consortiumId && candidate.stopIds.some((value) => value === stopId)
    );

    return of(option ?? null);
  }
}

class ActivatedRouteStub {
  private readonly subject = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  private readonly querySubject = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  readonly paramMap = this.subject.asObservable();
  readonly queryParamMap = this.querySubject.asObservable();
  snapshot = {
    paramMap: convertToParamMap({}),
    queryParamMap: convertToParamMap({})
  };

  emit(params: Record<string, string>): void {
    const map = convertToParamMap(params);
    this.snapshot = { ...this.snapshot, paramMap: map };
    this.subject.next(map);
  }

  emitQuery(params: Record<string, string>): void {
    const map = convertToParamMap(params);
    this.snapshot = { ...this.snapshot, queryParamMap: map };
    this.querySubject.next(map);
  }
}

const invalidDateTimeMessage = 'Invalid DateTime for test setup';

function ensureValidDateTime(dateTime: DateTime): DateTime<true> {
  if (!dateTime.isValid) {
    throw new Error(invalidDateTimeMessage);
  }

  return dateTime as DateTime<true>;
}

describe('RouteSearchComponent', () => {
  const overlayDialogs = {
    open: jasmine
      .createSpy('open')
      .and.returnValue({ afterClosed: () => of(true), close: () => undefined })
  };
  let fixture: ComponentFixture<RouteSearchComponent>;
  let state: RouteSearchStateService;
  let resultsService: RouteSearchResultsServiceStub;
  let resolver: RouteSearchSelectionResolverServiceStub;
  let activatedRoute: ActivatedRouteStub;
  let directoryFacade: StopDirectoryFacadeStub;

  const origin: StopDirectoryOption = {
    id: 'alpha',
    code: 'alpha',
    name: 'Alpha Station',
    municipality: 'Alpha City',
    municipalityId: 'mun-alpha',
    nucleus: 'Alpha',
    nucleusId: 'nuc-alpha',
    consortiumId: 7,
    stopIds: ['alpha']
  };

  const destination: StopDirectoryOption = {
    id: 'beta',
    code: 'beta',
    name: 'Beta Terminal',
    municipality: 'Beta City',
    municipalityId: 'mun-beta',
    nucleus: 'Beta',
    nucleusId: 'nuc-beta',
    consortiumId: 7,
    stopIds: ['beta']
  };

  beforeEach(async () => {
    overlayDialogs.open.calls.reset();
    activatedRoute = new ActivatedRouteStub();
    directoryFacade = new StopDirectoryFacadeStub();
    directoryFacade.setOptions(origin, destination);

    await TestBed.configureTestingModule({
      imports: [
        RouteSearchComponent,
        RouteSearchFormStubComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateTestingLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: OverlayDialogService, useValue: overlayDialogs },
        { provide: RouteSearchResultsService, useClass: RouteSearchResultsServiceStub },
        { provide: LineRouteWorkspaceService, useClass: LineRouteWorkspaceServiceStub },
        {
          provide: RouteSearchSelectionResolverService,
          useClass: RouteSearchSelectionResolverServiceStub
        },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: StopDirectoryFacade, useValue: directoryFacade },
        { provide: PinnedDepartureService, useClass: PinnedDepartureServiceStub }
      ]
    })
      .overrideComponent(RouteSearchComponent, {
        remove: { imports: [RouteSearchFormComponent] },
        add: { imports: [RouteSearchFormStubComponent] }
      })
      .compileComponents();

    state = TestBed.inject(RouteSearchStateService);
    resultsService = TestBed.inject(
      RouteSearchResultsService
    ) as unknown as RouteSearchResultsServiceStub;
    resolver = TestBed.inject(
      RouteSearchSelectionResolverService
    ) as unknown as RouteSearchSelectionResolverServiceStub;
    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');
    fixture = TestBed.createComponent(RouteSearchComponent);
  });

  it('renders departures for the selected route without a duplicated route summary', () => {
    const departure: RouteSearchDepartureView = {
      id: 'service-1',
      lineId: 'L1',
      lineCode: '001',
      direction: 0,
      destination: 'Beta Terminal',
      originStopId: 'alpha',
      originStopIds: ['alpha'],
      destinationStopIds: ['beta'],
arrivalTime: new Date('2025-02-02T08:05:00Z'),
      relativeLabel: { text: '5m', unit: 'minute', value: 5 },
      waitTimeSeconds: 300,
      kind: 'upcoming',
      isNext: true,
      isMostRecentPast: false,
      isAccessible: true,
      isUniversityOnly: false,
      isHolidayService: true,
      showUpcomingProgress: true,
      progressPercentage: 75,
      pastProgressPercentage: 0,
      destinationArrivalTime: new Date('2025-02-02T08:20:00Z'),
      travelDurationLabel: '15m'
    } satisfies RouteSearchDepartureView;

    resultsService.viewModel = {
      departures: [departure],
      hasUpcoming: true,
      nextDepartureId: 'service-1'
    } satisfies RouteSearchResultsViewModel;

    const selection = {
      origin,
      destination,
      queryDate: new Date('2025-02-02T00:00:00Z'),
      lineMatches: []
    } satisfies RouteSearchSelection;
    state.setSelection(selection);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.route-search__summary'))).toBeNull();
    const form = fixture.debugElement.query(By.directive(RouteSearchFormStubComponent))
      .componentInstance as RouteSearchFormStubComponent;
    expect(form.initialSelection).toEqual(selection);

    const item = fixture.debugElement.query(By.css('.route-search__item'));
    expect(item).not.toBeNull();
    const lineLabel = item?.query(By.css('.route-search__item-line'))?.nativeElement as HTMLElement;
    expect(lineLabel.textContent).toContain('001');
    const holidayBadge = item?.query(By.css('.route-search__item-frequency'));
    expect(holidayBadge).not.toBeNull();
    const arrival = item?.query(By.css('.route-search__item-arrival-time'))?.nativeElement as HTMLElement;
    expect(arrival.textContent?.trim()).toBe('08:20');
    expect(arrival.getAttribute('aria-label')).toContain('08:20');

    const routePreview = item?.query(By.directive(RouteSearchDepartureRoutePreviewComponent))
      ?.componentInstance as RouteSearchDepartureRoutePreviewComponent;
    expect(routePreview.consortiumId).toBe(origin.consortiumId);
    expect(routePreview.departure).toEqual(departure);
  });

  it('prefills the origin field from the query parameter', () => {
    fixture.detectChanges();

    activatedRoute.emitQuery({ originStopId: origin.id });
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.directive(RouteSearchFormStubComponent))
      .componentInstance as RouteSearchFormStubComponent;

    expect(form.originDraft).toEqual(origin);
  });

  it('prefills the origin field when the query parameter is a slug', () => {
    fixture.detectChanges();

    activatedRoute.emitQuery({ originStopId: buildStopSlug(origin) });
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.directive(RouteSearchFormStubComponent))
      .componentInstance as RouteSearchFormStubComponent;

    expect(form.originDraft).toEqual(origin);
  });

  it('shows the accuracy warning for a distant future search', () => {
    const departure: RouteSearchDepartureView = {
      id: 'service-2',
      lineId: 'L2',
      lineCode: '002',
      direction: 0,
      destination: 'Beta Terminal',
      originStopId: 'alpha',
      originStopIds: ['alpha'],
      destinationStopIds: ['beta'],
arrivalTime: new Date('2025-02-02T08:05:00Z'),
      relativeLabel: { text: '5m', unit: 'minute', value: 5 },
      waitTimeSeconds: 300,
      kind: 'upcoming',
      isNext: true,
      isMostRecentPast: false,
      isAccessible: false,
      isUniversityOnly: false,
      isHolidayService: false,
      showUpcomingProgress: false,
      progressPercentage: 0,
      pastProgressPercentage: 0,
      destinationArrivalTime: null,
      travelDurationLabel: null
    } satisfies RouteSearchDepartureView;

    resultsService.viewModel = {
      departures: [departure],
      hasUpcoming: true,
      nextDepartureId: 'service-2'
    } satisfies RouteSearchResultsViewModel;

    const futureDate = DateTime.now().plus({ days: 45 }).startOf('day');

    state.setSelection({
      origin,
      destination,
      queryDate: futureDate.toJSDate(),
      lineMatches: []
    });

    fixture.detectChanges();

    const warning = fixture.debugElement.query(By.css('.route-search__accuracy'));
    expect(warning).not.toBeNull();
    const text = warning?.query(By.css('.route-search__accuracy-text'))?.nativeElement as HTMLElement;
    const content = text.textContent ?? '';
    expect(content).toMatch(/Schedules may change|routeSearch\.scheduleAccuracyWarning/);
  });

  it('navigates when the search form emits a new selection', async () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const form = fixture.debugElement
      .query(By.directive(RouteSearchFormStubComponent))
      .componentInstance as RouteSearchFormStubComponent;

    const selection = {
      origin,
      destination,
      queryDate: new Date('2025-02-02T00:00:00Z'),
      lineMatches: []
    } satisfies RouteSearchSelection;

    form.selectionConfirmed.emit(selection);
    fixture.detectChanges();

    expect(state.getSelection()).toEqual(selection);
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('shows only the search workspace when no selection is available', () => {
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.route-search__results'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.route-search__summary'))).toBeNull();
    expect(fixture.debugElement.query(By.directive(RouteSearchFormStubComponent))).not.toBeNull();
  });

  it('renders actionable guidance when a selection has no results', () => {
    state.setSelection({
      origin,
      destination,
      queryDate: new Date('2025-02-02T00:00:00Z'),
      lineMatches: []
    });

    fixture.detectChanges();

    const title = fixture.debugElement.query(By.css('.route-search__empty-title'));
    expect(title).not.toBeNull();
    const titleContent = (title?.nativeElement as HTMLElement).textContent?.trim() ?? '';
    expect(titleContent).toBe('No routes found');

    const description = fixture.debugElement.query(By.css('.route-search__empty-description'));
    expect(description).not.toBeNull();
    const descriptionContent = (description?.nativeElement as HTMLElement).textContent?.trim() ?? '';
    expect(descriptionContent).toBe('Try another combination');

    const action = fixture.debugElement.query(By.css('.route-search__empty-action'));
    expect(action).not.toBeNull();

    const formDebugElement = fixture.debugElement.query(By.directive(RouteSearchFormStubComponent));
    const form = formDebugElement.componentInstance as RouteSearchFormStubComponent;
    Reflect.set(fixture.componentInstance as object, 'formComponent', form);

    action?.triggerEventHandler('appAccessibleButtonActivated', {});

    expect(form.focusOriginField).toHaveBeenCalled();
  });

  it('shows the no upcoming message when all lines lack future services', () => {
    resultsService.viewModel = {
      departures: [
        {
          id: 'past-1',
          lineId: 'L9',
          lineCode: '009',
          direction: 1,
          destination: 'Beta Terminal',
          originStopId: 'alpha',
          originStopIds: ['alpha'],
          destinationStopIds: ['beta'],
arrivalTime: new Date('2025-02-02T07:30:00Z'),
          relativeLabel: { text: '10m', unit: 'minute', value: 10 },
          waitTimeSeconds: 600,
          kind: 'past',
          isNext: false,
          isMostRecentPast: true,
          isAccessible: false,
          isUniversityOnly: false,
          isHolidayService: false,
          showUpcomingProgress: false,
          progressPercentage: 0,
          pastProgressPercentage: 33,
          destinationArrivalTime: new Date('2025-02-02T07:45:00Z'),
          travelDurationLabel: '15m'
        }
      ],
      hasUpcoming: false,
      nextDepartureId: null
    } satisfies RouteSearchResultsViewModel;

    state.setSelection({
      origin,
      destination,
      queryDate: new Date('2025-02-02T00:00:00Z'),
      lineMatches: []
    });

    fixture.detectChanges();

    const message = fixture.debugElement.query(By.css('.route-search__no-upcoming'));
    expect(message).not.toBeNull();
  });

  it('shows a past search notice and navigates back to today', async () => {
    const nowSpy = spyOn(DateTime, 'now').and.returnValue(
      ensureValidDateTime(DateTime.fromISO('2025-06-10T12:00:00', { zone: 'Europe/Madrid' }))
    );

    resultsService.viewModel = {
      departures: [],
      hasUpcoming: false,
      nextDepartureId: null
    } satisfies RouteSearchResultsViewModel;

    state.setSelection({
      origin,
      destination,
      queryDate: new Date('2025-06-01T00:00:00Z'),
      lineMatches: []
    });

    fixture.detectChanges();

    const notice = fixture.debugElement.query(By.css('.route-search__notice'));
    expect(notice).not.toBeNull();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const button = fixture.debugElement.query(By.css('.route-search__notice-button'));
    button.triggerEventHandler('click', {});

    await fixture.whenStable();
    expect(navigateSpy).toHaveBeenCalled();

    nowSpy.and.callThrough();
  });

  it('restores the selection from route parameters when state is empty', () => {
    const departure: RouteSearchDepartureView = {
      id: 'service-10',
      lineId: 'L2',
      lineCode: '040',
      direction: 1,
      destination: 'Beta Terminal',
      originStopId: 'alpha',
      originStopIds: ['alpha'],
      destinationStopIds: ['beta'],
      arrivalTime: new Date('2025-02-02T08:20:00Z'),
      relativeLabel: { text: '15m', unit: 'minute', value: 15 },
      waitTimeSeconds: 900,
      kind: 'upcoming',
      isNext: true,
      isMostRecentPast: false,
      isAccessible: true,
      isUniversityOnly: false,
      isHolidayService: false,
      showUpcomingProgress: true,
      progressPercentage: 50,
      pastProgressPercentage: 0,
      destinationArrivalTime: new Date('2025-02-02T08:35:00Z'),
      travelDurationLabel: '15m'
    } satisfies RouteSearchDepartureView;

    resultsService.viewModel = {
      departures: [departure],
      hasUpcoming: true,
      nextDepartureId: 'service-10'
    } satisfies RouteSearchResultsViewModel;

    resolver.resolveFromSlugs.and.returnValue(
      of({
        origin,
        destination,
        queryDate: new Date('2025-02-02T00:00:00Z'),
        lineMatches: [
          {
            lineId: 'L2',
            lineCode: '040',
            direction: 1,
            originStopIds: ['alpha'],
            destinationStopIds: ['beta']
          }
        ]
      })
    );

    activatedRoute.emit({
      originSlug: 'alpha-station--alpha',
      destinationSlug: 'beta-terminal--beta',
      dateSlug: buildDateSlug(new Date('2025-02-02T00:00:00Z'))
    });

    fixture.detectChanges();

    const form = fixture.debugElement.query(By.directive(RouteSearchFormStubComponent))
      .componentInstance as RouteSearchFormStubComponent;
    expect(form.initialSelection?.origin.name).toBe('Alpha Station');
    expect(form.initialSelection?.destination.name).toBe('Beta Terminal');
    expect(fixture.debugElement.query(By.css('.route-search__summary'))).toBeNull();
  });

  function setUpResultsWithUpcomingDeparture(): void {
    const departure: RouteSearchDepartureView = {
      id: 'service-1',
      lineId: 'L1',
      lineCode: '001',
      direction: 0,
      destination: 'Beta Terminal',
      originStopId: 'alpha',
      originStopIds: ['alpha'],
      destinationStopIds: ['beta'],
      arrivalTime: new Date(Date.now() + 30 * 60_000),
      relativeLabel: { text: '5m', unit: 'minute', value: 5 },
      waitTimeSeconds: 300,
      kind: 'upcoming',
      isNext: true,
      isMostRecentPast: false,
      isAccessible: true,
      isUniversityOnly: false,
      isHolidayService: false,
      showUpcomingProgress: false,
      progressPercentage: 0,
      pastProgressPercentage: 0,
      destinationArrivalTime: null,
      travelDurationLabel: null
    } satisfies RouteSearchDepartureView;

    resultsService.viewModel = {
      departures: [departure],
      hasUpcoming: true,
      nextDepartureId: 'service-1'
    } satisfies RouteSearchResultsViewModel;

    state.setSelection({
      origin,
      destination,
      queryDate: new Date(),
      lineMatches: []
    });
    fixture.detectChanges();
  }

  it('starts a live trip session from the overflow menu of an upcoming departure', () => {
    setUpResultsWithUpcomingDeparture();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const storage = TestBed.inject(TripSessionStorage);

    fixture.debugElement.query(By.css('.route-search__item-overflow')).nativeElement.click();
    fixture.detectChanges();
    fixture.debugElement
      .query(By.css('.route-search__item-menu-option--live'))
      .nativeElement.click();

    const session = storage.load();
    expect(session).not.toBeNull();
    expect(session?.departureId).toBe('service-1');
    expect(session?.lineId).toBe('L1');
    expect(session?.originStopId).toBe('alpha');
    expect(session?.destinationStopId).toBe('beta');
    expect(session?.departTime).toBeTruthy();
    expect(session?.arriveTime).toBeTruthy();
    expect(navigateSpy).toHaveBeenCalledWith(['/', jasmine.any(String)]);
    storage.clear();
  });

  it('collapses pin, live and alarm actions behind an overflow menu on every row at all sizes', () => {
    setUpResultsWithUpcomingDeparture();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.route-search__item-quick-actions'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.route-search__item-alarm'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.route-search__item-pin'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.route-search__item-live'))).toBeNull();

    const trigger = fixture.debugElement.query(By.css('.route-search__item-overflow'));
    expect(trigger).not.toBeNull();
    expect(trigger.nativeElement.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.nativeElement.getAttribute('aria-expanded')).toBe('false');

    trigger.nativeElement.click();
    fixture.detectChanges();

    const menu = fixture.debugElement.query(By.css('.route-search__item-menu'));
    expect(menu).not.toBeNull();
    expect(trigger.nativeElement.getAttribute('aria-expanded')).toBe('true');

    const items = menu.nativeElement.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(3);
    for (const item of Array.from(items) as HTMLElement[]) {
      expect(item.textContent?.trim().length).toBeGreaterThan(3);
    }
  });

  it('closes the overflow menu after choosing the alarm action', () => {
    setUpResultsWithUpcomingDeparture();
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.route-search__item-overflow')).nativeElement.click();
    fixture.detectChanges();

    const alarmItem = fixture.debugElement.query(
      By.css('.route-search__item-menu .route-search__item-menu-option--alarm')
    );
    expect(alarmItem).not.toBeNull();
    alarmItem.nativeElement.click();
    fixture.detectChanges();

    expect(overlayDialogs.open).toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('.route-search__item-menu'))).toBeNull();
  });

  it('closes the overflow menu with Escape keeping the row intact', () => {
    setUpResultsWithUpcomingDeparture();
    fixture.detectChanges();

    const trigger = fixture.debugElement.query(By.css('.route-search__item-overflow'));
    trigger.nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.route-search__item-menu'))).not.toBeNull();

    fixture.nativeElement.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.route-search__item-menu'))).toBeNull();
    expect(trigger.nativeElement.getAttribute('aria-expanded')).toBe('false');
  });

  it('pins an upcoming departure and reflects the active pin', () => {
    const pins = TestBed.inject(PinnedDepartureService) as unknown as PinnedDepartureServiceStub;
    setUpResultsWithUpcomingDeparture();

    fixture.debugElement.query(By.css('.route-search__item-overflow')).nativeElement.click();
    fixture.detectChanges();
    let pinOption = fixture.debugElement.query(By.css('.route-search__item-menu-option--pin'));
    expect(pinOption.nativeElement.textContent).toContain('routeSearch.menuPinAdd');

    pinOption.nativeElement.click();
    fixture.detectChanges();

    expect(pins.pinDeparture).toHaveBeenCalledTimes(1);
    const [departure, selection] = pins.pinDeparture.calls.mostRecent().args;
    expect((departure as RouteSearchDepartureView).id).toBe('service-1');
    expect((selection as RouteSearchSelection).origin.name).toBe('Alpha Station');

    pins.pin.set({
      departureId: 'service-1',
      consortiumId: origin.consortiumId,
      lineId: 'L1',
      lineCode: '001',
      direction: 0,
      destination: 'Beta Terminal',
      originName: 'Alpha Station',
      destinationName: 'Beta Terminal',
      arrivalTime: new Date(Date.now() + 30 * 60_000),
      remainingMs: 30 * 60_000,
      progress: 0.2,
      countdown: { text: '30m', unit: 'minute', value: 30 }
    });
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.route-search__item-overflow')).nativeElement.click();
    fixture.detectChanges();
    pinOption = fixture.debugElement.query(By.css('.route-search__item-menu-option--pin'));
    expect(pinOption.nativeElement.textContent).toContain('routeSearch.menuPinActive');

    pinOption.nativeElement.click();
    expect(pins.unpin).toHaveBeenCalledTimes(1);
  });

  it('also exposes the departure alarm on past departures for recurring reminders (E14)', () => {
    resultsService.viewModel = {
      departures: [
        {
          id: 'past-1',
          lineId: 'L9',
          lineCode: '009',
          direction: 1,
          destination: 'Beta Terminal',
          originStopId: 'alpha',
          originStopIds: ['alpha'],
          destinationStopIds: ['beta'],
          arrivalTime: new Date('2025-02-02T07:30:00Z'),
          relativeLabel: { text: '10m', unit: 'minute', value: 10 },
          waitTimeSeconds: 600,
          kind: 'past',
          isNext: false,
          isMostRecentPast: true,
          isAccessible: false,
          isUniversityOnly: false,
          isHolidayService: false,
          showUpcomingProgress: false,
          progressPercentage: 0,
          pastProgressPercentage: 33,
          destinationArrivalTime: new Date('2025-02-02T07:45:00Z'),
          travelDurationLabel: '15m'
        }
      ],
      hasUpcoming: false,
      nextDepartureId: null
    } satisfies RouteSearchResultsViewModel;
    state.setSelection({ origin, destination, queryDate: new Date(), lineMatches: [] });
    fixture.detectChanges();

    const bell = fixture.debugElement.query(By.css('.route-search__item-alarm'));
    expect(bell).toBeNull();

    fixture.debugElement.query(By.css('.route-search__item-overflow')).nativeElement.click();
    fixture.detectChanges();
    fixture.debugElement
      .query(By.css('.route-search__item-menu-option--alarm'))
      .nativeElement.click();

    expect(overlayDialogs.open).toHaveBeenCalledTimes(1);
    const [component] = overlayDialogs.open.calls.mostRecent().args as [
      typeof StopAlarmDialogComponent
    ];
    expect(component).toBe(StopAlarmDialogComponent);
  });

  it('offers a departure alarm toggle that opens the alarm dialog with the route-search service id', () => {
    setUpResultsWithUpcomingDeparture();

    fixture.debugElement.query(By.css('.route-search__item-overflow')).nativeElement.click();
    fixture.detectChanges();
    const alarmOption = fixture.debugElement.query(
      By.css('.route-search__item-menu-option--alarm')
    );
    expect(alarmOption).not.toBeNull();
    expect(alarmOption.nativeElement.textContent).toContain('routeSearch.menuAlarmAdd');

    alarmOption.nativeElement.click();

    expect(overlayDialogs.open).toHaveBeenCalledTimes(1);
    const [component, config] = overlayDialogs.open.calls.mostRecent().args as [
      typeof StopAlarmDialogComponent,
      { data: StopAlarmDialogData }
    ];
    expect(component).toBe(StopAlarmDialogComponent);
    expect(config.data.serviceId).toBe('rs-service-1');
    expect(config.data.stopId).toBe('alpha');
    expect(config.data.stopName).toBe('Alpha Station');
    expect(config.data.consortiumId).toBe(origin.consortiumId);
  });

  it('marks existing departure alarms as active and opens the cancel dialog instead', () => {
    const alarms = TestBed.inject(StopAlarmsService);
    alarms.add({
      stopId: 'alpha',
      serviceId: 'rs-service-1',
      consortiumId: origin.consortiumId,
      stopName: 'Alpha Station',
      lineCode: '001',
      destination: 'Beta Terminal',
      scheduledArrival: new Date(Date.now() + 40 * 60_000),
      offsetMinutes: 10,
      repeatWeekdays: []
    });

    setUpResultsWithUpcomingDeparture();

    fixture.debugElement.query(By.css('.route-search__item-overflow')).nativeElement.click();
    fixture.detectChanges();
    const alarmOption = fixture.debugElement.query(
      By.css('.route-search__item-menu-option--alarm')
    );
    expect(alarmOption.nativeElement.textContent).toContain('routeSearch.menuAlarmActive');
    expect(
      alarmOption.nativeElement.querySelector('.material-symbols-outlined')?.textContent
    ).toContain('notifications_active');

    alarmOption.nativeElement.click();

    expect(overlayDialogs.open).toHaveBeenCalledTimes(1);
    const [component, config] = overlayDialogs.open.calls.mostRecent().args as [
      typeof ConfirmDialogComponent,
      { data: ConfirmDialogData }
    ];
    expect(component).toBe(ConfirmDialogComponent);
    expect(config.data.titleKey).toBe('stopDetail.alarms.cancelTitle');
  });
});

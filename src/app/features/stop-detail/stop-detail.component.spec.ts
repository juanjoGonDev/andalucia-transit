import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import {
  TranslateCompiler,
  TranslateLoader,
  TranslateModule,
  TranslateService
} from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { BehaviorSubject, delay, firstValueFrom, of, throwError } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { RouteLinesApiService } from '@data/route-search/route-lines-api.service';
import { StopScheduleFacade } from '@domain/stop-schedule/stop-schedule.facade';
import { StopSchedule, StopScheduleResult, StopService } from '@domain/stop-schedule/stop-schedule.model';
import { FavoritesFacade, StopFavorite } from '@domain/stops/favorites.facade';
import {
  StopDirectoryFacade,
  StopDirectoryOption,
  StopDirectoryRecord
} from '@domain/stops/stop-directory.facade';
import { addMinutesToDate } from '@domain/utils/time.util';
import { StopDetailComponent } from '@features/stop-detail/stop-detail.component';
import { APP_LAYOUT_CONTEXT, AppLayoutContext } from '@shared/layout/app-layout-context.token';

const STATUS_ROLE = 'status';
const POLITE_LIVE_REGION = 'polite';
const ASSERTIVE_LIVE_REGION = 'assertive';
const CONSORTIUM_QUERY_PARAM = APP_CONFIG.routeParams.stopInfo.consortiumId;

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      navigation: { lines: 'Lines' },
      home: {
        sections: {
          search: {
            addFavoriteLabel: 'Add to favorites',
            removeFavoriteLabel: 'Remove from favorites'
          }
        }
      },
      map: {
        focusedLines: {
          loading: 'Loading lines',
          error: 'Could not load lines',
          empty: 'No lines'
        }
      },
      stopInfo: {
        directions: { title: 'Directions' },
        status: { error: 'Could not load stop' }
      },
      stopDetail: {
        title: 'Stop detail',
        subtitle: 'Live schedules',
        loading: 'Loading schedule',
        error: { title: 'Unavailable', description: 'Try again' },
        header: {
          stopCodeLabel: 'Stop code',
          scheduleDateLabel: 'Schedule date',
          lastUpdatedLabel: 'Last updated'
        },
        filters: { destinationLabel: 'Destination', allDestinations: 'All destinations' },
        schedule: {
          upcomingTitle: 'Upcoming departures',
          upcomingSubtitle: '{count} departures',
          pastTitle: 'Recent departures',
          pastSubtitle: '{count} departures',
          emptyUpcoming: 'No upcoming departures',
          emptyPast: 'No recent departures'
        },
        status: {
          arrivesIn: 'Arrives in {minutes} min',
          arrivingNow: 'Arriving now',
          departedAgo: 'Departed {minutes} min ago'
        },
        announcements: {
          progress: 'lineCode:{lineCode}|destination:{destination}|status:{statusText}|progress:{percentage}'
        },
        badges: { accessible: 'Accessible', universityOnly: 'University' },
        source: { live: 'Live {provider}', snapshot: 'Snapshot {provider}' }
      }
    });
  }
}

class FavoritesFacadeStub {
  private readonly subject = new BehaviorSubject<readonly StopFavorite[]>([]);
  readonly favorites$ = this.subject.asObservable();
  readonly toggle = jasmine.createSpy('toggle');

  emit(favorites: readonly StopFavorite[]): void {
    this.subject.next(favorites);
  }
}

describe('StopDetailComponent', () => {
  let fixture: ComponentFixture<StopDetailComponent>;
  let router: jasmine.SpyObj<Router>;
  let scheduleFacade: jasmine.SpyObj<StopScheduleFacade>;
  let directoryFacade: jasmine.SpyObj<StopDirectoryFacade>;
  let favoritesFacade: FavoritesFacadeStub;
  let routeLines: jasmine.SpyObj<RouteLinesApiService>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let queryParamMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ stopId: 'stop-main-street' }));
    queryParamMapSubject = new BehaviorSubject(convertToParamMap({}));

    scheduleFacade = jasmine.createSpyObj<StopScheduleFacade>('StopScheduleFacade', [
      'loadStopSchedule'
    ]);
    scheduleFacade.loadStopSchedule.and.callFake((stopId: string) => of(createResult(stopId)));

    directoryFacade = jasmine.createSpyObj<StopDirectoryFacade>('StopDirectoryFacade', [
      'getOptionByStopId',
      'getOptionByStopSignature',
      'getRecordByStopId',
      'getRecordByStopSignature'
    ]);
    directoryFacade.getOptionByStopId.and.callFake((stopId) => of(createDirectoryOption(stopId)));
    directoryFacade.getOptionByStopSignature.and.callFake((consortiumId, stopId) =>
      of(createDirectoryOption(stopId, consortiumId))
    );
    directoryFacade.getRecordByStopId.and.callFake((stopId) => of(createDirectoryRecord(stopId)));
    directoryFacade.getRecordByStopSignature.and.callFake((consortiumId, stopId) =>
      of(createDirectoryRecord(stopId, consortiumId))
    );

    favoritesFacade = new FavoritesFacadeStub();

    routeLines = jasmine.createSpyObj<RouteLinesApiService>('RouteLinesApiService', [
      'getLinesForStops'
    ]);
    routeLines.getLinesForStops.and.returnValue(
      of([
        {
          lineId: '301',
          code: 'M-301',
          name: 'Almería - Aguadulce',
          mode: 'Autobús',
          priority: 1
        }
      ])
    );

    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    const layoutContext = jasmine.createSpyObj<AppLayoutContext>('AppLayoutContext', [
      'registerContent',
      'unregisterContent'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        StopDetailComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        { provide: StopScheduleFacade, useValue: scheduleFacade },
        { provide: StopDirectoryFacade, useValue: directoryFacade },
        { provide: FavoritesFacade, useValue: favoritesFacade },
        { provide: RouteLinesApiService, useValue: routeLines },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable(),
            queryParamMap: queryParamMapSubject.asObservable()
          }
        },
        { provide: Router, useValue: router },
        { provide: APP_LAYOUT_CONTEXT, useValue: layoutContext }
      ]
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    await firstValueFrom(translate.use('en'));
  });

  it('requests the schedule for the routed stop identifier', fakeAsync(() => {
    createFixture();
    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledWith('stop-main-street');
  }));

  it('resolves the routed stop and exposes an inactive favorite toggle', fakeAsync(() => {
    createFixture();

    expect(directoryFacade.getOptionByStopId).toHaveBeenCalledWith('stop-main-street');
    const button = fixture.nativeElement.querySelector('.stop-detail__favorite') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Add to favorites');
  }));

  it('uses consortium-aware lookup for the favorite toggle', fakeAsync(() => {
    queryParamMapSubject.next(convertToParamMap({ [CONSORTIUM_QUERY_PARAM]: '4' }));
    createFixture();

    expect(directoryFacade.getOptionByStopSignature).toHaveBeenCalledWith(4, 'stop-main-street');
  }));

  it('reacts to favorite changes and toggles the canonical stop option', fakeAsync(() => {
    const option = createDirectoryOption('stop-main-street');
    directoryFacade.getOptionByStopId.and.returnValue(of(option));
    createFixture();

    favoritesFacade.emit([toFavorite(option)]);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.stop-detail__favorite') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Remove from favorites');

    button.click();
    fixture.detectChanges();

    expect(favoritesFacade.toggle).toHaveBeenCalledOnceWith(option);
  }));

  it('keeps schedule detail usable when the stop cannot be resolved for favorites', fakeAsync(() => {
    directoryFacade.getOptionByStopId.and.returnValue(of(null));
    createFixture();

    expect(fixture.nativeElement.querySelector('.stop-detail__title')?.textContent).toContain('Test Stop');
    expect(fixture.nativeElement.querySelector('.stop-detail__favorite')).toBeNull();
  }));

  it('keeps utility work lazy until its task tab is selected', fakeAsync(() => {
    queryParamMapSubject.next(convertToParamMap({ [CONSORTIUM_QUERY_PARAM]: '4' }));
    createFixture();

    expect(routeLines.getLinesForStops).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.stop-detail__panel--departures')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-stop-utility')).toBeNull();

    selectSection('lines');

    expect(directoryFacade.getRecordByStopSignature).toHaveBeenCalledWith(4, 'stop-main-street');
    expect(routeLines.getLinesForStops).toHaveBeenCalledOnceWith(4, ['stop-main-street']);
    expect(fixture.nativeElement.querySelector('.stop-utility__line')?.textContent).toContain('M-301');
    expect(fixture.nativeElement.querySelectorAll('.stop-utility__map-link').length).toBe(0);
  }));

  it('renders directions separately from lines and hands walking routes to map providers', fakeAsync(() => {
    queryParamMapSubject.next(convertToParamMap({ [CONSORTIUM_QUERY_PARAM]: '7' }));
    createFixture();

    selectSection('directions');

    const mapLinks = fixture.nativeElement.querySelectorAll(
      '.stop-utility__map-link'
    ) as NodeListOf<HTMLAnchorElement>;
    expect(mapLinks.length).toBe(2);
    expect(fixture.nativeElement.querySelector('.stop-utility__line')).toBeNull();
    expect(routeLines.getLinesForStops).not.toHaveBeenCalled();
    expect(mapLinks[0]?.href).toContain('google.com/maps/dir/');
    expect(mapLinks[0]?.href).toContain('travelmode=walking');
    expect(mapLinks[1]?.href).toContain('maps.apple.com/');
  }));

  it('keeps the destination filter inside the departures surface', fakeAsync(() => {
    createFixture();

    expect(fixture.nativeElement.querySelector('.stop-detail__summary .stop-detail__select')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.stop-detail__panel--departures .stop-detail__select')
    ).not.toBeNull();
  }));

  it('uses accessible tabs and supports keyboard task switching', fakeAsync(() => {
    createFixture();

    const departures = fixture.nativeElement.querySelector(
      '[data-stop-section="departures"]'
    ) as HTMLButtonElement;
    const lines = fixture.nativeElement.querySelector(
      '[data-stop-section="lines"]'
    ) as HTMLButtonElement;

    expect(departures.getAttribute('aria-selected')).toBe('true');
    expect(lines.getAttribute('aria-selected')).toBe('false');

    departures.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(lines.getAttribute('aria-selected')).toBe('true');
  }));

  it('preserves consortium context when reloading the same stop', fakeAsync(() => {
    createFixture();
    scheduleFacade.loadStopSchedule.calls.reset();

    queryParamMapSubject.next(convertToParamMap({ [CONSORTIUM_QUERY_PARAM]: '7' }));
    tick();

    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledOnceWith('stop-main-street', {
      consortiumId: 7
    });
  }));

  it('marks loading and error schedule states as live regions', fakeAsync(() => {
    scheduleFacade.loadStopSchedule.and.returnValue(
      of(createResult('stop-main-street')).pipe(delay(1))
    );
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();

    const loading = fixture.nativeElement.querySelector('.stop-detail__loading') as HTMLElement;
    expect(loading.getAttribute('role')).toBe(STATUS_ROLE);
    expect(loading.getAttribute('aria-live')).toBe(POLITE_LIVE_REGION);
    tick();

    fixture.destroy();
    scheduleFacade.loadStopSchedule.and.returnValue(throwError(() => new Error('Network error')));
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.stop-detail__error') as HTMLElement;
    expect(error.getAttribute('role')).toBe(STATUS_ROLE);
    expect(error.getAttribute('aria-live')).toBe(ASSERTIVE_LIVE_REGION);
  }));

  it('redirects to home when the stop identifier is missing', fakeAsync(() => {
    paramMapSubject.next(convertToParamMap({}));
    createFixture();

    expect(router.navigate).toHaveBeenCalledWith(['/', APP_CONFIG.routes.home]);
    expect(scheduleFacade.loadStopSchedule).not.toHaveBeenCalled();
  }));

  it('announces upcoming progress changes through a polite live region', fakeAsync(() => {
    const service = createUpcomingService({
      serviceId: 'service-42',
      lineCode: 'M-112',
      destination: 'Centro',
      minutesUntilArrival: 5
    });
    scheduleFacade.loadStopSchedule.and.returnValue(of(createResult('stop-main-street', [service])));

    createFixture();

    const liveRegion = fixture.nativeElement.querySelector('.stop-detail__live-region') as HTMLElement;
    const textContent = liveRegion.textContent?.trim() ?? '';
    expect(liveRegion.getAttribute('aria-live')).toBe(POLITE_LIVE_REGION);
    expect(textContent).toContain('lineCode:M-112');
    expect(textContent).toContain('destination:Centro');
    expect(textContent).toContain('status:Arrives in 5 min');
  }));

  function createFixture(): void {
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function selectSection(section: 'lines' | 'directions'): void {
    const tab = fixture.nativeElement.querySelector(
      `[data-stop-section="${section}"]`
    ) as HTMLButtonElement;
    tab.click();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }
});

function createResult(stopId: string, services: readonly StopService[] = []): StopScheduleResult {
  const now = new Date();
  const schedule: StopSchedule = {
    stopId,
    stopCode: '1234',
    stopName: 'Test Stop',
    queryDate: now,
    generatedAt: now,
    services
  } as const;

  return {
    schedule,
    dataSource: {
      type: 'api',
      providerName: 'Test Provider',
      queryTime: now,
      snapshotTime: null
    }
  } as const;
}

function createDirectoryOption(stopId: string, consortiumId = 7): StopDirectoryOption {
  return {
    id: `${consortiumId}:${stopId}`,
    code: '056',
    name: 'Main Street',
    municipality: 'Sevilla',
    municipalityId: 'sevilla',
    nucleus: 'Sevilla',
    nucleusId: 'sevilla',
    consortiumId,
    stopIds: [stopId]
  } as const;
}

function toFavorite(option: StopDirectoryOption): StopFavorite {
  return {
    id: option.id,
    code: option.code,
    name: option.name,
    municipality: option.municipality,
    municipalityId: option.municipalityId,
    nucleus: option.nucleus,
    nucleusId: option.nucleusId,
    consortiumId: option.consortiumId,
    stopIds: option.stopIds
  } as const;
}

function createDirectoryRecord(stopId: string, consortiumId = 7): StopDirectoryRecord {
  return {
    consortiumId,
    stopId,
    stopCode: '056',
    name: 'Main Street',
    municipality: 'Sevilla',
    municipalityId: 'sevilla',
    nucleus: 'Sevilla',
    nucleusId: 'sevilla',
    zone: 'A',
    location: { latitude: 37.389, longitude: -5.984 }
  } as const;
}

function createUpcomingService(
  overrides: Partial<StopService> & { minutesUntilArrival?: number } = {}
): StopService {
  const minutesUntilArrival = overrides.minutesUntilArrival ?? 5;
  const currentTime = new Date();

  return {
    serviceId: overrides.serviceId ?? 'service-1',
    lineId: overrides.lineId ?? 'line-1',
    lineCode: overrides.lineCode ?? 'L-1',
    direction: overrides.direction ?? 1,
    destination: overrides.destination ?? 'Central Station',
    arrivalTime: addMinutesToDate(currentTime, minutesUntilArrival),
    isAccessible: overrides.isAccessible ?? false,
    isUniversityOnly: overrides.isUniversityOnly ?? false
  } as StopService;
}

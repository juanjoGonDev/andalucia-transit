import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import {
  TranslateCompiler,
  TranslateLoader,
  TranslateModule,
  TranslateService
} from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { BehaviorSubject, Observable, delay, firstValueFrom, of, throwError } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { RouteLinesApiService } from '@data/route-search/route-lines-api.service';
import { StopScheduleFacade } from '@domain/stop-schedule/stop-schedule.facade';
import { StopSchedule, StopScheduleResult, StopService } from '@domain/stop-schedule/stop-schedule.model';
import { StopDirectoryFacade, StopDirectoryRecord } from '@domain/stops/stop-directory.facade';
import { addMinutesToDate } from '@domain/utils/time.util';
import {
  STOP_TIMELINE_PAST_TAB_ID,
  STOP_TIMELINE_UPCOMING_TAB_ID,
  StopDetailComponent
} from '@features/stop-detail/stop-detail.component';
import { APP_LAYOUT_CONTEXT, AppLayoutContext } from '@shared/layout/app-layout-context.token';

const STATUS_ROLE = 'status';
const POLITE_LIVE_REGION = 'polite';
const ASSERTIVE_LIVE_REGION = 'assertive';
const CONSORTIUM_QUERY_PARAM = APP_CONFIG.routeParams.stopInfo.consortiumId;

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      navigation: { lines: 'Lines' },
      map: {
        focusedLines: {
          loading: 'Loading lines',
          error: 'Could not load lines',
          empty: 'No lines'
        }
      },
      stopInfo: { directions: { title: 'Directions' } },
      stopDetail: {
        title: 'stopDetail.title',
        subtitle: 'stopDetail.subtitle',
        loading: 'stopDetail.loading',
        error: {
          title: 'stopDetail.error.title',
          description: 'stopDetail.error.description'
        },
        header: {
          stopCodeLabel: 'stopDetail.header.stopCodeLabel',
          scheduleDateLabel: 'stopDetail.header.scheduleDateLabel',
          lastUpdatedLabel: 'stopDetail.header.lastUpdatedLabel'
        },
        filters: {
          destinationLabel: 'stopDetail.filters.destinationLabel',
          allDestinations: 'stopDetail.filters.allDestinations'
        },
        schedule: {
          upcomingTitle: 'stopDetail.schedule.upcomingTitle',
          upcomingSubtitle: 'stopDetail.schedule.upcomingSubtitle',
          pastTitle: 'stopDetail.schedule.pastTitle',
          pastSubtitle: 'stopDetail.schedule.pastSubtitle',
          emptyUpcoming: 'stopDetail.schedule.emptyUpcoming',
          emptyPast: 'stopDetail.schedule.emptyPast'
        },
        status: {
          arrivesIn: 'Arrives in {minutes} min',
          arrivingNow: 'Arriving now',
          departedAgo: 'Departed {minutes} min ago'
        },
        announcements: {
          progress: 'lineCode:{lineCode}|destination:{destination}|status:{statusText}|progress:{percentage}'
        },
        badges: {
          accessible: 'stopDetail.badges.accessible',
          universityOnly: 'stopDetail.badges.universityOnly'
        },
        source: {
          live: 'stopDetail.source.live',
          snapshot: 'stopDetail.source.snapshot'
        }
      }
    });
  }
}

describe('StopDetailComponent', () => {
  let fixture: ComponentFixture<StopDetailComponent>;
  let router: jasmine.SpyObj<Router>;
  let scheduleFacade: jasmine.SpyObj<StopScheduleFacade>;
  let directoryFacade: jasmine.SpyObj<StopDirectoryFacade>;
  let routeLines: jasmine.SpyObj<RouteLinesApiService>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let queryParamMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let layoutContext: jasmine.SpyObj<AppLayoutContext>;

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ stopId: 'stop-main-street' }));
    queryParamMapSubject = new BehaviorSubject(convertToParamMap({}));

    scheduleFacade = jasmine.createSpyObj<StopScheduleFacade>('StopScheduleFacade', [
      'loadStopSchedule'
    ]);
    scheduleFacade.loadStopSchedule.and.callFake((stopId: string) => of(createResult(stopId)));

    directoryFacade = jasmine.createSpyObj<StopDirectoryFacade>('StopDirectoryFacade', [
      'getRecordByStopId',
      'getRecordByStopSignature'
    ]);
    directoryFacade.getRecordByStopId.and.callFake((stopId) => of(createDirectoryRecord(stopId)));
    directoryFacade.getRecordByStopSignature.and.callFake((consortiumId, stopId) =>
      of(createDirectoryRecord(stopId, consortiumId))
    );

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

    layoutContext = jasmine.createSpyObj<AppLayoutContext>('AppLayoutContext', [
      'registerContent',
      'unregisterContent',
      'configureTabs',
      'setActiveTab',
      'clearTabs',
      'snapshot'
    ]);
    layoutContext.snapshot.and.returnValue({
      activeContent: null,
      activeNavigationKey: null,
      tabs: [],
      activeTab: null
    });

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

  it('preserves consortium context for schedules, stop metadata and stop lines', fakeAsync(() => {
    queryParamMapSubject.next(convertToParamMap({ [CONSORTIUM_QUERY_PARAM]: '4' }));

    createFixture();

    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledWith('stop-main-street', {
      consortiumId: 4
    });
    expect(directoryFacade.getRecordByStopSignature).toHaveBeenCalledWith(4, 'stop-main-street');
    expect(routeLines.getLinesForStops).toHaveBeenCalledWith(4, ['stop-main-street']);
  }));

  it('falls back to legacy stop resolution when consortium context is invalid', fakeAsync(() => {
    queryParamMapSubject.next(convertToParamMap({ [CONSORTIUM_QUERY_PARAM]: 'invalid' }));

    createFixture();

    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledWith('stop-main-street');
    expect(directoryFacade.getRecordByStopId).toHaveBeenCalledWith('stop-main-street');
  }));

  it('renders useful line and walking-map actions in the stop detail surface', fakeAsync(() => {
    createFixture();

    const lineButton = fixture.nativeElement.querySelector('.stop-utility__line') as HTMLButtonElement | null;
    const mapLinks = fixture.nativeElement.querySelectorAll('.stop-utility__map-link') as NodeListOf<HTMLAnchorElement>;

    expect(lineButton?.textContent).toContain('M-301');
    expect(mapLinks.length).toBe(2);
    expect(mapLinks[0]?.href).toContain('google.com/maps/dir/');
    expect(mapLinks[0]?.href).toContain('travelmode=walking');
    expect(mapLinks[1]?.href).toContain('maps.apple.com/');

    lineButton?.click();
    expect(router.navigate).toHaveBeenCalledWith(['/', 'lines', '7', '301']);
  }));

  it('marks the loading status as a polite live region', fakeAsync(() => {
    scheduleFacade.loadStopSchedule.and.returnValue(
      of(createResult('stop-main-street')).pipe(delay(1))
    );
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();

    const statusElement = fixture.nativeElement.querySelector('.stop-detail__loading') as HTMLElement | null;

    expect(statusElement?.getAttribute('role')).toBe(STATUS_ROLE);
    expect(statusElement?.getAttribute('aria-live')).toBe(POLITE_LIVE_REGION);
    tick();
  }));

  it('redirects to home when the stop identifier is missing', fakeAsync(() => {
    paramMapSubject.next(convertToParamMap({}));
    createFixture();

    expect(router.navigate).toHaveBeenCalledWith(['/', APP_CONFIG.routes.home]);
    expect(scheduleFacade.loadStopSchedule).not.toHaveBeenCalled();
  }));

  it('shows an assertive error status when the schedule request fails', fakeAsync(() => {
    scheduleFacade.loadStopSchedule.and.returnValue(throwError(() => new Error('Network error')));

    createFixture();

    const statusElement = fixture.nativeElement.querySelector('.stop-detail__error') as HTMLElement | null;
    expect(statusElement?.getAttribute('role')).toBe(STATUS_ROLE);
    expect(statusElement?.getAttribute('aria-live')).toBe(ASSERTIVE_LIVE_REGION);
  }));

  it('reloads the same stop when consortium context changes', fakeAsync(() => {
    createFixture();
    scheduleFacade.loadStopSchedule.calls.reset();

    queryParamMapSubject.next(convertToParamMap({ [CONSORTIUM_QUERY_PARAM]: '7' }));
    tick();

    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledOnceWith('stop-main-street', {
      consortiumId: 7
    });
  }));

  it('configures and clears timeline tabs through the layout context', fakeAsync(() => {
    createFixture();

    expect(layoutContext.configureTabs).toHaveBeenCalledWith([
      {
        identifier: STOP_TIMELINE_UPCOMING_TAB_ID,
        labelKey: APP_CONFIG.translationKeys.stopDetail.schedule.upcomingTitle
      },
      {
        identifier: STOP_TIMELINE_PAST_TAB_ID,
        labelKey: APP_CONFIG.translationKeys.stopDetail.schedule.pastTitle
      }
    ]);
    expect(layoutContext.setActiveTab.calls.mostRecent().args[0]).toBe(STOP_TIMELINE_PAST_TAB_ID);

    layoutContext.clearTabs.calls.reset();
    fixture.destroy();
    expect(layoutContext.clearTabs).toHaveBeenCalledTimes(1);
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

    const liveRegion = fixture.nativeElement.querySelector('.stop-detail__live-region') as HTMLElement | null;
    const textContent = liveRegion?.textContent?.trim() ?? '';

    expect(liveRegion?.getAttribute('aria-live')).toBe(POLITE_LIVE_REGION);
    expect(textContent).toContain('lineCode:M-112');
    expect(textContent).toContain('destination:Centro');
    expect(textContent).toContain('status:Arrives in 5 min');
    expect(textContent).toContain('progress:83');
  }));

  function createFixture(): void {
    fixture = TestBed.createComponent(StopDetailComponent);
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
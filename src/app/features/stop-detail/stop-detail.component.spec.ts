import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, delay, of, throwError } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';
import { StopSchedule, StopScheduleResult } from '../../domain/stop-schedule/stop-schedule.model';
import { StopScheduleFacade } from '../../domain/stop-schedule/stop-schedule.facade';
import { StopDirectoryFacade, StopDirectoryRecord } from '../../domain/stops/stop-directory.facade';
import {
  STOP_TIMELINE_PAST_TAB_ID,
  STOP_TIMELINE_UPCOMING_TAB_ID,
  StopDetailComponent
} from './stop-detail.component';
import { APP_LAYOUT_CONTEXT, AppLayoutContext } from '../../shared/layout/app-layout-context.token';

const STATUS_ROLE = 'status';
const POLITE_LIVE_REGION = 'polite';
const ASSERTIVE_LIVE_REGION = 'assertive';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('StopDetailComponent', () => {
  let fixture: ComponentFixture<StopDetailComponent>;
  let router: Router;
  let scheduleFacade: jasmine.SpyObj<StopScheduleFacade>;
  let directoryFacade: jasmine.SpyObj<StopDirectoryFacade>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let layoutContext: jasmine.SpyObj<AppLayoutContext>;

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ stopId: 'stop-main-street' }));
    scheduleFacade = jasmine.createSpyObj<StopScheduleFacade>('StopScheduleFacade', [
      'loadStopSchedule'
    ]);
    scheduleFacade.loadStopSchedule.and.callFake((stopId: string) => of(createResult(stopId)));
    directoryFacade = jasmine.createSpyObj<StopDirectoryFacade>('StopDirectoryFacade', [
      'getRecordByStopId'
    ]);
    directoryFacade.getRecordByStopId.and.returnValue(of(createDirectoryRecord('stop-main-street')));
    const routerStub = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerStub.navigate.and.resolveTo(true);
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
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: StopScheduleFacade, useValue: scheduleFacade },
        { provide: StopDirectoryFacade, useValue: directoryFacade },
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject.asObservable() } },
        { provide: Router, useValue: routerStub },
        { provide: APP_LAYOUT_CONTEXT, useValue: layoutContext }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('requests the schedule for the routed stop identifier', fakeAsync(() => {
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();

    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledWith('stop-main-street');
  }));

  it('marks the loading status as a polite live region', fakeAsync(() => {
    scheduleFacade.loadStopSchedule.and.returnValue(
      of(createResult('stop-main-street')).pipe(delay(1))
    );
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();

    const statusElement = fixture.nativeElement.querySelector('.stop-detail__loading') as HTMLElement | null;

    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute('role')).toBe(STATUS_ROLE);
    expect(statusElement?.getAttribute('aria-live')).toBe(POLITE_LIVE_REGION);

    tick();
  }));

  it('redirects to home when the stop identifier is missing', fakeAsync(() => {
    const navigateSpy = router.navigate as jasmine.Spy;
    navigateSpy.calls.reset();

    paramMapSubject.next(convertToParamMap({}));
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();

    expect(navigateSpy).toHaveBeenCalledWith([
      '/',
      APP_CONFIG.routes.home
    ]);
    expect(scheduleFacade.loadStopSchedule).not.toHaveBeenCalled();
  }));

  it('shows an error message when the schedule request fails', fakeAsync(() => {
    scheduleFacade.loadStopSchedule.and.returnValue(throwError(() => new Error('Network error')));

    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const errorText = fixture.nativeElement.querySelector('.stop-detail__error-text');
    expect(errorText?.textContent?.trim()).toBe(APP_CONFIG.translationKeys.stopDetail.error.title);

    const statusElement = fixture.nativeElement.querySelector('.stop-detail__error') as HTMLElement | null;

    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute('role')).toBe(STATUS_ROLE);
    expect(statusElement?.getAttribute('aria-live')).toBe(ASSERTIVE_LIVE_REGION);
  }));

  it('recovers from errors when navigating to a different stop', fakeAsync(() => {
    scheduleFacade.loadStopSchedule.and.returnValues(
      throwError(() => new Error('Unavailable')),
      of(createResult('stop-avenue-center'))
    );
    directoryFacade.getRecordByStopId.and.returnValues(
      of(createDirectoryRecord('stop-main-street')),
      of(createDirectoryRecord('stop-avenue-center'))
    );

    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();

    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledTimes(1);

    paramMapSubject.next(convertToParamMap({ stopId: 'stop-avenue-center' }));
    tick();

    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledTimes(2);
    expect(scheduleFacade.loadStopSchedule).toHaveBeenCalledWith('stop-avenue-center');
  }));

  it('navigates to stop information when the action is activated', fakeAsync(() => {
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const navigateSpy = router.navigate as jasmine.Spy;
    navigateSpy.calls.reset();

    const action = fixture.nativeElement.querySelector('.stop-detail__action') as HTMLElement | null;

    if (!action) {
      throw new Error('Stop info action not found');
    }

    action.dispatchEvent(new MouseEvent('click'));

    expect(navigateSpy).toHaveBeenCalledWith([
      '/',
      APP_CONFIG.routes.stopInfoBase,
      '7',
      'stop-main-street'
    ]);
  }));

  it('hides the stop information action when metadata is unavailable', fakeAsync(() => {
    directoryFacade.getRecordByStopId.and.returnValue(of(null));

    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const action = fixture.nativeElement.querySelector('.stop-detail__action');

    expect(action).toBeNull();
  }));

  it('configures timeline tabs through the layout context', fakeAsync(() => {
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();

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
  }));

  it('marks the past timeline tab active when no upcoming services remain', fakeAsync(() => {
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();

    const lastCall = layoutContext.setActiveTab.calls.mostRecent();

    expect(lastCall?.args[0]).toBe(STOP_TIMELINE_PAST_TAB_ID);
  }));

  it('clears timeline tabs on destroy', fakeAsync(() => {
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();
    tick();

    layoutContext.clearTabs.calls.reset();

    fixture.destroy();

    expect(layoutContext.clearTabs).toHaveBeenCalledTimes(1);
  }));
});

function createResult(stopId: string): StopScheduleResult {
  const now = new Date();
  const schedule: StopSchedule = {
    stopId,
    stopCode: '1234',
    stopName: 'Test Stop',
    queryDate: now,
    generatedAt: now,
    services: []
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

function createDirectoryRecord(stopId: string): StopDirectoryRecord {
  return {
    consortiumId: 7,
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

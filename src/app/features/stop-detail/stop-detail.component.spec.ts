import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';
import { StopSchedule, StopScheduleResult } from '../../domain/stop-schedule/stop-schedule.model';
import { StopScheduleFacade } from '../../domain/stop-schedule/stop-schedule.facade';
import {
  STOP_TIMELINE_PAST_TAB_ID,
  STOP_TIMELINE_UPCOMING_TAB_ID,
  StopDetailComponent
} from './stop-detail.component';
import { APP_LAYOUT_CONTEXT, AppLayoutContext } from '../../shared/layout/app-layout-context.token';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('StopDetailComponent', () => {
  let fixture: ComponentFixture<StopDetailComponent>;
  let router: Router;
  let scheduleFacade: jasmine.SpyObj<StopScheduleFacade>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let layoutContext: jasmine.SpyObj<AppLayoutContext>;

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ stopId: 'stop-main-street' }));
    scheduleFacade = jasmine.createSpyObj<StopScheduleFacade>('StopScheduleFacade', [
      'loadStopSchedule'
    ]);
    scheduleFacade.loadStopSchedule.and.callFake((stopId: string) => of(createResult(stopId)));
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
  }));

  it('recovers from errors when navigating to a different stop', fakeAsync(() => {
    scheduleFacade.loadStopSchedule.and.returnValues(
      throwError(() => new Error('Unavailable')),
      of(createResult('stop-avenue-center'))
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

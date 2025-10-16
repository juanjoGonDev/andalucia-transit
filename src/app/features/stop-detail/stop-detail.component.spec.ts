import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';
import { StopSchedule, StopScheduleResult } from '../../domain/stop-schedule/stop-schedule.model';
import { StopScheduleFacade } from '../../domain/stop-schedule/stop-schedule.facade';
import { StopDetailComponent } from './stop-detail.component';

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

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ stopId: 'stop-main-street' }));
    scheduleFacade = jasmine.createSpyObj<StopScheduleFacade>('StopScheduleFacade', [
      'loadStopSchedule'
    ]);
    scheduleFacade.loadStopSchedule.and.callFake((stopId: string) => of(createResult(stopId)));
    const routerStub = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerStub.navigate.and.resolveTo(true);

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
        { provide: Router, useValue: routerStub }
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

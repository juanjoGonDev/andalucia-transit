import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';
import { StopSchedule, StopScheduleResult } from '../../domain/stop-schedule/stop-schedule.model';
import { StopScheduleService } from '../../data/services/stop-schedule.service';
import { StopDetailComponent } from './stop-detail.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('StopDetailComponent', () => {
  let fixture: ComponentFixture<StopDetailComponent>;
  let router: Router;
  let scheduleService: jasmine.SpyObj<StopScheduleService>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ stopId: 'stop-main-street' }));
    scheduleService = jasmine.createSpyObj<StopScheduleService>('StopScheduleService', [
      'getStopSchedule'
    ]);
    scheduleService.getStopSchedule.and.callFake((stopId: string) => of(createResult(stopId)));
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
        { provide: StopScheduleService, useValue: scheduleService },
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

    expect(scheduleService.getStopSchedule).toHaveBeenCalledWith('stop-main-street');
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
    expect(scheduleService.getStopSchedule).not.toHaveBeenCalled();
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

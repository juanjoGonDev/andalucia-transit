import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';
import { StopSchedule } from '../../domain/stop-schedule/stop-schedule.model';
import { MockStopScheduleService } from '../../data/services/mock-stop-schedule.service';
import { StopDetailComponent } from './stop-detail.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('StopDetailComponent', () => {
  let fixture: ComponentFixture<StopDetailComponent>;
  let router: Router;
  let scheduleService: jasmine.SpyObj<MockStopScheduleService>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ stopId: 'stop-main-street' }));
    scheduleService = jasmine.createSpyObj<MockStopScheduleService>('MockStopScheduleService', [
      'getStopSchedule'
    ]);
    scheduleService.getStopSchedule.and.callFake((stopId: string) =>
      of(createSchedule(stopId))
    );

    await TestBed.configureTestingModule({
      imports: [
        StopDetailComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: MockStopScheduleService, useValue: scheduleService },
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject.asObservable() } },
        provideRouter([])
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('requests the schedule for the routed stop identifier', () => {
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();

    expect(scheduleService.getStopSchedule).toHaveBeenCalledWith('stop-main-street');
  });

  it('redirects to home when the stop identifier is missing', async () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    paramMapSubject.next(convertToParamMap({}));
    fixture = TestBed.createComponent(StopDetailComponent);
    fixture.detectChanges();

    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith([
      '/',
      APP_CONFIG.routes.home
    ]);
    expect(scheduleService.getStopSchedule).not.toHaveBeenCalled();
  });
});

function createSchedule(stopId: string): StopSchedule {
  const now = new Date();
  return {
    stopId,
    stopCode: '1234',
    stopName: 'Test Stop',
    queryDate: now,
    generatedAt: now,
    services: []
  } as const;
}

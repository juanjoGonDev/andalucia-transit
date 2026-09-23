import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { AlarmSchedulerService, FiredAlarmEvent } from '@domain/stop-alarms/alarm-scheduler.service';
import { AlarmToastBridgeService } from './alarm-toast-bridge.service';
import { ToastRequest, ToastService } from '@shared/ui/toast/toast.service';

function buildEvent(): FiredAlarmEvent {
  return {
    alarm: {
      id: 'stop-1::service-1',
      stopId: 'stop-1',
      consortiumId: 4,
      stopName: 'Calle Principal',
      lineCode: 'M-370',
      destination: 'Estación Intermodal',
      scheduledArrival: new Date(Date.now() + 2 * 60_000).toISOString(),
      offsetMinutes: 10,
      repeatWeekdays: [],
      enabled: true,
      createdAt: new Date(0).toISOString(),
      nextTriggerAt: Date.now()
    },
    nextTriggerAt: Date.now()
  };
}

class SchedulerStub {
  readonly fired$ = new Subject<FiredAlarmEvent>();
}

describe('AlarmToastBridgeService', () => {
  let scheduler: SchedulerStub;
  let toastShow: jasmine.Spy;
  let navigate: jasmine.Spy;
  let bridge: AlarmToastBridgeService;

  beforeEach(() => {
    scheduler = new SchedulerStub();
    toastShow = jasmine.createSpy('toastShow').and.returnValue(1);
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        AlarmToastBridgeService,
        { provide: AlarmSchedulerService, useValue: scheduler },
        { provide: ToastService, useValue: { show: toastShow } },
        { provide: Router, useValue: { navigate } }
      ]
    });

    bridge = TestBed.inject(AlarmToastBridgeService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('converts fired alarms into toasts with a deep link to the stop detail', () => {
    bridge.start();
    scheduler.fired$.next(buildEvent());

    expect(toastShow).toHaveBeenCalledTimes(1);
    const request = toastShow.calls.mostRecent().args[0] as ToastRequest;
    expect(request.titleParams).toEqual({ lineCode: 'M-370' });
    expect(request.action).toBeDefined();

    request.action?.run();
    expect(navigate).toHaveBeenCalledTimes(1);
    const [commands] = navigate.calls.mostRecent().args;
    expect(commands).toContain('stop-detail');
    expect(commands).toContain('stop-1');
  });

  it('starts only once even when invoked repeatedly', () => {
    bridge.start();
    bridge.start();
    scheduler.fired$.next(buildEvent());

    expect(toastShow).toHaveBeenCalledTimes(1);
  });

  it('routes consortium-less alarms to the alarms page', () => {
    bridge.start();
    const event = buildEvent();
    const projectedEvent: FiredAlarmEvent = {
      ...event,
      alarm: { ...event.alarm, consortiumId: null }
    };
    scheduler.fired$.next(projectedEvent);

    const request = toastShow.calls.mostRecent().args[0] as ToastRequest;
    request.action?.run();
    expect(navigate).toHaveBeenCalledWith([APP_CONFIG.routes.alarms]);
  });
});



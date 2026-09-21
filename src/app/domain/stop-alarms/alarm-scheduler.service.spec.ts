import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { NotificationPermissionService } from '@core/services/notification-permission.service';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { StopAlarmsStorage } from '@data/stop-alarms/stop-alarms.storage';
import { AlarmSchedulerService, FiredAlarmEvent } from './alarm-scheduler.service';
import { StopAlarmsService } from './stop-alarms.service';

const MINUTES = 60_000;

describe('AlarmSchedulerService', () => {
  let storage: jasmine.SpyObj<StopAlarmsStorage>;
  let permissions: jasmine.SpyObj<NotificationPermissionService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StopAlarmsStorage>('StopAlarmsStorage', [
      'load',
      'save',
      'clear'
    ]);
    storage.load.and.returnValue([]);

    permissions = jasmine.createSpyObj<NotificationPermissionService>(
      'NotificationPermissionService',
      ['request', 'refresh', 'show']
    );
    permissions.show.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        StopAlarmsService,
        AlarmSchedulerService,
        { provide: StopAlarmsStorage, useValue: storage },
        { provide: NotificationPermissionService, useValue: permissions },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });
  });

  /**
   * Creates an alarm whose trigger sits `leadMs` ahead of the creation instant,
   * so the service accepts it (triggers must be reachable when created).
   */
  function createAlarmWithTriggerAt(leadMs: number, repeatDaily: boolean): StopAlarmsService {
    const service = TestBed.inject(StopAlarmsService);
    const offset = 10;

    const created = service.add({
      stopId: 'stop-1',
      serviceId: `service-${leadMs}-${repeatDaily}`,
      consortiumId: 4,
      stopName: 'Calle Principal',
      lineCode: 'M-101',
      destination: 'Centro',
      scheduledArrival: new Date(Date.now() + leadMs + offset * MINUTES),
      offsetMinutes: offset,
      repeatDaily
    });

    expect(created).not.toBeNull();
    return service;
  }

  it('notifies and removes one-shot alarms when their trigger elapses', async () => {
    const scheduler = TestBed.inject(AlarmSchedulerService);
    const service = createAlarmWithTriggerAt(200, false);
    const firedPromise = firstValueFrom(scheduler.fired$);

    scheduler.processDueAlarms(Date.now() + 1_000);

    expect(permissions.show).toHaveBeenCalledTimes(1);
    expect(service.snapshot.length).toBe(0);
    const event: FiredAlarmEvent = await firedPromise;
    expect(event.alarm.stopId).toBe('stop-1');
    expect(event.nextTriggerAt).toBeNull();
  });

  it('re-arms repeating alarms for the next day instead of removing them', async () => {
    const scheduler = TestBed.inject(AlarmSchedulerService);
    const service = createAlarmWithTriggerAt(200, true);
    const firedPromise = firstValueFrom(scheduler.fired$);

    scheduler.processDueAlarms(Date.now() + 1_000);

    expect(permissions.show).toHaveBeenCalledTimes(1);
    expect(service.snapshot.length).toBe(1);
    expect(service.snapshot[0].nextTriggerAt).toBeGreaterThan(Date.now());
    expect(service.snapshot[0].repeatDaily).toBeTrue();
    const event: FiredAlarmEvent = await firedPromise;
    expect(event.nextTriggerAt).toBe(service.snapshot[0].nextTriggerAt);
  });

  it('ignores alarms whose trigger is still pending', () => {
    const scheduler = TestBed.inject(AlarmSchedulerService);
    const service = createAlarmWithTriggerAt(30 * MINUTES, false);

    scheduler.processDueAlarms(Date.now());

    expect(permissions.show).not.toHaveBeenCalled();
    expect(service.snapshot.length).toBe(1);
  });

  it('expires long-missed one-shot alarms silently', () => {
    const scheduler = TestBed.inject(AlarmSchedulerService);
    const service = createAlarmWithTriggerAt(200, false);

    scheduler.processDueAlarms(Date.now() + 60 * MINUTES);

    expect(permissions.show).not.toHaveBeenCalled();
    expect(service.snapshot.length).toBe(0);
  });

  it('keeps long-missed repeating alarms without a spurious notification', () => {
    const scheduler = TestBed.inject(AlarmSchedulerService);
    const service = createAlarmWithTriggerAt(200, true);

    scheduler.processDueAlarms(Date.now() + 9 * MINUTES);

    expect(permissions.show).not.toHaveBeenCalled();
    expect(service.snapshot.length).toBe(1);
    expect(service.snapshot[0].nextTriggerAt).toBeGreaterThan(Date.now());
  });

  it('skips disabled alarms without notifying or advancing them', async () => {
    const scheduler = TestBed.inject(AlarmSchedulerService);
    const service = createAlarmWithTriggerAt(200, false);
    const alarmId = service.snapshot[0].id;

    expect(service.setEnabled(alarmId, false)).toBeTrue();

    scheduler.processDueAlarms(Date.now() + 60 * MINUTES);

    expect(permissions.show).not.toHaveBeenCalled();
    expect(service.snapshot.length).toBe(1);
    expect(service.snapshot[0].enabled).toBeFalse();
  });
});

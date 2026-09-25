import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { StopAlarmsStorage } from '@data/stop-alarms/stop-alarms.storage';
import { StopAlarmCandidate, StopAlarmsService } from './stop-alarms.service';

const MINUTES = 60_000;

function candidate(overrides: Partial<StopAlarmCandidate> = {}): StopAlarmCandidate {
  return {
    stopId: 'stop-1',
    serviceId: 'service-1',
    consortiumId: 4,
    stopName: 'Calle Principal',
    lineCode: 'M-101',
    destination: 'Centro',
    scheduledArrival: new Date(Date.now() + 60 * MINUTES),
    offsetMinutes: 10,
    repeatWeekdays: [],
    ...overrides
  };
}

describe('StopAlarmsService', () => {
  let storage: jasmine.SpyObj<StopAlarmsStorage>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StopAlarmsStorage>('StopAlarmsStorage', [
      'load',
      'save',
      'clear'
    ]);
    storage.load.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        StopAlarmsService,
        { provide: StopAlarmsStorage, useValue: storage },
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });
  });

  it('creates an alarm and exposes it through alarms$', async () => {
    const service = TestBed.inject(StopAlarmsService);

    const created = service.add(candidate());

    expect(created).not.toBeNull();
    expect(service.hasServiceAlarm('stop-1', 'service-1')).toBeTrue();
    const alarms = await firstValueFrom(service.alarms$);
    expect(alarms.length).toBe(1);
    expect(alarms[0].lineCode).toBe('M-101');
    expect(alarms[0].nextTriggerAt).toBe(
      Date.parse(alarms[0].scheduledArrival) - 10 * MINUTES
    );
  });

  it('persists alarms without runtime-only fields', () => {
    const service = TestBed.inject(StopAlarmsService);

    service.add(candidate());

    const persisted = storage.save.calls.mostRecent().args[0];
    expect(persisted.length).toBe(1);
    expect(persisted[0]).not.toContain(jasmine.objectContaining({ nextTriggerAt: jasmine.anything() }) as never);
    expect(Object.keys(persisted[0])).not.toContain('nextTriggerAt');
  });

  it('updates the existing alarm for the same stop and service', () => {
    const service = TestBed.inject(StopAlarmsService);

    service.add(candidate());
    service.add(candidate({ offsetMinutes: 30 }));

    const alarms = service.snapshot;
    expect(alarms.length).toBe(1);
    expect(alarms[0].offsetMinutes).toBe(30);
  });

  it('rejects alarms whose trigger already elapsed', () => {
    const service = TestBed.inject(StopAlarmsService);

    const created = service.add(
      candidate({ scheduledArrival: new Date(Date.now() + 5 * MINUTES), offsetMinutes: 10 })
    );

    expect(created).toBeNull();
    expect(service.snapshot.length).toBe(0);
  });

  it('enforces the per-stop alarm limit only for new alarms', () => {
    const service = TestBed.inject(StopAlarmsService);

    for (let index = 0; index < APP_CONFIG.alarms.maxPerStop; index += 1) {
      service.add(candidate({ serviceId: `service-${index}` }));
    }

    expect(service.add(candidate({ serviceId: 'service-extra' }))).toBeNull();
    expect(service.countForStop('stop-1')).toBe(APP_CONFIG.alarms.maxPerStop);

    service.add(candidate({ serviceId: 'service-0', offsetMinutes: 25 }));
    expect(service.countForStop('stop-1')).toBe(APP_CONFIG.alarms.maxPerStop);
  });

  it('removes alarms by id and by stop', () => {
    const service = TestBed.inject(StopAlarmsService);

    service.add(candidate());
    service.removeServiceAlarm('stop-1', 'service-1');
    expect(service.snapshot.length).toBe(0);

    service.add(candidate({ serviceId: 'service-1' }));
    service.add(candidate({ serviceId: 'service-2' }));
    service.removeAllForStop('stop-1');
    expect(service.snapshot.length).toBe(0);
  });

  it('reschedules repeating alarms and drops finished one-shot alarms after firing', () => {
    const service = TestBed.inject(StopAlarmsService);

    service.add(candidate({ repeatWeekdays: [1, 2, 3] }));
    const repeating = service.snapshot[0];

    service.rescheduleAfterFiring(repeating, (repeating.nextTriggerAt ?? Date.now()) + 24 * 60 * MINUTES);
    expect(service.snapshot.length).toBe(1);

    const oneShot = service.snapshot.find((alarm) => alarm.repeatWeekdays.length === 0) ?? null;
    expect(oneShot).toBeNull();
  });

  it('hydrates persisted alarms and drops expired ones on boot', () => {
    storage.load.and.returnValue([
      {
        id: 'stop-1::service-live',
        stopId: 'stop-1',
        consortiumId: 4,
        stopName: 'Calle Principal',
        lineCode: 'M-101',
        destination: 'Centro',
        scheduledArrival: new Date(Date.now() + 3 * 60 * MINUTES).toISOString(),
        offsetMinutes: 30,
        repeatWeekdays: [],
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'stop-1::service-expired',
        stopId: 'stop-1',
        consortiumId: 4,
        stopName: 'Calle Principal',
        lineCode: 'M-102',
        destination: 'Centro',
        scheduledArrival: new Date(Date.now() - 48 * 60 * MINUTES).toISOString(),
        offsetMinutes: 30,
        repeatWeekdays: [],
        enabled: true,
        createdAt: new Date().toISOString()
      }
    ]);

    const service = TestBed.inject(StopAlarmsService);

    expect(service.snapshot.length).toBe(1);
    expect(service.snapshot[0].id).toContain('service-live');
  });

  it('keeps disabled alarms listed during hydration even when unreachable', () => {
    storage.load.and.returnValue([
      {
        id: 'stop-1::service-disabled',
        stopId: 'stop-1',
        consortiumId: 4,
        stopName: 'Calle Principal',
        lineCode: 'M-101',
        destination: 'Centro',
        scheduledArrival: new Date(Date.now() - 48 * 60 * MINUTES).toISOString(),
        offsetMinutes: 10,
        repeatWeekdays: [],
        enabled: false,
        createdAt: new Date().toISOString()
      }
    ]);

    const service = TestBed.inject(StopAlarmsService);

    expect(service.snapshot.length).toBe(1);
    expect(service.snapshot[0].enabled).toBeFalse();
    expect(service.snapshot[0].nextTriggerAt).toBeNull();
  });

  it('disabling keeps the alarm listed and persists it as disabled', () => {
    const service = TestBed.inject(StopAlarmsService);

    service.add(candidate({ serviceId: 'service-a' }));
    service.add(candidate({ serviceId: 'service-b', offsetMinutes: 20 }));
    const alarmId = service.serviceAlarmId('stop-1', 'service-a');

    expect(service.setEnabled(alarmId, false)).toBeTrue();

    const alarms = service.snapshot;
    expect(alarms.length).toBe(2);
    const disabled = alarms.find((alarm) => alarm.id === alarmId) ?? null;
    expect(disabled).not.toBeNull();
    expect(disabled?.enabled).toBeFalse();

    const persisted = storage.save.calls.mostRecent().args[0];
    const persistedDisabled = persisted.find((alarm) => alarm.id === alarmId) ?? null;
    expect(persistedDisabled?.enabled).toBeFalse();
  });

  it('re-enabling a future one-shot alarm re-arms it at arrival minus offset', () => {
    const service = TestBed.inject(StopAlarmsService);

    const created = service.add(candidate({ serviceId: 'service-future' }));
    expect(created).not.toBeNull();
    const alarmId = service.serviceAlarmId('stop-1', 'service-future');
    service.setEnabled(alarmId, false);

    expect(service.setEnabled(alarmId, true)).toBeTrue();

    const alarm = service.snapshot.find((entry) => entry.id === alarmId) ?? null;
    expect(alarm?.enabled).toBeTrue();
    expect(alarm?.nextTriggerAt).toBe(
      Date.parse(alarm?.scheduledArrival ?? '') - 10 * MINUTES
    );
  });

  it('re-enabling an elapsed one-shot alarm drops it and reports failure', () => {
    jasmine.clock().install();
    try {
      const base = new Date('2026-09-21T09:00:00');
      jasmine.clock().mockDate(base);

      const service = TestBed.inject(StopAlarmsService);
      const created = service.add(candidate({ serviceId: 'service-gone' }));
      expect(created).not.toBeNull();
      const alarmId = service.serviceAlarmId('stop-1', 'service-gone');
      service.setEnabled(alarmId, false);

      jasmine.clock().mockDate(new Date(base.getTime() + 2 * 60 * MINUTES));

      expect(service.setEnabled(alarmId, true)).toBeFalse();
      expect(service.snapshot.length).toBe(0);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('re-enabling a repeating alarm rolls it to the next daily slot', () => {
    jasmine.clock().install();
    try {
      const base = new Date('2026-09-21T09:00:00');
      jasmine.clock().mockDate(base);

      const service = TestBed.inject(StopAlarmsService);
      const created = service.add(
        candidate({ serviceId: 'service-repeat', repeatWeekdays: [1, 2, 3] })
      );
      expect(created).not.toBeNull();
      const alarmId = service.serviceAlarmId('stop-1', 'service-repeat');
      service.setEnabled(alarmId, false);

      jasmine.clock().mockDate(new Date(base.getTime() + 24 * 60 * MINUTES));

      expect(service.setEnabled(alarmId, true)).toBeTrue();

      const alarm = service.snapshot.find((entry) => entry.id === alarmId) ?? null;
      expect(alarm?.enabled).toBeTrue();
      expect(alarm?.nextTriggerAt).toBe(
        Date.parse(alarm?.scheduledArrival ?? '') - 10 * MINUTES + 24 * 60 * MINUTES
      );
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('setEnabled on a missing alarm reports failure without persisting', () => {
    const service = TestBed.inject(StopAlarmsService);

    service.add(candidate());
    const savesBefore = storage.save.calls.count();

    expect(service.setEnabled('stop-1::missing', false)).toBeFalse();
    expect(storage.save.calls.count()).toBe(savesBefore);
  });

  it('update resaves offset and recurrence while preserving identity and enabled state', () => {
    jasmine.clock().install();
    try {
      // Monday: the base trigger (arrival - offset) keeps the mask weekday, so the
      // reschedule assertion below is deterministic instead of day-of-week dependent.
      const base = new Date('2026-09-21T09:00:00');
      jasmine.clock().mockDate(base);

      const service = TestBed.inject(StopAlarmsService);
      service.add(
        candidate({
          serviceId: 'service-edit',
          scheduledArrival: new Date(base.getTime() + 60 * MINUTES)
        })
      );
      const alarmId = service.serviceAlarmId('stop-1', 'service-edit');
      service.setEnabled(alarmId, false);

      const updated = service.update(alarmId, { offsetMinutes: 25, repeatWeekdays: [3, 1] });

      expect(updated).toBeTrue();
      const alarm = service.snapshot.find((entry) => entry.id === alarmId) ?? null;
      expect(alarm).not.toBeNull();
      expect(alarm?.enabled).toBeFalse();
      expect(alarm?.offsetMinutes).toBe(25);
      expect(alarm?.repeatWeekdays).toEqual([1, 3]);
      expect(alarm?.stopId).toBe('stop-1');
      expect(alarm?.lineCode).toBe('M-101');
      expect(alarm?.nextTriggerAt).toBe(
        Date.parse(alarm?.scheduledArrival ?? '') - 25 * MINUTES
      );
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('update drops one-shot alarms whose new schedule can never ring again', () => {
    jasmine.clock().install();
    try {
      const base = new Date('2026-09-21T09:00:00');
      jasmine.clock().mockDate(base);

      const service = TestBed.inject(StopAlarmsService);
      service.add(
        candidate({
          serviceId: 'service-past',
          scheduledArrival: new Date(base.getTime() + 90 * MINUTES),
          offsetMinutes: 10,
          repeatWeekdays: [base.getDay()]
        })
      );
      const alarmId = service.serviceAlarmId('stop-1', 'service-past');

      jasmine.clock().mockDate(new Date(base.getTime() + 2 * 60 * MINUTES));

      expect(service.update(alarmId, { offsetMinutes: 10, repeatWeekdays: [] })).toBeFalse();
      expect(service.snapshot.length).toBe(0);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('update on a missing alarm reports failure without persisting', () => {
    const service = TestBed.inject(StopAlarmsService);

    service.add(candidate());
    const savesBefore = storage.save.calls.count();

    expect(service.update('stop-1::missing', { offsetMinutes: 20, repeatWeekdays: [] })).toBeFalse();
    expect(service.snapshot.length).toBe(1);
    expect(storage.save.calls.count()).toBe(savesBefore);
  });

  it('removeAll clears every alarm and persists the empty list', () => {
    const service = TestBed.inject(StopAlarmsService);

    service.add(candidate({ serviceId: 'service-a' }));
    service.add(candidate({ serviceId: 'service-b' }));

    service.removeAll();

    expect(service.snapshot.length).toBe(0);
    expect(storage.save.calls.mostRecent().args[0]).toEqual([]);
  });
});

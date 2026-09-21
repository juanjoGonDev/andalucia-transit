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
    repeatDaily: false,
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

    service.add(candidate({ repeatDaily: true }));
    const repeating = service.snapshot[0];

    service.rescheduleAfterFiring(repeating, repeating.nextTriggerAt + 24 * 60 * MINUTES);
    expect(service.snapshot.length).toBe(1);

    const oneShot = service.snapshot.find((alarm) => !alarm.repeatDaily) ?? null;
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
        repeatDaily: false,
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
        repeatDaily: false,
        createdAt: new Date().toISOString()
      }
    ]);

    const service = TestBed.inject(StopAlarmsService);

    expect(service.snapshot.length).toBe(1);
    expect(service.snapshot[0].id).toContain('service-live');
  });
});

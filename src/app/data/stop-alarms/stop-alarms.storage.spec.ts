import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { StopAlarmsStorage } from './stop-alarms.storage';

const VALID_ALARM = {
  id: 'stop-1::service-1',
  stopId: 'stop-1',
  consortiumId: 4,
  stopName: 'Calle Principal',
  lineCode: 'M-101',
  destination: 'Centro',
  scheduledArrival: '2026-09-22T08:10:00.000Z',
  offsetMinutes: 10,
  repeatDaily: true,
  enabled: true,
  createdAt: '2026-09-21T08:00:00.000Z'
};

describe('StopAlarmsStorage', () => {
  it('defaults the enabled flag to true for legacy rows persisted without it', () => {
    const legacyRow = {
      id: 'stop-1::service-legacy',
      stopId: 'stop-1',
      consortiumId: 4,
      stopName: 'Calle Principal',
      lineCode: 'M-101',
      destination: 'Centro',
      scheduledArrival: '2026-09-22T08:10:00.000Z',
      offsetMinutes: 10,
      repeatDaily: true,
      createdAt: '2026-09-21T08:00:00.000Z'
    };
    spyOn(window.localStorage, 'getItem').and.returnValue(JSON.stringify([legacyRow]));

    expect(storage.load()).toEqual([
      {
        ...legacyRow,
        enabled: true
      }
    ]);
  });

  let storage: StopAlarmsStorage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }]
    });
    storage = TestBed.inject(StopAlarmsStorage);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(storage.load()).toEqual([]);
  });

  it('persists and reloads alarms', () => {
    storage.save([VALID_ALARM]);

    expect(storage.load()).toEqual([VALID_ALARM]);
  });

  it('drops malformed entries instead of failing', () => {
    localStorage.setItem(APP_CONFIG.alarms.storageKey, JSON.stringify([
      VALID_ALARM,
      { id: 'broken' },
      { ...VALID_ALARM, id: 'stop-2::service-2', offsetMinutes: -5 },
      null
    ]));

    expect(storage.load()).toEqual([VALID_ALARM]);
  });

  it('survives corrupted payloads', () => {
    localStorage.setItem(APP_CONFIG.alarms.storageKey, '{not json');

    expect(storage.load()).toEqual([]);
  });

  it('clear removes the persisted alarms', () => {
    storage.save([VALID_ALARM]);
    storage.clear();

    expect(storage.load()).toEqual([]);
  });
});

import { TRIP_SESSION_STORAGE_KEY, TripSessionRecord, TripSessionStorage } from './trip-session.storage';

const RECORD: TripSessionRecord = {
  departureId: 'service-7',
  consortiumId: 3,
  lineId: 'line-7',
  lineCode: '040',
  direction: 1,
  destination: 'Almería Estación',
  originStopId: 'par-001',
  destinationStopId: 'par-999',
  originName: 'La Gangosa',
  destinationName: 'Almería Estación',
  departTime: '2026-09-21T14:05:00.000Z',
  arriveTime: '2026-09-21T14:40:00.000Z'
};

describe('TripSessionStorage', () => {
  const storage = new TripSessionStorage();

  afterEach(() => window.localStorage.removeItem(TRIP_SESSION_STORAGE_KEY));

  it('round-trips a valid session record', () => {
    storage.save(RECORD);

    expect(window.localStorage.getItem(TRIP_SESSION_STORAGE_KEY)).not.toBeNull();
    expect(storage.load()).toEqual(RECORD);
  });

  it('clears the stored session', () => {
    storage.save(RECORD);
    storage.clear();

    expect(storage.load()).toBeNull();
    expect(window.localStorage.getItem(TRIP_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('drops corrupt or incomplete payloads instead of crashing', () => {
    window.localStorage.setItem(TRIP_SESSION_STORAGE_KEY, '{not-json');
    expect(storage.load()).toBeNull();

    const { arriveTime, ...broken } = RECORD;
    void arriveTime;
    window.localStorage.setItem(TRIP_SESSION_STORAGE_KEY, JSON.stringify(broken));
    expect(storage.load()).toBeNull();

    const wrongTypes = { ...RECORD, consortiumId: '3' };
    window.localStorage.setItem(TRIP_SESSION_STORAGE_KEY, JSON.stringify(wrongTypes));
    expect(storage.load()).toBeNull();
  });
});

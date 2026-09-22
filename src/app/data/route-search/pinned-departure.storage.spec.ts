import { TestBed } from '@angular/core/testing';
import {
  PINNED_DEPARTURE_STORAGE_KEY,
  PinnedDepartureRecord,
  PinnedDepartureStorage
} from './pinned-departure.storage';

const record: PinnedDepartureRecord = {
  departureId: 'service-1-line-1',
  lineId: 'line-1',
  lineCode: '040',
  direction: 1,
  destination: 'Almería',
  consortiumId: 3,
  arrivalTime: '2026-09-21T14:26:00.000Z',
  pinnedAt: '2026-09-21T13:11:00.000Z',
  selection: {
    origin: {
      id: 'origin',
      code: '100',
      name: 'Origin Stop',
      municipality: 'Almería',
      municipalityId: 'm-1',
      nucleus: 'La Gangosa',
      nucleusId: 'n-1',
      consortiumId: 3,
      stopIds: ['origin-a', 'origin-b']
    },
    destination: {
      id: 'destination',
      code: '200',
      name: 'Destination Stop',
      municipality: 'Roquetas',
      municipalityId: 'm-2',
      nucleus: 'Roquetas',
      nucleusId: 'n-2',
      consortiumId: 3,
      stopIds: ['destination-a']
    },
    queryDate: '2026-09-21T00:00:00.000Z',
    lineMatches: []
  }
};

describe('PinnedDepartureStorage', () => {
  let storage: PinnedDepartureStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    storage = TestBed.inject(PinnedDepartureStorage);
    window.localStorage.removeItem(PINNED_DEPARTURE_STORAGE_KEY);
  });

  afterEach(() => window.localStorage.removeItem(PINNED_DEPARTURE_STORAGE_KEY));

  it('roundtrips a pinned departure', () => {
    storage.save(record);

    expect(storage.load()).toEqual(record);
  });

  it('returns null when nothing is stored or the payload is corrupt', () => {
    expect(storage.load()).toBeNull();

    window.localStorage.setItem(PINNED_DEPARTURE_STORAGE_KEY, '{not json');
    expect(storage.load()).toBeNull();
  });

  it('rejects payloads missing required departure fields', () => {
    const { lineCode: _lineCode, ...broken } = record;
    window.localStorage.setItem(PINNED_DEPARTURE_STORAGE_KEY, JSON.stringify(broken));

    expect(storage.load()).toBeNull();
  });
});

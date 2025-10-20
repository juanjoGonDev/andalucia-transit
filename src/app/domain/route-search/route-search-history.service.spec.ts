import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { RouteSearchHistoryStorage, RouteSearchHistoryStoredEntry } from '../../data/route-search/route-search-history.storage';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { RouteSearchHistoryService } from './route-search-history.service';
import { createRouteSearchSelection } from './route-search-selection.util';
import { RouteSearchLineMatch } from './route-search-state.service';

class RouteSearchHistoryStorageStub {
  private value: RouteSearchHistoryStoredEntry[] = [];

  load(): readonly RouteSearchHistoryStoredEntry[] {
    return this.value;
  }

  save(entries: readonly RouteSearchHistoryStoredEntry[]): void {
    this.value = [...entries];
  }

  clear(): void {
    this.value = [];
  }
}

describe('RouteSearchHistoryService', () => {
  let storage: RouteSearchHistoryStorageStub;
  const origin: StopDirectoryOption = {
    id: 'origin',
    code: '001',
    name: 'Origin',
    municipality: 'Origin',
    municipalityId: 'origin-mun',
    nucleus: 'Origin',
    nucleusId: 'origin-nuc',
    consortiumId: 1,
    stopIds: ['origin-stop']
  };
  const destination: StopDirectoryOption = {
    id: 'destination',
    code: '002',
    name: 'Destination',
    municipality: 'Destination',
    municipalityId: 'destination-mun',
    nucleus: 'Destination',
    nucleusId: 'destination-nuc',
    consortiumId: 1,
    stopIds: ['destination-stop']
  };
  const destinationAlt: StopDirectoryOption = {
    id: 'destination-alt',
    code: '003',
    name: 'Alt Destination',
    municipality: 'Alt',
    municipalityId: 'alt-mun',
    nucleus: 'Alt',
    nucleusId: 'alt-nuc',
    consortiumId: 1,
    stopIds: ['destination-alt-stop']
  };
  const matches: RouteSearchLineMatch[] = [
    {
      lineId: 'line',
      lineCode: 'L1',
      direction: 0,
      originStopIds: ['origin-stop'],
      destinationStopIds: ['destination-stop']
    }
  ];
  const matchesAlt: RouteSearchLineMatch[] = [
    {
      lineId: 'line',
      lineCode: 'L1',
      direction: 0,
      originStopIds: ['origin-stop'],
      destinationStopIds: ['destination-alt-stop']
    }
  ];

  beforeEach(() => {
    storage = new RouteSearchHistoryStorageStub();
    TestBed.configureTestingModule({
      providers: [{ provide: RouteSearchHistoryStorage, useValue: storage }]
    });
  });

  it('records selections and exposes them ordered by execution date', async () => {
    const service = TestBed.inject(RouteSearchHistoryService);
    const firstSelection = createRouteSearchSelection(origin, destination, matches, new Date('2025-01-01T00:00:00Z'));
    const secondSelection = createRouteSearchSelection(origin, destinationAlt, matchesAlt, new Date('2025-01-02T00:00:00Z'));

    service.record(firstSelection, new Date('2025-01-05T12:00:00Z'));
    service.record(secondSelection, new Date('2025-01-06T12:00:00Z'));

    const entries = await snapshot(service);

    expect(entries.length).toBe(2);
    expect(entries[0]?.selection.queryDate.toISOString()).toBe(secondSelection.queryDate.toISOString());
    expect(entries[1]?.selection.queryDate.toISOString()).toBe(firstSelection.queryDate.toISOString());
  });

  it('replaces an existing selection when recording again', async () => {
    const service = TestBed.inject(RouteSearchHistoryService);
    const selection = createRouteSearchSelection(origin, destination, matches, new Date('2025-01-01T00:00:00Z'));

    service.record(selection, new Date('2025-01-05T12:00:00Z'));
    const initialId = (await snapshot(service))[0]?.id ?? '';

    service.record(selection, new Date('2025-01-07T08:00:00Z'));
    const entries = await snapshot(service);

    expect(entries.length).toBe(1);
    expect(entries[0]?.id).not.toBe(initialId);
  });

  it('removes entries by id', async () => {
    const service = TestBed.inject(RouteSearchHistoryService);
    const selection = createRouteSearchSelection(origin, destination, matches, new Date('2025-01-01T00:00:00Z'));

    service.record(selection, new Date('2025-01-05T12:00:00Z'));
    const id = (await snapshot(service))[0]?.id ?? '';

    service.remove(id);

    expect((await snapshot(service)).length).toBe(0);
  });

  it('clears the history', async () => {
    const service = TestBed.inject(RouteSearchHistoryService);
    const selection = createRouteSearchSelection(origin, destination, matches, new Date('2025-01-01T00:00:00Z'));

    service.record(selection, new Date('2025-01-05T12:00:00Z'));
    service.clear();

    expect((await snapshot(service)).length).toBe(0);
    expect(storage.load().length).toBe(0);
  });

  it('loads entries from storage on initialization', async () => {
    const storedSelection = createRouteSearchSelection(origin, destination, matches, new Date('2025-01-01T00:00:00Z'));
    const stored: RouteSearchHistoryStoredEntry = {
      id: 'stored',
      executedAt: '2025-01-05T10:00:00.000Z',
      selection: {
        origin,
        destination,
        queryDate: storedSelection.queryDate.toISOString(),
        lineMatches: matches
      }
    };

    storage.save([stored]);
    const service = TestBed.inject(RouteSearchHistoryService);
    const entries = await snapshot(service);

    expect(entries.length).toBe(1);
    expect(entries[0]?.id).toBe('stored');
  });

  function snapshot(service: RouteSearchHistoryService) {
    return firstValueFrom(service.entries$.pipe(take(1)));
  }
});

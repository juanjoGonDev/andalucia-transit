import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  PINNED_DEPARTURE_STORAGE_KEY,
  PinnedDepartureRecord,
  PinnedDepartureStorage
} from '@data/route-search/pinned-departure.storage';
import { PinnedDepartureService } from './pinned-departure.service';
import { RouteSearchExecutionService } from './route-search-execution.service';
import { RouteSearchDepartureView } from './route-search-results.service';
import { RouteSearchSelection } from './route-search-state.service';

const NOW = new Date('2026-09-21T12:00:00.000Z');

class RouteSearchExecutionServiceStub {
  lastSelection: RouteSearchSelection | null = null;

  prepare(selection: RouteSearchSelection): readonly string[] {
    this.lastSelection = selection;
    return ['/buscador', 'origen', 'hasta', 'destino'];
  }
}

function buildSelection(): RouteSearchSelection {
  const stop = (id: string, name: string) => ({
    id,
    code: id.toUpperCase(),
    name,
    municipality: 'Almería',
    municipalityId: 'm-1',
    nucleus: 'La Gangosa',
    nucleusId: 'n-1',
    consortiumId: 3,
    stopIds: [id]
  });

  return {
    origin: stop('origin', 'Origin Stop'),
    destination: stop('destination', 'Destination Stop'),
    queryDate: new Date('2026-09-21T00:00:00.000Z'),
    lineMatches: [
      {
        lineId: 'line-1',
        lineCode: '040',
        direction: 1,
        originStopIds: ['origin'],
        destinationStopIds: ['destination']
      }
    ]
  };
}

function buildDeparture(minutesAhead: number, reference: Date = NOW): RouteSearchDepartureView {
  const arrivalTime = new Date(reference.getTime() + minutesAhead * 60_000);
  return {
    id: 'service-1-line-1',
    lineId: 'line-1',
    lineCode: '040',
    direction: 1,
    destination: 'Almería',
    originStopId: 'origin',
    originStopIds: ['origin'],
    destinationStopIds: ['destination'],
    arrivalTime,
    relativeLabel: { text: '20m', unit: 'minute', value: 20 },
    waitTimeSeconds: minutesAhead * 60,
    kind: 'upcoming',
    isNext: true,
    isMostRecentPast: false,
    isAccessible: true,
    isUniversityOnly: false,
    isHolidayService: false,
    showUpcomingProgress: false,
    progressPercentage: 0,
    pastProgressPercentage: 0,
    destinationArrivalTime: null,
    travelDurationLabel: null
  };
}

describe('PinnedDepartureService', () => {
  let service: PinnedDepartureService;
  let execution: RouteSearchExecutionServiceStub;

  beforeEach(() => {
    window.localStorage.removeItem(PINNED_DEPARTURE_STORAGE_KEY);
    spyOn(Date, 'now').and.callFake(() => NOW.getTime());
    execution = new RouteSearchExecutionServiceStub();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        PinnedDepartureStorage,
        PinnedDepartureService,
        { provide: RouteSearchExecutionService, useValue: execution }
      ]
    });
    service = TestBed.inject(PinnedDepartureService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.removeItem(PINNED_DEPARTURE_STORAGE_KEY);
  });

  it('reports no pinned departure initially', () => {
    expect(service.pin()).toBeNull();
  });

  it('pins an upcoming departure with snapshot detail and exposes the live view', () => {
    service.pinDeparture(buildDeparture(20), buildSelection());

    const view = service.pin();
    expect(view?.lineCode).toBe('040');
    expect(view?.destination).toBe('Almería');
    expect(view?.remainingMs).toBe(20 * 60_000);
    expect(view?.countdown).toEqual({ text: '20m', unit: 'minute', value: 20 });
    expect(view?.progress).toBeCloseTo(0, 2);
  });

  it('replaces an older pin when a new departure is pinned', () => {
    service.pinDeparture(buildDeparture(20), buildSelection());
    service.pinDeparture({ ...buildDeparture(45), id: 'service-2', lineCode: '001' }, buildSelection());

    const view = service.pin();
    expect(view?.departureId).toBe('service-2');
    expect(view?.lineCode).toBe('001');
  });

  it('unpins the departure and clears storage', () => {
    service.pinDeparture(buildDeparture(20), buildSelection());
    service.unpin();

    expect(service.pin()).toBeNull();
    expect(window.localStorage.getItem(PINNED_DEPARTURE_STORAGE_KEY)).toBeNull();
  });

  it('restores a persisted pin on creation', () => {
    TestBed.resetTestingModule();
    const record: PinnedDepartureRecord = {
      departureId: 'service-1-line-1',
      lineId: 'line-1',
      lineCode: '040',
      direction: 1,
      destination: 'Almería',
      consortiumId: 3,
      arrivalTime: new Date(NOW.getTime() + 30 * 60_000).toISOString(),
      pinnedAt: NOW.toISOString(),
      selection: {
        origin: {
          id: 'origin',
          code: 'O',
          name: 'Origin',
          municipality: 'Almería',
          municipalityId: 'm-1',
          nucleus: 'La Gangosa',
          nucleusId: 'n-1',
          consortiumId: 3,
          stopIds: ['origin']
        },
        destination: {
          id: 'destination',
          code: 'D',
          name: 'Destination',
          municipality: 'Roquetas',
          municipalityId: 'm-2',
          nucleus: 'Roquetas',
          nucleusId: 'n-2',
          consortiumId: 3,
          stopIds: ['destination']
        },
        queryDate: '2026-09-21T00:00:00.000Z',
        lineMatches: []
      }
    };
    window.localStorage.setItem(PINNED_DEPARTURE_STORAGE_KEY, JSON.stringify(record));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        PinnedDepartureStorage,
        PinnedDepartureService,
        { provide: RouteSearchExecutionService, useValue: new RouteSearchExecutionServiceStub() }
      ]
    });

    const restored = TestBed.inject(PinnedDepartureService);
    expect(restored.pin()?.lineCode).toBe('040');
  });

  it('advances the countdown on each tick and expires stale pins', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        PinnedDepartureStorage,
        PinnedDepartureService,
        { provide: RouteSearchExecutionService, useValue: execution }
      ]
    });
    service = TestBed.inject(PinnedDepartureService);

    const virtualStart = new Date(Date.now());
    service.pinDeparture(buildDeparture(20, virtualStart), buildSelection());
    expect(service.pin()?.remainingMs).toBe(20 * 60_000);

    tick(10 * 60_000);
    expect(service.pin()?.remainingMs).toBe(10 * 60_000);
    expect(service.pin()?.progress).toBeCloseTo(0.5, 1);

    tick(10 * 60_000);
    expect(service.pin()?.progress).toBe(1);
    expect(service.pin()?.countdown).toEqual({ text: '0s', unit: 'second', value: 0 });

    tick(2 * 60_000);
    expect(service.pin()).toBeNull();
    expect(window.localStorage.getItem(PINNED_DEPARTURE_STORAGE_KEY)).toBeNull();
  }));
});

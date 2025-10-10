import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import {
  RouteSearchResultsService,
  RouteSearchResultsViewModel
} from './route-search-results.service';
import { RouteSearchSelection } from './route-search-state.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { RouteTimetableService, RouteTimetableRequest } from '../../data/route-search/route-timetable.service';
import { RouteTimetableEntry } from '../../data/route-search/route-timetable.mapper';

class RouteTimetableServiceStub {
  constructor(private readonly entries: readonly RouteTimetableEntry[]) {}

  readonly requests: RouteTimetableRequest[] = [];

  loadTimetable(request: RouteTimetableRequest) {
    this.requests.push(request);
    return of(this.entries);
  }
}

describe('RouteSearchResultsService', () => {
  const referenceTime = new Date('2025-06-01T10:00:00Z');

  const origin: StopDirectoryOption = {
    id: '7:origin-a',
    code: 'origin-code',
    name: 'Origen Principal',
    municipality: 'Municipio',
    municipalityId: 'mun-origin',
    nucleus: 'Núcleo',
    nucleusId: 'nuc-origin',
    consortiumId: 7,
    stopIds: ['origin-a', 'origin-b']
  };

  const destination: StopDirectoryOption = {
    id: '7:destination-a',
    code: 'destination-code',
    name: 'Destino Final',
    municipality: 'Municipio',
    municipalityId: 'mun-destination',
    nucleus: 'Núcleo',
    nucleusId: 'nuc-destination',
    consortiumId: 7,
    stopIds: ['destination-a']
  };

  function setup(
    entries: RouteTimetableEntry[]
  ): { service: RouteSearchResultsService; timetable: RouteTimetableServiceStub } {
    const timetableStub = new RouteTimetableServiceStub(entries);

    TestBed.configureTestingModule({
      providers: [
        RouteSearchResultsService,
        {
          provide: RouteTimetableService,
          useValue: timetableStub
        }
      ]
    });

    return {
      service: TestBed.inject(RouteSearchResultsService),
      timetable: TestBed.inject(RouteTimetableService) as unknown as RouteTimetableServiceStub
    };
  }

  function ensureResults(
    value: RouteSearchResultsViewModel | null
  ): RouteSearchResultsViewModel {
    if (!value) {
      throw new Error('Expected route search results to be emitted');
    }

    return value;
  }

  it('builds departures ordered by time and marks the next service', fakeAsync(() => {
    const entries: RouteTimetableEntry[] = [
      buildEntry(referenceTime, -20, 20, 'L1', '001'),
      buildEntry(referenceTime, 5, 15, 'L1', '001'),
      buildEntry(referenceTime, 15, 12, 'L1', '001'),
      buildEntry(referenceTime, 40, 18, 'L1', '001', { isHolidayOnly: true }),
      buildEntry(referenceTime, 60, 25, 'L1', '001', { notes: 'Servicio especial' })
    ];

    const { service } = setup(entries);

    const selection: RouteSearchSelection = {
      origin,
      destination,
      queryDate: referenceTime,
      lineMatches: [
        {
          lineId: 'L1',
          lineCode: '001',
          direction: 0,
          originStopIds: ['origin-a', 'origin-b'],
          destinationStopIds: ['destination-a']
        }
      ]
    };

    let result: RouteSearchResultsViewModel | null = null;
    const subscription = service
      .loadResults(selection, {
        nowProvider: () => referenceTime,
        refreshIntervalMs: 1_000
      })
      .subscribe((viewModel) => {
        result = viewModel;
      });

    tick(0);
    subscription.unsubscribe();

    const viewModel = ensureResults(result);
    expect(viewModel.departures.length).toBe(5);
    expect(viewModel.hasUpcoming).toBeTrue();
    expect(viewModel.nextDepartureId).toBe(viewModel.departures[1].id);
    const first = viewModel.departures[0];
    const second = viewModel.departures[1];
    expect(first.kind).toBe('past');
    expect(first.relativeLabel).toBe('20m');
    expect(first.isMostRecentPast).toBeTrue();
    expect(first.pastProgressPercentage).toBeGreaterThan(0);
    expect(second.kind).toBe('upcoming');
    expect(second.relativeLabel).toBe('5m');
    expect(second.travelDurationLabel).toBe('15m');
    expect(second.showUpcomingProgress).toBeTrue();
    expect(viewModel.departures[3].showUpcomingProgress).toBeFalse();
    expect(viewModel.departures[3].isHolidayService).toBeTrue();
    expect(viewModel.departures[4].destination).toContain('Servicio especial');
  }));

  it('passes the selection details to the timetable service', fakeAsync(() => {
    const { service, timetable } = setup([buildEntry(referenceTime, 5, 15, 'L1', '001')]);

    const selection: RouteSearchSelection = {
      origin,
      destination,
      queryDate: referenceTime,
      lineMatches: [
        {
          lineId: 'L1',
          lineCode: '001',
          direction: 0,
          originStopIds: ['origin-a'],
          destinationStopIds: ['destination-a']
        }
      ]
    };

    let emissionCount = 0;
    const subscription = service
      .loadResults(selection, {
        nowProvider: () => referenceTime,
        refreshIntervalMs: 1_000
      })
      .subscribe(() => {
        emissionCount += 1;
      });

    tick(0);
    subscription.unsubscribe();

    expect(timetable.requests.length).toBe(1);
    const request = timetable.requests[0];
    expect(request.queryDate.getTime()).toBe(selection.queryDate.getTime());
    expect(request.consortiumId).toBe(origin.consortiumId);
    expect(request.originNucleusId).toBe(origin.nucleusId);
    expect(request.destinationNucleusId).toBe(destination.nucleusId);
    expect(emissionCount).toBeGreaterThan(0);
  }));

  it('filters past departures older than thirty minutes', fakeAsync(() => {
    const entries: RouteTimetableEntry[] = [
      buildEntry(referenceTime, -45, 30, 'L1', '001'),
      buildEntry(referenceTime, -10, 12, 'L1', '001')
    ];

    const { service } = setup(entries);

    const selection: RouteSearchSelection = {
      origin,
      destination,
      queryDate: referenceTime,
      lineMatches: [
        {
          lineId: 'L1',
          lineCode: '001',
          direction: 0,
          originStopIds: ['origin-a'],
          destinationStopIds: ['destination-a']
        }
      ]
    };

    let viewModel: RouteSearchResultsViewModel | null = null;
    const subscription = service
      .loadResults(selection, {
        nowProvider: () => referenceTime,
        refreshIntervalMs: 1_000
      })
      .subscribe((result) => {
        viewModel = result;
      });

    tick(0);
    subscription.unsubscribe();

    const resolved = ensureResults(viewModel);
    expect(resolved.departures.length).toBe(1);
    expect(resolved.departures[0].relativeLabel).toBe('10m');
    expect(resolved.departures[0].isMostRecentPast).toBeTrue();
    expect(resolved.hasUpcoming).toBeFalse();
    expect(resolved.nextDepartureId).toBeNull();
  }));

  it('keeps a visible past progress immediately after departure', fakeAsync(() => {
    const entries: RouteTimetableEntry[] = [buildEntry(referenceTime, -0.1, 12, 'L1', '001')];

    const { service } = setup(entries);

    const selection: RouteSearchSelection = {
      origin,
      destination,
      queryDate: referenceTime,
      lineMatches: [
        {
          lineId: 'L1',
          lineCode: '001',
          direction: 0,
          originStopIds: ['origin-a'],
          destinationStopIds: ['destination-a']
        }
      ]
    };

    let viewModel: RouteSearchResultsViewModel | null = null;
    const subscription = service
      .loadResults(selection, {
        nowProvider: () => referenceTime,
        refreshIntervalMs: 1_000
      })
      .subscribe((result) => {
        viewModel = result;
      });

    tick(0);
    subscription.unsubscribe();

    const resolved = ensureResults(viewModel);
    expect(resolved.departures.length).toBe(1);
    expect(resolved.departures[0].pastProgressPercentage).toBeGreaterThan(0);
  }));

  it('deduplicates timetable entries that share the same slot', fakeAsync(() => {
    const duplicate = buildEntry(referenceTime, 10, 20, 'L1', '001');
    const entries: RouteTimetableEntry[] = [duplicate, { ...duplicate }];

    const { service } = setup(entries);

    const selection: RouteSearchSelection = {
      origin,
      destination,
      queryDate: referenceTime,
      lineMatches: [
        {
          lineId: 'L1',
          lineCode: '001',
          direction: 0,
          originStopIds: ['origin-a'],
          destinationStopIds: ['destination-a']
        }
      ]
    };

    let viewModel: RouteSearchResultsViewModel | null = null;
    const subscription = service
      .loadResults(selection, {
        nowProvider: () => referenceTime,
        refreshIntervalMs: 1_000
      })
      .subscribe((result) => {
        viewModel = result;
      });

    tick(0);
    subscription.unsubscribe();

    const resolved = ensureResults(viewModel);
    expect(resolved.departures.length).toBe(1);
  }));

  it('returns upcoming departures when the query date is in the future', fakeAsync(() => {
    const futureDate = new Date('2025-06-02T00:00:00Z');
    const entries: RouteTimetableEntry[] = [
      buildEntry(futureDate, 60, 30, 'L10', '010'),
      buildEntry(futureDate, 120, 35, 'L10', '010')
    ];

    const { service } = setup(entries);

    const selection: RouteSearchSelection = {
      origin,
      destination,
      queryDate: futureDate,
      lineMatches: [
        {
          lineId: 'L10',
          lineCode: '010',
          direction: 1,
          originStopIds: ['origin-a'],
          destinationStopIds: ['destination-a']
        }
      ]
    };

    const currentTime = new Date('2025-06-01T10:00:00Z');

    let viewModel: RouteSearchResultsViewModel | null = null;
    const subscription = service
      .loadResults(selection, {
        nowProvider: () => currentTime,
        refreshIntervalMs: 1_000
      })
      .subscribe((result) => {
        viewModel = result;
      });

    tick(0);
    subscription.unsubscribe();

    const resolved = ensureResults(viewModel);
    expect(resolved.departures.every((item) => item.kind === 'upcoming')).toBeTrue();
  }));

  it('updates the timeline as time advances', fakeAsync(() => {
    const entries: RouteTimetableEntry[] = [
      buildEntry(referenceTime, -5, 15, 'L1', '001'),
      buildEntry(referenceTime, 15, 15, 'L1', '001'),
      buildEntry(referenceTime, 45, 15, 'L1', '001'),
      buildEntry(referenceTime, 90, 15, 'L1', '001')
    ];

    const { service } = setup(entries);

    const selection: RouteSearchSelection = {
      origin,
      destination,
      queryDate: referenceTime,
      lineMatches: [
        {
          lineId: 'L1',
          lineCode: '001',
          direction: 0,
          originStopIds: ['origin-a'],
          destinationStopIds: ['destination-a']
        }
      ]
    };

    let now = referenceTime;
    const emissions: RouteSearchResultsViewModel[] = [];
    const subscription = service
      .loadResults(selection, {
        nowProvider: () => now,
        refreshIntervalMs: 1_000
      })
      .subscribe((viewModel) => {
        emissions.push(viewModel);
      });

    tick(0);
    expect(emissions[0].departures.length).toBe(4);
    expect(emissions[0].departures[0].isMostRecentPast).toBeTrue();
    expect(emissions[0].departures[1].kind).toBe('upcoming');
    expect(emissions[0].departures[1].showUpcomingProgress).toBeTrue();
    expect(emissions[0].departures[2].showUpcomingProgress).toBeFalse();
    now = new Date(referenceTime.getTime() + 20 * 60_000);
    tick(1_000);
    expect(emissions[1].departures.length).toBe(4);
    expect(emissions[1].departures[1].kind).toBe('past');
    expect(emissions[1].departures[1].isMostRecentPast).toBeTrue();
    expect(emissions[1].departures[2].showUpcomingProgress).toBeTrue();
    now = new Date(referenceTime.getTime() + 80 * 60_000);
    tick(1_000);
    expect(emissions[2].departures.length).toBe(1);
    expect(emissions[2].departures[0].kind).toBe('upcoming');
    expect(emissions[2].departures[0].showUpcomingProgress).toBeTrue();

    subscription.unsubscribe();
  }));

  interface BuildEntryOptions {
    readonly notes?: string;
    readonly isHolidayOnly?: boolean;
  }

  function buildEntry(
    reference: Date,
    offsetMinutes: number,
    travelMinutes: number,
    lineId: string,
    lineCode: string,
    options?: BuildEntryOptions
  ): RouteTimetableEntry {
    const departure = new Date(reference.getTime() + offsetMinutes * 60_000);
    const arrival = new Date(departure.getTime() + travelMinutes * 60_000);

    return {
      lineId,
      lineCode,
      departureTime: departure,
      arrivalTime: arrival,
      frequency: { id: 'freq', code: 'L-V', name: 'Lunes a viernes' },
      notes: options?.notes ?? null,
      isHolidayOnly: options?.isHolidayOnly ?? false
    } satisfies RouteTimetableEntry;
  }
});

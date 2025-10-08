import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RouteSearchResultsService } from './route-search-results.service';
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
    id: 'origin-group',
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
    id: 'destination-group',
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

  it('builds departures ordered by time and marks the next service', (done) => {
    const entries: RouteTimetableEntry[] = [
      buildEntry(referenceTime, -20, 20, 'L1', '001'),
      buildEntry(referenceTime, 5, 15, 'L1', '001'),
      buildEntry(referenceTime, 15, 12, 'L1', '001'),
      buildEntry(referenceTime, 40, 18, 'L1', '001'),
      buildEntry(referenceTime, 60, 25, 'L1', '001', 'Servicio especial')
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

    service.loadResults(selection, { currentTime: referenceTime }).subscribe((viewModel) => {
      expect(viewModel.departures.length).toBe(5);
      expect(viewModel.hasUpcoming).toBeTrue();
      expect(viewModel.nextDepartureId).toBe(viewModel.departures[1].id);
      const first = viewModel.departures[0];
      const second = viewModel.departures[1];
      expect(first.kind).toBe('past');
      expect(first.relativeLabel).toBe('20m');
      expect(second.kind).toBe('upcoming');
      expect(second.relativeLabel).toBe('5m');
      expect(second.travelDurationLabel).toBe('15m');
      expect(viewModel.departures[4].destination).toContain('Servicio especial');
      done();
    });
  });

  it('passes the selection details to the timetable service', (done) => {
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

    service.loadResults(selection, { currentTime: referenceTime }).subscribe(() => {
      expect(timetable.requests.length).toBe(1);
      const request = timetable.requests[0];
      expect(request.queryDate.getTime()).toBe(selection.queryDate.getTime());
      expect(request.consortiumId).toBe(origin.consortiumId);
      expect(request.originNucleusId).toBe(origin.nucleusId);
      expect(request.destinationNucleusId).toBe(destination.nucleusId);
      done();
    });
  });

  it('filters past departures older than thirty minutes', (done) => {
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

    service.loadResults(selection, { currentTime: referenceTime }).subscribe((viewModel) => {
      expect(viewModel.departures.length).toBe(1);
      expect(viewModel.departures[0].relativeLabel).toBe('10m');
      expect(viewModel.hasUpcoming).toBeFalse();
      expect(viewModel.nextDepartureId).toBeNull();
      done();
    });
  });

  it('deduplicates timetable entries that share the same slot', (done) => {
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

    service.loadResults(selection, { currentTime: referenceTime }).subscribe((viewModel) => {
      expect(viewModel.departures.length).toBe(1);
      done();
    });
  });

  it('returns upcoming departures when the query date is in the future', (done) => {
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

    service.loadResults(selection, { currentTime }).subscribe((viewModel) => {
      expect(viewModel.departures.length).toBe(2);
      expect(viewModel.departures.every((item) => item.kind === 'upcoming')).toBeTrue();
      done();
    });
  });

  function buildEntry(
    reference: Date,
    offsetMinutes: number,
    travelMinutes: number,
    lineId: string,
    lineCode: string,
    notes?: string
  ): RouteTimetableEntry {
    const departure = new Date(reference.getTime() + offsetMinutes * 60_000);
    const arrival = new Date(departure.getTime() + travelMinutes * 60_000);

    return {
      lineId,
      lineCode,
      departureTime: departure,
      arrivalTime: arrival,
      frequency: { id: 'freq', code: 'L-V', name: 'Lunes a viernes' },
      notes: notes ?? null
    } satisfies RouteTimetableEntry;
  }
});

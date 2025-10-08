import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RouteSearchResultsService } from './route-search-results.service';
import { RouteSearchSelection } from './route-search-state.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { StopScheduleService } from '../../data/services/stop-schedule.service';
import { StopScheduleResult, StopService } from '../stop-schedule/stop-schedule.model';

class StopScheduleServiceStub {
  constructor(private readonly results: Map<string, StopScheduleResult>) {}

  readonly requests: { readonly stopId: string; readonly queryDate: Date | undefined }[] = [];

  getStopSchedule(stopId: string, options?: { readonly queryDate?: Date }) {
    this.requests.push({ stopId, queryDate: options?.queryDate });
    const result = this.results.get(stopId);

    if (!result) {
      throw new Error(`Unexpected stop request: ${stopId}`);
    }

    return of(result);
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
    results: Record<string, StopScheduleResult>
  ): { service: RouteSearchResultsService; stopSchedule: StopScheduleServiceStub } {
    TestBed.configureTestingModule({
      providers: [
        RouteSearchResultsService,
        {
          provide: StopScheduleService,
          useValue: new StopScheduleServiceStub(new Map(Object.entries(results)))
        }
      ]
    });

    return {
      service: TestBed.inject(RouteSearchResultsService),
      stopSchedule: TestBed.inject(StopScheduleService) as unknown as StopScheduleServiceStub
    };
  }

  it('merges schedules from multiple origin stops and marks the next upcoming service', (done) => {
    const { service } = setup({
      'origin-a': buildResult('origin-a', [
        buildService(referenceTime, -20, 'service-1', '001', 'L1', 0),
        buildService(referenceTime, 5, 'service-2', '001', 'L1', 0),
        buildService(referenceTime, 40, 'service-3', '001', 'L1', 0)
      ]),
      'origin-b': buildResult('origin-b', [
        buildService(referenceTime, 15, 'service-4', '001', 'L1', 0),
        buildService(referenceTime, 60, 'service-5', '001', 'L1', 0)
      ]),
      'destination-a': buildResult('destination-a', [
        buildService(referenceTime, -5, 'service-1', '001', 'L1', 0),
        buildService(referenceTime, 20, 'service-2', '001', 'L1', 0),
        buildService(referenceTime, 55, 'service-3', '001', 'L1', 0),
        buildService(referenceTime, 30, 'service-4', '001', 'L1', 0),
        buildService(referenceTime, 75, 'service-5', '001', 'L1', 0)
      ])
    });

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
      expect(viewModel.nextDepartureId).toBe('service-2');
      const first = viewModel.departures[0];
      const second = viewModel.departures[1];
      expect(first.kind).toBe('past');
      expect(first.relativeLabel).toBe('20m');
      expect(first.pastProgressPercentage).toBe(Math.round((20 / 30) * 100));
      expect(second.kind).toBe('upcoming');
      expect(second.relativeLabel).toBe('5m');
      expect(second.isNext).toBeTrue();
      expect(second.progressPercentage).toBe(Math.round((5 / 30) * 100));
      expect(second.destinationArrivalTime).not.toBeNull();
      expect(second.travelDurationLabel).toBe('15m');
      expect(viewModel.departures[2].relativeLabel).toBe('15m');
      const expectedArrival = new Date(referenceTime.getTime() + 20 * 60_000);
      expect(second.destinationArrivalTime?.toISOString()).toBe(
        expectedArrival.toISOString()
      );
      done();
    });
  });

  it('passes the selection date to the schedule service', (done) => {
    const { service, stopSchedule } = setup({
      'origin-a': buildResult('origin-a', [
        buildService(referenceTime, 5, 'service-1', '001', 'L1', 0)
      ]),
      'destination-a': buildResult('destination-a', [
        buildService(referenceTime, 15, 'service-1', '001', 'L1', 0)
      ])
    });

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
      expect(stopSchedule.requests.length).toBe(2);
      stopSchedule.requests.forEach((request) => {
        expect(request.queryDate?.getTime()).toBe(selection.queryDate.getTime());
      });
      done();
    });
  });

  it('omits past services older than thirty minutes and reports when no upcoming services remain', (done) => {
    const { service } = setup({
      'origin-a': buildResult('origin-a', [
        buildService(referenceTime, -45, 'service-1', '001', 'L1', 0),
        buildService(referenceTime, -10, 'service-2', '001', 'L1', 0)
      ]),
      'destination-a': buildResult('destination-a', [
        buildService(referenceTime, -30, 'service-1', '001', 'L1', 0),
        buildService(referenceTime, 0, 'service-2', '001', 'L1', 0)
      ])
    });

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
      const departure = viewModel.departures[0];
      expect(departure.relativeLabel).toBe('10m');
      expect(departure.kind).toBe('past');
      expect(departure.pastProgressPercentage).toBe(Math.round((10 / 30) * 100));
      expect(departure.destinationArrivalTime).not.toBeNull();
      expect(viewModel.hasUpcoming).toBeFalse();
      expect(viewModel.nextDepartureId).toBeNull();
      done();
    });
  });

  it('deduplicates services that share the same line, direction, and arrival minute', (done) => {
    const duplicateTime = new Date(referenceTime.getTime() + 5 * 60_000);
    const { service } = setup({
      'origin-a': buildResult('origin-a', [
        buildService(referenceTime, 5, 'service-1', '001', 'L1', 0)
      ]),
      'origin-b': buildResult('origin-b', [
        {
          serviceId: 'service-duplicate',
          lineId: 'L1',
          lineCode: '001',
          direction: 0,
          destination: 'Destino Final',
          arrivalTime: duplicateTime,
          isAccessible: true,
          isUniversityOnly: false
        }
      ]),
      'destination-a': buildResult('destination-a', [
        buildService(referenceTime, 20, 'service-1', '001', 'L1', 0),
        buildService(referenceTime, 20, 'service-duplicate', '001', 'L1', 0)
      ])
    });

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
      expect(viewModel.departures.length).toBe(1);
      expect(viewModel.departures[0].originStopId).toBe('origin-a');
      done();
    });
  });

  it('returns the full schedule when requesting a future date', (done) => {
    const futureReference = new Date('2025-06-02T00:00:00Z');
    const { service } = setup({
      'origin-a': buildResult(
        'origin-a',
        [
          buildService(futureReference, 60, 'service-10', '010', 'L10', 1),
          buildService(futureReference, 120, 'service-11', '010', 'L10', 1)
        ]
      ),
      'destination-a': buildResult(
        'destination-a',
        [
          buildService(futureReference, 90, 'service-10', '010', 'L10', 1),
          buildService(futureReference, 150, 'service-11', '010', 'L10', 1)
        ]
      )
    });

    const selection: RouteSearchSelection = {
      origin,
      destination,
      queryDate: futureReference,
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
      expect(viewModel.departures[0].kind).toBe('upcoming');
      expect(viewModel.departures[1].kind).toBe('upcoming');
      expect(viewModel.nextDepartureId).toBe('service-10');
      done();
    });
  });
  function buildResult(stopId: string, services: readonly StopService[]): StopScheduleResult {
    return {
      schedule: {
        stopId,
        stopCode: stopId,
        stopName: stopId,
        queryDate: referenceTime,
        generatedAt: referenceTime,
        services
      },
      dataSource: {
        type: 'snapshot',
        providerName: 'Provider',
        queryTime: referenceTime,
        snapshotTime: referenceTime
      }
    } satisfies StopScheduleResult;
  }

  function buildService(
    reference: Date,
    offsetMinutes: number,
    serviceId: string,
    lineCode: string,
    lineId: string,
    direction: number
  ): StopService {
    return {
      serviceId,
      lineId,
      lineCode,
      direction,
      destination: 'Destino Final',
      arrivalTime: new Date(reference.getTime() + offsetMinutes * 60_000),
      isAccessible: true,
      isUniversityOnly: false
    } satisfies StopService;
  }
});

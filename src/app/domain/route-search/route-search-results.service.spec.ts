import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RouteSearchResultsService } from './route-search-results.service';
import { RouteSearchSelection } from './route-search-state.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { StopScheduleService } from '../../data/services/stop-schedule.service';
import { StopScheduleResult, StopService } from '../stop-schedule/stop-schedule.model';

class StopScheduleServiceStub {
  constructor(private readonly results: Map<string, StopScheduleResult>) {}

  getStopSchedule(stopId: string) {
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

  function setup(results: Record<string, StopScheduleResult>): RouteSearchResultsService {
    TestBed.configureTestingModule({
      providers: [
        RouteSearchResultsService,
        {
          provide: StopScheduleService,
          useValue: new StopScheduleServiceStub(new Map(Object.entries(results)))
        }
      ]
    });

    return TestBed.inject(RouteSearchResultsService);
  }

  it('merges schedules from multiple origin stops and marks the next upcoming service', (done) => {
    const service = setup({
      'origin-a': buildResult('origin-a', [
        buildService(referenceTime, -20, 'service-1', '001', 'L1', 0),
        buildService(referenceTime, 5, 'service-2', '001', 'L1', 0),
        buildService(referenceTime, 40, 'service-3', '001', 'L1', 0)
      ]),
      'origin-b': buildResult('origin-b', [
        buildService(referenceTime, 15, 'service-4', '001', 'L1', 0),
        buildService(referenceTime, 60, 'service-5', '001', 'L1', 0)
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
      expect(viewModel.lines.length).toBe(1);
      const line = viewModel.lines[0];
      expect(line.hasUpcoming).toBeTrue();
      expect(line.items.length).toBe(5);
      expect(line.items[0].kind).toBe('past');
      expect(line.items[0].relativeLabel).toBe('20m');
      expect(line.items[1].kind).toBe('upcoming');
      expect(line.items[1].relativeLabel).toBe('5m');
      expect(line.items[1].isNext).toBeTrue();
      expect(line.items[2].relativeLabel).toBe('15m');
      done();
    });
  });

  it('omits past services older than thirty minutes and reports when no upcoming services remain', (done) => {
    const service = setup({
      'origin-a': buildResult('origin-a', [
        buildService(referenceTime, -45, 'service-1', '001', 'L1', 0),
        buildService(referenceTime, -10, 'service-2', '001', 'L1', 0)
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
      expect(viewModel.lines[0].items.length).toBe(1);
      expect(viewModel.lines[0].items[0].relativeLabel).toBe('10m');
      expect(viewModel.lines[0].items[0].kind).toBe('past');
      expect(viewModel.lines[0].hasUpcoming).toBeFalse();
      done();
    });
  });

  it('deduplicates services that share the same line, direction, and arrival minute', (done) => {
    const duplicateTime = new Date(referenceTime.getTime() + 5 * 60_000);
    const service = setup({
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
      expect(viewModel.lines[0].items.length).toBe(1);
      expect(viewModel.lines[0].items[0].originStopId).toBe('origin-a');
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

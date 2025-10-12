import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { RouteSearchPreviewService } from './route-search-preview.service';
import {
  RouteSearchResultsService,
  RouteSearchDepartureView,
  RouteSearchResultsViewModel
} from './route-search-results.service';
import { RouteSearchSelection } from './route-search-state.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';

class RouteSearchResultsStub {
  loadResults = jasmine.createSpy('loadResults');
}

describe('RouteSearchPreviewService', () => {
  let service: RouteSearchPreviewService;
  let results: RouteSearchResultsStub;
  const selection = createSelection();

  beforeEach(() => {
    results = new RouteSearchResultsStub();
    TestBed.configureTestingModule({
      providers: [{ provide: RouteSearchResultsService, useValue: results }]
    });

    service = TestBed.inject(RouteSearchPreviewService);
  });

  it('returns the next and previous departures', async () => {
    const departures: RouteSearchDepartureView[] = [
      buildDeparture('prev', 'past', true),
      buildDeparture('next', 'upcoming', false)
    ];
    results.loadResults.and.returnValue(of(buildResults(departures)));

    const preview = await firstValueFrom(service.loadPreview(selection));

    expect(preview.next?.id).toBe('next');
    expect(preview.previous?.id).toBe('prev');
  });

  it('handles missing departures by returning nulls', async () => {
    results.loadResults.and.returnValue(of(buildResults([])));

    const preview = await firstValueFrom(service.loadPreview(selection));

    expect(preview.next).toBeNull();
    expect(preview.previous).toBeNull();
  });

  it('propagates errors from the results service', async () => {
    results.loadResults.and.returnValue(throwError(() => new Error('failed')));

    await expectAsync(firstValueFrom(service.loadPreview(selection))).toBeRejected();
  });

  function buildResults(departures: RouteSearchDepartureView[]): RouteSearchResultsViewModel {
    return {
      departures,
      hasUpcoming: departures.some((item) => item.kind === 'upcoming'),
      nextDepartureId: departures.find((item) => item.kind === 'upcoming')?.id ?? null
    };
  }

  function buildDeparture(
    id: string,
    kind: 'past' | 'upcoming',
    isMostRecentPast: boolean
  ): RouteSearchDepartureView {
    return {
      id,
      lineId: 'line',
      lineCode: 'L1',
      direction: 0,
      destination: 'Destination',
      originStopId: 'origin',
      arrivalTime: new Date('2025-01-01T10:00:00Z'),
      relativeLabel: '5 min',
      waitTimeSeconds: 0,
      kind,
      isNext: kind === 'upcoming',
      isMostRecentPast,
      isAccessible: false,
      isUniversityOnly: false,
      isHolidayService: false,
      showUpcomingProgress: false,
      progressPercentage: 0,
      pastProgressPercentage: 0,
      destinationArrivalTime: null,
      travelDurationLabel: null
    };
  }

  function createSelection(): RouteSearchSelection {
    const option: StopDirectoryOption = {
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

    return {
      origin: option,
      destination: option,
      queryDate: new Date('2025-01-01T00:00:00Z'),
      lineMatches: []
    };
  }
});

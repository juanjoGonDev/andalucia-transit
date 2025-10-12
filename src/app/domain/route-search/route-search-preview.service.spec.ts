import { TestBed } from '@angular/core/testing';
import { Subject, Subscription } from 'rxjs';

import { RouteSearchPreview, RouteSearchPreviewService } from './route-search-preview.service';
import {
  RouteSearchResultsService,
  RouteSearchDepartureView,
  RouteSearchResultsViewModel
} from './route-search-results.service';
import { RouteSearchSelection } from './route-search-state.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';

class RouteSearchResultsStub {
  private subject = new Subject<RouteSearchResultsViewModel>();
  readonly loadResults = jasmine
    .createSpy('loadResults')
    .and.callFake(() => this.subject.asObservable());

  emit(value: RouteSearchResultsViewModel): void {
    this.subject.next(value);
  }

  fail(error: Error): void {
    this.subject.error(error);
    this.subject = new Subject<RouteSearchResultsViewModel>();
  }
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

  it('streams next and previous departures over time', () => {
    const previewValues: RouteSearchPreview[] = [];
    const subscription = subscribeToPreview(previewValues);

    results.emit(buildResults([buildDeparture('prev', 'past', true)]));
    results.emit(buildResults([buildDeparture('next', 'upcoming', false)]));

    expect(previewValues.length).toBe(2);
    expect(previewValues[0]?.previous?.id).toBe('prev');
    expect(previewValues[1]?.next?.id).toBe('next');

    subscription.unsubscribe();
  });

  it('emits null preview when departures are missing', () => {
    const previewValues: RouteSearchPreview[] = [];
    const subscription = subscribeToPreview(previewValues);

    results.emit(buildResults([]));

    expect(previewValues[0]?.next).toBeNull();
    expect(previewValues[0]?.previous).toBeNull();

    subscription.unsubscribe();
  });

  it('shares the same results subscription across observers', () => {
    const firstValues: RouteSearchPreview[] = [];
    const secondValues: RouteSearchPreview[] = [];
    const firstSubscription = subscribeToPreview(firstValues);
    const secondSubscription = subscribeToPreview(secondValues);

    results.emit(buildResults([buildDeparture('next', 'upcoming', false)]));

    expect(results.loadResults).toHaveBeenCalledTimes(1);
    expect(firstValues.length).toBe(1);
    expect(secondValues.length).toBe(1);

    firstSubscription.unsubscribe();
    secondSubscription.unsubscribe();
  });

  it('retains cached data after observers unsubscribe', () => {
    const firstValues: RouteSearchPreview[] = [];
    const firstSubscription = subscribeToPreview(firstValues);

    results.emit(buildResults([buildDeparture('next', 'upcoming', false)]));
    firstSubscription.unsubscribe();

    const secondValues: RouteSearchPreview[] = [];
    const secondSubscription = subscribeToPreview(secondValues);

    expect(results.loadResults).toHaveBeenCalledTimes(1);
    expect(secondValues.length).toBe(1);
    expect(secondValues[0]?.next?.id).toBe('next');

    secondSubscription.unsubscribe();
  });

  it('propagates errors and clears the cache entry', () => {
    const previewValues: RouteSearchPreview[] = [];
    const errorSpy = jasmine.createSpy('error');
    const subscription = subscribeToPreview(previewValues, errorSpy);
    results.fail(new Error('failed'));

    expect(previewValues.length).toBe(0);
    expect(errorSpy).toHaveBeenCalled();
    subscription.unsubscribe();

    const nextValues: RouteSearchPreview[] = [];
    const nextErrorSpy = jasmine.createSpy('nextError');
    const nextSubscription = subscribeToPreview(nextValues, nextErrorSpy);

    expect(results.loadResults).toHaveBeenCalledTimes(2);
    expect(nextErrorSpy).not.toHaveBeenCalled();
    nextSubscription.unsubscribe();
  });

  function subscribeToPreview(
    target: RouteSearchPreview[],
    error?: jasmine.Spy
  ): Subscription {
    return service.loadPreview(selection).subscribe({
      next: (preview) => target.push(preview),
      error: error ?? (() => undefined)
    });
  }

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

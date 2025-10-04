import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import {
  MockTransitNetworkService,
  StopOption,
  StopSearchRequest
} from './mock-transit-network.service';

describe('MockTransitNetworkService', () => {
  let service: MockTransitNetworkService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockTransitNetworkService]
    });

    service = TestBed.inject(MockTransitNetworkService);
  });

  it('limits search results and matches the query string case-insensitively', async () => {
    const request: StopSearchRequest = {
      query: 'stop 01',
      limit: 5
    };

    const results = await firstValueFrom(service.searchStops(request));

    const normalizedQuery = request.query.toLocaleLowerCase();

    expect(results.length).toBeLessThanOrEqual(request.limit);
    expect(results.length).toBeGreaterThan(0);

    for (const stop of results) {
      expect(stop.name.toLocaleLowerCase()).toContain(normalizedQuery);
    }
  });

  it('filters by allowed stop identifiers and excludes the provided one', async () => {
    const origin = service.getStopById('stop-1') as StopOption;
    const reachable = service.getReachableStopIds(origin.id);
    const excludeStopId = reachable[0];

    const results = await firstValueFrom(
      service.searchStops({
        query: '',
        includeStopIds: reachable,
        excludeStopId,
        limit: reachable.length
      })
    );

    expect(results.length).toBeLessThanOrEqual(reachable.length);
    expect(results.find((stop) => stop.id === excludeStopId)).toBeUndefined();

    for (const stop of results) {
      expect(reachable.includes(stop.id)).toBeTrue();
    }
  });

  it('returns an empty collection when the stop identifier is unknown', () => {
    const reachable = service.getReachableStopIds('unknown-stop');

    expect(reachable).toEqual([]);
    expect(service.getStopById('unknown-stop')).toBeNull();
  });
});

import { Injectable } from '@angular/core';

import { APP_CONFIG } from '../config';
import { GeoCoordinate, calculateDistanceInMeters } from '../../domain/utils/geo-distance.util';

export interface NearbyStopResult {
  id: string;
  titleKey: string;
  distanceInMeters: number;
}

@Injectable({ providedIn: 'root' })
export class NearbyStopsService {
  private readonly stops = APP_CONFIG.homeData.nearbyStops.stops;
  private readonly defaultLimit = APP_CONFIG.homeData.nearbyStops.maxResults;

  findClosestStops(position: GeoCoordinate, limit?: number): readonly NearbyStopResult[] {
    const resultsLimit = limit ?? this.defaultLimit;

    return this.stops
      .map((stop) => ({
        id: stop.id,
        titleKey: stop.titleKey,
        distanceInMeters: calculateDistanceInMeters(position, {
          latitude: stop.latitude,
          longitude: stop.longitude
        })
      }))
      .sort((first, second) => first.distanceInMeters - second.distanceInMeters)
      .slice(0, resultsLimit);
  }
}

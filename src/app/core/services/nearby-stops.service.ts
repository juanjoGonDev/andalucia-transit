import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '@core/config';
import type {
  NearbyStopResult as LoaderNearbyStopResult,
  NearbyStopRecord
} from '@core/services/nearby-stops.loader';
import type { GeoCoordinate } from '@domain/utils/geo-distance.util';

export type NearbyStopResult = LoaderNearbyStopResult;

@Injectable({ providedIn: 'root' })
export class NearbyStopsService {
  private static readonly EMPTY_RESULTS: readonly NearbyStopResult[] = Object.freeze([]);

  private readonly http = inject(HttpClient);
  private readonly defaultLimit = APP_CONFIG.homeData.nearbyStops.maxResults;
  private readonly maxDistanceInMeters = APP_CONFIG.homeData.nearbyStops.maxDistanceInMeters;
  private readonly indexPath = APP_CONFIG.data.snapshots.stopDirectoryPath;

  private stopsPromise: Promise<readonly NearbyStopRecord[]> | null = null;
  private loaderPromise: Promise<NearbyStopsLoaderModule> | null = null;

  async findClosestStops(
    position: GeoCoordinate,
    limit?: number
  ): Promise<readonly NearbyStopResult[]> {
    const records = await this.loadStops();
    const resultsLimit = limit ?? this.defaultLimit;

    if (resultsLimit <= 0 || !records.length) {
      return NearbyStopsService.EMPTY_RESULTS;
    }

    const { buildNearbyStopResults } = await this.loadLoaderModule();
    const results = buildNearbyStopResults(
      records,
      position,
      resultsLimit,
      this.maxDistanceInMeters
    );

    return results.length ? results : NearbyStopsService.EMPTY_RESULTS;
  }

  private async loadStops(): Promise<readonly NearbyStopRecord[]> {
    if (!this.stopsPromise) {
      this.stopsPromise = this.fetchStops().catch((error) => {
        this.stopsPromise = null;
        throw error;
      });
    }

    return this.stopsPromise;
  }

  private async fetchStops(): Promise<readonly NearbyStopRecord[]> {
    const { loadNearbyStopRecords } = await this.loadLoaderModule();
    return loadNearbyStopRecords(this.http, this.indexPath);
  }

  private loadLoaderModule(): Promise<NearbyStopsLoaderModule> {
    if (!this.loaderPromise) {
      this.loaderPromise = import('@core/services/nearby-stops.loader');
    }

    return this.loaderPromise;
  }
}

type NearbyStopsLoaderModule = typeof import('@core/services/nearby-stops.loader');

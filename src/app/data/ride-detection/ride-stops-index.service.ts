import { Injectable, signal } from '@angular/core';
import {
  RideCandidateStop,
  filterStopsWithinMeters
} from '@domain/ride-detection/ride-candidates.util';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';

const RIDE_STOP_RADIUS_METERS = 700;
const CHUNK_PATH = 'assets/data/stop-directory/chunks';

interface DirectoryChunkStopFile {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly name?: string;
  readonly location?: {
    readonly latitude?: number;
    readonly longitude?: number;
  };
}

interface DirectoryChunkFile {
  readonly stops: readonly DirectoryChunkStopFile[];
}

/**
 * Client-side radius scan over the daily stop directory snapshot. Chunks load
 * lazily and stay cached for the session; scanning always runs under ~9 files
 * (≤ ~3MB compressed once per detection episode).
 */
@Injectable({ providedIn: 'root' })
export class RideStopsIndexService {
  private readonly cache = signal<ReadonlyMap<number, readonly DirectoryChunkStopFile[]>>(
    new Map()
  );
  private readonly loading = new Map<number, Promise<readonly DirectoryChunkStopFile[]>>();

  /** Radius-filtered stops around a fix across every downloaded consortium chunk. */
  async stopsWithin(center: GeoCoordinate, radiusMeters: number = RIDE_STOP_RADIUS_METERS): Promise<RideCandidateStop[]> {
    const allConsortiums = [...Array(9).keys()].map((i) => i + 1);
    const located: ReturnType<typeof filterStopsWithinMeters>[number][] = [];

    const chunks = await Promise.all(allConsortiums.map((id) => this.loadChunk(id)));

    for (const chunk of chunks.flat()) {
      const latitude = chunk.location?.latitude;
      const longitude = chunk.location?.longitude;

      if (latitude === undefined || longitude === undefined) {
        continue;
      }

      located.push(
        ...filterStopsWithinMeters(
          [
            {
              consortiumId: chunk.consortiumId,
              stopId: chunk.stopId,
              stopName: chunk.name ?? '',
              location: { latitude, longitude }
            }
          ],
          center,
          radiusMeters
        )
      );
    }

    return located;
  }

  private loadChunk(consortiumId: number): Promise<readonly DirectoryChunkStopFile[]> {
    const cached = this.cache().get(consortiumId);

    if (cached) {
      return Promise.resolve(cached);
    }

    const pending = this.loading.get(consortiumId);

    if (pending) {
      return pending;
    }

    const url = `${CHUNK_PATH}/consortium-${consortiumId}.json`;
    const request = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            return [] as const;
          }

          throw new Error('ride-stops-index: request failed');
        }

        const payload = (await response.json()) as DirectoryChunkFile;
        const stops = payload.stops ?? [];

        this.cache.update((map) => new Map(map).set(consortiumId, stops));
        this.loading.delete(consortiumId);
        return stops as readonly DirectoryChunkStopFile[];
      })
      .catch(() => {
        this.loading.delete(consortiumId);
        return [] as const;
      });

    this.loading.set(consortiumId, request);
    return request;
  }
}

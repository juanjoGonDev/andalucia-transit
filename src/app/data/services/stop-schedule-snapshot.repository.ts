import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';

import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';

export interface StopScheduleSnapshotRecord {
  readonly metadata: SnapshotMetadata;
  readonly stop: StopScheduleSnapshot;
}

export interface SnapshotMetadata {
  readonly generatedAt: Date;
  readonly timezone: string;
}

export interface StopScheduleSnapshot {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopCode: string;
  readonly stopName: string;
  readonly municipality: string;
  readonly nucleus: string;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly services: readonly StopScheduleSnapshotService[];
  readonly query: {
    readonly requestedAt: Date;
    readonly startTime: Date;
    readonly endTime: Date;
  };
}

export interface StopScheduleSnapshotService {
  readonly lineId: string;
  readonly lineCode: string;
  readonly lineName: string;
  readonly destination: string;
  readonly scheduledTime: Date;
  readonly direction: number;
  readonly stopType: number;
}

interface StopScheduleSnapshotFile {
  readonly metadata: {
    readonly generatedAt: string;
    readonly timezone: string;
  };
  readonly stops: readonly StopScheduleSnapshotEntry[];
}

interface StopScheduleSnapshotEntry {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopCode: string;
  readonly stopName: string;
  readonly municipality: string;
  readonly nucleus: string;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly services: readonly StopScheduleSnapshotServiceEntry[];
  readonly query: {
    readonly requestedAt: string;
    readonly startTime: string;
    readonly endTime: string;
  };
}

interface StopScheduleSnapshotServiceEntry {
  readonly lineId: string;
  readonly lineCode: string;
  readonly lineName: string;
  readonly destination: string;
  readonly scheduledTime: string;
  readonly direction: number;
  readonly stopType: number;
}

interface SnapshotDataset {
  readonly metadata: SnapshotMetadata;
  readonly stopMap: ReadonlyMap<string, StopScheduleSnapshot>;
}

@Injectable({ providedIn: 'root' })
export class StopScheduleSnapshotRepository {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  private readonly dataset$: Observable<SnapshotDataset> = this.http
    .get<StopScheduleSnapshotFile>(this.config.data.snapshots.stopServicesPath)
    .pipe(map((file) => normalizeDataset(file)), shareReplay({ bufferSize: 1, refCount: true }));

  getSnapshotForStop(stopId: string): Observable<StopScheduleSnapshotRecord | null> {
    return this.dataset$.pipe(
      map((dataset) => {
        const stop = dataset.stopMap.get(stopId);
        if (!stop) {
          return null;
        }

        return {
          metadata: dataset.metadata,
          stop
        } satisfies StopScheduleSnapshotRecord;
      })
    );
  }
}

function normalizeDataset(file: StopScheduleSnapshotFile): SnapshotDataset {
  const metadata: SnapshotMetadata = {
    generatedAt: new Date(file.metadata.generatedAt),
    timezone: file.metadata.timezone
  };

  const entries = file.stops.map<readonly [string, StopScheduleSnapshot]>((entry) => [
    entry.stopId,
    {
      consortiumId: entry.consortiumId,
      stopId: entry.stopId,
      stopCode: entry.stopCode,
      stopName: entry.stopName,
      municipality: entry.municipality,
      nucleus: entry.nucleus,
      location: {
        latitude: entry.location.latitude,
        longitude: entry.location.longitude
      },
      services: entry.services.map((service) => ({
        lineId: service.lineId,
        lineCode: service.lineCode,
        lineName: service.lineName,
        destination: service.destination,
        scheduledTime: new Date(service.scheduledTime),
        direction: service.direction,
        stopType: service.stopType
      })),
      query: {
        requestedAt: new Date(entry.query.requestedAt),
        startTime: new Date(entry.query.startTime),
        endTime: new Date(entry.query.endTime)
      }
    } satisfies StopScheduleSnapshot
  ]);

  return {
    metadata,
    stopMap: new Map(entries)
  } satisfies SnapshotDataset;
}

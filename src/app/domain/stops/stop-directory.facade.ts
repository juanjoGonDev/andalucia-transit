import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  StopDirectoryOption,
  StopDirectoryRecord,
  StopDirectoryService,
  StopDirectoryStopSignature,
  StopSearchRequest
} from '@data/stops/stop-directory.service';
import { normalizeRequiredStopNucleus } from '@data/stops/stop-metadata.util';

@Injectable({ providedIn: 'root' })
export class StopDirectoryFacade {
  private readonly directory = inject(StopDirectoryService);

  getOptionByStopId(stopId: string): Observable<StopDirectoryOption | null> {
    return this.directory
      .getOptionByStopId(stopId)
      .pipe(map((option) => (option ? normalizeOption(option) : null)));
  }

  getRecordByStopId(stopId: string): Observable<StopDirectoryRecord | null> {
    return this.directory
      .getStopById(stopId)
      .pipe(map((record) => (record ? normalizeRecord(record) : null)));
  }

  getOptionByStopSignature(
    consortiumId: number,
    stopId: string
  ): Observable<StopDirectoryOption | null> {
    return this.directory
      .getOptionByStopSignature(consortiumId, stopId)
      .pipe(map((option) => (option ? normalizeOption(option) : null)));
  }

  getRecordByStopSignature(
    consortiumId: number,
    stopId: string
  ): Observable<StopDirectoryRecord | null> {
    return this.directory
      .getStopBySignature(consortiumId, stopId)
      .pipe(map((record) => (record ? normalizeRecord(record) : null)));
  }

  searchStops(request: StopSearchRequest): Observable<readonly StopDirectoryOption[]> {
    return this.directory.searchStops(request).pipe(
      map((options) => Object.freeze(options.map((option) => normalizeOption(option))))
    );
  }
}

function normalizeOption(option: StopDirectoryOption): StopDirectoryOption {
  const nucleus = normalizeRequiredStopNucleus(option.nucleus);
  return nucleus === option.nucleus ? option : { ...option, nucleus };
}

function normalizeRecord(record: StopDirectoryRecord): StopDirectoryRecord {
  const nucleus = normalizeRequiredStopNucleus(record.nucleus);
  return nucleus === record.nucleus ? record : { ...record, nucleus };
}

export type {
  StopDirectoryOption,
  StopDirectoryRecord,
  StopDirectoryStopSignature,
  StopSearchRequest
};

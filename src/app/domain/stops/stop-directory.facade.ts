import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  StopDirectoryOption,
  StopDirectoryService,
  StopDirectoryStopSignature,
  StopSearchRequest
} from '../../data/stops/stop-directory.service';

@Injectable({ providedIn: 'root' })
export class StopDirectoryFacade {
  private readonly directory = inject(StopDirectoryService);

  getOptionByStopId(stopId: string): Observable<StopDirectoryOption | null> {
    return this.directory.getOptionByStopId(stopId);
  }

  getOptionByStopSignature(
    consortiumId: number,
    stopId: string
  ): Observable<StopDirectoryOption | null> {
    return this.directory.getOptionByStopSignature(consortiumId, stopId);
  }

  searchStops(request: StopSearchRequest): Observable<readonly StopDirectoryOption[]> {
    return this.directory.searchStops(request);
  }
}

export type {
  StopDirectoryOption,
  StopDirectoryStopSignature,
  StopSearchRequest
};

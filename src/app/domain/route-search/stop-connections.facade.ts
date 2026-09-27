import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  StopConnection,
  StopConnectionsService
} from '@data/route-search/stop-connections.service';
import { StopDirectoryStopSignature } from '@data/stops/stop-directory.service';

@Injectable({ providedIn: 'root' })
export class StopConnectionsFacade {
  private readonly connections = inject(StopConnectionsService);

  getConnections(
    signatures: readonly StopDirectoryStopSignature[]
  ): Observable<ReadonlyMap<string, StopConnection>> {
    return this.connections.getConnections(signatures);
  }
}

export { buildStopConnectionKey } from '@data/route-search/stop-connections.service';

export type {
  StopConnection,
  StopLineSignature
} from '@data/route-search/stop-connections.service';

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  StopConnection,
  StopConnectionDirection,
  StopConnectionsService,
  mergeStopConnectionMaps
} from '../../data/route-search/stop-connections.service';
import { StopDirectoryStopSignature } from '../../data/stops/stop-directory.service';

@Injectable({ providedIn: 'root' })
export class StopConnectionsFacade {
  private readonly connections = inject(StopConnectionsService);

  getConnections(
    signatures: readonly StopDirectoryStopSignature[],
    direction: StopConnectionDirection
  ): Observable<ReadonlyMap<string, StopConnection>> {
    return this.connections.getConnections(signatures, direction);
  }

  mergeConnections(
    maps: readonly ReadonlyMap<string, StopConnection>[]
  ): ReadonlyMap<string, StopConnection> {
    return mergeStopConnectionMaps(maps);
  }
}

export {
  STOP_CONNECTION_DIRECTION,
  buildStopConnectionKey,
  mergeStopConnectionMaps
} from '../../data/route-search/stop-connections.service';

export type {
  StopConnection,
  StopConnectionDirection,
  StopLineSignature
} from '../../data/route-search/stop-connections.service';

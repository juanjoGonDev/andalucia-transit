import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { StopConnectionsService, StopConnection } from './stop-connections.service';
import {
  RouteLineStop,
  RouteLineSummary,
  RouteLinesApiService
} from './route-lines-api.service';
import {
  StopDirectoryRecord,
  StopDirectoryService
} from '../stops/stop-directory.service';

class DirectoryStub {
  private readonly records = new Map<string, StopDirectoryRecord>();

  constructor() {
    this.addRecord(buildRecord('O1', 7));
    this.addRecord(buildRecord('O2', 7));
    this.addRecord(buildRecord('D1', 7));
    this.addRecord(buildRecord('D2', 7));
    this.addRecord(buildRecord('D3', 7));
  }

  getStopById(stopId: string): Observable<StopDirectoryRecord | null> {
    return of(this.records.get(stopId) ?? null);
  }

  private addRecord(record: StopDirectoryRecord): void {
    this.records.set(record.stopId, record);
  }
}

class RouteLinesApiStub {
  private readonly linesByConsortium = new Map<number, RouteLineSummary[]>();
  private readonly lineStops = new Map<string, RouteLineStop[]>();

  constructor() {
    this.setLinesForStops(7, [
      { lineId: 'L1', code: '001', name: 'Alpha Loop', mode: 'bus', priority: 1 }
    ]);

    this.setLineStops(7, 'L1', [
      buildLineStop('O1', 'L1', 0, 1),
      buildLineStop('O2', 'L1', 0, 2),
      buildLineStop('D1', 'L1', 0, 3),
      buildLineStop('D2', 'L1', 0, 4),
      buildLineStop('D3', 'L1', 0, 5),
      buildLineStop('D3', 'L1', 1, 1),
      buildLineStop('D2', 'L1', 1, 2),
      buildLineStop('O2', 'L1', 1, 3),
      buildLineStop('O1', 'L1', 1, 4)
    ]);
  }

  getLinesForStops(
    consortiumId: number,
    stopIds: readonly string[]
  ): Observable<readonly RouteLineSummary[]> {
    return of(this.linesByConsortium.get(consortiumId) ?? []);
  }

  getLineStops(
    consortiumId: number,
    lineId: string
  ): Observable<readonly RouteLineStop[]> {
    const key = this.buildKey(consortiumId, lineId);
    return of(this.lineStops.get(key) ?? []);
  }

    private setLinesForStops(
      consortiumId: number,
      lines: readonly RouteLineSummary[]
    ): void {
      this.linesByConsortium.set(consortiumId, [...lines]);
    }

  private setLineStops(
    consortiumId: number,
    lineId: string,
    stops: readonly RouteLineStop[]
  ): void {
    const key = this.buildKey(consortiumId, lineId);
    this.lineStops.set(key, [...stops]);
  }

  private buildKey(consortiumId: number, lineId: string): string {
    return `${consortiumId}|${lineId}`;
  }
}

describe('StopConnectionsService', () => {
  let service: StopConnectionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StopConnectionsService,
        { provide: StopDirectoryService, useClass: DirectoryStub },
        { provide: RouteLinesApiService, useClass: RouteLinesApiStub }
      ]
    });

    service = TestBed.inject(StopConnectionsService);
  });

  it('returns destinations that appear after each origin in the same line direction', (done) => {
    service.getConnections(['O1', 'O2']).subscribe((connections) => {
      const destinationIds = Array.from(connections.keys()).sort();
      expect(destinationIds).toEqual(['D1', 'D2', 'D3']);

      const d2 = connections.get('D2') as StopConnection;
      expect(d2.originStopIds).toEqual(['O1', 'O2']);
      expect(d2.lineSignatures).toEqual([{ lineId: 'L1', direction: 0 }]);

      const d3 = connections.get('D3') as StopConnection;
      expect(d3.originStopIds).toEqual(['O1', 'O2']);
      expect(d3.lineSignatures).toEqual([{ lineId: 'L1', direction: 0 }]);

      done();
    });
  });

  it('merges matching origins across shared lines while preserving the original order', (done) => {
    service.getConnections(['O2', 'O1']).subscribe((connections) => {
      const d2 = connections.get('D2') as StopConnection;
      expect(d2.originStopIds).toEqual(['O2', 'O1']);
      expect(d2.lineSignatures).toEqual([{ lineId: 'L1', direction: 0 }]);

      done();
    });
  });

  it('returns an empty map when none of the stops resolve to directory entries', (done) => {
    service.getConnections(['UNKNOWN']).subscribe((connections) => {
      expect(connections.size).toBe(0);
      done();
    });
  });
});

function buildRecord(stopId: string, consortiumId: number): StopDirectoryRecord {
  return {
    consortiumId,
    stopId,
    stopCode: stopId,
    name: stopId,
    municipality: 'Town',
    municipalityId: 'mun-town',
    nucleus: 'Center',
    nucleusId: 'nuc-center',
    zone: null,
    location: { latitude: 0, longitude: 0 }
  } satisfies StopDirectoryRecord;
}

function buildLineStop(
  stopId: string,
  lineId: string,
  direction: number,
  order: number
): RouteLineStop {
  return {
    stopId,
    lineId,
    direction,
    order,
    nucleusId: 'nuc',
    zoneId: null,
    latitude: 0,
    longitude: 0,
    name: `${stopId} name`
  } satisfies RouteLineStop;
}

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { StopConnectionsService, StopConnection } from './stop-connections.service';
import {
  StopScheduleSnapshot,
  StopScheduleSnapshotRecord,
  StopScheduleSnapshotRepository
} from '../services/stop-schedule-snapshot.repository';

class SnapshotRepositoryStub {
  private readonly dataset = new Map<string, StopScheduleSnapshot>();
  private readonly metadata = {
    generatedAt: new Date('2025-02-01T05:00:00.000Z'),
    timezone: 'Europe/Madrid'
  } as const;

  constructor() {
    this.addStop({
      stopId: 'A1',
      consortiumId: 7,
      municipalityId: 'mun-a',
      municipality: 'Town',
      nucleusId: 'nuc-a',
      nucleus: 'Town Center',
      services: [
        buildService('L1', 0),
        buildService('L2', 1)
      ]
    });
    this.addStop({
      stopId: 'A2',
      consortiumId: 7,
      municipalityId: 'mun-a',
      municipality: 'Town',
      nucleusId: 'nuc-a',
      nucleus: 'Town Center',
      services: [buildService('L1', 0)]
    });
    this.addStop({
      stopId: 'B1',
      consortiumId: 7,
      municipalityId: 'mun-a',
      municipality: 'Town',
      nucleusId: 'nuc-b',
      nucleus: 'Town East',
      services: [buildService('L1', 0)]
    });
    this.addStop({
      stopId: 'B2',
      consortiumId: 7,
      municipalityId: 'mun-a',
      municipality: 'Town',
      nucleusId: 'nuc-b',
      nucleus: 'Town East',
      services: [buildService('L2', 1)]
    });
    this.addStop({
      stopId: 'C1',
      consortiumId: 9,
      municipalityId: 'mun-c',
      municipality: 'Other',
      nucleusId: 'nuc-c',
      nucleus: 'Other Center',
      services: [buildService('L1', 0)]
    });
  }

  getSnapshotForStop(stopId: string) {
    const stop = this.dataset.get(stopId);
    if (!stop) {
      return of(null);
    }
    return of({ metadata: this.metadata, stop } satisfies StopScheduleSnapshotRecord);
  }

  getAllStops() {
    return of(new Map(this.dataset));
  }

  private addStop(entry: {
    stopId: string;
    consortiumId: number;
    municipalityId: string;
    municipality: string;
    nucleusId: string;
    nucleus: string;
    services: readonly { lineId: string; direction: number }[];
  }): void {
    const stop: StopScheduleSnapshot = {
      consortiumId: entry.consortiumId,
      stopId: entry.stopId,
      stopCode: entry.stopId,
      stopName: entry.stopId,
      municipality: entry.municipality,
      nucleus: entry.nucleus,
      location: { latitude: 0, longitude: 0 },
      services: entry.services.map((service) => ({
        lineId: service.lineId,
        lineCode: service.lineId,
        lineName: service.lineId,
        destination: 'Destination',
        scheduledTime: new Date('2025-02-01T06:00:00.000Z'),
        direction: service.direction,
        stopType: 0
      })),
      query: {
        requestedAt: new Date('2025-02-01T04:00:00.000Z'),
        startTime: new Date('2025-02-01T05:00:00.000Z'),
        endTime: new Date('2025-02-01T07:00:00.000Z')
      }
    };

    this.dataset.set(entry.stopId, stop);
  }
}

describe('StopConnectionsService', () => {
  let service: StopConnectionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StopConnectionsService,
        { provide: StopScheduleSnapshotRepository, useClass: SnapshotRepositoryStub }
      ]
    });

    service = TestBed.inject(StopConnectionsService);
  });

  it('lists destination stops sharing any line direction with the origin group', (done) => {
    service.getConnections(['A1', 'A2']).subscribe((connections) => {
      const destinationIds = Array.from(connections.keys()).sort();
      expect(destinationIds).toEqual(['B1', 'B2']);

      const b1 = connections.get('B1') as StopConnection;
      expect(b1.originStopIds.slice().sort()).toEqual(['A1', 'A2']);
      expect(b1.lineSignatures).toEqual([{ lineId: 'L1', direction: 0 }]);

      const b2 = connections.get('B2') as StopConnection;
      expect(b2.originStopIds).toEqual(['A1']);
      expect(b2.lineSignatures).toEqual([{ lineId: 'L2', direction: 1 }]);

      done();
    });
  });

  it('returns an empty map when no shared lines exist', (done) => {
    service.getConnections(['C1']).subscribe((connections) => {
      expect(connections.size).toBe(0);
      done();
    });
  });
});

function buildService(lineId: string, direction: number) {
  return { lineId, direction } as const;
}

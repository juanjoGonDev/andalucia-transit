import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StopScheduleService } from '@data/services/stop-schedule.service';
import { RideDirectionSourceService } from './ride-direction-source.service';

class StopScheduleStub {
  getStopSchedule = jasmine.createSpy('getStopSchedule').and.returnValue(
    of({
      schedule: {
        services: [
          {
            lineId: 'L1',
            lineCode: 'M-101',
            direction: 1,
            destination: 'Centro',
            arrivalTime: new Date(Date.now() + 10 * 60_000),
            isAccessible: true,
            isUniversityOnly: false,
            serviceId: 'a',
          },
          {
            lineId: 'L2',
            lineCode: 'M-205',
            direction: 0,
            destination: 'Norte',
            arrivalTime: new Date(Date.now() + 90 * 60_000),
            isAccessible: true,
            isUniversityOnly: false,
            serviceId: 'b',
          },
          {
            lineId: 'L3',
            lineCode: 'M-303',
            direction: 1,
            destination: 'Sur',
            arrivalTime: new Date(Date.now() - 20 * 60_000),
            isAccessible: true,
            isUniversityOnly: false,
            serviceId: 'c',
          },
          {
            lineId: 'L4',
            lineCode: 'M-404',
            direction: 1,
            destination: 'Oeste',
            arrivalTime: new Date(Date.now() - 40 * 60_000),
            isAccessible: true,
            isUniversityOnly: false,
            serviceId: 'd',
          },
        ],
      },
    }),
  );
}

describe('RideDirectionSourceService', () => {
  let service: RideDirectionSourceService;
  let schedule: StopScheduleStub;

  beforeEach(() => {
    schedule = new StopScheduleStub();
    TestBed.configureTestingModule({
      providers: [{ provide: StopScheduleService, useValue: schedule }],
    });
    service = TestBed.inject(RideDirectionSourceService);
  });

  it('maps upcoming and recently departed services into direction candidates', async () => {
    const candidates = await service.fetchDirections({
      consortiumId: 3,
      stopId: '10',
      stopName: 'Parada',
      location: { latitude: 36.7, longitude: -4.36 },
      distanceMeters: 12,
    });

    expect(schedule.getStopSchedule).toHaveBeenCalledWith('10', { consortiumId: 3 });
    // A service that departed 20 minutes ago still counts (late buses), one from 40
    // minutes ago or 90 minutes ahead does not.
    expect(candidates.map((candidate) => candidate.lineCode)).toEqual(['M-101', 'M-303']);
  });

  it('returns an empty list when the API fails', async () => {
    schedule.getStopSchedule.and.returnValue(throwError(() => new Error('offline')));

    const candidates = await service.fetchDirections({
      consortiumId: 3,
      stopId: '10',
      stopName: 'Parada',
      location: { latitude: 36.7, longitude: -4.36 },
      distanceMeters: 12,
    });

    expect(candidates.length).toBe(0);
  });
});

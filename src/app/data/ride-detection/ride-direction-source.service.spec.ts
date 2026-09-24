import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StopScheduleService } from '@data/services/stop-schedule.service';
import { RideDirectionSourceService } from './ride-direction-source.service';

class StopScheduleStub {
  getStopSchedule = jasmine
    .createSpy('getStopSchedule')
    .and.returnValue(
      of({
        schedule: { services: [
          {
            lineId: 'L1',
            lineCode: 'M-101',
            direction: 1,
            destination: 'Centro',
            arrivalTime: new Date(Date.now() + 10 * 60_000),
            isAccessible: true,
            isUniversityOnly: false,
            serviceId: 'a'
          },
          {
            lineId: 'L2',
            lineCode: 'M-205',
            direction: 0,
            destination: 'Norte',
            arrivalTime: new Date(Date.now() + 90 * 60_000),
            isAccessible: true,
            isUniversityOnly: false,
            serviceId: 'b'
          }
        ] }
      })
    );
}

describe('RideDirectionSourceService', () => {
  let service: RideDirectionSourceService;
  let schedule: StopScheduleStub;

  beforeEach(() => {
    schedule = new StopScheduleStub();
    TestBed.configureTestingModule({
      providers: [{ provide: StopScheduleService, useValue: schedule }]
    });
    service = TestBed.inject(RideDirectionSourceService);
  });

  it('maps upcoming services into direction candidates', async () => {
    const candidates = await service.fetchDirections({
      consortiumId: 3,
      stopId: '10',
      stopName: 'Parada',
      location: { latitude: 36.7, longitude: -4.36 },
      distanceMeters: 12
    });

    expect(schedule.getStopSchedule).toHaveBeenCalledWith('10', { consortiumId: 3 });
    expect(candidates.length).toBe(1);
    expect(candidates[0]?.lineCode).toBe('M-101');
  });

  it('returns an empty list when the API fails', async () => {
    schedule.getStopSchedule.and.returnValue(throwError(() => new Error('offline')));

    const candidates = await service.fetchDirections({
      consortiumId: 3,
      stopId: '10',
      stopName: 'Parada',
      location: { latitude: 36.7, longitude: -4.36 },
      distanceMeters: 12
    });

    expect(candidates.length).toBe(0);
  });
});

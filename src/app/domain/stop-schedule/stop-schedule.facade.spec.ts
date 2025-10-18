import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { StopScheduleResult } from './stop-schedule.model';
import { StopScheduleFacade } from './stop-schedule.facade';
import { StopScheduleService } from '../../data/services/stop-schedule.service';

describe('StopScheduleFacade', () => {
  let facade: StopScheduleFacade;
  let service: jasmine.SpyObj<StopScheduleService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<StopScheduleService>('StopScheduleService', ['getStopSchedule']);
    service.getStopSchedule.and.returnValue(of(createResult()));

    TestBed.configureTestingModule({
      providers: [{ provide: StopScheduleService, useValue: service }]
    });

    facade = TestBed.inject(StopScheduleFacade);
  });

  it('loads stop schedules through the data service', () => {
    const queryDate = new Date('2025-10-16T00:00:00Z');

    facade.loadStopSchedule('stop-identifier', { queryDate }).subscribe();

    expect(service.getStopSchedule).toHaveBeenCalledWith('stop-identifier', { queryDate });
  });

  it('loads stop schedules without options when none are provided', () => {
    facade.loadStopSchedule('stop-identifier').subscribe();

    expect(service.getStopSchedule).toHaveBeenCalledWith('stop-identifier', undefined);
  });
});

function createResult(): StopScheduleResult {
  const now = new Date();

  return {
    schedule: {
      stopId: 'stop-identifier',
      stopCode: '1234',
      stopName: 'Test Stop',
      queryDate: now,
      generatedAt: now,
      services: []
    },
    dataSource: {
      type: 'api',
      providerName: 'Test Provider',
      queryTime: now,
      snapshotTime: null
    }
  };
}

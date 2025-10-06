import { StopSchedule, StopScheduleResult } from './stop-schedule.model';
import { buildStopScheduleUiModel } from './stop-schedule.transform';
import { addMinutesToDate, startOfMinute } from '../utils/time.util';

describe('buildStopScheduleUiModel', () => {
  it('classifies services into upcoming and past buckets', () => {
    const now = startOfMinute(new Date('2024-05-01T10:00:00Z'));
    const schedule = createSchedule(now, [-10, 5, -2]);
    const result = buildStopScheduleUiModel(createResult(schedule), now, null);

    expect(result.upcoming.length).toBe(1);
    expect(result.past.length).toBe(2);
    expect(result.upcoming[0].minutesUntilArrival).toBe(5);
    expect(result.past[0].minutesSinceDeparture).toBe(2);
  });

  it('marks the earliest upcoming service as next', () => {
    const now = startOfMinute(new Date('2024-05-01T10:00:00Z'));
    const schedule = createSchedule(now, [3, 7, 12]);
    const result = buildStopScheduleUiModel(createResult(schedule), now, null);

    expect(result.upcoming[0].isNext).toBeTrue();
    expect(result.upcoming[1].isNext).toBeFalse();
  });

  it('filters services by destination', () => {
    const now = startOfMinute(new Date('2024-05-01T10:00:00Z'));
    const schedule: StopSchedule = {
      stopId: 'test-stop',
      stopCode: '1001',
      stopName: 'Test Stop',
      queryDate: now,
      generatedAt: now,
      services: [
        {
          serviceId: 'a',
          lineCode: 'L1',
          destination: 'North Campus',
          arrivalTime: addMinutesToDate(now, 5),
          isAccessible: true,
          isUniversityOnly: false
        },
        {
          serviceId: 'b',
          lineCode: 'L2',
          destination: 'City Center',
          arrivalTime: addMinutesToDate(now, 8),
          isAccessible: false,
          isUniversityOnly: true
        }
      ]
    };

    const result = buildStopScheduleUiModel(createResult(schedule), now, 'North Campus');

    expect(result.upcoming.length).toBe(1);
    expect(result.upcoming[0].destination).toBe('North Campus');
  });
});

function createSchedule(reference: Date, offsets: readonly number[]): StopSchedule {
  return {
    stopId: 'test-stop',
    stopCode: '1001',
    stopName: 'Test Stop',
    queryDate: reference,
    generatedAt: reference,
    services: offsets.map((offset, index) => createService(reference, offset, index))
  };
}

function createResult(schedule: StopSchedule): StopScheduleResult {
  return {
    schedule,
    dataSource: {
      type: 'api',
      providerName: 'Test Provider',
      queryTime: schedule.queryDate,
      snapshotTime: null
    }
  };
}

function createService(reference: Date, offset: number, index: number): StopSchedule['services'][number] {
  const arrival = addMinutesToDate(reference, offset);

  return {
    serviceId: `service-${index}`,
    lineCode: `L${index + 1}`,
    destination: `Destination ${index}`,
    arrivalTime: arrival,
    isAccessible: index % 2 === 0,
    isUniversityOnly: index % 2 === 1
  };
}

import {
  StopAlarm,
  advanceRepeatTrigger,
  buildStopAlarmId,
  computeNextTriggerAt,
  isAlarmTargetInThePast,
  splitStopAlarmId
} from './stop-alarm.model';

const MINUTES = 60_000;
const DAYS = 24 * 60 * MINUTES;

const BASE_ALARM: StopAlarm = {
  id: 'stop-1::service-1',
  stopId: 'stop-1',
  consortiumId: 4,
  stopName: 'Calle Principal',
  lineCode: 'M-101',
  destination: 'Centro',
  scheduledArrival: new Date(10 * DAYS + 60 * MINUTES).toISOString(),
  offsetMinutes: 10,
  repeatDaily: false,
  createdAt: new Date(0).toISOString()
};

describe('stop-alarm.model', () => {
  describe('buildStopAlarmId / splitStopAlarmId', () => {
    it('round-trips stop and service identifiers', () => {
      const id = buildStopAlarmId('stop-1', 'service-1');

      expect(splitStopAlarmId(id)).toEqual({ stopId: 'stop-1', serviceId: 'service-1' });
    });

    it('rejects malformed identifiers', () => {
      expect(splitStopAlarmId('invalid')).toBeNull();
      expect(splitStopAlarmId('::service')).toBeNull();
      expect(splitStopAlarmId('stop::')).toBeNull();
    });
  });

  describe('computeNextTriggerAt', () => {
    it('returns the arrival minus the offset for one-shot alarms in the future', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const now = 9 * DAYS;

      const next = computeNextTriggerAt(BASE_ALARM, { now, maxRepeatDays: 30 });

      expect(next).toBe(arrival - 10 * MINUTES);
    });

    it('returns null when a one-shot trigger already elapsed', () => {
      const now = 10 * DAYS + 60 * MINUTES;

      expect(computeNextTriggerAt(BASE_ALARM, { now, maxRepeatDays: 30 })).toBeNull();
    });

    it('keeps one-shot triggers elapsed within the grace window as pending', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const trigger = arrival - 10 * MINUTES;
      const now = trigger + 30_000;

      const next = computeNextTriggerAt(BASE_ALARM, {
        now,
        maxRepeatDays: 30,
        graceMs: 2 * MINUTES
      });

      expect(next).toBe(trigger);
    });

    it('rolls repeating alarms forward day by day until they are pending', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const now = arrival + 2 * DAYS;

      const next = computeNextTriggerAt(
        { ...BASE_ALARM, repeatDaily: true },
        { now, maxRepeatDays: 30 }
      );

      expect(next).toBe(arrival - 10 * MINUTES + 3 * DAYS);
    });

    it('keeps repeating triggers elapsed within the grace window as pending', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const trigger = arrival - 10 * MINUTES;
      const now = trigger + 90_000;

      const next = computeNextTriggerAt({ ...BASE_ALARM, repeatDaily: true }, {
        now,
        maxRepeatDays: 30,
        graceMs: 2 * MINUTES
      });

      expect(next).toBe(trigger);
    });

    it('expires repeating alarms beyond the configured repeat window', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const now = arrival + 31 * DAYS;

      expect(
        computeNextTriggerAt({ ...BASE_ALARM, repeatDaily: true }, { now, maxRepeatDays: 30 })
      ).toBeNull();
    });
  });

  describe('advanceRepeatTrigger', () => {
    it('schedules the next ring exactly one day after the fired trigger', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const firedAt = arrival - 10 * MINUTES;
      const alarm = { ...BASE_ALARM, repeatDaily: true };

      const next = advanceRepeatTrigger(alarm, firedAt, {
        now: firedAt + MINUTES,
        maxRepeatDays: 30
      });

      expect(next).toBe(firedAt + DAYS);
    });

    it('expires when the next slot exceeds the repeat window', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const firedAt = arrival - 10 * MINUTES + 30 * DAYS;
      const alarm = { ...BASE_ALARM, repeatDaily: true };

      const next = advanceRepeatTrigger(alarm, firedAt, {
        now: firedAt + MINUTES,
        maxRepeatDays: 30
      });

      expect(next).toBeNull();
    });
  });

  describe('isAlarmTargetInThePast', () => {
    it('flags alarms whose trigger would not be in the future', () => {
      const arrivalMs = Date.parse(BASE_ALARM.scheduledArrival);

      expect(
        isAlarmTargetInThePast(BASE_ALARM.scheduledArrival, 10, arrivalMs - 11 * MINUTES)
      ).toBe(false);
      expect(
        isAlarmTargetInThePast(BASE_ALARM.scheduledArrival, 10, arrivalMs - 9 * MINUTES)
      ).toBe(true);
    });
  });
});

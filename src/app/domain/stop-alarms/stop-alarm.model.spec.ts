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
  repeatWeekdays: [],
  enabled: true,
  createdAt: new Date(0).toISOString()
};

function weekdayOf(epochMs: number): number {
  return new Date(epochMs).getDay();
}

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

    it('rolls a weekly alarm to its next selected weekday', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const trigger = arrival - 10 * MINUTES;
      const now = trigger + 2 * DAYS;

      const next = computeNextTriggerAt(
        { ...BASE_ALARM, repeatWeekdays: [weekdayOf(trigger)] },
        { now, maxRepeatDays: 30 }
      );

      expect(next).toBe(trigger + 7 * DAYS);
    });

    it('picks the soonest selected weekday when several are configured', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const trigger = arrival - 10 * MINUTES;
      const now = trigger + 2 * DAYS;
      const triggerDay = weekdayOf(trigger);

      const next = computeNextTriggerAt(
        {
          ...BASE_ALARM,
          repeatWeekdays: [(triggerDay + 3) % 7, (triggerDay + 6) % 7]
        },
        { now, maxRepeatDays: 30 }
      );

      expect(next).toBe(trigger + 3 * DAYS);
    });

    it('fires the same day when the trigger time has not passed yet', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const trigger = arrival - 10 * MINUTES;
      const now = trigger - 30_000;

      const next = computeNextTriggerAt(
        { ...BASE_ALARM, repeatWeekdays: [weekdayOf(trigger)] },
        { now, maxRepeatDays: 30 }
      );

      expect(next).toBe(trigger);
    });

    it('keeps recurring triggers elapsed within the grace window as pending', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const trigger = arrival - 10 * MINUTES;
      const now = trigger + 90_000;

      const next = computeNextTriggerAt(
        { ...BASE_ALARM, repeatWeekdays: [weekdayOf(trigger)] },
        {
          now,
          maxRepeatDays: 30,
          graceMs: 2 * MINUTES
        }
      );

      expect(next).toBe(trigger);
    });

    it('expires recurring alarms beyond the configured repeat window', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const trigger = arrival - 10 * MINUTES;
      const now = trigger + 31 * DAYS;

      const next = computeNextTriggerAt(
        { ...BASE_ALARM, repeatWeekdays: [weekdayOf(trigger)] },
        { now, maxRepeatDays: 30 }
      );

      expect(next).toBeNull();
    });
  });

  describe('advanceRepeatTrigger', () => {
    it('returns null for one-shot alarms', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const fired = arrival - 10 * MINUTES;

      const next = advanceRepeatTrigger(BASE_ALARM, fired, {
        now: fired,
        maxRepeatDays: 30
      });

      expect(next).toBeNull();
    });

    it('advances a weekly alarm to the next selected weekday after firing', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const fired = arrival - 10 * MINUTES;
      const firedDay = weekdayOf(fired);

      const next = advanceRepeatTrigger(
        { ...BASE_ALARM, repeatWeekdays: [firedDay] },
        fired,
        { now: fired + 5 * MINUTES, maxRepeatDays: 30 }
      );

      expect(next).toBe(fired + 7 * DAYS);
    });

    it('advances past unselected weekdays until a selected one matches', () => {
      const arrival = 10 * DAYS + 60 * MINUTES;
      const fired = arrival - 10 * MINUTES;
      const firedDay = weekdayOf(fired);

      const next = advanceRepeatTrigger(
        { ...BASE_ALARM, repeatWeekdays: [(firedDay + 2) % 7] },
        fired,
        { now: fired + 5 * MINUTES, maxRepeatDays: 30 }
      );

      expect(next).toBe(fired + 2 * DAYS);
    });
  });

  describe('isAlarmTargetInThePast', () => {
    it('flags a trigger that would already have fired', () => {
      const now = Date.now();

      expect(isAlarmTargetInThePast(new Date(now - MINUTES).toISOString(), 10, now)).toBeTrue();
    });
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FIXED_VISUAL_TIME_ISO,
  buildExactNewsList,
  buildExactStopServicesSnapshot,
  selectVisualStopDetailEntry,
} from './exact-visual-data';

function sourceSnapshot(stopId: string, stopName: string, scheduledTime: string): unknown {
  return {
    metadata: { generatedAt: scheduledTime },
    stops: [
      {
        consortiumId: 1,
        stopId,
        stopName,
        services: [{ scheduledTime }],
      },
    ],
  };
}

test('exact Stop Detail selection is independent from refreshed snapshot contents', () => {
  const first = sourceSnapshot('first-live-stop', 'FIRST LIVE STOP', '2026-08-30T10:00:00.000Z');
  const second = sourceSnapshot('second-live-stop', 'SECOND LIVE STOP', '2026-08-31T18:30:00.000Z');

  const exactFirst = selectVisualStopDetailEntry(first, true);
  const exactSecond = selectVisualStopDetailEntry(second, true);

  assert.deepEqual(exactFirst, exactSecond);
  assert.equal(exactFirst?.stopId, '2528');
  assert.equal(exactFirst?.stopName, 'ACEITES LA ESPANOLA');

  assert.equal(selectVisualStopDetailEntry(first, false)?.stopId, 'first-live-stop');
  assert.equal(selectVisualStopDetailEntry(second, false)?.stopId, 'second-live-stop');
});

test('canonical Stop Detail fixture is internally time-stable and returns fresh data', () => {
  const first = buildExactStopServicesSnapshot();
  const second = buildExactStopServicesSnapshot();

  assert.deepEqual(first, second);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.stops, second.stops);

  const stop = first.stops[0];
  assert.ok(stop);
  assert.equal(stop.services.length, 2);

  const fixedTime = Date.parse(FIXED_VISUAL_TIME_ISO);
  const scheduledTimes = stop.services.map((service) => {
    assert.equal(typeof service, 'object');
    assert.ok(service);
    return Date.parse(String((service as { scheduledTime?: unknown }).scheduledTime));
  });

  assert.ok(scheduledTimes.some((scheduledTime) => scheduledTime < fixedTime));
  assert.ok(scheduledTimes.some((scheduledTime) => scheduledTime > fixedTime));
});

test('canonical News feed is stable across exact renders', () => {
  const firstAlmeria = buildExactNewsList(6);
  const secondAlmeria = buildExactNewsList(6);
  const huelva = buildExactNewsList(9);

  assert.deepEqual(firstAlmeria, secondAlmeria);
  assert.notStrictEqual(firstAlmeria, secondAlmeria);
  assert.equal(firstAlmeria.length, 11);
  assert.equal(huelva.length, 2);
  assert.deepEqual(buildExactNewsList(1), []);
});

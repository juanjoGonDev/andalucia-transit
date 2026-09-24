import {
  STOP_FOCUS_MAX_ZOOM,
  STOP_FOCUS_MIN_ZOOM,
  STOP_FOCUS_TARGET_ZOOM,
  resolveStopFocusZoom
} from '@shared/map/map-stop-focus.util';

describe('resolveStopFocusZoom (E6 adaptive medium zoom)', () => {
  it('zooms in to the medium target when the view is too far out', () => {
    expect(resolveStopFocusZoom(13)).toBe(STOP_FOCUS_TARGET_ZOOM);
    expect(resolveStopFocusZoom(14.4)).toBe(STOP_FOCUS_TARGET_ZOOM);
  });

  it('zooms out to the medium target when the view is too close', () => {
    expect(resolveStopFocusZoom(17)).toBe(STOP_FOCUS_TARGET_ZOOM);
    expect(resolveStopFocusZoom(16.6)).toBe(STOP_FOCUS_TARGET_ZOOM);
  });

  it('keeps the current zoom when it already sits inside the comfort band', () => {
    expect(resolveStopFocusZoom(STOP_FOCUS_MIN_ZOOM)).toBe(STOP_FOCUS_MIN_ZOOM);
    expect(resolveStopFocusZoom(STOP_FOCUS_MAX_ZOOM)).toBe(STOP_FOCUS_MAX_ZOOM);
    expect(resolveStopFocusZoom(15.5)).toBe(15.5);
  });

  it('exposes a readable band around the target', () => {
    expect(STOP_FOCUS_MIN_ZOOM).toBeLessThan(STOP_FOCUS_TARGET_ZOOM);
    expect(STOP_FOCUS_TARGET_ZOOM).toBeLessThan(STOP_FOCUS_MAX_ZOOM);
    expect(STOP_FOCUS_MAX_ZOOM - STOP_FOCUS_MIN_ZOOM).toBeGreaterThan(0);
  });
});

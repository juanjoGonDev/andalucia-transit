/**
 * Adaptive focus band for stop-centered maps (E6): re-centering smoothly also
 * eases the zoom toward a medium, readable level — zooming in when the map is
 * too far out, zooming out when it is too close — while leaving the zoom alone
 * when it already sits inside the comfort band.
 */
export const STOP_FOCUS_MIN_ZOOM = 14.5;
export const STOP_FOCUS_MAX_ZOOM = 16.5;
export const STOP_FOCUS_TARGET_ZOOM = 15.5;

export function stopFocusZoomKeepsCurrent(zoom: number): boolean {
  return zoom >= STOP_FOCUS_MIN_ZOOM && zoom <= STOP_FOCUS_MAX_ZOOM;
}

export function resolveStopFocusZoom(currentZoom: number): number {
  return stopFocusZoomKeepsCurrent(currentZoom) ? currentZoom : STOP_FOCUS_TARGET_ZOOM;
}

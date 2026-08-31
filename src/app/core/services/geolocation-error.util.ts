import { APP_CONFIG } from '@core/config';

export type GeolocationFailureKind =
  | 'notSupported'
  | 'permissionDenied'
  | 'positionUnavailable'
  | 'timeout'
  | 'unknown';

const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_POSITION_UNAVAILABLE = 2;
const GEOLOCATION_TIMEOUT = 3;

interface PositionErrorLike {
  readonly code: number;
}

const isPositionErrorLike = (error: unknown): error is PositionErrorLike => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return typeof (error as PositionErrorLike).code === 'number';
};

export const classifyGeolocationError = (error: unknown): GeolocationFailureKind => {
  if (error instanceof Error && error.message === APP_CONFIG.errors.geolocationNotSupported) {
    return 'notSupported';
  }

  if (!isPositionErrorLike(error)) {
    return 'unknown';
  }

  switch (error.code) {
    case GEOLOCATION_PERMISSION_DENIED:
      return 'permissionDenied';
    case GEOLOCATION_POSITION_UNAVAILABLE:
      return 'positionUnavailable';
    case GEOLOCATION_TIMEOUT:
      return 'timeout';
    default:
      return 'unknown';
  }
};

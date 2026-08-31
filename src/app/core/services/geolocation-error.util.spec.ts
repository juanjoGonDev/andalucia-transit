import { APP_CONFIG } from '@core/config';
import { classifyGeolocationError } from '@core/services/geolocation-error.util';

describe('classifyGeolocationError', () => {
  it('classifies unsupported geolocation errors', () => {
    expect(classifyGeolocationError(new Error(APP_CONFIG.errors.geolocationNotSupported))).toBe(
      'notSupported'
    );
  });

  it('classifies browser position error codes', () => {
    expect(classifyGeolocationError({ code: 1 })).toBe('permissionDenied');
    expect(classifyGeolocationError({ code: 2 })).toBe('positionUnavailable');
    expect(classifyGeolocationError({ code: 3 })).toBe('timeout');
  });

  it('falls back to unknown for unsupported shapes and codes', () => {
    expect(classifyGeolocationError({ code: 999 })).toBe('unknown');
    expect(classifyGeolocationError(new Error('boom'))).toBe('unknown');
    expect(classifyGeolocationError(null)).toBe('unknown');
  });
});

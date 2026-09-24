import { GeolocationService } from './geolocation.service';

describe('GeolocationService', () => {
  const service = new GeolocationService();

  function buildPosition(latitude: number): GeolocationPosition {
    return {
      coords: {
        latitude,
        longitude: -2.0,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    } as GeolocationPosition;
  }

  it('watches position updates until stopped', () => {
    const holder: { success?: (position: GeolocationPosition) => void } = {};
    const watchSpy = spyOn(navigator.geolocation, 'watchPosition').and.callFake(
      (success) => {
        holder.success = success;
        return 42;
      }
    );
    const clearSpy = spyOn(navigator.geolocation, 'clearWatch');

    const positions: number[] = [];
    const stop = service.watchPosition((position) => positions.push(position.coords.latitude), undefined, {
      enableHighAccuracy: true
    });

    holder.success?.(buildPosition(36.9));
    holder.success?.(buildPosition(37.0));

    expect(watchSpy).toHaveBeenCalledTimes(1);
    expect(positions).toEqual([36.9, 37.0]);

    stop();
    expect(clearSpy).toHaveBeenCalledWith(42);
  });

  it('forwards geolocation errors to the error callback', () => {
    const holder: { error?: (error: GeolocationPositionError) => void } = {};
    spyOn(navigator.geolocation, 'watchPosition').and.callFake(
      (_success, error) => {
        holder.error = error ?? undefined;
        return 7;
      }
    );
    spyOn(navigator.geolocation, 'clearWatch');

    const errors: string[] = [];
    const stop = service.watchPosition(
      () => undefined,
      (error) => errors.push(error.message)
    );

    holder.error?.({ code: 1, message: 'denied' } as GeolocationPositionError);
    expect(errors).toEqual(['denied']);
    stop();
  });
});

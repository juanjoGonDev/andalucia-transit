import { Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    if (!navigator.geolocation) {
      throw new Error(APP_CONFIG.errors.geolocationNotSupported);
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  /**
   * Watches the device position and reports every movement. Returns a stop function that
   * clears the watch; designed for high-accuracy live tracking sessions.
   */
  watchPosition(
    onPosition: (position: GeolocationPosition) => void,
    onError?: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): () => void {
    if (!navigator.geolocation) {
      throw new Error(APP_CONFIG.errors.geolocationNotSupported);
    }

    const watchId = navigator.geolocation.watchPosition(onPosition, onError, options);
    return () => navigator.geolocation.clearWatch(watchId);
  }
}

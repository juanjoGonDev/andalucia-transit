import { Injectable } from '@angular/core';
import { APP_CONFIG } from '../config';

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
}

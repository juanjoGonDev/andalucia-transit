import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';
import { GeolocationService } from '../../core/services/geolocation.service';
import { NearbyStopsService, NearbyStopResult } from '../../core/services/nearby-stops.service';
import { GeoCoordinate } from '../../domain/utils/geo-distance.util';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';

type NearbyDialogState = 'loading' | 'success' | 'permissionDenied' | 'notSupported' | 'unknown';

interface NearbyStopViewModel {
  id: string;
  titleKey: string;
  distanceKey: string;
  distanceValue: string;
}

const METERS_IN_KILOMETER = 1_000;
const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_POSITION_UNAVAILABLE = 2;
const GEOLOCATION_TIMEOUT = 3;
const GEOLOCATION_TIMEOUT_MS = 10_000;
const GEOLOCATION_MAXIMUM_AGE_MS = 0;
const KILOMETER_DECIMALS = 1;
const METER_DECIMALS = 0;

@Component({
  selector: 'app-home-nearby-stops-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './home-nearby-stops-dialog.component.html',
  styleUrl: './home-nearby-stops-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeNearbyStopsDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<HomeNearbyStopsDialogComponent>);
  private readonly geolocationService = inject(GeolocationService);
  private readonly nearbyStopsService = inject(NearbyStopsService);
  private readonly translation = APP_CONFIG.translationKeys.home.dialogs.nearbyStops;
  private readonly notSupportedMessage = APP_CONFIG.errors.geolocationNotSupported;
  private readonly metersPerKilometer = METERS_IN_KILOMETER;

  protected readonly titleKey = this.translation.title;
  protected readonly descriptionKey = this.translation.description;
  protected readonly loadingKey = this.translation.loading;
  protected readonly permissionDeniedKey = this.translation.permissionDenied;
  protected readonly notSupportedKey = this.translation.notSupported;
  protected readonly unknownErrorKey = this.translation.unknownError;
  protected readonly emptyKey = this.translation.empty;
  protected readonly retryKey = this.translation.retry;
  protected readonly closeKey = this.translation.close;
  protected readonly stopIcon: MaterialSymbolName = 'pin_drop';

  protected state: NearbyDialogState = 'loading';
  protected stops: readonly NearbyStopViewModel[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadNearbyStops();
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async retry(): Promise<void> {
    await this.loadNearbyStops();
  }

  protected get isLoading(): boolean {
    return this.state === 'loading';
  }

  private async loadNearbyStops(): Promise<void> {
    this.state = 'loading';

    try {
      const position = await this.geolocationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAXIMUM_AGE_MS
      });
      const coordinates: GeoCoordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      const results = this.nearbyStopsService.findClosestStops(coordinates);
      this.stops = results.map((stop) => this.buildViewModel(stop));
      this.state = 'success';
    } catch (error) {
      this.state = this.mapError(error);
      this.stops = [];
    }
  }

  private buildViewModel(stop: NearbyStopResult): NearbyStopViewModel {
    const isKilometers = stop.distanceInMeters >= this.metersPerKilometer;
    const distanceKey = isKilometers ? this.translation.distance.kilometers : this.translation.distance.meters;
    const fractionDigits = isKilometers ? KILOMETER_DECIMALS : METER_DECIMALS;
    const formattedValue = this.formatDistanceValue(
      isKilometers ? stop.distanceInMeters / this.metersPerKilometer : stop.distanceInMeters,
      fractionDigits
    );

    return {
      id: stop.id,
      titleKey: stop.titleKey,
      distanceKey,
      distanceValue: formattedValue
    };
  }

  private formatDistanceValue(distance: number, fractionDigits: number): string {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(distance);
  }

  private mapError(error: unknown): NearbyDialogState {
    if (error instanceof Error && error.message === this.notSupportedMessage) {
      return 'notSupported';
    }

    if (this.isGeolocationError(error)) {
      if (error.code === GEOLOCATION_PERMISSION_DENIED) {
        return 'permissionDenied';
      }

      if (error.code === GEOLOCATION_POSITION_UNAVAILABLE || error.code === GEOLOCATION_TIMEOUT) {
        return 'unknown';
      }
    }

    return 'unknown';
  }

  private isGeolocationError(error: unknown): error is GeolocationPositionError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as GeolocationPositionError).code === 'number'
    );
  }
}

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { APP_CONFIG } from '../../core/config';
import { GeolocationService } from '../../core/services/geolocation.service';
import { NearbyStopsService } from '../../core/services/nearby-stops.service';
import { GeoCoordinate } from '../../domain/utils/geo-distance.util';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import { GEOLOCATION_REQUEST_OPTIONS } from '../../core/services/geolocation-request.options';
import { NearbyStopOptionsService, NearbyStopOption } from '../../core/services/nearby-stop-options.service';
import { buildDistanceDisplay } from '../../domain/utils/distance-display.util';
import { DialogLayoutComponent } from '../../shared/ui/dialog/dialog-layout.component';
import { buildStopSlug } from '../../domain/route-search/route-search-url.util';

type NearbyDialogState = 'loading' | 'success' | 'permissionDenied' | 'notSupported' | 'unknown';

interface NearbyStopViewModel {
  id: string;
  slug: string;
  title: string;
  distanceKey: string;
  distanceValue: string;
}

const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_POSITION_UNAVAILABLE = 2;
const GEOLOCATION_TIMEOUT = 3;

@Component({
  selector: 'app-home-nearby-stops-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, DialogLayoutComponent, MatButtonModule],
  templateUrl: './home-nearby-stops-dialog.component.html',
  styleUrl: './home-nearby-stops-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeNearbyStopsDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<HomeNearbyStopsDialogComponent>);
  private readonly geolocationService = inject(GeolocationService);
  private readonly nearbyStopsService = inject(NearbyStopsService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly nearbyStopOptions = inject(NearbyStopOptionsService);
  private readonly translation = APP_CONFIG.translationKeys.home.dialogs.nearbyStops;
  private readonly notSupportedMessage = APP_CONFIG.errors.geolocationNotSupported;
  private readonly routeSearchPath = APP_CONFIG.routes.routeSearch;
  private readonly originQueryParam = APP_CONFIG.routeSearchData.queryParams.originStopId;
  private readonly distanceTranslation = this.translation.distance;

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

  protected async selectStop(stop: NearbyStopViewModel): Promise<void> {
    const navigated = await this.router.navigate([this.routeSearchPath], {
      queryParams: { [this.originQueryParam]: stop.slug }
    });

    if (navigated) {
      this.dialogRef.close();
    }
  }

  protected get isLoading(): boolean {
    return this.state === 'loading';
  }

  private async loadNearbyStops(): Promise<void> {
    this.state = 'loading';

    try {
      const position = await this.geolocationService.getCurrentPosition(
        GEOLOCATION_REQUEST_OPTIONS
      );
      const coordinates: GeoCoordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      const results = await this.nearbyStopsService.findClosestStops(coordinates);
      const options = await firstValueFrom(this.nearbyStopOptions.loadOptions(results));
      this.stops = options.map((option) => this.buildViewModel(option));
      this.state = 'success';
    } catch (error) {
      this.state = this.mapError(error);
      this.stops = [];
    }

    this.changeDetector.markForCheck();
  }

  private buildViewModel(stop: NearbyStopOption): NearbyStopViewModel {
    const distance = buildDistanceDisplay(stop.distanceInMeters, this.distanceTranslation);
    return {
      id: stop.id,
      slug: buildStopSlug(stop),
      title: stop.name,
      distanceKey: distance.translationKey,
      distanceValue: distance.value
    };
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

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { APP_CONFIG } from '../../core/config';
import { AccessibleButtonDirective } from '../../shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '../../shared/layout/app-layout-content.directive';
import { InteractiveCardComponent } from '../../shared/ui/cards/interactive-card/interactive-card.component';
import { LeafletMapService, MapHandle, MapStopMarker } from '../../shared/map/leaflet-map.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { GEOLOCATION_REQUEST_OPTIONS } from '../../core/services/geolocation-request.options';
import { NearbyStopResult, NearbyStopsService } from '../../core/services/nearby-stops.service';
import { StopDirectoryService } from '../../data/stops/stop-directory.service';
import { buildDistanceDisplay } from '../../domain/utils/distance-display.util';
import { GeoCoordinate } from '../../domain/utils/geo-distance.util';

interface MapStopView {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly municipality: string;
  readonly nucleus: string;
  readonly coordinate: GeoCoordinate;
  readonly distanceTranslationKey: string;
  readonly distanceValue: string;
  readonly distanceInMeters: number;
  readonly commands: readonly string[];
}

const DEFAULT_CENTER: GeoCoordinate = Object.freeze({ latitude: 37.389092, longitude: -5.984459 });
const DEFAULT_ZOOM = 7;
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 17;
const ROOT_ROUTE_SEGMENT = '/' as const;
const STOP_CARD_BODY_CLASSES: readonly string[] = ['map__stop-card-body'];

const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_POSITION_UNAVAILABLE = 2;
const GEOLOCATION_TIMEOUT = 3;

interface PositionErrorLike {
  readonly code: number;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AccessibleButtonDirective,
    AppLayoutContentDirective,
    InteractiveCardComponent
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapCanvas', { static: true })
  private readonly mapCanvas?: ElementRef<HTMLDivElement>;

  private readonly mapService = inject(LeafletMapService);
  private readonly geolocation = inject(GeolocationService);
  private readonly nearbyStops = inject(NearbyStopsService);
  private readonly stopDirectory = inject(StopDirectoryService);
  private readonly platformId = inject(PLATFORM_ID);

  private mapHandle: MapHandle | null = null;
  private userCoordinate: GeoCoordinate | null = null;
  private isDestroyed = false;

  private readonly translations = APP_CONFIG.translationKeys.map;
  private readonly distanceTranslations = APP_CONFIG.translationKeys.home.dialogs.nearbyStops.distance;
  private readonly stopDetailRouteKey = APP_CONFIG.routes.stopDetailBase;

  protected readonly translationKeys = this.translations;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.map;
  protected readonly stopCardBodyClasses = STOP_CARD_BODY_CLASSES;

  protected readonly stops = signal<readonly MapStopView[]>([]);
  protected readonly isLocating = signal(false);
  protected readonly hasAttemptedLocation = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly hasStops = computed(() => this.stops().length > 0);
  protected readonly showEmptyState = computed(
    () =>
      this.hasAttemptedLocation() &&
      !this.isLocating() &&
      !this.errorKey() &&
      !this.hasStops()
  );
  protected readonly showPrompt = computed(
    () => !this.hasAttemptedLocation() && !this.errorKey() && !this.isLocating()
  );

  async ngAfterViewInit(): Promise<void> {
    if (!this.isRunningInBrowser()) {
      return;
    }

    const canvas = this.mapCanvas?.nativeElement;

    if (!canvas) {
      return;
    }

    this.mapHandle = this.mapService.create(canvas, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM
    });

    await this.invalidateMapSize();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.mapHandle?.destroy();
    this.mapHandle = null;
  }

  protected trackStop(_: number, stop: MapStopView): string {
    return stop.id;
  }

  protected async locate(): Promise<void> {
    if (this.isLocating() || !this.isRunningInBrowser()) {
      return;
    }

    this.errorKey.set(null);
    this.isLocating.set(true);

    try {
      const position = await this.geolocation.getCurrentPosition(GEOLOCATION_REQUEST_OPTIONS);

      if (this.isDestroyed) {
        return;
      }

      const coordinate = this.toCoordinate(position);
      this.userCoordinate = coordinate;

      this.mapHandle?.renderUserLocation(coordinate);
      this.mapHandle?.renderStops([]);

      const results = await this.nearbyStops.findClosestStops(coordinate);

      if (this.isDestroyed) {
        return;
      }

      const stops = await this.loadStops(results);

      if (this.isDestroyed) {
        return;
      }

      this.stops.set(stops);

      const markers = stops.map<MapStopMarker>((stop) => ({
        id: stop.id,
        coordinate: stop.coordinate
      }));

      if (markers.length) {
        this.mapHandle?.renderStops(markers);
        const focusPoints = this.buildFocusPoints(markers.map((marker) => marker.coordinate), coordinate);
        this.mapHandle?.fitToCoordinates(focusPoints);
      } else {
        this.mapHandle?.fitToCoordinates([coordinate]);
      }
    } catch (error) {
      if (this.isDestroyed) {
        return;
      }

      this.errorKey.set(this.resolveErrorKey(error));
      this.stops.set([]);
    } finally {
      if (!this.isDestroyed) {
        this.isLocating.set(false);
        this.hasAttemptedLocation.set(true);
      }
    }
  }

  private async loadStops(
    results: readonly NearbyStopResult[]
  ): Promise<readonly MapStopView[]> {
    if (!results.length) {
      return [];
    }

    const stopViews = await Promise.all(results.map((result) => this.buildStopView(result)));
    const filtered = stopViews.filter((stop): stop is MapStopView => Boolean(stop));

    filtered.sort((first, second) => first.distanceInMeters - second.distanceInMeters);

    return Object.freeze(filtered.map((stop) => ({ ...stop })));
  }

  private async buildStopView(result: NearbyStopResult): Promise<MapStopView | null> {
    try {
      const record = await firstValueFrom(this.stopDirectory.getStopById(result.id));

      if (!record) {
        return null;
      }

      const distance = buildDistanceDisplay(result.distanceInMeters, this.distanceTranslations);

      return {
        id: record.stopId,
        name: record.name,
        code: record.stopCode,
        municipality: record.municipality,
        nucleus: record.nucleus,
        coordinate: {
          latitude: record.location.latitude,
          longitude: record.location.longitude
        },
        distanceTranslationKey: distance.translationKey,
        distanceValue: distance.value,
        distanceInMeters: result.distanceInMeters,
        commands: this.buildCommands(record.stopId)
      } satisfies MapStopView;
    } catch {
      return null;
    }
  }

  private buildCommands(stopId: string): readonly string[] {
    return [ROOT_ROUTE_SEGMENT, this.stopDetailRouteKey, stopId] as const;
  }

  private buildFocusPoints(
    stopCoordinates: readonly GeoCoordinate[],
    coordinate: GeoCoordinate
  ): readonly GeoCoordinate[] {
    return Object.freeze([...stopCoordinates, coordinate]);
  }

  private async invalidateMapSize(): Promise<void> {
    if (!this.mapHandle) {
      return;
    }

    const handle = this.mapHandle;
    const hasAnimationFrame =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';

    if (!hasAnimationFrame) {
      handle.invalidateSize();
      return;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        if (!this.isDestroyed) {
          handle.invalidateSize();
        }

        resolve();
      });
    });
  }

  private resolveErrorKey(error: unknown): string {
    if (this.isPositionError(error)) {
      if (error.code === GEOLOCATION_PERMISSION_DENIED) {
        return this.translations.errors.permissionDenied;
      }

      if (error.code === GEOLOCATION_POSITION_UNAVAILABLE) {
        return this.translations.errors.positionUnavailable;
      }

      if (error.code === GEOLOCATION_TIMEOUT) {
        return this.translations.errors.timeout;
      }
    }

    return this.translations.errors.generic;
  }

  private isPositionError(value: unknown): value is PositionErrorLike {
    return (
      typeof value === 'object' &&
      value !== null &&
      'code' in value &&
      typeof (value as PositionErrorLike).code === 'number'
    );
  }

  private toCoordinate(position: GeolocationPosition): GeoCoordinate {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  }

  private isRunningInBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}

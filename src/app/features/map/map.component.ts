import { CommonModule, isPlatformBrowser } from '@angular/common';
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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, map, startWith } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { PluralizationService } from '@core/i18n/pluralization.service';
import { classifyGeolocationError } from '@core/services/geolocation-error.util';
import { GEOLOCATION_REQUEST_OPTIONS } from '@core/services/geolocation-request.options';
import { GeolocationService } from '@core/services/geolocation.service';
import {
  NearbyStopRecord,
  NearbyStopResult,
  NearbyStopsService
} from '@core/services/nearby-stops.service';
import { buildStopIdentity } from '@core/services/stop-identity.util';
import { StopDirectoryService } from '@data/stops/stop-directory.service';
import {
  RouteOverlayFacade,
  RouteOverlayRoute,
  RouteOverlaySelectionSummary,
  RouteOverlayState,
  RouteOverlayStatus
} from '@domain/map/route-overlay.facade';
import { buildDistanceDisplay } from '@domain/utils/distance-display.util';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';
import { MapSearchComponent } from '@features/map/map-search.component';
import {
  MapSearchTarget,
  buildMapSearchTargets
} from '@features/map/map-search.util';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import {
  LeafletMapService,
  MapHandle,
  MapRoutePolyline,
  MapStopInteractionOptions,
  MapStopMarker
} from '@shared/map/leaflet-map.service';
import { InteractiveCardComponent } from '@shared/ui/cards/interactive-card/interactive-card.component';

interface MapStopView {
  readonly id: string;
  readonly consortiumId: number;
  readonly stopId: string;
  readonly name: string;
  readonly code: string;
  readonly municipality: string;
  readonly nucleus: string;
  readonly coordinate: GeoCoordinate;
  readonly distanceTranslationKey: string;
  readonly distanceValue: string;
  readonly distanceInMeters: number;
}

interface MapRouteView {
  readonly id: string;
  readonly lineCode: string;
  readonly destinationName: string;
  readonly stopCountTranslationKey: string;
  readonly stopCountValue: string;
  readonly distanceTranslationKey: string;
  readonly distanceValue: string;
}

interface StopNavigationTarget {
  readonly consortiumId: number;
  readonly stopId: string;
}

const DEFAULT_CENTER: GeoCoordinate = Object.freeze({ latitude: 37.389092, longitude: -5.984459 });
const DEFAULT_ZOOM = 7;
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 17;
const MAP_SEARCH_STOP_ZOOM = 15;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)' as const;
const ROOT_ROUTE_SEGMENT = '/' as const;
const STOP_CARD_BODY_CLASSES: readonly string[] = ['map__stop-card-body'];
const ROUTE_CARD_BODY_CLASSES: readonly string[] = ['map__route-card-body'];
const ROUTE_CARD_ACTIVE_BODY_CLASSES: readonly string[] = [
  'map__route-card-body',
  'map__route-card-body--active'
];
const LINK_ROLE = 'link' as const;
const ROUTE_CARD_ROLE = 'button' as const;
const EMPTY_STRING = '' as const;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AccessibleButtonDirective,
    AppLayoutContentDirective,
    MapSearchComponent,
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
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlayFacade = inject(RouteOverlayFacade);
  private readonly translate = inject(TranslateService);
  private readonly pluralization = inject(PluralizationService);

  private mapHandle: MapHandle | null = null;
  private userCoordinate: GeoCoordinate | null = null;
  private networkStopMarkers: readonly MapStopMarker[] = Object.freeze([]);
  private stopNavigationIndex = new Map<string, StopNavigationTarget>();
  private isDestroyed = false;
  private currentSelectionKey: string | null = null;
  private hasFittedRoutes = false;

  private readonly translations = APP_CONFIG.translationKeys.map;
  private readonly distanceTranslations = APP_CONFIG.translationKeys.home.dialogs.nearbyStops.distance;
  private readonly routeDistanceTranslations = APP_CONFIG.translationKeys.map.routes.distance;
  private readonly routeStopCountTranslations = APP_CONFIG.translationKeys.map.routes.stopCount;
  private readonly routeAnnouncementSelectedKey =
    APP_CONFIG.translationKeys.map.routes.announcements.selected;
  private readonly routeAnnouncementClearedKey =
    APP_CONFIG.translationKeys.map.routes.announcements.cleared;
  private readonly routeAnnouncementLoadingKey =
    APP_CONFIG.translationKeys.map.routes.announcements.loading;
  private readonly routeAnnouncementLoadedTranslations =
    APP_CONFIG.translationKeys.map.routes.announcements.loaded;
  private readonly routeAnnouncementEmptyKey =
    APP_CONFIG.translationKeys.map.routes.announcements.empty;
  private readonly routeAnnouncementErrorKey =
    APP_CONFIG.translationKeys.map.routes.announcements.error;
  private readonly stopDetailRouteKey = APP_CONFIG.routes.stopDetailBase;

  private readonly stopMarkerInteractions: MapStopInteractionOptions = {
    getDetailsLabel: () => this.translate.instant(APP_CONFIG.translationKeys.navigation.stopDetail),
    onDetails: (markerId) => this.openMarkerDetails(markerId)
  };

  private readonly language = toSignal(
    this.translate.onLangChange.pipe(
      map(({ lang }) =>
        this.pluralization.resolveLanguage({
          current: lang,
          defaultLanguage: this.translate.defaultLang,
          fallback: APP_CONFIG.locales.default
        })
      ),
      startWith(
        this.pluralization.resolveLanguage({
          current: this.translate.currentLang,
          defaultLanguage: this.translate.defaultLang,
          fallback: APP_CONFIG.locales.default
        })
      )
    ),
    { requireSync: true }
  );

  protected readonly translationKeys = this.translations;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.map;
  protected readonly stopCardBodyClasses = STOP_CARD_BODY_CLASSES;
  protected readonly stopCardRole = LINK_ROLE;
  protected readonly routeCardRole = ROUTE_CARD_ROLE;

  protected readonly stops = signal<readonly MapStopView[]>([]);
  protected readonly searchTargets = signal<readonly MapSearchTarget[]>(Object.freeze([]));
  protected readonly isLoadingNetworkStops = signal(false);
  protected readonly isLocating = signal(false);
  protected readonly hasAttemptedLocation = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly routeStatus = signal<RouteOverlayStatus>('idle');
  protected readonly routeErrorKey = signal<string | null>(null);
  protected readonly routes = signal<readonly RouteOverlayRoute[]>([]);
  protected readonly routeLiveMessage = signal<string>(EMPTY_STRING);
  protected readonly routeViews = computed<readonly MapRouteView[]>(() => {
    const language = this.language();

    return this.routes().map((route) => {
      const distance = buildDistanceDisplay(route.lengthInMeters, this.routeDistanceTranslations);
      const stopCountTranslationKey = this.pluralization.selectKey(
        route.stopCount,
        this.routeStopCountTranslations,
        language
      );

      return {
        id: route.id,
        lineCode: route.lineCode,
        destinationName: route.destinationName,
        stopCountTranslationKey,
        stopCountValue: String(route.stopCount),
        distanceTranslationKey: distance.translationKey,
        distanceValue: distance.value
      } satisfies MapRouteView;
    });
  });
  protected readonly activeRouteId = signal<string | null>(null);
  protected readonly routeSelectionSummary = signal<RouteOverlaySelectionSummary | null>(null);

  private lastRouteStatus: RouteOverlayStatus | null = null;
  private lastRouteCount = -1;
  private lastRouteErrorKey: string | null = null;
  private lastRouteSelectionKey: string | null = null;

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
  protected readonly hasRouteSelection = computed(
    () => this.routeStatus() !== 'idle' && this.routeSelectionSummary() !== null
  );
  protected readonly isRouteLoading = computed(() => this.routeStatus() === 'loading');
  protected readonly hasRouteResults = computed(
    () => this.routeStatus() === 'ready' && this.routes().length > 0
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
    this.updateMapRoutes();
    await this.loadNetworkStops();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.mapHandle?.destroy();
    this.mapHandle = null;
  }

  protected trackStop(_: number, stop: MapStopView): string {
    return stop.id;
  }

  protected trackRoute(_: number, route: MapRouteView): string {
    return route.id;
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

      const results = await this.nearbyStops.findClosestStops(coordinate);

      if (this.isDestroyed) {
        return;
      }

      if (!this.networkStopMarkers.length) {
        await this.loadNetworkStops();
      }

      const stops = await this.loadStops(results);

      if (this.isDestroyed) {
        return;
      }

      this.stops.set(stops);
      this.renderNearbyFallbackIfNeeded(stops);

      const nearbyCoordinates = stops.map((stop) => stop.coordinate);
      const animate = this.shouldAnimateMapMovement();

      if (nearbyCoordinates.length) {
        this.mapHandle?.fitToCoordinates(this.buildFocusPoints(nearbyCoordinates, coordinate), animate);
      } else {
        this.mapHandle?.fitToCoordinates([coordinate], animate);
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

  protected selectSearchTarget(target: MapSearchTarget): void {
    if (!this.mapHandle) {
      return;
    }

    const animate = this.shouldAnimateMapMovement();

    if (target.kind === 'stop') {
      this.mapHandle.focusStop(target.id, MAP_SEARCH_STOP_ZOOM, animate);
      return;
    }

    this.mapHandle.fitToCoordinates(target.coordinates, animate);
  }

  protected setStopHighlight(stopId: string | null): void {
    this.mapHandle?.highlightStop(stopId);
  }

  protected openNearbyStop(stop: MapStopView): void {
    void this.navigateToStop(stop.consortiumId, stop.stopId);
  }

  protected routeCardBodyClasses(routeId: string): readonly string[] {
    return this.activeRouteId() === routeId
      ? ROUTE_CARD_ACTIVE_BODY_CLASSES
      : ROUTE_CARD_BODY_CLASSES;
  }

  protected toggleRoute(routeId: string): void {
    if (this.activeRouteId() === routeId) {
      this.activeRouteId.set(null);
      this.updateMapRoutes();
      this.announceRouteCleared();
      return;
    }

    this.activeRouteId.set(routeId);
    this.updateMapRoutes();

    const selectedRoute = this.routes().find((route) => route.id === routeId);

    if (selectedRoute && selectedRoute.coordinates.length > 0) {
      this.mapHandle?.fitToCoordinates(
        selectedRoute.coordinates,
        this.shouldAnimateMapMovement()
      );
      this.announceRouteSelected(selectedRoute);
    }
  }

  protected refreshRoutes(): void {
    this.overlayFacade.refresh();
  }

  private async loadNetworkStops(): Promise<void> {
    if (!this.mapHandle || this.isLoadingNetworkStops()) {
      return;
    }

    this.isLoadingNetworkStops.set(true);

    try {
      const records = await this.nearbyStops.getAllStops();

      if (this.isDestroyed || !this.mapHandle) {
        return;
      }

      const markers = this.buildNetworkMarkers(records);
      const coordinates = markers.map((marker) => marker.coordinate);
      this.networkStopMarkers = markers;
      this.stopNavigationIndex = this.buildStopNavigationIndex(records);
      this.searchTargets.set(buildMapSearchTargets(records));
      this.mapHandle.renderStops(markers, this.stopMarkerInteractions);
      this.mapHandle.restrictToCoordinates(coordinates);

      if (markers.length && !this.userCoordinate && !this.hasRouteSelection()) {
        this.mapHandle.fitToCoordinates(coordinates);
      }
    } catch {
      this.networkStopMarkers = Object.freeze([]);
      this.stopNavigationIndex.clear();
      this.searchTargets.set(Object.freeze([]));
    } finally {
      if (!this.isDestroyed) {
        this.isLoadingNetworkStops.set(false);
      }
    }
  }

  private buildNetworkMarkers(records: readonly NearbyStopRecord[]): readonly MapStopMarker[] {
    return Object.freeze(
      records.map((record) => ({
        id: buildStopIdentity(record.consortiumId, record.stopId),
        name: record.name,
        coordinate: {
          latitude: record.latitude,
          longitude: record.longitude
        }
      }))
    );
  }

  private buildStopNavigationIndex(
    records: readonly NearbyStopRecord[]
  ): Map<string, StopNavigationTarget> {
    return new Map(
      records.map((record) => [
        buildStopIdentity(record.consortiumId, record.stopId),
        { consortiumId: record.consortiumId, stopId: record.stopId }
      ] as const)
    );
  }

  private renderNearbyFallbackIfNeeded(stops: readonly MapStopView[]): void {
    if (this.networkStopMarkers.length || !stops.length || !this.mapHandle) {
      return;
    }

    const fallbackMarkers = Object.freeze(
      stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        coordinate: stop.coordinate
      }))
    );

    for (const stop of stops) {
      this.stopNavigationIndex.set(stop.id, {
        consortiumId: stop.consortiumId,
        stopId: stop.stopId
      });
    }

    this.mapHandle.renderStops(fallbackMarkers, this.stopMarkerInteractions);
  }

  private openMarkerDetails(markerId: string): void {
    const target = this.stopNavigationIndex.get(markerId);

    if (!target) {
      return;
    }

    void this.navigateToStop(target.consortiumId, target.stopId);
  }

  private navigateToStop(consortiumId: number, stopId: string): Promise<boolean> {
    return this.router.navigate(
      [ROOT_ROUTE_SEGMENT, this.stopDetailRouteKey, stopId],
      { queryParams: { consortiumId: String(consortiumId) } }
    );
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
      const record = await firstValueFrom(
        this.stopDirectory.getStopBySignature(result.consortiumId, result.id)
      );

      if (!record) {
        return null;
      }

      const distance = buildDistanceDisplay(result.distanceInMeters, this.distanceTranslations);

      return {
        id: buildStopIdentity(record.consortiumId, record.stopId),
        consortiumId: record.consortiumId,
        stopId: record.stopId,
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
        distanceInMeters: result.distanceInMeters
      } satisfies MapStopView;
    } catch {
      return null;
    }
  }

  private buildFocusPoints(
    stopCoordinates: readonly GeoCoordinate[],
    coordinate: GeoCoordinate
  ): readonly GeoCoordinate[] {
    return Object.freeze([...stopCoordinates, coordinate]);
  }

  private handleOverlayState(state: RouteOverlayState): void {
    if (state.selectionKey !== this.currentSelectionKey) {
      const hadActiveRoute = this.activeRouteId() !== null;
      this.currentSelectionKey = state.selectionKey;
      this.activeRouteId.set(null);
      this.hasFittedRoutes = false;

      if (hadActiveRoute) {
        this.announceRouteCleared();
      }
    }

    this.routeStatus.set(state.status);
    this.routeErrorKey.set(state.errorKey);
    this.routeSelectionSummary.set(state.selectionSummary);
    this.routes.set(state.routes);
    this.updateMapRoutes();
    this.announceRouteStatusIfNeeded(state);

    if (!this.hasFittedRoutes && state.status === 'ready' && state.routes.length > 0) {
      const allCoordinates = this.collectRouteCoordinates(state.routes);

      if (allCoordinates.length > 0 && this.mapHandle) {
        this.mapHandle.fitToCoordinates(allCoordinates);
        this.hasFittedRoutes = true;
      }
    }
  }

  private collectRouteCoordinates(routes: readonly RouteOverlayRoute[]): readonly GeoCoordinate[] {
    const coordinates: GeoCoordinate[] = [];

    for (const route of routes) {
      coordinates.push(...route.coordinates);
    }

    return Object.freeze(coordinates);
  }

  private updateMapRoutes(): void {
    if (!this.mapHandle) {
      return;
    }

    const activeRoute = this.activeRouteId();
    const mappedRoutes: readonly MapRoutePolyline[] = this.routes().map((route) => ({
      id: route.id,
      coordinates: route.coordinates
    }));

    this.mapHandle.renderRoutes(mappedRoutes, activeRoute);
  }

  private announceRouteSelected(route: RouteOverlayRoute): void {
    const message = this.translate.instant(this.routeAnnouncementSelectedKey, {
      code: route.lineCode,
      destination: route.destinationName
    });

    this.publishRouteAnnouncement(message);
  }

  private announceRouteCleared(): void {
    const message = this.translate.instant(this.routeAnnouncementClearedKey);
    this.publishRouteAnnouncement(message);
  }

  private announceRoutesLoading(): void {
    const message = this.translate.instant(this.routeAnnouncementLoadingKey);
    this.publishRouteAnnouncement(message);
  }

  private announceRoutesLoaded(count: number): void {
    const language = this.language();
    const translationKey = this.pluralization.selectKey(
      count,
      this.routeAnnouncementLoadedTranslations,
      language
    );
    const message = this.translate.instant(translationKey, { value: String(count) });
    this.publishRouteAnnouncement(message);
  }

  private announceRoutesEmpty(): void {
    const message = this.translate.instant(this.routeAnnouncementEmptyKey);
    this.publishRouteAnnouncement(message);
  }

  private announceRoutesError(errorKey: string | null): void {
    const translationKey = errorKey ?? this.routeAnnouncementErrorKey;
    const message = this.translate.instant(translationKey);
    this.publishRouteAnnouncement(message);
  }

  private announceRouteStatusIfNeeded(state: RouteOverlayState): void {
    const statusChanged = state.status !== this.lastRouteStatus;
    const routeCountChanged = state.routes.length !== this.lastRouteCount;
    const errorChanged = state.errorKey !== this.lastRouteErrorKey;
    const selectionChanged = state.selectionKey !== this.lastRouteSelectionKey;

    if (!statusChanged && !routeCountChanged && !errorChanged && !selectionChanged) {
      return;
    }

    if (state.status === 'loading') {
      this.announceRoutesLoading();
    } else if (state.status === 'ready') {
      if (state.routes.length > 0) {
        this.announceRoutesLoaded(state.routes.length);
      } else if (routeCountChanged || statusChanged || selectionChanged) {
        this.announceRoutesEmpty();
      }
    } else if (state.status === 'error') {
      this.announceRoutesError(state.errorKey);
    }

    this.lastRouteStatus = state.status;
    this.lastRouteCount = state.routes.length;
    this.lastRouteErrorKey = state.errorKey;
    this.lastRouteSelectionKey = state.selectionKey;
  }

  private publishRouteAnnouncement(message: string): void {
    if (!message) {
      return;
    }

    this.routeLiveMessage.set(EMPTY_STRING);
    queueMicrotask(() => {
      if (!this.isDestroyed) {
        this.routeLiveMessage.set(message);
      }
    });
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
    switch (classifyGeolocationError(error)) {
      case 'notSupported':
        return APP_CONFIG.errors.geolocationNotSupported;
      case 'permissionDenied':
        return this.translations.errors.permissionDenied;
      case 'positionUnavailable':
        return this.translations.errors.positionUnavailable;
      case 'timeout':
        return this.translations.errors.timeout;
      case 'unknown':
        return this.translations.errors.generic;
    }
  }

  private resolveLanguage(language: string | undefined): string {
    if (language) {
      return language;
    }

    return this.translate.defaultLang ?? APP_CONFIG.locales.default;
  }

  private shouldAnimateMapMovement(): boolean {
    if (!this.isRunningInBrowser() || typeof window.matchMedia !== 'function') {
      return false;
    }

    return !window.matchMedia(REDUCED_MOTION_QUERY).matches;
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

  constructor() {
    this.overlayFacade
      .watchOverlay()
      .pipe(takeUntilDestroyed())
      .subscribe((state) => this.handleOverlayState(state));
  }
}

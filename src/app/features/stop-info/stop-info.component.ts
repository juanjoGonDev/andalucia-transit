import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { distinctUntilChanged, map, shareReplay } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { classifyGeolocationError } from '@core/services/geolocation-error.util';
import { GEOLOCATION_REQUEST_OPTIONS } from '@core/services/geolocation-request.options';
import { GeolocationService } from '@core/services/geolocation.service';
import { buildDistanceDisplay, DistanceDisplay } from '@domain/utils/distance-display.util';
import { calculateDistanceInMeters, GeoCoordinate } from '@domain/utils/geo-distance.util';
import {
  StopInfoFacade,
  StopInformationDetail,
  StopInformationState,
} from '@domain/stops/stop-info.facade';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';

interface StopInfoRouteSelection {
  readonly consortiumId: number;
  readonly stopNumber: string;
}

type DirectionsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface DirectionsState {
  readonly status: DirectionsStatus;
  readonly distance: DistanceDisplay | null;
  readonly errorKey: string | null;
}

const STOP_INFO_HOME_REDIRECT = ['/', APP_CONFIG.routes.home] as const;
const STATUS_ROLE = 'status';
const POLITE_LIVE = 'polite';
const ASSERTIVE_LIVE = 'assertive';
const DIRECTIONS_TRANSLATION_KEYS = {
  title: 'stopInfo.directions.title',
  description: 'stopInfo.directions.description',
  locate: 'stopInfo.directions.locate',
  loading: 'stopInfo.directions.loading',
  distanceLabel: 'stopInfo.directions.distanceLabel',
  disclaimer: 'stopInfo.directions.disclaimer',
  unavailable: 'stopInfo.directions.unavailable',
} as const;
const DISTANCE_TRANSLATION_KEYS = APP_CONFIG.translationKeys.home.dialogs.nearbyStops.distance;
const IDLE_DIRECTIONS_STATE: DirectionsState = {
  status: 'idle',
  distance: null,
  errorKey: null,
};

const areSelectionsEqual = (
  left: StopInfoRouteSelection | null,
  right: StopInfoRouteSelection | null,
): boolean => {
  if (left === right) {
    return true;
  }

  if (left === null || right === null) {
    return false;
  }

  return left.consortiumId === right.consortiumId && left.stopNumber === right.stopNumber;
};

const normalizeStopNumber = (value: string | null): string => (value ?? '').trim();

const parseConsortiumId = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const toSelection = (paramMap: ParamMap): StopInfoRouteSelection | null => {
  const consortiumParam = paramMap.get(APP_CONFIG.routeParams.stopInfo.consortiumId);
  const stopParam = paramMap.get(APP_CONFIG.routeParams.stopInfo.stopNumber);
  const consortiumId = parseConsortiumId(consortiumParam);
  const stopNumber = normalizeStopNumber(stopParam);

  if (consortiumId === null || stopNumber.length === 0) {
    return null;
  }

  return { consortiumId, stopNumber };
};

const isReadyState = (
  state: StopInformationState,
): state is Extract<StopInformationState, { status: 'ready' }> => state.status === 'ready';

const isNotFoundState = (
  state: StopInformationState,
): state is Extract<StopInformationState, { status: 'notFound' }> => state.status === 'notFound';

const isErrorState = (
  state: StopInformationState,
): state is Extract<StopInformationState, { status: 'error' }> => state.status === 'error';

const isLoadingState = (
  state: StopInformationState,
): state is Extract<StopInformationState, { status: 'loading' }> => state.status === 'loading';

@Component({
  selector: 'app-stop-info',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AppLayoutContentDirective,
    AccessibleButtonDirective,
  ],
  templateUrl: './stop-info.component.html',
  styleUrls: ['./stop-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StopInfoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly facade = inject(StopInfoFacade);
  private readonly geolocation = inject(GeolocationService);
  private directionsRequestVersion = 0;

  protected readonly translation = APP_CONFIG.translationKeys.stopInfo;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.stopInfoBase;
  protected readonly state$ = this.facade.state$;
  protected readonly labels = this.translation.labels;
  protected readonly statusKeys = this.translation.status;
  protected readonly actionKeys = this.translation.actions;
  protected readonly tagKeys = this.translation.tags;
  protected readonly directionsKeys = DIRECTIONS_TRANSLATION_KEYS;
  protected readonly statusRole = STATUS_ROLE;
  protected readonly politeLiveRegion = POLITE_LIVE;
  protected readonly assertiveLiveRegion = ASSERTIVE_LIVE;
  protected readonly directionsState = signal<DirectionsState>(IDLE_DIRECTIONS_STATE);

  private readonly selection$ = this.route.paramMap.pipe(
    map((params) => toSelection(params)),
    distinctUntilChanged(areSelectionsEqual),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.directionsRequestVersion += 1;
    });

    this.selection$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((selection) => {
      this.resetDirections();

      if (!selection) {
        void this.router.navigate(STOP_INFO_HOME_REDIRECT);
        return;
      }

      this.facade.selectStop(selection.consortiumId, selection.stopNumber);
    });
  }

  protected refresh(): void {
    this.facade.refresh();
  }

  protected async calculateApproximateDistance(stopLocation: GeoCoordinate): Promise<void> {
    if (this.directionsState().status === 'loading') {
      return;
    }

    const requestVersion = ++this.directionsRequestVersion;
    this.directionsState.set({ status: 'loading', distance: null, errorKey: null });

    try {
      const position = await this.geolocation.getCurrentPosition(GEOLOCATION_REQUEST_OPTIONS);

      if (requestVersion !== this.directionsRequestVersion) {
        return;
      }

      const userLocation: GeoCoordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const distanceInMeters = calculateDistanceInMeters(userLocation, stopLocation);

      this.directionsState.set({
        status: 'ready',
        distance: buildDistanceDisplay(distanceInMeters, DISTANCE_TRANSLATION_KEYS),
        errorKey: null,
      });
    } catch (error) {
      if (requestVersion !== this.directionsRequestVersion) {
        return;
      }

      this.directionsState.set({
        status: 'error',
        distance: null,
        errorKey: this.resolveDirectionsErrorKey(error),
      });
    }
  }

  protected trackCorrespondence(_: number, code: string): string {
    return code;
  }

  protected trackTag(_: number, tag: string): string {
    return tag;
  }

  protected isReady(
    state: StopInformationState,
  ): state is Extract<StopInformationState, { status: 'ready' }> {
    return isReadyState(state);
  }

  protected isNotFound(
    state: StopInformationState,
  ): state is Extract<StopInformationState, { status: 'notFound' }> {
    return isNotFoundState(state);
  }

  protected isError(
    state: StopInformationState,
  ): state is Extract<StopInformationState, { status: 'error' }> {
    return isErrorState(state);
  }

  protected isLoading(
    state: StopInformationState,
  ): state is Extract<StopInformationState, { status: 'loading' }> {
    return isLoadingState(state);
  }

  protected showTag(detail: StopInformationDetail, tag: 'main' | 'inactive'): boolean {
    if (tag === 'main') {
      return detail.isMain === true;
    }

    if (tag === 'inactive') {
      return detail.isInactive === true;
    }

    return false;
  }

  private resetDirections(): void {
    this.directionsRequestVersion += 1;
    this.directionsState.set(IDLE_DIRECTIONS_STATE);
  }

  private resolveDirectionsErrorKey(error: unknown): string {
    switch (classifyGeolocationError(error)) {
      case 'notSupported':
        return APP_CONFIG.errors.geolocationNotSupported;
      case 'permissionDenied':
        return APP_CONFIG.translationKeys.map.errors.permissionDenied;
      case 'positionUnavailable':
        return APP_CONFIG.translationKeys.map.errors.positionUnavailable;
      case 'timeout':
        return APP_CONFIG.translationKeys.map.errors.timeout;
      case 'unknown':
        return APP_CONFIG.translationKeys.map.errors.generic;
    }
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';
import {
  TripProgressState,
  TripStopGeoPoint,
  TripStopTiming,
  buildTripStopTimes,
  resolveTripProgress
} from './trip-progress.util';
import { TripSessionRecord, TripSessionStorage } from './trip-session.storage';

export const TRIP_ETA_TICK_MS = 5_000;

export type LiveTripStatus = 'idle' | 'locating' | 'tracking' | 'completed' | 'unavailable';

export interface LiveTripState {
  readonly status: LiveTripStatus;
  readonly session: TripSessionRecord | null;
  readonly userPosition: GeoCoordinate | null;
  readonly accuracyMeters: number | null;
  readonly progress: TripProgressState | null;
  readonly etaMs: number;
  readonly stopTimes: readonly TripStopTiming[];
}

const IDLE_STATE: LiveTripState = {
  status: 'idle',
  session: null,
  userPosition: null,
  accuracyMeters: null,
  progress: null,
  etaMs: 0,
  stopTimes: []
};

/**
 * Keeps the live tracking session for a trip: watches GPS, projects every fix on the line
 * geometry and exposes the current stop segment, progressive fraction and schedule-based ETA.
 */
@Injectable({ providedIn: 'root' })
export class LiveTripService {
  private readonly geolocation = inject(GeolocationService);
  private readonly storage = inject(TripSessionStorage);

  private readonly stateSignal = signal<LiveTripState>(IDLE_STATE);
  readonly state = this.stateSignal.asReadonly();

  private stopWatch: (() => void) | null = null;
  private etaTimer: Subscription | null = null;
  private polyline: readonly GeoCoordinate[] = [];
  private stopTimes: ReturnType<typeof buildTripStopTimes> = [];
  private arriveAt = 0;

  startTracking(
    session: TripSessionRecord,
    stops: readonly TripStopGeoPoint[],
    polyline: readonly GeoCoordinate[]
  ): void {
    this.stopTracking();

    this.polyline = polyline;
    const departTime = new Date(session.departTime);
    const arriveTime = new Date(session.arriveTime);
    this.arriveAt = arriveTime.getTime();
    this.stopTimes = buildTripStopTimes(stops, polyline, departTime, arriveTime);

    this.storage.save(session);
    this.patch({
      status: 'locating',
      session,
      progress: null,
      userPosition: null,
      etaMs: this.remainingMs(),
      stopTimes: this.stopTimes
    });

    this.stopWatch = this.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      () => this.handleError(),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
    );

    this.etaTimer = interval(TRIP_ETA_TICK_MS).subscribe(() => this.patch({ etaMs: this.remainingMs() }));
  }

  stopTracking(): void {
    if (this.stopWatch) {
      this.stopWatch();
      this.stopWatch = null;
    }

    if (this.etaTimer) {
      this.etaTimer.unsubscribe();
      this.etaTimer = null;
    }

    if (this.stateSignal().status !== 'idle') {
      this.stateSignal.set(IDLE_STATE);
    }

    if (this.stopTimes.length > 0) {
      this.storage.clear();
    }

    this.stopTimes = [];
    this.polyline = [];
    this.arriveAt = 0;
  }

  private handlePosition(position: GeolocationPosition): void {
    const point: GeoCoordinate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };

    if (this.polyline.length < 2 || this.stopTimes.length === 0) {
      return;
    }

    const progress = resolveTripProgress(point, this.polyline, this.stopTimes);
    const completed = progress.completed;

    if (completed) {
      this.storage.clear();
    }

    this.patch({
      status: completed ? 'completed' : 'tracking',
      userPosition: point,
      accuracyMeters: position.coords.accuracy ?? null,
      progress,
      etaMs: completed ? 0 : this.remainingMs()
    });
  }

  private handleError(): void {
    this.patch({ status: 'unavailable', progress: null });
  }

  private remainingMs(): number {
    return Math.max(0, this.arriveAt - Date.now());
  }

  private patch(partial: Partial<LiveTripState>): void {
    this.stateSignal.update((previous) => ({ ...previous, ...partial }));
  }
}

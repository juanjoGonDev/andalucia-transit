import { Injectable, inject, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import { GeoCoordinate, calculateDistanceInMeters } from '@domain/utils/geo-distance.util';
import {
  TripProgressState,
  TripStopGeoPoint,
  TripStopTiming,
  buildTripStopTimes,
  estimateEtaMs,
  resolveTripProgress,
} from './trip-progress.util';
import { TripSessionRecord, TripSessionStorage } from './trip-session.storage';

export const TRIP_ETA_TICK_MS = 1_000;
export const TRIP_ARRIVAL_RADIUS_METERS = 45;
/** How long the last GPS fix stays authoritative once fixes stop arriving. */
export const TRIP_GPS_STALE_MS = 60_000;

export type LiveTripStatus = 'idle' | 'locating' | 'tracking' | 'completed' | 'unavailable';

export interface LiveTripState {
  readonly status: LiveTripStatus;
  readonly session: TripSessionRecord | null;
  readonly userPosition: GeoCoordinate | null;
  readonly accuracyMeters: number | null;
  readonly progress: TripProgressState | null;
  readonly etaMs: number;
  readonly stopTimes: readonly TripStopTiming[];
  /** Planned duration of the whole tracked leg, in milliseconds. */
  readonly planSpanMs: number;
  /** Timestamp of the GPS fix anchoring the current progress, when available. */
  readonly progressAt: number | null;
}

const IDLE_STATE: LiveTripState = {
  status: 'idle',
  session: null,
  userPosition: null,
  accuracyMeters: null,
  progress: null,
  etaMs: 0,
  stopTimes: [],
  planSpanMs: 0,
  progressAt: null,
};

/**
 * Keeps the live tracking session for a trip: watches GPS, projects every fix on the line
 * geometry and exposes the current stop segment, progressive fraction and a GPS-anchored
 * ETA. Arrival times derive from the user position (plan pace re-anchored to the latest
 * fix), never from the raw timetable, so a late bus keeps honest countdowns.
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
  private planSpanMs = 0;
  private finalFraction = 1;
  private finalStopPoint: GeoCoordinate | null = null;
  private anchorFraction: number | null = null;
  private anchorAt = 0;

  startTracking(
    session: TripSessionRecord,
    stops: readonly TripStopGeoPoint[],
    polyline: readonly GeoCoordinate[],
  ): void {
    this.stopTracking();

    this.polyline = polyline;
    const departTime = new Date(session.departTime);
    const arriveTime = new Date(session.arriveTime);
    this.arriveAt = arriveTime.getTime();
    this.planSpanMs = Math.max(0, this.arriveAt - departTime.getTime());
    this.stopTimes = buildTripStopTimes(stops, polyline, departTime, arriveTime);
    this.finalFraction = this.stopTimes[this.stopTimes.length - 1]?.fraction ?? 1;
    const finalStop = stops[stops.length - 1];
    this.finalStopPoint = finalStop
      ? { latitude: finalStop.latitude, longitude: finalStop.longitude }
      : null;
    this.anchorFraction = null;
    this.anchorAt = 0;

    this.storage.save(session);
    this.patch({
      status: 'locating',
      session,
      progress: null,
      userPosition: null,
      etaMs: this.remainingMs(),
      stopTimes: this.stopTimes,
      planSpanMs: this.planSpanMs,
      progressAt: null,
    });

    this.stopWatch = this.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      () => this.handleError(),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );

    this.etaTimer = interval(TRIP_ETA_TICK_MS).subscribe(() => {
      this.expireStaleFix();
      this.patch({ etaMs: this.remainingMs() });
    });
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
    this.planSpanMs = 0;
    this.finalFraction = 1;
    this.finalStopPoint = null;
    this.anchorFraction = null;
    this.anchorAt = 0;
  }

  private handlePosition(position: GeolocationPosition): void {
    const point: GeoCoordinate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    if (this.polyline.length < 2 || this.stopTimes.length === 0) {
      return;
    }

    const progress = resolveTripProgress(point, this.polyline, this.stopTimes);
    const nearDestination =
      this.finalStopPoint !== null &&
      calculateDistanceInMeters(point, this.finalStopPoint) <= TRIP_ARRIVAL_RADIUS_METERS;
    const completed = progress.completed || nearDestination;
    const resolvedProgress: TripProgressState =
      completed && !progress.completed
        ? {
            fraction: 1,
            currentStopIndex: this.stopTimes.length - 1,
            nextStopIndex: -1,
            nextStop: null,
            completed: true,
          }
        : progress;

    const now = Date.now();
    this.anchorFraction = completed ? this.finalFraction : resolvedProgress.fraction;
    this.anchorAt = now;

    if (completed) {
      this.storage.clear();
    }

    this.patch({
      status: completed ? 'completed' : 'tracking',
      userPosition: point,
      accuracyMeters: position.coords.accuracy ?? null,
      progress: resolvedProgress,
      etaMs: completed ? 0 : this.remainingMs(),
      progressAt: now,
    });
  }

  private handleError(): void {
    // Transient GPS errors are routine (indoors, tunnels, device throttling):
    // the last fix stays authoritative so the timeline, the sticky destination
    // countdown and the map keep telling one consistent GPS-anchored story.
    // `expireStaleFix` degrades everything to the timetable once it goes stale.
    this.patch({ status: 'unavailable' });
  }

  /**
   * Drops the GPS anchor once no fresh fix has arrived for a while, so every
   * countdown (sticky ETA included) falls back to the timetable together
   * instead of drifting on a stale projection.
   */
  private expireStaleFix(): void {
    const status = this.stateSignal().status;

    if (status === 'idle' || status === 'completed' || this.anchorFraction === null) {
      return;
    }

    if (Date.now() - this.anchorAt <= TRIP_GPS_STALE_MS) {
      return;
    }

    this.anchorFraction = null;
    this.anchorAt = 0;
    this.patch({
      status: 'unavailable',
      progress: null,
      progressAt: null,
      userPosition: null,
      accuracyMeters: null,
    });
  }

  private remainingMs(): number {
    if (this.anchorFraction === null) {
      return Math.max(0, this.arriveAt - Date.now());
    }

    return estimateEtaMs(
      this.finalFraction,
      this.anchorFraction,
      this.anchorAt,
      this.planSpanMs,
      Date.now(),
    );
  }

  private patch(partial: Partial<LiveTripState>): void {
    this.stateSignal.update((previous) => ({ ...previous, ...partial }));
  }
}

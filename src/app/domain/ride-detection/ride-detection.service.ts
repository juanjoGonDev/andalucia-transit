import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { GeolocationService } from '@core/services/geolocation.service';
import { RideCandidateStop, RideLineDirectionCandidate, RideLineProposal, rankRideCandidates } from '@domain/ride-detection/ride-candidates.util';
import {
  RidePositionSample,
  computeOverallHeadingDeg,
  isRidingVehicle
} from '@domain/ride-detection/ride-detection.util';

const SAMPLE_RETENTION_MS = 120_000;
const RESCOOL_MS = 180_000; // re-propose at most every 3 minutes
const MAX_PROPOSALS = 3;

/** Data needed to score line direction candidates after the radius scan. */
export interface RideDirectionSource {
  /** Line directions serveable from a stop; resolves empty when unknown. */
  fetchDirections(stop: RideCandidateStop): Promise<readonly RideLineDirectionCandidate[]>;
}

export type RideDetectionPhase = 'idle' | 'collecting' | 'proposing';

/**
 * Turns GPS motion into floating proposals: watch position, classify sustained
 * vehicle movement, scan the stop corridor and rank line candidates. All data
 * stays on the device; only the stop directory snapshot is fetched locally.
 */
@Injectable({ providedIn: 'root' })
export class RideDetectionService implements OnDestroy {
  private readonly geolocation = new GeolocationService();
  private directionSource: RideDirectionSource | null = null;
  private stopsIndexLoader: ((center: { latitude: number; longitude: number }) => Promise<RideCandidateStop[]>) | null =
    null;

  private readonly samplesSignal = signal<readonly RidePositionSample[]>([]);
  private readonly phaseSignal = signal<RideDetectionPhase>('idle');
  private readonly proposalsSignal = signal<readonly RideLineProposal[]>([]);
  private watchStop: (() => void) | null = null;
  private dismissedAt: number | null = null;
  private proposedAt: number | null = null;

  readonly phase = this.phaseSignal.asReadonly();
  readonly proposals = this.proposalsSignal.asReadonly();
  readonly isActive = computed(() => this.phaseSignal() !== 'idle');

  /** Runtime injects the stops index adapter (data layer) on bootstrap. */
  configure(adapters: {
    stopsIndex: (center: { latitude: number; longitude: number }) => Promise<RideCandidateStop[]>;
    directions?: RideDirectionSource;
  }): void {
    this.stopsIndexLoader = adapters.stopsIndex;
    this.directionSource = adapters.directions ?? null;
  }

  async start(): Promise<void> {
    if (
      this.watchStop ||
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      return;
    }

    // Never prompt: only watch when the user has already granted location.
    if (
      typeof navigator !== 'undefined' &&
      navigator.permissions &&
      typeof navigator.permissions.query === 'function'
    ) {
      try {
        const status = await navigator.permissions.query({
          name: 'geolocation' as PermissionName
        });

        if (status.state !== 'granted') {
          return;
        }
      } catch {
        return; // permission introspection unavailable: stay silent
      }
    }

    if (this.watchStop) {
      return;
    }

    this.watchStop = this.geolocation.watchPosition(
      (position) => this.onPosition(position),
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 20_000 }
    );
  }

  ngOnDestroy(): void {
    this.stop();
  }

  stop(): void {
    this.watchStop?.();
    this.watchStop = null;
    this.phaseSignal.set('idle');
    this.proposalsSignal.set([]);
  }

  dismiss(): void {
    this.dismissedAt = Date.now();
    this.proposalsSignal.set([]);
    this.phaseSignal.set('idle');
  }

  /** Called by the UI after the user opened/confirmed one of the proposals. */
  accept(): void {
    this.proposedAt = Date.now();
    this.proposalsSignal.set([]);
    this.phaseSignal.set('idle');
  }

  private onPosition(position: GeolocationPosition): void {
    const sample: RidePositionSample = {
      coordinate: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      },
      speedMps: position.coords.speed ?? null,
      bearingDeg: position.coords.heading ?? null,
      at: position.timestamp
    };

    const now = Date.now();
    const retained = [...this.samplesSignal(), sample].filter(
      (entry) => now - entry.at <= SAMPLE_RETENTION_MS
    );
    this.samplesSignal.set(retained);

    if (this.phaseSignal() === 'proposing') {
      return;
    }

    if (this.dismissedAt !== null && now - this.dismissedAt < RESCOOL_MS) {
      return;
    }

    if (this.proposedAt !== null && now - this.proposedAt < RESCOOL_MS) {
      return;
    }

    if (!isRidingVehicle(retained, now)) {
      if (this.phaseSignal() === 'collecting') {
        this.phaseSignal.set('idle');
      }
      return;
    }

    this.phaseSignal.set('collecting');
    void this.propose(now).catch(() => undefined);
  }

  private async propose(now: number): Promise<void> {
    const stopsIndex = this.stopsIndexLoader;
    const samples = this.samplesSignal();
    const current = samples[samples.length - 1];
    const heading = computeOverallHeadingDeg(samples);

    if (!stopsIndex || !current || heading === null) {
      return;
    }

    const stops = await stopsIndex(current.coordinate);
    const nearest = stops.slice(0, 5);

    if (nearest.length === 0) {
      return;
    }

    const directionsMap: Record<string, readonly RideLineDirectionCandidate[]> = {};

    if (this.directionSource) {
      await Promise.all(
        nearest.map(async (stop) => {
          try {
            directionsMap[`${stop.consortiumId}:${stop.stopId}`] =
              await this.directionSource?.fetchDirections(stop) ?? [];
          } catch {
            directionsMap[`${stop.consortiumId}:${stop.stopId}`] = [];
          }
        })
      );
    }

    const proposals = rankRideCandidates(nearest, directionsMap, heading).slice(
      0,
      MAX_PROPOSALS
    );

    if (proposals.length === 0) {
      return;
    }

    this.proposalsSignal.set(proposals);
    this.phaseSignal.set('proposing');
    void now;
  }
}

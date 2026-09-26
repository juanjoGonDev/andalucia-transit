import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import {
  LineRouteWorkspaceService,
  LineRouteWorkspaceStop,
} from '@domain/lines/line-route-workspace.service';
import { LiveTripService, LiveTripState } from '@domain/trip/live-trip.service';
import { estimateEtaMs } from '@domain/trip/trip-progress.util';
import { TripSessionRecord, TripSessionStorage } from '@domain/trip/trip-session.storage';
import { buildCountdownDuration } from '@domain/utils/countdown-labels.util';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import { RouteMapComponent } from '@shared/map/route-map/route-map.component';
import { buildStopDetailNavigation } from '@shared/navigation/navigation.util';

const RECENTER_SCROLL_PX = 140;

const TRIP_KEYS = {
  headline: 'trip.headline',
  eta: 'trip.eta',
  locating: 'trip.locating',
  unavailable: 'trip.unavailable',
  completed: 'trip.completed',
  endTracking: 'trip.endTracking',
  recenter: 'trip.recenter',
  nextStopAnnouncement: 'trip.announcementNextStop',
  passedAnnouncement: 'trip.announcementPassed',
  backLabel: 'trip.backLabel',
  viewToggle: 'trip.viewToggle',
  viewList: 'trip.viewList',
  viewMap: 'trip.viewMap',
  mapLabel: 'trip.mapLabel',
  groupStops: 'trip.groupStops',
  stopNumber: 'trip.stopNumber',
  stopEta: 'trip.stopEta',
  stopPassed: 'trip.stopPassed',
  stopCurrent: 'trip.stopCurrent',
  stopInfoClose: 'trip.stopInfoClose',
  viewStop: 'trip.viewStop',
} as const;

type TripViewMode = 'list' | 'map';

interface TripStopView {
  readonly stopId: string;
  readonly name: string;
  readonly nucleusName: string | null;
  readonly nucleusOrdinal: number | null;
  readonly estimatedTime: Date;
  readonly projectedTime: Date;
  readonly etaMs: number;
  readonly countdownText: string | null;
  readonly segmentFill: number;
  readonly state: 'passed' | 'current' | 'next' | 'pending';
  readonly isLast: boolean;
}

interface TripStopGroupView {
  readonly key: string;
  readonly nucleusName: string | null;
  readonly stops: readonly TripStopView[];
}

interface TripStopMeta {
  readonly name: string;
  readonly nucleusName: string | null;
  readonly nucleusOrdinal: number | null;
}

/**
 * Full-screen live trip experience: the direction timeline grouped by nucleus, GPS-anchored
 * arrival countdowns, per-stop info popovers and a live map mode with the route, the user
 * position and the upcoming stop highlighted.
 */
@Component({
  selector: 'app-trip',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AccessibleButtonDirective,
    AppLayoutContentDirective,
    RouteMapComponent,
  ],
  templateUrl: './trip.component.html',
  styleUrls: ['./trip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripComponent implements OnInit, OnDestroy {
  private readonly liveTrip = inject(LiveTripService);
  private readonly sessions = inject(TripSessionStorage);
  private readonly workspace = inject(LineRouteWorkspaceService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  protected readonly keys = TRIP_KEYS;
  protected readonly layoutNavigationKey = this.config.routes.trip;
  protected readonly state = this.liveTrip.state;
  protected readonly stopsView = signal<readonly TripStopView[]>([]);
  protected readonly stopGroups = signal<readonly TripStopGroupView[]>([]);
  protected readonly announcement = signal('');
  protected readonly autoScrollActive = signal(true);
  protected readonly viewMode = signal<TripViewMode>('list');
  protected readonly selectedStopId = signal<string | null>(null);
  protected readonly mapStops = signal<readonly LineRouteWorkspaceStop[]>([]);
  protected readonly mapCoordinates = signal<readonly GeoCoordinate[]>([]);

  protected readonly travelComplete = computed(() => {
    const state = this.state();
    return (
      state.status === 'completed' ||
      (state.status === 'tracking' && state.progress !== null && state.etaMs <= 0)
    );
  });

  protected readonly etaLabel = computed(() =>
    this.formatCountdown(this.destinationEtaMs()),
  );

  /**
   * Destination countdown taken from the same stop view the timeline renders, so
   * the sticky header always shows exactly what the destination row (and its map
   * popup) shows — one GPS-anchored number everywhere.
   */
  protected readonly destinationEtaMs = computed(() => {
    const stops = this.stopsView();
    const destination = stops.length > 0 ? stops[stops.length - 1] : null;
    return destination ? destination.etaMs : this.state().etaMs;
  });

  protected readonly nextStopId = computed(() => this.state().progress?.nextStop?.stopId ?? null);

  /** Stop info shown in the list popover: only after an explicit tap. */
  protected readonly selectedStopInfo = computed(() => {
    const stopId = this.selectedStopId();
    return stopId === null
      ? null
      : (this.stopsView().find((stop) => stop.stopId === stopId) ?? null);
  });

  /** Stop highlighted on the map: manual pick first, otherwise it follows the next stop. */
  protected readonly mapActiveStopId = computed(() => this.selectedStopId() ?? this.nextStopId());

  /** Next-stop popovers can be dismissed until the upcoming stop changes again. */
  private readonly mapAutoDismissedFor = signal<string | null>(null);

  protected readonly mapStopInfo = computed(() => {
    const manual = this.selectedStopId();
    const stops = this.stopsView();

    if (manual !== null) {
      return stops.find((stop) => stop.stopId === manual) ?? null;
    }

    const next = this.nextStopId();

    if (next === null || this.mapAutoDismissedFor() === next) {
      return null;
    }

    return stops.find((stop) => stop.stopId === next) ?? null;
  });

  protected readonly mapOriginIds = computed(() =>
    this.session ? [this.session.originStopId] : [],
  );
  protected readonly mapDestinationIds = computed(() =>
    this.session ? [this.session.destinationStopId] : [],
  );

  private readonly timelineRef = viewChild<ElementRef<HTMLOListElement>>('timeline');
  private readonly routeMapRef = viewChild<RouteMapComponent>('routeMap');
  private session: TripSessionRecord | null = null;
  private lastAnnouncedStopId: string | null = null;
  private arrivalAnnounced = false;
  private stopsMeta: readonly TripStopMeta[] = [];

  constructor() {
    effect(() => {
      const state = this.state();
      this.renderStops(state);
      this.announceProgress(state);
    });
  }

  ngOnInit(): void {
    const session = this.sessions.load();

    if (!session) {
      void this.router.navigate(['/']);
      return;
    }

    this.session = session;
    this.workspace
      .load({
        consortiumId: session.consortiumId,
        lineId: session.lineId,
        direction: session.direction,
        segment: {
          originStopIds: [session.originStopId],
          destinationStopIds: [session.destinationStopId],
        },
      })
      .pipe(catchError(() => of(null)))
      .subscribe((view) => {
        if (!view || !this.session) {
          this.liveTrip.stopTracking();
          void this.router.navigate(['/']);
          return;
        }

        const geoStops = view.stops.map((stop) => ({
          stopId: stop.stopId,
          latitude: stop.latitude,
          longitude: stop.longitude,
        }));
        this.stopsMeta = view.stops.map((stop) => ({
          name: stop.name,
          nucleusName: stop.nucleusName ?? null,
          nucleusOrdinal: stop.nucleusOrdinal ?? null,
        }));
        this.mapStops.set(view.stops);
        const coordinates = view.coordinates.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }));
        this.mapCoordinates.set(coordinates);

        this.liveTrip.startTracking(this.session, geoStops, coordinates);
        this.scrollToCurrentStop();
      });
  }

  ngOnDestroy(): void {
    this.liveTrip.stopTracking();
  }

  @HostListener('window:scroll')
  protected onUserScroll(): void {
    if (this.viewMode() !== 'list') {
      return;
    }

    const timeline = this.timelineRef()?.nativeElement;

    if (!timeline) {
      return;
    }

    const current = timeline.querySelector<HTMLElement>('.trip__stop--current');
    const anchor = current ?? timeline.querySelector<HTMLElement>('.trip__stop--next');

    if (!anchor) {
      return;
    }

    const anchorDistance = Math.abs(anchor.getBoundingClientRect().top - window.innerHeight / 2);
    this.autoScrollActive.set(anchorDistance <= RECENTER_SCROLL_PX);
  }

  protected trackGroup(_index: number, group: TripStopGroupView): string {
    return group.key;
  }

  protected trackStop(_index: number, stop: TripStopView): string {
    return stop.stopId;
  }

  protected setViewMode(mode: TripViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }

    this.viewMode.set(mode);

    if (mode === 'list') {
      this.autoScrollActive.set(true);
      queueMicrotask(() => this.scrollToCurrentStop());
    }
  }

  protected recenter(): void {
    if (this.viewMode() === 'map') {
      const map = this.routeMapRef();
      const activeStopId = this.mapActiveStopId();

      if (map && !map.centerOnUser() && activeStopId) {
        map.centerStop(activeStopId);
      }
      return;
    }

    this.autoScrollActive.set(true);
    this.scrollToCurrentStop();
  }

  protected toggleStopInfo(stopId: string): void {
    this.selectedStopId.update((current) => (current === stopId ? null : stopId));
  }

  protected closeStopInfo(): void {
    if (this.viewMode() === 'map' && this.selectedStopId() === null) {
      this.mapAutoDismissedFor.set(this.nextStopId());
    }

    this.selectedStopId.set(null);
  }

  protected onMapStopSelected(stopId: string): void {
    this.selectedStopId.set(stopId);
  }

  protected infoEtaLabel(info: TripStopView): string {
    return this.formatCountdown(info.etaMs);
  }

  private formatCountdown(etaMs: number): string {
    const duration = buildCountdownDuration(Math.ceil(etaMs / 1000));
    return this.translate.instant(`countdown.${duration.unit}`, { value: duration.value });
  }

  protected openStopDetail(stopId: string): void {
    if (!this.session) {
      return;
    }

    const navigation = buildStopDetailNavigation(this.session.consortiumId, stopId);

    if (navigation.commands.length === 0) {
      return;
    }

    void this.router.navigate(navigation.commands, { queryParams: navigation.queryParams });
  }

  protected endTracking(): void {
    this.liveTrip.stopTracking();
    void this.router.navigate(['/']);
  }

  protected goBack(): void {
    void this.router.navigate(['/']);
  }

  private renderStops(state: LiveTripState): void {
    if (!this.session || state.stopTimes.length === 0 || this.stopsMeta.length === 0) {
      return;
    }

    const fraction = state.progress?.fraction ?? 0;
    const currentIndex = state.progress?.currentStopIndex ?? -1;
    const nextIndex = state.progress?.nextStopIndex ?? 0;
    const completed = this.travelComplete();
    const now = Date.now();

    const total = state.stopTimes.length;

    const views: TripStopView[] = state.stopTimes.map((timing, index) => {
      const nextFraction = index + 1 < total ? state.stopTimes[index + 1].fraction : 1;
      const span = Math.max(0.0001, nextFraction - timing.fraction);
      const rawFill = (fraction - timing.fraction) / span;
      const segmentFill =
        completed || index === total - 1 ? (completed ? 1 : 0) : Math.max(0, Math.min(1, rawFill));

      let stopState: TripStopView['state'];
      if (completed) {
        stopState = index === total - 1 ? 'current' : 'passed';
      } else if (index < currentIndex) {
        stopState = 'passed';
      } else if (index === currentIndex) {
        stopState = 'current';
      } else if (index === nextIndex && (currentIndex >= 0 || fraction > 0)) {
        stopState = 'next';
      } else {
        stopState = 'pending';
      }

      const reached = stopState === 'passed' || stopState === 'current';
      const etaMs = reached ? 0 : this.stopEtaMs(timing.fraction, timing.estimatedTime, state, now);
      const countdownText = reached ? null : buildCountdownDuration(Math.ceil(etaMs / 1000)).text;
      const meta = this.stopsMeta[index];

      return {
        stopId: timing.stopId,
        name: meta?.name ?? timing.stopId,
        nucleusName: meta?.nucleusName ?? null,
        nucleusOrdinal: meta?.nucleusOrdinal ?? null,
        estimatedTime: timing.estimatedTime,
        projectedTime: reached ? timing.estimatedTime : new Date(now + etaMs),
        etaMs,
        countdownText,
        segmentFill,
        state: stopState,
        isLast: index === total - 1,
      };
    });

    this.stopsView.set(views);
    this.stopGroups.set(buildStopGroups(views));

    if (this.autoScrollActive() && this.viewMode() === 'list') {
      this.scrollToCurrentStop();
    }
  }

  /**
   * GPS-anchored countdown for a stop: plan pace re-anchored to the latest fix, decaying
   * between fixes. Before the first fix it falls back to the timetable estimate.
   */
  private stopEtaMs(
    stopFraction: number,
    estimatedTime: Date,
    state: LiveTripState,
    now: number,
  ): number {
    if (state.progress !== null && state.progressAt !== null) {
      return estimateEtaMs(
        stopFraction,
        state.progress.fraction,
        state.progressAt,
        state.planSpanMs,
        now,
      );
    }

    return Math.max(0, estimatedTime.getTime() - now);
  }

  private announceProgress(state: LiveTripState): void {
    if (!this.session) {
      return;
    }

    if (this.travelComplete()) {
      if (!this.arrivalAnnounced) {
        this.arrivalAnnounced = true;
        this.announcement.set(
          this.translate.instant(this.keys.completed, {
            destination: this.session.destinationName,
          }),
        );
      }
      return;
    }

    const nextStop = state.progress?.nextStop;

    if (!nextStop || nextStop.stopId === this.lastAnnouncedStopId) {
      return;
    }

    if (this.lastAnnouncedStopId !== null) {
      const nextIndex = state.progress?.nextStopIndex ?? 0;
      const timing = state.stopTimes[nextIndex];
      const name = this.stopsMeta[nextIndex]?.name ?? nextStop.stopId;
      // Announce the next stop's own countdown, matching what its timeline row
      // and map popup show — never the destination-wide ETA.
      const etaMs = timing
        ? this.stopEtaMs(timing.fraction, timing.estimatedTime, state, Date.now())
        : this.state().etaMs;
      this.announcement.set(
        this.translate.instant(this.keys.nextStopAnnouncement, {
          stop: name,
          time: this.formatCountdown(etaMs),
        }),
      );
    }

    this.lastAnnouncedStopId = nextStop.stopId;
  }

  private scrollToCurrentStop(): void {
    const timeline = this.timelineRef()?.nativeElement;

    if (!timeline) {
      return;
    }

    const anchor =
      timeline.querySelector<HTMLElement>('.trip__stop--current') ??
      timeline.querySelector<HTMLElement>('.trip__stop--next') ??
      (timeline.firstElementChild as HTMLElement | null);

    anchor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/** Groups consecutive stops sharing a nucleus so the town name renders only once. */
function buildStopGroups(stops: readonly TripStopView[]): readonly TripStopGroupView[] {
  const groups: TripStopGroupView[] = [];
  let currentKey: string | null = null;
  let currentName: string | null = null;
  let bucket: TripStopView[] = [];

  const flush = (): void => {
    if (bucket.length === 0) {
      return;
    }

    groups.push({
      key: `${currentName ?? 'no-nucleus'}:${bucket[0].stopId}`,
      nucleusName: currentName,
      stops: bucket,
    });
    bucket = [];
  };

  for (const stop of stops) {
    const name = stop.nucleusName;

    if (currentKey === null || name !== currentName) {
      flush();
      currentName = name;
      currentKey = name ?? 'no-nucleus';
    }

    bucket.push(stop);
  }

  flush();
  return groups;
}

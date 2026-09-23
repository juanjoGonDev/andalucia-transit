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
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { LineRouteWorkspaceService } from '@domain/lines/line-route-workspace.service';
import { LiveTripService, LiveTripState } from '@domain/trip/live-trip.service';
import { TripSessionRecord, TripSessionStorage } from '@domain/trip/trip-session.storage';
import { buildCountdownDuration } from '@domain/utils/countdown-labels.util';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';

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
  backLabel: 'trip.backLabel'
} as const;

interface TripStopView {
  readonly stopId: string;
  readonly name: string;
  readonly estimatedTime: Date;
  readonly segmentFill: number;
  readonly state: 'passed' | 'current' | 'next' | 'pending';
}

/**
 * Full-screen live trip experience: the complete direction timeline, schedule-based ETA,
 * progressive fill driven by GPS position and a sticky destination + ETA header.
 */
@Component({
  selector: 'app-trip',
  standalone: true,
  imports: [CommonModule, TranslateModule, AccessibleButtonDirective, AppLayoutContentDirective],
  templateUrl: './trip.component.html',
  styleUrls: ['./trip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
  protected readonly announcement = signal('');
  protected readonly autoScrollActive = signal(true);
  protected readonly travelComplete = computed(() => this.state().status === 'completed');
  protected readonly etaLabel = computed(() => {
    const seconds = Math.ceil(this.state().etaMs / 1000);
    const duration = buildCountdownDuration(seconds);
    return this.translate.instant(`countdown.${duration.unit}`, { value: duration.value });
  });

  private readonly timelineRef = viewChild<ElementRef<HTMLOListElement>>('timeline');
  private session: TripSessionRecord | null = null;
  private lastAnnouncedStopId: string | null = null;
  private stopNames: readonly string[] = [];

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
          destinationStopIds: [session.destinationStopId]
        }
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
          longitude: stop.longitude
        }));
        this.stopNames = view.stops.map((stop) => stop.name);
        const coordinates = view.coordinates.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude
        }));

        this.liveTrip.startTracking(this.session, geoStops, coordinates);
        this.scrollToCurrentStop();
      });
  }

  ngOnDestroy(): void {
    this.liveTrip.stopTracking();
  }

  @HostListener('window:scroll')
  protected onUserScroll(): void {
    const timeline = this.timelineRef()?.nativeElement;

    if (!timeline) {
      return;
    }

    const current = timeline.querySelector<HTMLElement>('.trip__stop--current');
    const anchor = current ?? timeline.querySelector<HTMLElement>('.trip__stop--next');

    if (!anchor) {
      return;
    }

    const anchorDistance = Math.abs(
      anchor.getBoundingClientRect().top - window.innerHeight / 2
    );
    this.autoScrollActive.set(anchorDistance <= RECENTER_SCROLL_PX);
  }

  protected trackStop(_index: number, stop: TripStopView): string {
    return stop.stopId;
  }

  protected recenter(): void {
    this.autoScrollActive.set(true);
    this.scrollToCurrentStop();
  }

  protected endTracking(): void {
    this.liveTrip.stopTracking();
    void this.router.navigate(['/']);
  }

  protected goBack(): void {
    void this.router.navigate(['/']);
  }

  private renderStops(state: LiveTripState): void {
    if (!this.session || state.stopTimes.length === 0 || this.stopNames.length === 0) {
      return;
    }

    const fraction = state.progress?.fraction ?? 0;
    const currentIndex = state.progress?.currentStopIndex ?? -1;
    const nextIndex = state.progress?.nextStopIndex ?? 0;
    const completed = state.status === 'completed';

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

      return {
        stopId: timing.stopId,
        name: this.stopNames[index] ?? timing.stopId,
        estimatedTime: timing.estimatedTime,
        segmentFill,
        state: stopState
      };
    });

    this.stopsView.set(views);

    if (this.autoScrollActive()) {
      this.scrollToCurrentStop();
    }
  }

  private announceProgress(state: LiveTripState): void {
    if (!this.session) {
      return;
    }

    if (state.status === 'completed') {
      this.announcement.set(
        this.translate.instant(this.keys.completed, { destination: this.session.destinationName })
      );
      return;
    }

    const nextStop = state.progress?.nextStop;

    if (!nextStop || nextStop.stopId === this.lastAnnouncedStopId) {
      return;
    }

    if (this.lastAnnouncedStopId !== null) {
      const name = this.stopNames[state.progress?.nextStopIndex ?? 0] ?? nextStop.stopId;
      this.announcement.set(
        this.translate.instant(this.keys.nextStopAnnouncement, {
          stop: name,
          time: this.etaLabel()
        })
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
      (timeline.querySelector<HTMLElement>('.trip__stop--current') ??
        timeline.querySelector<HTMLElement>('.trip__stop--next')) ??
      timeline.firstElementChild as HTMLElement | null;

    anchor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

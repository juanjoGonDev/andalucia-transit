import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { StopScheduleFacade } from '@domain/stop-schedule/stop-schedule.facade';
import { StopScheduleResult } from '@domain/stop-schedule/stop-schedule.model';
import {
  StopScheduleUiModel,
  buildStopScheduleUiModel
} from '@domain/stop-schedule/stop-schedule.transform';
import { StopUtilityComponent } from '@features/stop-detail/stop-utility/stop-utility.component';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';

const ALL_DESTINATIONS_OPTION = 'all';
const STATUS_ROLE = 'status';
const POLITE_LIVE = 'polite';
const ASSERTIVE_LIVE = 'assertive';
const CONSORTIUM_QUERY_PARAM = APP_CONFIG.routeParams.stopInfo.consortiumId;
const UNSIGNED_INTEGER_PATTERN = /^\d+$/;
const ARROW_LEFT_KEY = 'ArrowLeft';
const ARROW_RIGHT_KEY = 'ArrowRight';
const HOME_KEY = 'Home';
const END_KEY = 'End';
const STEP_PREVIOUS = -1;
const STEP_NEXT = 1;

export type StopDetailSection = 'departures' | 'lines' | 'directions';

const STOP_DETAIL_SECTIONS: readonly StopDetailSection[] = Object.freeze([
  'departures',
  'lines',
  'directions'
]);

export interface StopRouteContext {
  readonly stopId: string;
  readonly consortiumId: number | null;
}

const areStopRouteContextsEqual = (left: StopRouteContext, right: StopRouteContext): boolean =>
  left.stopId === right.stopId && left.consortiumId === right.consortiumId;

type ScheduleItem = StopScheduleUiModel['upcoming'][number] | StopScheduleUiModel['past'][number];

type ScheduleState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'success'; readonly result: StopScheduleResult };

@Component({
  selector: 'app-stop-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    AppLayoutContentDirective,
    AccessibleButtonDirective,
    StopUtilityComponent
  ],
  templateUrl: './stop-detail.component.html',
  styleUrls: ['./stop-detail.component.scss', './stop-detail.component-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StopDetailComponent {
  private static readonly ROOT_COMMAND = '/' as const;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stopScheduleFacade = inject(StopScheduleFacade);
  private readonly translate = inject(TranslateService);
  private readonly scheduleRefresh = new Subject<void>();

  protected readonly translationKeys = APP_CONFIG.translationKeys.stopDetail;
  protected readonly retryKey = APP_CONFIG.translationKeys.home.dialogs.nearbyStops.retry;
  protected readonly linesLabelKey = APP_CONFIG.translationKeys.navigation.lines;
  protected readonly directionsLabelKey = APP_CONFIG.translationKeys.stopInfo.directions.title;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.stopDetailBase;
  protected readonly destinationControl = new FormControl<string>(ALL_DESTINATIONS_OPTION, {
    nonNullable: true
  });
  protected readonly activeSection = signal<StopDetailSection>('departures');
  protected readonly statusRole = STATUS_ROLE;
  protected readonly politeLiveRegion = POLITE_LIVE;
  protected readonly assertiveLiveRegion = ASSERTIVE_LIVE;

  private readonly stopIdParam$: Observable<string | null> = this.route.paramMap.pipe(
    map((params) => params.get(APP_CONFIG.routeParams.stopId)),
    map((stopId) => stopId?.trim() ?? ''),
    map((stopId) => (stopId.length > 0 ? stopId : null)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly stopId$: Observable<string> = this.stopIdParam$.pipe(
    filter((stopId): stopId is string => stopId !== null)
  );

  private readonly consortiumId$: Observable<number | null> = this.route.queryParamMap.pipe(
    map((params) => parseConsortiumId(params.get(CONSORTIUM_QUERY_PARAM))),
    distinctUntilChanged()
  );

  protected readonly stopRouteContext$: Observable<StopRouteContext> = combineLatest([
    this.stopId$,
    this.consortiumId$
  ]).pipe(
    map(([stopId, consortiumId]) => ({ stopId, consortiumId }) satisfies StopRouteContext),
    distinctUntilChanged(areStopRouteContextsEqual),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly scheduleState$: Observable<ScheduleState> = this.stopRouteContext$.pipe(
    switchMap(({ stopId, consortiumId }) =>
      this.scheduleRefresh.pipe(
        startWith(undefined),
        switchMap(() =>
          this.loadStopSchedule(stopId, consortiumId).pipe(
            map((result) => ({ status: 'success', result }) as const),
            startWith({ status: 'loading' } as const),
            catchError(() => of({ status: 'error' } as const))
          )
        )
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly scheduleResult$: Observable<StopScheduleResult> = this.scheduleState$.pipe(
    filter(
      (state): state is Extract<ScheduleState, { status: 'success' }> => state.status === 'success'
    ),
    map((state) => state.result),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly isLoading$ = this.scheduleState$.pipe(
    map((state) => state.status === 'loading'),
    distinctUntilChanged()
  );

  protected readonly loadError$ = this.scheduleState$.pipe(
    map((state) => state.status === 'error'),
    distinctUntilChanged()
  );

  protected readonly viewModel$: Observable<StopScheduleUiModel> = combineLatest([
    this.scheduleResult$,
    this.destinationControl.valueChanges.pipe(startWith(this.destinationControl.value))
  ]).pipe(
    map(([result, destination]) =>
      buildStopScheduleUiModel(
        result,
        new Date(),
        destination === ALL_DESTINATIONS_OPTION ? null : destination
      )
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  protected readonly allDestinationsOption = ALL_DESTINATIONS_OPTION;
  protected readonly trackByServiceId = (_: number, item: ScheduleItem): string => item.serviceId;

  protected readonly timelineAnnouncement$ = combineLatest([
    this.viewModel$,
    this.translate.onLangChange.pipe(startWith(null))
  ]).pipe(
    map(([viewModel]) => this.buildTimelineAnnouncement(viewModel)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.stopIdParam$
      .pipe(
        filter((stopId): stopId is null => stopId === null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.redirectToHome());
  }

  protected retrySchedule(): void {
    this.scheduleRefresh.next();
  }

  protected selectSection(section: StopDetailSection): void {
    this.activeSection.set(section);
  }

  protected isSectionActive(section: StopDetailSection): boolean {
    return this.activeSection() === section;
  }

  protected sectionTabIndex(section: StopDetailSection): number {
    return this.isSectionActive(section) ? 0 : -1;
  }

  protected onSectionTabKeydown(event: KeyboardEvent, section: StopDetailSection): void {
    const currentIndex = STOP_DETAIL_SECTIONS.indexOf(section);
    let nextIndex = currentIndex;

    if (event.key === ARROW_LEFT_KEY) {
      nextIndex = (currentIndex + STEP_PREVIOUS + STOP_DETAIL_SECTIONS.length) % STOP_DETAIL_SECTIONS.length;
    } else if (event.key === ARROW_RIGHT_KEY) {
      nextIndex = (currentIndex + STEP_NEXT) % STOP_DETAIL_SECTIONS.length;
    } else if (event.key === HOME_KEY) {
      nextIndex = 0;
    } else if (event.key === END_KEY) {
      nextIndex = STOP_DETAIL_SECTIONS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextSection = STOP_DETAIL_SECTIONS[nextIndex];

    if (!nextSection) {
      return;
    }

    this.selectSection(nextSection);
    const tabList = (event.currentTarget as HTMLElement | null)?.parentElement;
    const nextTab = tabList?.querySelector<HTMLButtonElement>(
      `[data-stop-section="${nextSection}"]`
    );
    nextTab?.focus();
  }

  private loadStopSchedule(
    stopId: string,
    consortiumId: number | null
  ): Observable<StopScheduleResult> {
    if (consortiumId === null) {
      return this.stopScheduleFacade.loadStopSchedule(stopId);
    }

    return this.stopScheduleFacade.loadStopSchedule(stopId, { consortiumId });
  }

  private redirectToHome(): void {
    void this.router.navigate([StopDetailComponent.ROOT_COMMAND, APP_CONFIG.routes.home]);
  }

  private buildTimelineAnnouncement(viewModel: StopScheduleUiModel): string | null {
    if (!viewModel.upcoming.length) {
      return null;
    }

    const nextService = viewModel.upcoming.find((service) => service.isNext) ?? viewModel.upcoming[0];

    if (!nextService) {
      return null;
    }

    const statusKey =
      nextService.minutesUntilArrival <= 0
        ? this.translationKeys.status.arrivingNow
        : this.translationKeys.status.arrivesIn;

    const statusParams =
      nextService.minutesUntilArrival <= 0
        ? undefined
        : { minutes: nextService.minutesUntilArrival };

    const statusText = this.translate.instant(statusKey, statusParams ?? {});
    const boundedProgress = Math.max(0, Math.min(100, Math.round(nextService.progressPercentage)));
    const message = this.translate.instant(this.translationKeys.announcements.progress, {
      lineCode: nextService.lineCode,
      destination: nextService.destination,
      statusText,
      percentage: boundedProgress
    });
    const normalized = message.trim();

    return normalized.length > 0 ? normalized : null;
  }
}

function parseConsortiumId(value: string | null): number | null {
  const normalized = value?.trim() ?? '';

  if (!normalized || !UNSIGNED_INTEGER_PATTERN.test(normalized)) {
    return null;
  }

  const consortiumId = Number(normalized);
  return Number.isSafeInteger(consortiumId) ? consortiumId : null;
}

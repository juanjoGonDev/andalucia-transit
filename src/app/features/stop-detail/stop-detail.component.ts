import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Observable,
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { StopScheduleFacade } from '@domain/stop-schedule/stop-schedule.facade';
import { StopScheduleResult } from '@domain/stop-schedule/stop-schedule.model';
import {
  StopScheduleUiModel,
  buildStopScheduleUiModel,
} from '@domain/stop-schedule/stop-schedule.transform';
import { StopDirectoryFacade } from '@domain/stops/stop-directory.facade';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import {
  APP_LAYOUT_CONTEXT,
  AppLayoutContext,
  AppLayoutTabRegistration,
} from '@shared/layout/app-layout-context.token';

const ALL_DESTINATIONS_OPTION = 'all';
const STATUS_ROLE = 'status';
const POLITE_LIVE = 'polite';
const ASSERTIVE_LIVE = 'assertive';
export const STOP_TIMELINE_UPCOMING_TAB_ID = 'stop-detail-timeline-upcoming' as const;
export const STOP_TIMELINE_PAST_TAB_ID = 'stop-detail-timeline-past' as const;

type StopInfoCommands = readonly string[] | null;

const areStopInfoCommandsEqual = (left: StopInfoCommands, right: StopInfoCommands): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
};

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
    AccessibleButtonDirective
  ],
  templateUrl: './stop-detail.component.html',
  styleUrls: ['./stop-detail.component.scss', './stop-detail.component-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StopDetailComponent {
  private static readonly ROOT_COMMAND = '/' as const;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stopScheduleFacade = inject(StopScheduleFacade);
  private readonly layoutContext: AppLayoutContext = inject(APP_LAYOUT_CONTEXT);
  private readonly stopDirectoryFacade = inject(StopDirectoryFacade);
  private readonly translate = inject(TranslateService);

  protected readonly translationKeys = APP_CONFIG.translationKeys.stopDetail;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.stopDetailBase;
  protected readonly actionKeys = this.translationKeys.actions;
  protected readonly destinationControl = new FormControl<string>(ALL_DESTINATIONS_OPTION, {
    nonNullable: true,
  });
  protected readonly statusRole = STATUS_ROLE;
  protected readonly politeLiveRegion = POLITE_LIVE;
  protected readonly assertiveLiveRegion = ASSERTIVE_LIVE;
  private readonly timelineTabs: readonly AppLayoutTabRegistration[] = [
    {
      identifier: STOP_TIMELINE_UPCOMING_TAB_ID,
      labelKey: this.translationKeys.schedule.upcomingTitle,
    },
    {
      identifier: STOP_TIMELINE_PAST_TAB_ID,
      labelKey: this.translationKeys.schedule.pastTitle,
    },
  ];

  private readonly stopIdParam$: Observable<string | null> = this.route.paramMap.pipe(
    map((params) => params.get(APP_CONFIG.routeParams.stopId)),
    map((stopId) => stopId?.trim() ?? ''),
    map((stopId) => (stopId.length > 0 ? stopId : null)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly stopId$: Observable<string> = this.stopIdParam$.pipe(
    filter((stopId): stopId is string => stopId !== null),
  );

  private readonly scheduleState$: Observable<ScheduleState> = this.stopId$.pipe(
    switchMap((stopId) =>
      this.stopScheduleFacade.loadStopSchedule(stopId).pipe(
        map((result) => ({ status: 'success', result }) as const),
        startWith({ status: 'loading' } as const),
        catchError(() => of({ status: 'error' } as const)),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly scheduleResult$: Observable<StopScheduleResult> = this.scheduleState$.pipe(
    filter(
      (state): state is Extract<ScheduleState, { status: 'success' }> => state.status === 'success',
    ),
    map((state) => state.result),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected readonly isLoading$ = this.scheduleState$.pipe(
    map((state) => state.status === 'loading'),
    distinctUntilChanged(),
  );

  protected readonly loadError$ = this.scheduleState$.pipe(
    map((state) => state.status === 'error'),
    distinctUntilChanged(),
  );

  protected readonly stopInfoCommands$ = this.stopId$.pipe(
    switchMap((stopId) =>
      this.stopDirectoryFacade.getRecordByStopId(stopId).pipe(
        map((record): StopInfoCommands => {
          if (!record) {
            return null;
          }

          return [
            StopDetailComponent.ROOT_COMMAND,
            APP_CONFIG.routes.stopInfoBase,
            record.consortiumId.toString(),
            stopId,
          ];
        }),
      ),
    ),
    startWith<StopInfoCommands>(null),
    distinctUntilChanged(areStopInfoCommandsEqual),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected readonly viewModel$: Observable<StopScheduleUiModel> = combineLatest([
    this.scheduleResult$,
    this.destinationControl.valueChanges.pipe(startWith(this.destinationControl.value)),
  ]).pipe(
    map(([result, destination]) =>
      buildStopScheduleUiModel(
        result,
        new Date(),
        destination === ALL_DESTINATIONS_OPTION ? null : destination,
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
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
    this.layoutContext.configureTabs(this.timelineTabs);
    this.layoutContext.setActiveTab(STOP_TIMELINE_UPCOMING_TAB_ID);
    this.destroyRef.onDestroy(() => this.layoutContext.clearTabs());

    this.stopIdParam$
      .pipe(
        filter((stopId): stopId is null => stopId === null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.redirectToHome());

    this.scheduleState$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((state) => {
      if (state.status !== 'success') {
        this.layoutContext.setActiveTab(STOP_TIMELINE_UPCOMING_TAB_ID);
      }
    });

    this.viewModel$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((viewModel) => this.syncTimelineTab(viewModel));
  }

  protected async openStopInfo(commands: readonly string[]): Promise<void> {
    await this.router.navigate(commands);
  }

  private redirectToHome(): void {
    void this.router.navigate([StopDetailComponent.ROOT_COMMAND, APP_CONFIG.routes.home]);
  }

  private syncTimelineTab(viewModel: StopScheduleUiModel): void {
    const nextActive =
      viewModel.upcoming.length > 0 ? STOP_TIMELINE_UPCOMING_TAB_ID : STOP_TIMELINE_PAST_TAB_ID;

    this.layoutContext.setActiveTab(nextActive);
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

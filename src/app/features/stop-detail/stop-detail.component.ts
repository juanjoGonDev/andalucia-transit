import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  switchMap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { APP_CONFIG } from '../../core/config';
import { StopScheduleFacade } from '../../domain/stop-schedule/stop-schedule.facade';
import {
  buildStopScheduleUiModel,
  StopScheduleUiModel
} from '../../domain/stop-schedule/stop-schedule.transform';
import { StopScheduleResult } from '../../domain/stop-schedule/stop-schedule.model';

const ALL_DESTINATIONS_OPTION = 'all';

type ScheduleItem = StopScheduleUiModel['upcoming'][number] | StopScheduleUiModel['past'][number];

type ScheduleState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'success'; readonly result: StopScheduleResult };

@Component({
  selector: 'app-stop-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
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

  protected readonly translationKeys = APP_CONFIG.translationKeys.stopDetail;
  protected readonly destinationControl = new FormControl<string>(ALL_DESTINATIONS_OPTION, {
    nonNullable: true
  });

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

  private readonly scheduleState$: Observable<ScheduleState> = this.stopId$.pipe(
    switchMap((stopId) =>
      this.stopScheduleFacade.loadStopSchedule(stopId).pipe(
        map((result) => ({ status: 'success', result }) as const),
        startWith({ status: 'loading' } as const),
        catchError(() => of({ status: 'error' } as const))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly scheduleResult$: Observable<StopScheduleResult> = this.scheduleState$.pipe(
    filter(
      (state): state is Extract<ScheduleState, { status: 'success' }> =>
        state.status === 'success'
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
      buildStopScheduleUiModel(result, new Date(), destination === ALL_DESTINATIONS_OPTION ? null : destination)
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  protected readonly allDestinationsOption = ALL_DESTINATIONS_OPTION;

  protected readonly trackByServiceId = (_: number, item: ScheduleItem): string => item.serviceId;

  constructor() {
    this.stopIdParam$
      .pipe(
        filter((stopId): stopId is null => stopId === null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.redirectToHome());

    this.viewModel$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private redirectToHome(): void {
    void this.router.navigate([StopDetailComponent.ROOT_COMMAND, APP_CONFIG.routes.home]);
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Observable,
  combineLatest,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  distinctUntilChanged
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { APP_CONFIG } from '../../core/config';
import { MockStopScheduleService } from '../../data/services/mock-stop-schedule.service';
import { buildStopScheduleUiModel, StopScheduleUiModel } from '../../domain/stop-schedule/stop-schedule.transform';

const ALL_DESTINATIONS_OPTION = 'all';

type ScheduleItem = StopScheduleUiModel['upcoming'][number] | StopScheduleUiModel['past'][number];

@Component({
  selector: 'app-stop-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './stop-detail.component.html',
  styleUrl: './stop-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StopDetailComponent {
  private static readonly ROOT_COMMAND = '/' as const;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stopScheduleService = inject(MockStopScheduleService);

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

  private readonly schedule$ = this.stopId$.pipe(
    switchMap((stopId) => this.stopScheduleService.getStopSchedule(stopId)),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  protected readonly isLoading$ = this.schedule$.pipe(map(() => false), startWith(true));

  protected readonly viewModel$: Observable<StopScheduleUiModel> = combineLatest([
    this.schedule$,
    this.destinationControl.valueChanges.pipe(startWith(this.destinationControl.value))
  ]).pipe(
    map(([schedule, destination]) =>
      buildStopScheduleUiModel(
        schedule,
        new Date(),
        destination === ALL_DESTINATIONS_OPTION ? null : destination
      )
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

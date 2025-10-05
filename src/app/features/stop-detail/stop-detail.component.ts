import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, combineLatest, map, shareReplay, startWith } from 'rxjs';

import { APP_CONFIG } from '../../core/config';
import { MockStopScheduleService, MOCK_STOP_ID } from '../../data/services/mock-stop-schedule.service';
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
  private readonly stopScheduleService = inject(MockStopScheduleService);

  protected readonly translationKeys = APP_CONFIG.translationKeys.stopDetail;
  protected readonly destinationControl = new FormControl<string>(ALL_DESTINATIONS_OPTION, {
    nonNullable: true
  });

  private readonly schedule$ = this.stopScheduleService
    .getStopSchedule(MOCK_STOP_ID)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

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
    )
  );

  protected readonly allDestinationsOption = ALL_DESTINATIONS_OPTION;

  protected readonly trackByServiceId = (_: number, item: ScheduleItem): string => item.serviceId;
}

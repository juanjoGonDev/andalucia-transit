import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { StopScheduleResult } from './stop-schedule.model';
import { StopScheduleService } from '../../data/services/stop-schedule.service';

export interface StopScheduleQueryOptions {
  readonly queryDate?: Date;
}

@Injectable({ providedIn: 'root' })
export class StopScheduleFacade {
  private readonly stopScheduleService = inject(StopScheduleService);

  loadStopSchedule(
    stopId: string,
    options?: StopScheduleQueryOptions
  ): Observable<StopScheduleResult> {
    const queryOptions = options?.queryDate ? { queryDate: options.queryDate } : undefined;
    return this.stopScheduleService.getStopSchedule(stopId, queryOptions);
  }
}

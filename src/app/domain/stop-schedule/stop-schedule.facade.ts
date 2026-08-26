import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StopScheduleService } from '@data/services/stop-schedule.service';
import { StopScheduleResult } from '@domain/stop-schedule/stop-schedule.model';

export interface StopScheduleQueryOptions {
  readonly queryDate?: Date;
  readonly consortiumId?: number;
}

@Injectable({ providedIn: 'root' })
export class StopScheduleFacade {
  private readonly stopScheduleService = inject(StopScheduleService);

  loadStopSchedule(
    stopId: string,
    options?: StopScheduleQueryOptions
  ): Observable<StopScheduleResult> {
    const queryOptions = buildServiceQueryOptions(options);
    return this.stopScheduleService.getStopSchedule(stopId, queryOptions);
  }
}

function buildServiceQueryOptions(options?: StopScheduleQueryOptions): StopScheduleQueryOptions | undefined {
  if (!options) {
    return undefined;
  }

  const queryOptions: {
    queryDate?: Date;
    consortiumId?: number;
  } = {};

  if (options.queryDate) {
    queryOptions.queryDate = options.queryDate;
  }

  if (options.consortiumId !== undefined) {
    queryOptions.consortiumId = options.consortiumId;
  }

  return queryOptions.queryDate || queryOptions.consortiumId !== undefined
    ? queryOptions
    : undefined;
}

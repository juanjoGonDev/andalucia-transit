import { Injectable, inject } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';

import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';
import { RouteTimetableApiService, ApiRouteTimetableResponse } from './route-timetable.api-service';
import {
  mapRouteTimetableResponse,
  RouteTimetableEntry,
  RouteTimetableMapperOptions
} from './route-timetable.mapper';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';

export interface RouteTimetableRequest {
  readonly consortiumId: number;
  readonly originNucleusId: string;
  readonly destinationNucleusId: string;
  readonly queryDate: Date;
}

@Injectable({ providedIn: 'root' })
export class RouteTimetableService {
  private readonly api = inject(RouteTimetableApiService);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly holidays = inject(HolidayCalendarService);

  loadTimetable(request: RouteTimetableRequest): Observable<readonly RouteTimetableEntry[]> {
    const options: RouteTimetableMapperOptions = {
      timezone: this.config.data.timezone
    };

    return this.holidays.isHoliday(request.queryDate).pipe(
      switchMap((isHoliday) =>
        this.api
          .loadTimetable(request.consortiumId, request.originNucleusId, request.destinationNucleusId)
          .pipe(
            map((response) =>
              this.mapResponse(response, request.queryDate, { ...options, isHoliday })
            )
          )
      )
    );
  }

  private mapResponse(
    response: ApiRouteTimetableResponse,
    queryDate: Date,
    options: RouteTimetableMapperOptions
  ): readonly RouteTimetableEntry[] {
    return mapRouteTimetableResponse(response, queryDate, options);
  }
}

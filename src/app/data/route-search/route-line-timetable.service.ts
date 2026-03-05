import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { HolidayCalendarService } from '@data/holidays/holiday-calendar.service';
import {
  ApiRouteLineTimetableResponse,
  RouteLineTimetableApiService
} from '@data/route-search/route-line-timetable.api-service';
import {
  RouteLineTimetableMapperOptions,
  mapRouteLineTimetableResponse
} from '@data/route-search/route-line-timetable.mapper';
import { RouteTimetableEntry } from '@data/route-search/route-timetable.mapper';

export interface RouteLineTimetableRequest {
  readonly consortiumId: number;
  readonly lineId: string;
  readonly lineCode: string;
  readonly queryDate: Date;
  readonly originNames: readonly string[];
  readonly destinationNames: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class RouteLineTimetableService {
  private readonly api = inject(RouteLineTimetableApiService);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly holidays = inject(HolidayCalendarService);

  loadLineTimetable(
    request: RouteLineTimetableRequest
  ): Observable<readonly RouteTimetableEntry[]> {
    const options: RouteLineTimetableMapperOptions = {
      lineId: request.lineId,
      lineCode: request.lineCode,
      originNames: request.originNames,
      destinationNames: request.destinationNames,
      queryDate: request.queryDate,
      timezone: this.config.data.timezone
    };

    return this.holidays.isHoliday(request.queryDate).pipe(
      switchMap((isHoliday) =>
        this.api
          .loadLineTimetable(request.consortiumId, request.lineId, request.queryDate)
          .pipe(
            map((response: ApiRouteLineTimetableResponse) =>
              mapRouteLineTimetableResponse(response, { ...options, isHoliday })
            )
          )
      )
    );
  }
}

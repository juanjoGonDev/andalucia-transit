import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfig } from '../../core/config';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';

export interface ApiPublicHoliday {
  readonly date: string;
  readonly localName: string;
  readonly name: string;
  readonly countryCode: string;
  readonly fixed: boolean;
  readonly global: boolean;
  readonly counties: readonly string[] | null;
  readonly launchYear: number | null;
  readonly types: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class HolidayCalendarApiService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  loadPublicHolidays(year: number): Observable<readonly ApiPublicHoliday[]> {
    const baseUrl = this.config.data.holidays.apiBaseUrl;
    const countryCode = this.config.data.holidays.countryCode;
    const url = `${baseUrl}/PublicHolidays/${year}/${countryCode}`;
    return this.http.get<readonly ApiPublicHoliday[]>(url);
  }
}

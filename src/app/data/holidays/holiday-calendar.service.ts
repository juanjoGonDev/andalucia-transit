import { Injectable, inject } from '@angular/core';
import { DateTime } from 'luxon';
import { map, Observable, shareReplay } from 'rxjs';

import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';
import { ApiPublicHoliday, HolidayCalendarApiService } from './holiday-calendar.api-service';

export interface HolidayMatch {
  readonly date: Date;
  readonly localName: string;
  readonly englishName: string;
}

interface HolidayEntry {
  readonly isoDate: string;
  readonly localName: string;
  readonly englishName: string;
  readonly isGlobal: boolean;
  readonly regions: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class HolidayCalendarService {
  private readonly api = inject(HolidayCalendarApiService);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly cachedYears = new Map<number, Observable<readonly HolidayEntry[]>>();
  private readonly allowedRegionCodes = new Set<string>(this.config.data.holidays.regionCodes);

  getHoliday(date: Date): Observable<HolidayMatch | null> {
    const year = DateTime.fromJSDate(date, { zone: this.config.data.timezone }).year;
    return this.loadYear(year).pipe(
      map((entries) => {
        const isoDate = DateTime.fromJSDate(date, { zone: this.config.data.timezone }).toISODate();
        if (!isoDate) {
          return null;
        }
        const match = entries.find((entry) => entry.isoDate === isoDate && this.matchesRegion(entry));
        if (!match) {
          return null;
        }
        const matchDate = DateTime.fromISO(match.isoDate, { zone: this.config.data.timezone })
          .startOf('day')
          .toJSDate();
        return {
          date: matchDate,
          localName: match.localName,
          englishName: match.englishName
        } satisfies HolidayMatch;
      })
    );
  }

  isHoliday(date: Date): Observable<boolean> {
    return this.getHoliday(date).pipe(map((match) => match !== null));
  }

  private loadYear(year: number): Observable<readonly HolidayEntry[]> {
    const cached = this.cachedYears.get(year);
    if (cached) {
      return cached;
    }
    const observable = this.api
      .loadPublicHolidays(year)
      .pipe(map((entries) => this.mapEntries(entries)), shareReplay({ bufferSize: 1, refCount: false }));
    this.cachedYears.set(year, observable);
    return observable;
  }

  private mapEntries(entries: readonly ApiPublicHoliday[]): readonly HolidayEntry[] {
    return entries.map((entry) => ({
      isoDate: entry.date,
      localName: entry.localName,
      englishName: entry.name,
      isGlobal: entry.global,
      regions: entry.counties ? [...entry.counties] : []
    } satisfies HolidayEntry));
  }

  private matchesRegion(entry: HolidayEntry): boolean {
    if (entry.isGlobal) {
      return true;
    }
    if (!entry.regions.length) {
      return false;
    }
    for (const region of entry.regions) {
      if (this.allowedRegionCodes.has(region)) {
        return true;
      }
    }
    return false;
  }
}

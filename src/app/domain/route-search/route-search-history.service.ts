import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RouteSearchHistoryStorage, RouteSearchHistoryStoredEntry } from '../../data/route-search/route-search-history.storage';
import { RouteSearchSelection, RouteSearchLineMatch } from './route-search-state.service';
import { createRouteSearchSelection } from './route-search-selection.util';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';

export interface RouteSearchHistoryEntry {
  readonly id: string;
  readonly executedAt: Date;
  readonly selection: RouteSearchSelection;
}

@Injectable({ providedIn: 'root' })
export class RouteSearchHistoryService {
  private readonly storage = inject(RouteSearchHistoryStorage);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly entriesSubject = new BehaviorSubject<readonly RouteSearchHistoryEntry[]>([]);
  readonly entries$ = this.entriesSubject.asObservable();
  private readonly limit = this.config.homeData.recentStops.maxItems;

  constructor() {
    const stored = this.storage.load();
    const entries = stored
      .map((entry) => this.deserialize(entry))
      .filter((entry): entry is RouteSearchHistoryEntry => entry !== null)
      .sort((first, second) => second.executedAt.getTime() - first.executedAt.getTime());

    this.entriesSubject.next(entries);
  }

  record(selection: RouteSearchSelection, executedAt: Date): void {
    const normalized = createRouteSearchSelection(
      selection.origin,
      selection.destination,
      selection.lineMatches,
      selection.queryDate
    );
    const id = executedAt.toISOString();
    const entry: RouteSearchHistoryEntry = {
      id,
      executedAt: new Date(executedAt.getTime()),
      selection: normalized
    };

    const existing = this.entriesSubject.value.filter(
      (current) => !this.matches(current.selection, normalized)
    );
    const nextEntries = [entry, ...existing]
      .sort((first, second) => second.executedAt.getTime() - first.executedAt.getTime())
      .slice(0, this.limit);

    this.persist(nextEntries);
  }

  remove(id: string): void {
    const filtered = this.entriesSubject.value.filter((entry) => entry.id !== id);
    this.persist(filtered);
  }

  clear(): void {
    this.entriesSubject.next([]);
    this.storage.clear();
  }

  private persist(entries: readonly RouteSearchHistoryEntry[]): void {
    this.entriesSubject.next(entries);
    const serialized = entries.map((entry) => this.serialize(entry));
    this.storage.save(serialized);
  }

  private serialize(entry: RouteSearchHistoryEntry): RouteSearchHistoryStoredEntry {
    return {
      id: entry.id,
      executedAt: entry.executedAt.toISOString(),
      selection: {
        origin: entry.selection.origin,
        destination: entry.selection.destination,
        queryDate: entry.selection.queryDate.toISOString(),
        lineMatches: entry.selection.lineMatches
      }
    } satisfies RouteSearchHistoryStoredEntry;
  }

  private deserialize(entry: RouteSearchHistoryStoredEntry): RouteSearchHistoryEntry | null {
    const executedAt = new Date(entry.executedAt);
    const queryDate = new Date(entry.selection.queryDate);

    if (Number.isNaN(executedAt.getTime()) || Number.isNaN(queryDate.getTime())) {
      return null;
    }

    const selection = createRouteSearchSelection(
      entry.selection.origin,
      entry.selection.destination,
      entry.selection.lineMatches,
      queryDate
    );

    return {
      id: entry.id,
      executedAt,
      selection
    } satisfies RouteSearchHistoryEntry;
  }

  private matches(first: RouteSearchSelection, second: RouteSearchSelection): boolean {
    if (first.origin.id !== second.origin.id || first.destination.id !== second.destination.id) {
      return false;
    }

    if (first.lineMatches.length !== second.lineMatches.length) {
      return false;
    }

    return first.lineMatches.every((match, index) => this.matchLine(match, second.lineMatches[index]));
  }

  private matchLine(first: RouteSearchLineMatch, second: RouteSearchLineMatch): boolean {
    return (
      first.lineId === second.lineId &&
      first.lineCode === second.lineCode &&
      first.direction === second.direction &&
      this.sameStops(first.originStopIds, second.originStopIds) &&
      this.sameStops(first.destinationStopIds, second.destinationStopIds)
    );
  }

  private sameStops(first: readonly string[], second: readonly string[]): boolean {
    if (first.length !== second.length) {
      return false;
    }

    return first.every((stopId, index) => stopId === second[index]);
  }
}

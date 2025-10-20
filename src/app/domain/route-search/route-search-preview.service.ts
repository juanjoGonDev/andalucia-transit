import { Injectable, inject } from '@angular/core';
import { Observable, ReplaySubject, Subscription, map } from 'rxjs';
import { RouteSearchDepartureView, RouteSearchResultsService } from './route-search-results.service';
import { RouteSearchSelection } from './route-search-state.service';

export interface RouteSearchPreviewDeparture {
  readonly id: string;
  readonly lineCode: string;
  readonly destination: string;
  readonly arrivalTime: Date;
  readonly relativeLabel: string | null;
  readonly kind: 'past' | 'upcoming';
}

export interface RouteSearchPreview {
  readonly next: RouteSearchPreviewDeparture | null;
  readonly previous: RouteSearchPreviewDeparture | null;
}

const SELECTION_KEY_SEPARATOR = '|';
const LINE_MATCH_SEPARATOR = ';';
const STOP_SEPARATOR = ',';
const MAX_PREVIEW_CACHE_SIZE = 16;

interface PreviewCacheEntry {
  readonly subject: ReplaySubject<RouteSearchPreview>;
  subscription: Subscription | null;
  subscribers: number;
  readonly selection: RouteSearchSelection;
}

@Injectable({ providedIn: 'root' })
export class RouteSearchPreviewService {
  private readonly results = inject(RouteSearchResultsService);
  private readonly cache = new Map<string, PreviewCacheEntry>();
  private readonly order: string[] = [];

  loadPreview(selection: RouteSearchSelection): Observable<RouteSearchPreview> {
    const key = this.buildKey(selection);
    const entry = this.ensureEntry(key, selection);
    this.touch(key);
    return new Observable<RouteSearchPreview>((subscriber) => {
      entry.subscribers += 1;
      this.ensureConnected(key, entry);
      const subscription = entry.subject.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        this.release(key);
      };
    });
  }

  private ensureEntry(key: string, selection: RouteSearchSelection): PreviewCacheEntry {
    const existing = this.cache.get(key);

    if (existing) {
      return existing;
    }

    const entry: PreviewCacheEntry = {
      subject: new ReplaySubject<RouteSearchPreview>(1),
      subscription: null,
      subscribers: 0,
      selection
    };

    this.cache.set(key, entry);
    this.touch(key);
    this.evictIfNeeded();

    return entry;
  }

  private ensureConnected(key: string, entry: PreviewCacheEntry): void {
    if (entry.subscription) {
      return;
    }

    entry.subscription = this.results
      .loadResults(entry.selection)
      .pipe(map((result) => this.mapResult(result.departures)))
      .subscribe({
        next: (preview) => entry.subject.next(preview),
        error: (error) => {
          entry.subject.error(error);
          this.dispose(key);
        },
        complete: () => {
          entry.subject.complete();
          this.dispose(key);
        }
      });
  }

  private release(key: string): void {
    const entry = this.cache.get(key);

    if (!entry) {
      return;
    }

    entry.subscribers = Math.max(0, entry.subscribers - 1);
  }

  private dispose(key: string): void {
    const entry = this.cache.get(key);

    if (!entry) {
      return;
    }

    entry.subscription?.unsubscribe();
    entry.subscription = null;
    this.cache.delete(key);
    this.removeKey(key);
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= MAX_PREVIEW_CACHE_SIZE) {
      return;
    }

    for (const key of [...this.order]) {
      const entry = this.cache.get(key);

      if (entry && entry.subscribers === 0) {
        this.dispose(key);

        if (this.cache.size <= MAX_PREVIEW_CACHE_SIZE) {
          break;
        }
      }
    }
  }

  private mapResult(
    departures: readonly RouteSearchDepartureView[]
  ): RouteSearchPreview {
    const next = departures.find((departure) => departure.kind === 'upcoming');
    const previous = departures.find((departure) => departure.isMostRecentPast);

    return {
      next: next ? this.toPreview(next) : null,
      previous: previous ? this.toPreview(previous) : null
    } satisfies RouteSearchPreview;
  }

  private toPreview(departure: RouteSearchDepartureView): RouteSearchPreviewDeparture {
    return {
      id: departure.id,
      lineCode: departure.lineCode,
      destination: departure.destination,
      arrivalTime: departure.arrivalTime,
      relativeLabel: departure.relativeLabel,
      kind: departure.kind
    } satisfies RouteSearchPreviewDeparture;
  }

  private buildKey(selection: RouteSearchSelection): string {
    const lineSegments = selection.lineMatches
      .map((match) =>
        [
          match.lineId,
          match.lineCode,
          match.direction.toString(10),
          [...match.originStopIds].sort().join(STOP_SEPARATOR),
          [...match.destinationStopIds].sort().join(STOP_SEPARATOR)
        ].join(SELECTION_KEY_SEPARATOR)
      )
      .sort()
      .join(LINE_MATCH_SEPARATOR);

    return [
      selection.origin.id,
      selection.destination.id,
      selection.queryDate.getTime().toString(10),
      lineSegments
    ].join(SELECTION_KEY_SEPARATOR);
  }

  private touch(key: string): void {
    this.removeKey(key);
    this.order.push(key);
  }

  private removeKey(key: string): void {
    const index = this.order.indexOf(key);

    if (index !== -1) {
      this.order.splice(index, 1);
    }
  }
}

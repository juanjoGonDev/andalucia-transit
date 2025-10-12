import { Injectable, inject } from '@angular/core';
import { map, Observable, take } from 'rxjs';

import { RouteSearchResultsService, RouteSearchDepartureView } from './route-search-results.service';
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

@Injectable({ providedIn: 'root' })
export class RouteSearchPreviewService {
  private readonly results = inject(RouteSearchResultsService);

  loadPreview(selection: RouteSearchSelection): Observable<RouteSearchPreview> {
    return this.results.loadResults(selection).pipe(
      take(1),
      map((result) => ({
        next: this.pickDeparture(result.departures, 'upcoming'),
        previous: this.pickPrevious(result.departures)
      } satisfies RouteSearchPreview))
    );
  }

  private pickDeparture(
    departures: readonly RouteSearchDepartureView[],
    kind: 'past' | 'upcoming'
  ): RouteSearchPreviewDeparture | null {
    const match = departures.find((departure) => departure.kind === kind);

    if (!match) {
      return null;
    }

    return this.toPreview(match);
  }

  private pickPrevious(
    departures: readonly RouteSearchDepartureView[]
  ): RouteSearchPreviewDeparture | null {
    const match = departures.find((departure) => departure.isMostRecentPast);

    if (!match) {
      return null;
    }

    return this.toPreview(match);
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
}

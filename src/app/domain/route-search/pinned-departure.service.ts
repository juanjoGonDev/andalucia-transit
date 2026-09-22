import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import {
  PinnedDepartureRecord,
  PinnedDepartureStorage
} from '@data/route-search/pinned-departure.storage';
import { RouteSearchExecutionService } from '@domain/route-search/route-search-execution.service';
import { RouteSearchDepartureView } from '@domain/route-search/route-search-results.service';
import { RouteSearchSelection } from '@domain/route-search/route-search-state.service';
import {
  CountdownDuration,
  buildCountdownDuration
} from '@domain/utils/countdown-labels.util';

export interface PinnedDepartureView {
  readonly departureId: string;
  readonly consortiumId: number;
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly destination: string;
  readonly originName: string;
  readonly destinationName: string;
  readonly arrivalTime: Date;
  readonly remainingMs: number;
  readonly progress: number;
  readonly countdown: CountdownDuration;
}

const TICK_MS = 1_000;
const PIN_EXPIRY_GRACE_MS = 60_000;
const MILLISECONDS_PER_SECOND = 1_000;

@Injectable({ providedIn: 'root' })
export class PinnedDepartureService {
  private readonly storage = inject(PinnedDepartureStorage);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly router = inject(Router);

  readonly pin = signal<PinnedDepartureView | null>(null);

  constructor() {
    this.pin.set(this.readPin());

    interval(TICK_MS).subscribe(() => {
      const view = this.readPin();
      this.pin.set(view);

      if (!view) {
        this.storage.clear();
      }
    });
  }

  pinDeparture(departure: RouteSearchDepartureView, selection: RouteSearchSelection): void {
    const record: PinnedDepartureRecord = {
      departureId: departure.id,
      lineId: departure.lineId,
      lineCode: departure.lineCode,
      direction: departure.direction,
      destination: departure.destination,
      consortiumId: selection.origin.consortiumId,
      arrivalTime: departure.arrivalTime.toISOString(),
      pinnedAt: new Date(Date.now()).toISOString(),
      selection: serializeSelection(selection)
    };

    this.storage.save(record);
    this.pin.set(this.readPin());
  }

  unpin(): void {
    this.storage.clear();
    this.pin.set(null);
  }

  async open(): Promise<void> {
    const record = this.storage.load();

    if (!record) {
      return;
    }

    const selection = hydrateSelection(record);
    const commands = this.execution.prepare(selection);
    await this.router.navigate([...commands]);
  }

  private readPin(): PinnedDepartureView | null {
    const record = this.storage.load();

    if (!record) {
      return null;
    }

    return resolvePinnedDepartureView(record, new Date(Date.now()));
  }
}

export function resolvePinnedDepartureView(
  record: PinnedDepartureRecord,
  now: Date
): PinnedDepartureView | null {
  const arrivalTime = new Date(record.arrivalTime);
  const remainingMs = arrivalTime.getTime() - now.getTime();

  if (remainingMs < -PIN_EXPIRY_GRACE_MS) {
    return null;
  }

  const windowMs = Math.max(arrivalTime.getTime() - new Date(record.pinnedAt).getTime(), 1);
  const progress = Math.min(1, Math.max(0, 1 - remainingMs / windowMs));
  const remainingSeconds = Math.max(0, Math.round(remainingMs / MILLISECONDS_PER_SECOND));

  return {
    departureId: record.departureId,
    consortiumId: record.consortiumId,
    lineId: record.lineId,
    lineCode: record.lineCode,
    direction: record.direction,
    destination: record.destination,
    originName: record.selection.origin.name,
    destinationName: record.selection.destination.name,
    arrivalTime,
    remainingMs: Math.max(0, remainingMs),
    progress,
    countdown: buildCountdownDuration(remainingSeconds)
  };
}

function serializeSelection(
  selection: RouteSearchSelection
): PinnedDepartureRecord['selection'] {
  return {
    origin: selection.origin,
    destination: selection.destination,
    queryDate: selection.queryDate.toISOString(),
    lineMatches: selection.lineMatches
  };
}

function hydrateSelection(record: PinnedDepartureRecord): RouteSearchSelection {
  return {
    origin: record.selection.origin,
    destination: record.selection.destination,
    queryDate: new Date(record.selection.queryDate),
    lineMatches: record.selection.lineMatches
  };
}

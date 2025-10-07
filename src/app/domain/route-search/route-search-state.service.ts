import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { StopDirectoryOption } from '../../data/stops/stop-directory.service';

export interface RouteSearchLineMatch {
  readonly lineId: string;
  readonly direction: number;
  readonly originStopIds: readonly string[];
  readonly destinationStopIds: readonly string[];
}

export interface RouteSearchSelection {
  readonly origin: StopDirectoryOption;
  readonly destination: StopDirectoryOption;
  readonly queryDate: Date;
  readonly lineMatches: readonly RouteSearchLineMatch[];
}

@Injectable({ providedIn: 'root' })
export class RouteSearchStateService {
  private readonly selectionSubject = new BehaviorSubject<RouteSearchSelection | null>(null);
  readonly selection$ = this.selectionSubject.asObservable();

  setSelection(selection: RouteSearchSelection): void {
    this.selectionSubject.next(selection);
  }

  getSelection(): RouteSearchSelection | null {
    return this.selectionSubject.value;
  }
}

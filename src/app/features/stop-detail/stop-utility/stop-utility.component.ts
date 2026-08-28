import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';
import {
  RouteLineSummary,
  RouteLinesApiService
} from '@data/route-search/route-lines-api.service';
import { StopDirectoryFacade, StopDirectoryRecord } from '@domain/stops/stop-directory.facade';
import { buildLineDetailNavigation } from '@shared/navigation/navigation.util';
import {
  StopTravelLinks,
  buildStopTravelLinks
} from '@shared/navigation/stop-travel-links.util';

interface StopUtilityContext {
  readonly stopId: string;
  readonly consortiumId: number | null;
}

type StopUtilityState =
  | { readonly status: 'loading'; readonly record: StopDirectoryRecord | null; readonly lines: readonly RouteLineSummary[] }
  | { readonly status: 'ready'; readonly record: StopDirectoryRecord; readonly lines: readonly RouteLineSummary[] }
  | { readonly status: 'error'; readonly record: StopDirectoryRecord | null; readonly lines: readonly RouteLineSummary[] };

@Component({
  selector: 'app-stop-utility',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './stop-utility.component.html',
  styleUrl: './stop-utility.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StopUtilityComponent implements OnChanges {
  @Input({ required: true }) stopId = '';
  @Input() consortiumId: number | null = null;

  private readonly stopDirectory = inject(StopDirectoryFacade);
  private readonly routeLines = inject(RouteLinesApiService);
  private readonly router = inject(Router);
  private readonly context = new BehaviorSubject<StopUtilityContext | null>(null);

  protected readonly state$: Observable<StopUtilityState> = this.context.pipe(
    distinctUntilChanged(areContextsEqual),
    switchMap((context) => {
      if (!context) {
        return of<StopUtilityState>({ status: 'error', record: null, lines: Object.freeze([]) });
      }

      return this.loadStopRecord(context).pipe(
        switchMap((record) => {
          if (!record) {
            return of<StopUtilityState>({ status: 'error', record: null, lines: Object.freeze([]) });
          }

          return this.routeLines.getLinesForStops(record.consortiumId, [record.stopId]).pipe(
            map((lines) => ({ status: 'ready', record, lines } as const)),
            startWith<StopUtilityState>({ status: 'loading', record, lines: Object.freeze([]) }),
            catchError(() =>
              of<StopUtilityState>({ status: 'error', record, lines: Object.freeze([]) })
            )
          );
        }),
        startWith<StopUtilityState>({ status: 'loading', record: null, lines: Object.freeze([]) }),
        catchError(() =>
          of<StopUtilityState>({ status: 'error', record: null, lines: Object.freeze([]) })
        )
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly trackLine = (_: number, line: RouteLineSummary): string => line.lineId;

  ngOnChanges(): void {
    const normalizedStopId = this.stopId.trim();
    this.context.next(
      normalizedStopId ? { stopId: normalizedStopId, consortiumId: this.consortiumId } : null
    );
  }

  protected directions(record: StopDirectoryRecord): StopTravelLinks {
    return buildStopTravelLinks(record.name, record.location);
  }

  protected openLine(record: StopDirectoryRecord, line: RouteLineSummary): void {
    const navigation = buildLineDetailNavigation(record.consortiumId, line.lineId);
    void this.router.navigate(navigation.commands);
  }

  private loadStopRecord(context: StopUtilityContext): Observable<StopDirectoryRecord | null> {
    if (context.consortiumId === null) {
      return this.stopDirectory.getRecordByStopId(context.stopId);
    }

    return this.stopDirectory.getRecordByStopSignature(context.consortiumId, context.stopId);
  }
}

function areContextsEqual(
  left: StopUtilityContext | null,
  right: StopUtilityContext | null
): boolean {
  if (left === right) {
    return true;
  }

  return Boolean(
    left &&
      right &&
      left.stopId === right.stopId &&
      left.consortiumId === right.consortiumId
  );
}

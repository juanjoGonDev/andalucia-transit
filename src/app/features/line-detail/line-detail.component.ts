import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { LanguageService } from '@core/services/language.service';
import {
  RouteLineDetail,
  RouteLineStop,
  RouteLinesApiService
} from '@data/route-search/route-lines-api.service';
import { selectPrimaryLineDirectionStops } from '@domain/lines/line-route-geometry';
import { getLineDetailUiCopy } from '@features/line-detail/line-detail-ui.copy';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import { RouteMapComponent } from '@shared/map/route-map/route-map.component';
import {
  LINE_DETAIL_BASE_SEGMENT,
  LINE_DETAIL_CONSORTIUM_PARAM,
  LINE_DETAIL_LINE_PARAM,
  buildStopDetailNavigation
} from '@shared/navigation/navigation.util';

interface LineDetailContext {
  readonly consortiumId: number;
  readonly lineId: string;
}

interface LineDetailViewModel {
  readonly detail: RouteLineDetail;
  readonly stops: readonly RouteLineStop[];
}

type LineDetailState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly viewModel: LineDetailViewModel };

@Component({
  selector: 'app-line-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, AppLayoutContentDirective, RouteMapComponent],
  templateUrl: './line-detail.component.html',
  styleUrl: './line-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LineDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeLines = inject(RouteLinesApiService);
  private readonly language = inject(LanguageService);

  protected readonly layoutNavigationKey = LINE_DETAIL_BASE_SEGMENT;
  protected readonly selectedStopId = signal<string | null>(null);
  protected readonly uiCopy = computed(() => getLineDetailUiCopy(this.language.currentLanguage()));
  protected readonly state$: Observable<LineDetailState> = this.route.paramMap.pipe(
    map((params) => parseContext(params.get(LINE_DETAIL_CONSORTIUM_PARAM), params.get(LINE_DETAIL_LINE_PARAM))),
    switchMap((context) => {
      this.selectedStopId.set(null);
      if (!context) {
        return of<LineDetailState>({ status: 'error' });
      }

      return forkJoin({
        detail: this.routeLines.getLineDetail(context.consortiumId, context.lineId),
        stops: this.routeLines.getLineStops(context.consortiumId, context.lineId)
      }).pipe(
        map(({ detail, stops }) => ({
          status: 'ready',
          viewModel: {
            detail,
            stops: selectPrimaryLineDirectionStops(stops)
          }
        }) as const),
        startWith<LineDetailState>({ status: 'loading' }),
        catchError(() => of<LineDetailState>({ status: 'error' }))
      );
    })
  );

  protected readonly trackStop = (_: number, stop: RouteLineStop): string => stop.stopId;

  protected selectStop(stop: RouteLineStop): void {
    this.selectedStopId.set(stop.stopId);
  }

  protected openStop(stop: RouteLineStop): void {
    this.navigateToStop(stop.stopId);
  }

  protected openStopById(stopId: string): void {
    this.selectedStopId.set(stopId);
    this.navigateToStop(stopId);
  }

  private navigateToStop(stopId: string): void {
    const consortiumId = Number(this.route.snapshot.paramMap.get(LINE_DETAIL_CONSORTIUM_PARAM));

    if (!Number.isSafeInteger(consortiumId) || consortiumId <= 0) {
      return;
    }

    const navigation = buildStopDetailNavigation(consortiumId, stopId);
    void this.router.navigate(navigation.commands, { queryParams: navigation.queryParams });
  }
}

function parseContext(consortiumValue: string | null, lineValue: string | null): LineDetailContext | null {
  const consortiumId = Number(consortiumValue);
  const lineId = lineValue?.trim() ?? '';

  if (!Number.isSafeInteger(consortiumId) || consortiumId <= 0 || !lineId) {
    return null;
  }

  return { consortiumId, lineId };
}

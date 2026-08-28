import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import { LanguageService } from '@core/services/language.service';
import {
  LineRouteWorkspaceService,
  LineRouteWorkspaceViewModel
} from '@domain/lines/line-route-workspace.service';
import { getLineDetailUiCopy } from '@features/line-detail/line-detail-ui.copy';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import { TransitRouteWorkspaceComponent } from '@shared/map/route-workspace/transit-route-workspace.component';
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

type LineDetailState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly viewModel: LineRouteWorkspaceViewModel };

@Component({
  selector: 'app-line-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, AppLayoutContentDirective, TransitRouteWorkspaceComponent],
  templateUrl: './line-detail.component.html',
  styleUrl: './line-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LineDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeWorkspace = inject(LineRouteWorkspaceService);
  private readonly language = inject(LanguageService);

  protected readonly layoutNavigationKey = LINE_DETAIL_BASE_SEGMENT;
  protected readonly selectedStopId = signal<string | null>(null);
  protected readonly uiCopy = computed(() => getLineDetailUiCopy(this.language.currentLanguage()));
  protected readonly state$: Observable<LineDetailState> = this.route.paramMap.pipe(
    map((params) =>
      parseContext(
        params.get(LINE_DETAIL_CONSORTIUM_PARAM),
        params.get(LINE_DETAIL_LINE_PARAM)
      )
    ),
    switchMap((context) => {
      this.selectedStopId.set(null);
      if (!context) {
        return of<LineDetailState>({ status: 'error' });
      }

      return this.routeWorkspace.load(context).pipe(
        map((viewModel) => ({ status: 'ready', viewModel }) as const),
        startWith<LineDetailState>({ status: 'loading' }),
        catchError(() => of<LineDetailState>({ status: 'error' }))
      );
    })
  );

  protected selectStopById(stopId: string): void {
    this.selectedStopId.set(stopId);
  }

  protected openStopById(stopId: string): void {
    this.selectStopById(stopId);
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

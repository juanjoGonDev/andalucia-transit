import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import { buildLineKey } from '@domain/lines/line-directory.service';
import {
  LineFavoriteCandidate,
  LineFavoritesFacade
} from '@domain/lines/line-favorites.facade';
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
  private readonly lineFavorites = inject(LineFavoritesFacade);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly favoriteLineIds = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly layoutNavigationKey = LINE_DETAIL_BASE_SEGMENT;
  protected readonly selectedStopId = signal<string | null>(null);
  protected readonly uiCopy = computed(() => getLineDetailUiCopy(this.language.currentLanguage()));
  protected readonly addFavoriteLabelKey = APP_CONFIG.translationKeys.home.sections.search.addFavoriteLabel;
  protected readonly removeFavoriteLabelKey =
    APP_CONFIG.translationKeys.home.sections.search.removeFavoriteLabel;
  protected readonly favoriteActiveIcon = APP_CONFIG.homeData.favoriteStops.activeIcon;
  protected readonly favoriteInactiveIcon = APP_CONFIG.homeData.favoriteStops.inactiveIcon;
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

  constructor() {
    this.lineFavorites.favorites$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((favorites) =>
        this.favoriteLineIds.set(new Set(favorites.map((favorite) => favorite.id)))
      );
  }

  protected selectStopById(stopId: string): void {
    this.selectedStopId.set(stopId);
  }

  protected openStopById(stopId: string): void {
    this.selectStopById(stopId);
    this.navigateToStop(stopId);
  }

  protected isFavorite(viewModel: LineRouteWorkspaceViewModel): boolean {
    const consortiumId = this.currentConsortiumId();
    return consortiumId !== null
      ? this.favoriteLineIds().has(buildLineKey(consortiumId, viewModel.detail.lineId))
      : false;
  }

  protected toggleFavorite(viewModel: LineRouteWorkspaceViewModel): void {
    const candidate = this.toFavoriteCandidate(viewModel);
    if (!candidate) {
      return;
    }

    this.lineFavorites.toggle(candidate);
  }

  private toFavoriteCandidate(
    viewModel: LineRouteWorkspaceViewModel
  ): LineFavoriteCandidate | null {
    const consortiumId = this.currentConsortiumId();
    if (consortiumId === null) {
      return null;
    }

    return {
      consortiumId,
      lineId: viewModel.detail.lineId,
      code: viewModel.detail.code,
      name: viewModel.detail.name,
      mode: viewModel.detail.mode
    };
  }

  private navigateToStop(stopId: string): void {
    const consortiumId = this.currentConsortiumId();

    if (consortiumId === null) {
      return;
    }

    const navigation = buildStopDetailNavigation(consortiumId, stopId);
    void this.router.navigate(navigation.commands, { queryParams: navigation.queryParams });
  }

  private currentConsortiumId(): number | null {
    const consortiumId = Number(this.route.snapshot.paramMap.get(LINE_DETAIL_CONSORTIUM_PARAM));
    return Number.isSafeInteger(consortiumId) && consortiumId > 0 ? consortiumId : null;
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

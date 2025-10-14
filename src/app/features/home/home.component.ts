import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { APP_CONFIG } from '../../core/config';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import { CardListItemComponent } from '../../shared/ui/card-list-item/card-list-item.component';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { RouteSearchSelection, RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import { RouteSearchExecutionService } from '../../domain/route-search/route-search-execution.service';
import { StopFavoritesService, StopFavorite } from '../../domain/stops/stop-favorites.service';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';
import { HomeRecentSearchesComponent } from './recent-searches/home-recent-searches.component';
import { buildNavigationCommands } from '../../shared/navigation/navigation.util';

interface ActionListItem {
  titleKey: string;
  subtitleKey?: string;
  leadingIcon: MaterialSymbolName;
  ariaLabelKey?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CardListItemComponent,
    SectionComponent,
    RouteSearchFormComponent,
    HomeRecentSearchesComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss', './home.component-search.scss', './home.component-placeholder.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private static readonly recentPlaceholderCount = 3;
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly routeSearchState = inject(RouteSearchStateService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly favoritesService = inject(StopFavoritesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly locationIcon: MaterialSymbolName = 'my_location';
  private readonly favoriteIconName: MaterialSymbolName = APP_CONFIG.homeData.favoriteStops.icon;
  private readonly favoritePreviewLimit = APP_CONFIG.homeData.favoriteStops.homePreviewLimit;

  protected readonly headerTitleKey = this.translation.header.title;
  protected readonly headerInfoLabelKey = this.translation.header.infoLabel;
  protected readonly infoIcon: MaterialSymbolName = 'info';
  protected readonly searchTitleKey = this.translation.sections.search.title;
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly recentStopsClearKey = this.translation.sections.recentStops.actions.clearAll;
  protected readonly findNearbyTitleKey = this.translation.sections.findNearby.title;
  protected readonly findNearbyActionKey = this.translation.sections.findNearby.action;
  protected readonly favoritesTitleKey = this.translation.sections.favorites.title;
  protected readonly favoritesDescriptionKey = this.translation.sections.favorites.description;
  protected readonly favoritesActionKey = this.translation.sections.favorites.action;
  protected readonly favoritesEmptyKey = this.translation.sections.favorites.empty;
  protected readonly favoritesCodeLabelKey = APP_CONFIG.translationKeys.favorites.list.code;

  protected readonly trailingIcon: MaterialSymbolName = 'chevron_right';
  protected readonly favoritesCommands = buildNavigationCommands(APP_CONFIG.routes.favorites);

  protected readonly locationAction: ActionListItem = {
    titleKey: this.findNearbyActionKey,
    leadingIcon: this.locationIcon,
    ariaLabelKey: this.findNearbyActionKey
  };
  protected readonly locationActionLayout = 'action' as const;
  protected readonly locationActionIconVariant = 'soft' as const;

  protected readonly recentClearActionVisible = signal(false);

  @ViewChild('recentSearches')
  private recentSearchesComponent?: HomeRecentSearchesComponent;

  private readonly favorites = signal<readonly StopFavorite[]>([]);
  protected readonly favoritePreview = computed(() => {
    const current = this.favorites();

    if (!current.length) {
      return [] as readonly StopFavorite[];
    }

    return current.slice(0, Math.max(this.favoritePreviewLimit, 0));
  });
  protected readonly hasFavorites = computed(() => this.favorites().length > 0);

  protected readonly currentSelection$ = this.routeSearchState.selection$;
  protected readonly recentPlaceholderItems = Array.from(
    { length: HomeComponent.recentPlaceholderCount },
    (_, index) => index
  );

  constructor() {
    this.observeFavorites();
  }

  protected async openNearbyStopsDialog(): Promise<void> {
    const { HomeNearbyStopsDialogComponent } = await import('./home-nearby-stops-dialog.component');
    this.dialog.open(HomeNearbyStopsDialogComponent);
  }

  protected async onSelectionConfirmed(selection: RouteSearchSelection): Promise<void> {
    const commands = this.execution.prepare(selection);
    await this.router.navigate(commands);
  }

  protected async openFavorite(favorite: StopFavorite): Promise<void> {
    const stopId = favorite.stopIds[0] ?? favorite.id;
    const commands: readonly string[] = ['/', APP_CONFIG.routes.stopDetailBase, stopId];
    await this.router.navigate(commands);
  }

  protected trackFavorite(_: number, favorite: StopFavorite): string {
    return favorite.id;
  }

  protected favoriteIcon(): MaterialSymbolName {
    return this.favoriteIconName;
  }

  protected onRecentItemsStateChange(hasItems: boolean): void {
    this.recentClearActionVisible.set(hasItems);
  }

  protected async onClearRecentSearches(): Promise<void> {
    const component = this.recentSearchesComponent;

    if (!component) {
      return;
    }

    await component.clearAll();
  }

  private observeFavorites(): void {
    this.favoritesService.favorites$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((favorites) => this.favorites.set(favorites));
  }
}

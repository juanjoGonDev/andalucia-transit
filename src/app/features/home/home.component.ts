import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { APP_CONFIG } from '../../core/config';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import {
  RouteSearchSelection,
  RouteSearchStateService
} from '../../domain/route-search/route-search-state.service';
import { RouteSearchExecutionService } from '../../domain/route-search/route-search-execution.service';
import { StopFavoritesService, StopFavorite } from '../../domain/stops/stop-favorites.service';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';
import { HomeRecentSearchesComponent } from './recent-searches/home-recent-searches.component';
import { buildNavigationCommands, NavigationCommands } from '../../shared/navigation/navigation.util';
import { HomeTabId, isHomeTabId } from './home.types';

interface HomeTabOption {
  readonly id: HomeTabId;
  readonly labelKey: string;
}

interface SettingsPreviewEntry {
  readonly id: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouteSearchFormComponent, HomeRecentSearchesComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly routeSearchState = inject(RouteSearchStateService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly favoritesService = inject(StopFavoritesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly favoriteIconName: MaterialSymbolName = APP_CONFIG.homeData.favoriteStops.icon;
  private readonly favoritePreviewLimit = APP_CONFIG.homeData.favoriteStops.homePreviewLimit;

  private readonly settingsCommands = buildNavigationCommands(APP_CONFIG.routes.settings);
  private readonly favoritesCommands = buildNavigationCommands(APP_CONFIG.routes.favorites);
  private readonly homeQueryParams = APP_CONFIG.home.queryParams;
  private readonly homeIntents = APP_CONFIG.home.intents;

  protected readonly headerTitleKey = this.translation.header.title;
  protected readonly headerTaglineKey = this.translation.header.tagline;
  protected readonly heroEyebrowKey = this.translation.hero.eyebrow;
  protected readonly heroDescriptionKey = this.translation.hero.description;
  protected readonly heroActionKey = this.translation.hero.action;
  protected readonly tabs: readonly HomeTabOption[] = [
    { id: 'search', labelKey: this.translation.tabs.search },
    { id: 'recent', labelKey: this.translation.tabs.recent },
    { id: 'favorites', labelKey: this.translation.tabs.favorites },
    { id: 'nearby', labelKey: this.translation.tabs.nearby },
    { id: 'settings', labelKey: this.translation.tabs.settings }
  ];
  protected readonly summaryTitleKey = this.translation.summary.lastSearch;
  protected readonly summarySeeAllKey = this.translation.summary.seeAll;
  protected readonly summaryEmptyKey = this.translation.summary.empty;
  protected readonly quickActionNearbyKey = this.translation.quickActions.nearby;
  protected readonly searchTitleKey = this.translation.sections.search.title;
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly recentStopsClearKey = this.translation.sections.recentStops.actions.clearAll;
  protected readonly favoritesTitleKey = this.translation.sections.favorites.title;
  protected readonly favoritesDescriptionKey = this.translation.sections.favorites.description;
  protected readonly favoritesActionKey = this.translation.sections.favorites.action;
  protected readonly favoritesEmptyKey = this.translation.sections.favorites.empty;
  protected readonly favoritesCodeLabelKey = APP_CONFIG.translationKeys.favorites.list.code;
  protected readonly findNearbyTitleKey = this.translation.sections.findNearby.title;
  protected readonly findNearbyDescriptionKey = this.translation.sections.findNearby.description;
  protected readonly findNearbyHintKey = this.translation.sections.findNearby.hint;
  protected readonly findNearbyActionKey = this.translation.sections.findNearby.action;
  protected readonly settingsTitleKey = this.translation.sections.settings.title;
  protected readonly settingsDescriptionKey = this.translation.sections.settings.description;
  protected readonly settingsActionKey = this.translation.sections.settings.action;
  protected readonly settingsHintKey = this.translation.sections.settings.hint;

  protected readonly activeTab = signal<HomeTabId>('search');
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
  protected readonly settingsPreviewEntries: readonly SettingsPreviewEntry[] = [
    {
      id: 'language',
      titleKey: APP_CONFIG.translationKeys.settings.sections.language.title,
      descriptionKey: APP_CONFIG.translationKeys.settings.sections.language.description
    },
    {
      id: 'recent',
      titleKey: APP_CONFIG.translationKeys.settings.sections.recentSearches.title,
      descriptionKey: APP_CONFIG.translationKeys.settings.sections.recentSearches.description
    }
  ];

  constructor() {
    this.observeFavorites();
    this.observeRouteState();
  }

  protected selectTab(tab: HomeTabId): void {
    if (this.activeTab() === tab) {
      return;
    }

    this.activeTab.set(tab);
    void this.updateTabQueryParam(tab);
  }

  protected isTabActive(tab: HomeTabId): boolean {
    return this.activeTab() === tab;
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

  protected trackSettingsPreview(_: number, entry: SettingsPreviewEntry): string {
    return entry.id;
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

  protected async openFavoritesView(): Promise<void> {
    await this.navigate(this.favoritesCommands);
  }

  protected async openSettings(): Promise<void> {
    await this.navigate(this.settingsCommands);
  }

  private async navigate(commands: NavigationCommands): Promise<void> {
    await this.router.navigate(commands);
  }

  private observeFavorites(): void {
    this.favoritesService.favorites$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((favorites) => this.favorites.set(favorites));
  }

  private observeRouteState(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const tabParam = params.get(this.homeQueryParams.tab);
        if (isHomeTabId(tabParam) && this.activeTab() !== tabParam) {
          this.activeTab.set(tabParam);
        }

        const intentParam = params.get(this.homeQueryParams.intent);
        if (intentParam === this.homeIntents.nearby) {
          void this.openNearbyStopsDialog();
          void this.clearIntentQueryParam();
        }
      });
  }

  private async updateTabQueryParam(tab: HomeTabId): Promise<void> {
    const currentTab = this.route.snapshot.queryParamMap.get(this.homeQueryParams.tab);

    if (currentTab === tab) {
      return;
    }

    const queryParams: Record<string, string | null> = {
      [this.homeQueryParams.tab]: tab === 'search' ? null : tab
    };

    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  private async clearIntentQueryParam(): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [this.homeQueryParams.intent]: null },
      queryParamsHandling: 'merge'
    });
  }
}

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
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { APP_CONFIG } from '../../core/config';
import {
  RouteSearchSelection,
  RouteSearchStateService
} from '../../domain/route-search/route-search-state.service';
import { RouteSearchExecutionService } from '../../domain/route-search/route-search-execution.service';
import { StopFavoritesService, StopFavorite } from '../../domain/stops/stop-favorites.service';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';
import { HomeRecentSearchesComponent } from './recent-searches/home-recent-searches.component';
import { buildNavigationCommands, NavigationCommands } from '../../shared/navigation/navigation.util';
import { HomeTabId } from './home.types';
import { HomeListCardComponent } from './shared/home-list-card/home-list-card.component';
import { AccessibleButtonDirective } from '../../shared/a11y/accessible-button.directive';

interface HomeTabOption {
  readonly id: HomeTabId;
  readonly labelKey: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouteSearchFormComponent,
    HomeRecentSearchesComponent,
    HomeListCardComponent,
    AccessibleButtonDirective
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routeSearchState = inject(RouteSearchStateService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly favoritesService = inject(StopFavoritesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly favoritePreviewLimit = APP_CONFIG.homeData.favoriteStops.homePreviewLimit;

  private readonly favoritesCommands = buildNavigationCommands(APP_CONFIG.routes.favorites);
  private readonly homeTabCommands: ReadonlyMap<HomeTabId, NavigationCommands> = new Map([
    ['search', buildNavigationCommands(APP_CONFIG.routes.home)],
    ['recent', buildNavigationCommands(APP_CONFIG.routes.homeRecent)],
    ['favorites', buildNavigationCommands(APP_CONFIG.routes.homeFavorites)]
  ]);
  private readonly homeTabRoutes = new Map<string, HomeTabId>([
    [APP_CONFIG.routes.home, 'search'],
    [APP_CONFIG.routes.homeRecent, 'recent'],
    [APP_CONFIG.routes.homeFavorites, 'favorites']
  ]);

  protected readonly headerTitleKey = this.translation.header.title;
  protected readonly headerTaglineKey = this.translation.header.tagline;
  protected readonly heroEyebrowKey = this.translation.hero.eyebrow;
  protected readonly heroDescriptionKey = this.translation.hero.description;
  protected readonly heroActionKey = this.translation.hero.action;
  protected readonly tabs: readonly HomeTabOption[] = [
    { id: 'search', labelKey: this.translation.tabs.search },
    { id: 'recent', labelKey: this.translation.tabs.recent },
    { id: 'favorites', labelKey: this.translation.tabs.favorites }
  ];
  protected readonly summaryTitleKey = this.translation.summary.lastSearch;
  protected readonly summarySeeAllKey = this.translation.summary.seeAll;
  protected readonly summaryEmptyKey = this.translation.summary.empty;
  protected readonly searchTitleKey = this.translation.sections.search.title;
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly recentStopsClearKey = this.translation.sections.recentStops.actions.clearAll;
  protected readonly favoritesTitleKey = this.translation.sections.favorites.title;
  protected readonly favoritesActionKey = this.translation.sections.favorites.action;
  protected readonly favoritesEmptyKey = this.translation.sections.favorites.empty;
  protected readonly favoritesCodeLabelKey = APP_CONFIG.translationKeys.favorites.list.code;
  protected readonly favoritesNucleusLabelKey = APP_CONFIG.translationKeys.favorites.list.nucleus;

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

    const limit = Math.max(this.favoritePreviewLimit, 0);

    if (limit === 0) {
      return [] as readonly StopFavorite[];
    }

    return current.slice(0, limit);
  });
  protected readonly hasFavorites = computed(() => this.favorites().length > 0);

  protected readonly currentSelection$ = this.routeSearchState.selection$;

  constructor() {
    this.observeFavorites();
    this.syncActiveTabWithRoute();
    this.observeRouteChanges();
  }

  protected selectTab(tab: HomeTabId): void {
    if (this.activeTab() === tab) {
      return;
    }

    this.activeTab.set(tab);
    void this.navigateToTab(tab);
  }

  protected isTabActive(tab: HomeTabId): boolean {
    return this.activeTab() === tab;
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

  private async navigate(commands: NavigationCommands): Promise<void> {
    await this.router.navigate(commands);
  }

  private observeFavorites(): void {
    this.favoritesService.favorites$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((favorites) => this.favorites.set(favorites));
  }

  private observeRouteChanges(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        const nextTab = this.resolveTabFromRoute();

        if (this.activeTab() !== nextTab) {
          this.activeTab.set(nextTab);
        }
      });
  }

  private syncActiveTabWithRoute(): void {
    this.activeTab.set(this.resolveTabFromRoute());
  }

  private resolveTabFromRoute(): HomeTabId {
    const path = this.route.snapshot.routeConfig?.path ?? APP_CONFIG.routes.home;
    return this.homeTabRoutes.get(path) ?? 'search';
  }

  private async navigateToTab(tab: HomeTabId): Promise<void> {
    const commands = this.homeTabCommands.get(tab);

    if (!commands) {
      return;
    }

    await this.router.navigate(commands);
  }
}

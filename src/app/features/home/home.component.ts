import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { APP_CONFIG } from '../../core/config';
import { RouteSearchExecutionService } from '../../domain/route-search/route-search-execution.service';
import {
  RouteSearchSelection,
  RouteSearchStateService,
} from '../../domain/route-search/route-search-state.service';
import { FavoritesFacade, StopFavorite } from '../../domain/stops/favorites.facade';
import { AccessibleButtonDirective } from '../../shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '../../shared/layout/app-layout-content.directive';
import { AppLayoutNavigationKey } from '../../shared/layout/app-layout-context.token';
import {
  NavigationCommands,
  buildNavigationCommands,
} from '../../shared/navigation/navigation.util';
import { InteractiveCardComponent } from '../../shared/ui/cards/interactive-card/interactive-card.component';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';
import { HomeTabId } from './home.types';
import { HomeRecentSearchesComponent } from './recent-searches/home-recent-searches.component';
import { RECENT_CARD_BODY_CLASSES, RECENT_CARD_HOST_CLASSES } from './shared/recent-card-classes';

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
    InteractiveCardComponent,
    AccessibleButtonDirective,
    AppLayoutContentDirective,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routeSearchState = inject(RouteSearchStateService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly favoritesFacade = inject(FavoritesFacade);
  private readonly destroyRef = inject(DestroyRef);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly favoritePreviewLimit = APP_CONFIG.homeData.favoriteStops.homePreviewLimit;

  private readonly favoritesCommands = buildNavigationCommands(APP_CONFIG.routes.favorites);
  private readonly homeTabCommands: ReadonlyMap<HomeTabId, NavigationCommands> = new Map([
    ['search', buildNavigationCommands(APP_CONFIG.routes.home)],
    ['recent', buildNavigationCommands(APP_CONFIG.routes.homeRecent)],
    ['favorites', buildNavigationCommands(APP_CONFIG.routes.homeFavorites)],
  ]);
  private readonly homeTabRoutes = new Map<string, HomeTabId>([
    [APP_CONFIG.routes.home, 'search'],
    [APP_CONFIG.routes.homeRecent, 'recent'],
    [APP_CONFIG.routes.homeFavorites, 'favorites'],
  ]);
  private readonly homeNavigationKeys = new Map<string, AppLayoutNavigationKey>([
    [APP_CONFIG.routes.home, APP_CONFIG.routes.home],
    [APP_CONFIG.routes.homeRecent, APP_CONFIG.routes.homeRecent],
    [APP_CONFIG.routes.homeFavorites, APP_CONFIG.routes.homeFavorites],
  ]);

  protected readonly headerTitleKey = this.translation.header.title;
  protected readonly headerTaglineKey = this.translation.header.tagline;
  protected readonly heroEyebrowKey = this.translation.hero.eyebrow;
  protected readonly heroDescriptionKey = this.translation.hero.description;
  protected readonly heroActionKey = this.translation.hero.action;
  protected readonly tabs: readonly HomeTabOption[] = [
    { id: 'search', labelKey: this.translation.tabs.search },
    { id: 'recent', labelKey: this.translation.tabs.recent },
    { id: 'favorites', labelKey: this.translation.tabs.favorites },
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
  protected readonly recentCardHostClasses = RECENT_CARD_HOST_CLASSES;
  protected readonly recentCardBodyClasses = RECENT_CARD_BODY_CLASSES;

  protected readonly activeTab = signal<HomeTabId>('search');
  protected readonly recentClearActionVisible = signal(false);
  protected readonly layoutNavigationKey = signal<AppLayoutNavigationKey>(APP_CONFIG.routes.home);

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
    this.favoritesFacade.favorites$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((favorites) => this.favorites.set(favorites));
  }

  private observeRouteChanges(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const nextTab = this.resolveTabFromRoute();
        const nextNavigationKey = this.resolveNavigationKeyFromRoute();

        if (this.activeTab() !== nextTab) {
          this.activeTab.set(nextTab);
        }

        if (this.layoutNavigationKey() !== nextNavigationKey) {
          this.layoutNavigationKey.set(nextNavigationKey);
        }
      });
  }

  private syncActiveTabWithRoute(): void {
    this.activeTab.set(this.resolveTabFromRoute());
    this.layoutNavigationKey.set(this.resolveNavigationKeyFromRoute());
  }

  private resolveTabFromRoute(): HomeTabId {
    const path = this.route.snapshot.routeConfig?.path ?? APP_CONFIG.routes.home;
    return this.homeTabRoutes.get(path) ?? 'search';
  }

  private resolveNavigationKeyFromRoute(): AppLayoutNavigationKey {
    const path = this.route.snapshot.routeConfig?.path ?? APP_CONFIG.routes.home;
    return this.homeNavigationKeys.get(path) ?? APP_CONFIG.routes.home;
  }

  private async navigateToTab(tab: HomeTabId): Promise<void> {
    const commands = this.homeTabCommands.get(tab);

    if (!commands) {
      return;
    }

    await this.router.navigate(commands);
  }
}

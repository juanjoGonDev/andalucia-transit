import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { RouteSearchExecutionService } from '@domain/route-search/route-search-execution.service';
import {
  RouteSearchSelection,
  RouteSearchStateService,
} from '@domain/route-search/route-search-state.service';
import { FavoritesFacade, StopFavorite } from '@domain/stops/favorites.facade';
import { HomeFavoritesPreviewComponent } from '@features/home/favorites-preview/home-favorites-preview.component';
import { HomeTabId } from '@features/home/home.types';
import { HomeRecentSearchesComponent } from '@features/home/recent-searches/home-recent-searches.component';
import { RouteSearchFormComponent } from '@features/route-search/route-search-form/route-search-form.component';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import {
  ARROW_DOWN_KEY_MATCHER,
  ARROW_LEFT_KEY_MATCHER,
  ARROW_RIGHT_KEY_MATCHER,
  ARROW_UP_KEY_MATCHER,
  END_KEY_MATCHER,
  HOME_KEY_MATCHER,
  matchesKey,
} from '@shared/a11y/key-event-matchers';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import { AppLayoutNavigationKey } from '@shared/layout/app-layout-context.token';
import {
  NavigationCommands,
  buildNavigationCommands,
} from '@shared/navigation/navigation.util';

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
    HomeFavoritesPreviewComponent,
    AccessibleButtonDirective,
    AppLayoutContentDirective,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private static readonly ACTIVE_TAB_INDEX = 0 as const;
  private static readonly INACTIVE_TAB_INDEX = -1 as const;

  private readonly router = inject(Router);
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
  private readonly homeTabNavigationKeys = new Map<HomeTabId, AppLayoutNavigationKey>([
    ['search', APP_CONFIG.routes.home],
    ['recent', APP_CONFIG.routes.homeRecent],
    ['favorites', APP_CONFIG.routes.homeFavorites],
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
  protected readonly activeTab = signal<HomeTabId>('search');
  protected readonly recentClearActionVisible = signal(false);
  protected readonly layoutNavigationKey = signal<AppLayoutNavigationKey>(APP_CONFIG.routes.home);

  @ViewChild('recentSearches')
  private recentSearchesComponent?: HomeRecentSearchesComponent;
  @ViewChildren('tabElement', { read: ElementRef })
  private tabElements?: QueryList<ElementRef<HTMLElement>>;

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
    this.activateTab(tab, this.resolveTabElementById(tab), false);
  }

  protected isTabActive(tab: HomeTabId): boolean {
    return this.activeTab() === tab;
  }

  protected resolveTabFocusIndex(tab: HomeTabId): number {
    return this.activeTab() === tab
      ? HomeComponent.ACTIVE_TAB_INDEX
      : HomeComponent.INACTIVE_TAB_INDEX;
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    if (this.handleHomeNavigation(event)) {
      return;
    }

    if (this.handleEndNavigation(event)) {
      return;
    }

    if (this.handlePreviousNavigation(event, index)) {
      return;
    }

    this.handleNextNavigation(event, index);
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
      .subscribe((event) => {
        const path = this.resolveRoutePath(event.urlAfterRedirects ?? event.url ?? null);
        const nextTab = this.resolveTabFromPath(path);
        const nextNavigationKey = this.resolveNavigationKeyFromPath(path);

        if (this.activeTab() !== nextTab) {
          this.activeTab.set(nextTab);
        }

        if (this.layoutNavigationKey() !== nextNavigationKey) {
          this.layoutNavigationKey.set(nextNavigationKey);
        }
      });
  }

  private syncActiveTabWithRoute(): void {
    const currentPath = this.resolveRoutePath(this.router.url);
    this.activeTab.set(this.resolveTabFromPath(currentPath));
    this.layoutNavigationKey.set(this.resolveNavigationKeyFromPath(currentPath));
  }

  private resolveRoutePath(url: string | null | undefined): string {
    if (!url) {
      return APP_CONFIG.routes.home;
    }

    const trimmed = url.startsWith('/') ? url.slice(1) : url;
    const path = trimmed.split('?')[0]?.split('#')[0] ?? '';

    if (!path) {
      return APP_CONFIG.routes.home;
    }

    return path;
  }

  private resolveTabFromPath(path: string | null | undefined): HomeTabId {
    const routePath = path ?? APP_CONFIG.routes.home;
    return this.homeTabRoutes.get(routePath) ?? 'search';
  }

  private resolveNavigationKeyFromPath(path: string | null | undefined): AppLayoutNavigationKey {
    const routePath = path ?? APP_CONFIG.routes.home;
    return this.homeNavigationKeys.get(routePath) ?? APP_CONFIG.routes.home;
  }

  private resolveNavigationKeyFromTab(tab: HomeTabId): AppLayoutNavigationKey | null {
    return this.homeTabNavigationKeys.get(tab) ?? null;
  }

  private async navigateToTab(tab: HomeTabId): Promise<void> {
    const commands = this.homeTabCommands.get(tab);

    if (!commands) {
      return;
    }

    await this.router.navigate(commands);
  }

  private updateLayoutNavigationKeyForTab(tab: HomeTabId): void {
    const nextKey = this.resolveNavigationKeyFromTab(tab);

    if (!nextKey || this.layoutNavigationKey() === nextKey) {
      return;
    }

    this.layoutNavigationKey.set(nextKey);
  }

  private handlePreviousNavigation(event: KeyboardEvent, currentIndex: number): boolean {
    if (!this.isPreviousNavigationKey(event)) {
      return false;
    }

    event.preventDefault();
    const targetIndex = this.resolveCircularIndex(currentIndex - 1);
    this.activateTabByIndex(targetIndex);
    return true;
  }

  private handleNextNavigation(event: KeyboardEvent, currentIndex: number): void {
    if (!this.isNextNavigationKey(event)) {
      return;
    }

    event.preventDefault();
    const targetIndex = this.resolveCircularIndex(currentIndex + 1);
    this.activateTabByIndex(targetIndex);
  }

  private handleHomeNavigation(event: KeyboardEvent): boolean {
    if (!matchesKey(event, HOME_KEY_MATCHER)) {
      return false;
    }

    event.preventDefault();
    this.activateTabByIndex(0);
    return true;
  }

  private handleEndNavigation(event: KeyboardEvent): boolean {
    if (!matchesKey(event, END_KEY_MATCHER)) {
      return false;
    }

    event.preventDefault();
    this.activateTabByIndex(this.tabs.length - 1);
    return true;
  }

  private isPreviousNavigationKey(event: KeyboardEvent): boolean {
    return matchesKey(event, ARROW_LEFT_KEY_MATCHER) || matchesKey(event, ARROW_UP_KEY_MATCHER);
  }

  private isNextNavigationKey(event: KeyboardEvent): boolean {
    return matchesKey(event, ARROW_RIGHT_KEY_MATCHER) || matchesKey(event, ARROW_DOWN_KEY_MATCHER);
  }

  private resolveCircularIndex(index: number): number {
    const count = this.tabs.length;

    if (count === 0) {
      return 0;
    }

    return ((index % count) + count) % count;
  }

  private activateTabByIndex(index: number): void {
    const resolvedIndex = this.resolveCircularIndex(index);
    const target = this.tabs[resolvedIndex];

    if (!target) {
      return;
    }

    this.activateTab(target.id, this.resolveTabElementByIndex(resolvedIndex), true);
  }

  private activateTab(tab: HomeTabId, element: HTMLElement | null, focusAfterNavigation: boolean): void {
    const current = this.activeTab();

    if (current === tab) {
      if (focusAfterNavigation) {
        this.focusTabElement(element);
      }

      return;
    }

    this.activeTab.set(tab);
    this.updateLayoutNavigationKeyForTab(tab);

    if (focusAfterNavigation) {
      this.focusTabElement(element);
    }

    void this.navigateToTab(tab).then(() => {
      if (focusAfterNavigation) {
        this.focusTabElement(element);
      }
    });
  }

  private resolveTabElementById(tab: HomeTabId): HTMLElement | null {
    const index = this.tabs.findIndex((option) => option.id === tab);

    if (index < 0) {
      return null;
    }

    return this.resolveTabElementByIndex(index);
  }

  private resolveTabElementByIndex(index: number): HTMLElement | null {
    const elements = this.tabElements?.toArray() ?? [];
    const elementRef = elements[index] ?? null;
    return elementRef ? elementRef.nativeElement : null;
  }

  private focusTabElement(element: HTMLElement | null): void {
    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.focus();
    });
  }
}

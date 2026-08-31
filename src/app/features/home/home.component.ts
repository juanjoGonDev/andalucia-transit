import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, NavigationExtras, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { HomeTabStorage } from '@data/home/home-tab.storage';
import { RouteSearchExecutionService } from '@domain/route-search/route-search-execution.service';
import {
  RouteSearchSelection,
  RouteSearchStateService,
} from '@domain/route-search/route-search-state.service';
import { HomeFavoritesPanelComponent } from '@features/home/favorites-preview/home-favorites-panel.component';
import { HOME_TABS, HomeTabId } from '@features/home/home.types';
import { HomeRecentSearchesComponent } from '@features/home/recent-searches/home-recent-searches.component';
import { RouteSearchFormComponent } from '@features/route-search/route-search-form/route-search-form.component';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import {
  ARROW_LEFT_KEY_MATCHER,
  ARROW_RIGHT_KEY_MATCHER,
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

const TAB_ROLE = 'tab' as const;
const ACTIVE_TAB_INDEX = 0 as const;
const INACTIVE_TAB_INDEX = -1 as const;
const STEP_PREVIOUS = -1 as const;
const STEP_NEXT = 1 as const;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouteSearchFormComponent,
    HomeRecentSearchesComponent,
    HomeFavoritesPanelComponent,
    AccessibleButtonDirective,
    AppLayoutContentDirective,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly routeSearchState = inject(RouteSearchStateService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly route = inject(ActivatedRoute);
  private readonly homeTabStorage = inject(HomeTabStorage);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly defaultTab = APP_CONFIG.homeData.tabs.defaultTab;
  private readonly tabQueryParam = APP_CONFIG.homeData.tabs.queryParam;
  private readonly supportedTabs = new Set<HomeTabId>(HOME_TABS);

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
  protected readonly tabRole = TAB_ROLE;
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly recentStopsClearKey = this.translation.sections.recentStops.actions.clearAll;
  protected readonly activeTab = signal<HomeTabId>(this.defaultTab);
  protected readonly recentClearActionVisible = signal(false);
  protected readonly layoutNavigationKey = signal<AppLayoutNavigationKey>(APP_CONFIG.routes.home);

  @ViewChild('recentSearches')
  private recentSearchesComponent?: HomeRecentSearchesComponent;

  @ViewChildren('homeTabButton', { read: AccessibleButtonDirective })
  private tabButtons?: QueryList<AccessibleButtonDirective>;

  protected readonly currentSelection$ = this.routeSearchState.selection$;

  private pendingTabFocusRestore = false;

  constructor() {
    this.syncActiveTabWithRoute();
    this.observeRouteChanges();
  }

  protected selectTab(tab: HomeTabId): void {
    if (this.activeTab() === tab) {
      this.queueFocusOnTab(tab);
      return;
    }

    this.activeTab.set(tab);
    this.homeTabStorage.write(tab);
    this.updateLayoutNavigationKeyForTab(tab);
    this.queueFocusOnTab(tab);
    void this.navigateToTab(tab, this.buildTabNavigationExtras(tab));
  }

  protected isTabActive(tab: HomeTabId): boolean {
    return this.activeTab() === tab;
  }

  protected async onSelectionConfirmed(selection: RouteSearchSelection): Promise<void> {
    const commands = this.execution.prepare(selection);
    await this.navigate(commands);
  }

  protected onRecentItemsStateChange(hasItems: boolean): void {
    this.recentClearActionVisible.set(hasItems);
  }

  protected async onClearRecentSearches(): Promise<void> {
    const component = this.recentSearchesComponent;
    if (component) {
      await component.clearAll();
    }
  }

  protected async openFavoritesView(): Promise<void> {
    await this.navigate(this.favoritesCommands);
  }

  protected tabButtonTabIndex(tab: HomeTabId): number {
    return this.activeTab() === tab ? ACTIVE_TAB_INDEX : INACTIVE_TAB_INDEX;
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    if (matchesKey(event, ARROW_LEFT_KEY_MATCHER)) {
      event.preventDefault();
      this.activateRelativeTab(index, STEP_PREVIOUS);
      return;
    }

    if (matchesKey(event, ARROW_RIGHT_KEY_MATCHER)) {
      event.preventDefault();
      this.activateRelativeTab(index, STEP_NEXT);
      return;
    }

    if (matchesKey(event, HOME_KEY_MATCHER)) {
      event.preventDefault();
      this.activateTabByIndex(0);
      return;
    }

    if (matchesKey(event, END_KEY_MATCHER)) {
      event.preventDefault();
      this.activateTabByIndex(this.tabs.length - 1);
    }
  }

  private async navigate(
    commands: NavigationCommands,
    trackFocusRestore = true,
    extras?: NavigationExtras
  ): Promise<void> {
    if (trackFocusRestore && !this.isHomeTabCommand(commands)) {
      this.pendingTabFocusRestore = true;
    }

    if (extras) {
      await this.router.navigate(commands, extras);
      return;
    }

    await this.router.navigate(commands);
  }

  private observeRouteChanges(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects ?? event.url ?? '';
        const path = this.resolveRoutePath(url);
        const queryTab = this.extractTabFromUrl(url);
        const storedTab = this.homeTabStorage.read();
        const nextTab = this.resolvePreferredTab(path, queryTab, storedTab);
        const nextNavigationKey =
          this.resolveNavigationKeyFromTab(nextTab) ?? this.resolveNavigationKeyFromPath(path);

        if (this.activeTab() !== nextTab) {
          this.activeTab.set(nextTab);
        }

        if (this.layoutNavigationKey() !== nextNavigationKey) {
          this.layoutNavigationKey.set(nextNavigationKey);
        }

        this.homeTabStorage.write(nextTab);
        void this.ensureCanonicalRoute(nextTab, path, queryTab);

        if (this.pendingTabFocusRestore && this.isHomeTabRoute(path)) {
          this.pendingTabFocusRestore = false;
          this.queueFocusOnTab(nextTab);
        }
      });
  }

  private syncActiveTabWithRoute(): void {
    const currentUrl = this.router.url;
    const path = this.resolveRoutePath(currentUrl);
    const queryTab = this.resolveTabFromQueryParam(this.route.snapshot.queryParamMap.get(this.tabQueryParam));
    const storedTab = this.homeTabStorage.read();
    const resolvedTab = this.resolvePreferredTab(path, queryTab, storedTab);

    this.activeTab.set(resolvedTab);
    this.homeTabStorage.write(resolvedTab);
    this.updateLayoutNavigationKeyForTab(resolvedTab);
    void this.ensureCanonicalRoute(resolvedTab, path, queryTab);
  }

  private resolveRoutePath(url: string | null | undefined): string {
    if (!url) {
      return APP_CONFIG.routes.home;
    }

    const trimmed = url.startsWith('/') ? url.slice(1) : url;
    return trimmed.split('?')[0]?.split('#')[0] ?? APP_CONFIG.routes.home;
  }

  private resolveTabFromPath(path: string | null | undefined): HomeTabId {
    return this.homeTabRoutes.get(path ?? APP_CONFIG.routes.home) ?? 'search';
  }

  private resolveNavigationKeyFromPath(path: string | null | undefined): AppLayoutNavigationKey {
    return this.homeNavigationKeys.get(path ?? APP_CONFIG.routes.home) ?? APP_CONFIG.routes.home;
  }

  private resolveNavigationKeyFromTab(tab: HomeTabId): AppLayoutNavigationKey | null {
    return this.homeTabNavigationKeys.get(tab) ?? null;
  }

  private resolvePreferredTab(
    path: string,
    queryTab: HomeTabId | null,
    storedTab: HomeTabId | null
  ): HomeTabId {
    if (queryTab) {
      return queryTab;
    }

    const pathTab = this.resolveTabFromPath(path);
    if (path === APP_CONFIG.routes.home) {
      return storedTab ?? pathTab ?? this.defaultTab;
    }

    return this.isHomeTabRoute(path) ? pathTab : storedTab ?? pathTab ?? this.defaultTab;
  }

  private async navigateToTab(tab: HomeTabId, extras?: NavigationExtras): Promise<void> {
    const commands = this.homeTabCommands.get(tab);
    if (commands) {
      await this.navigate(commands, false, extras);
    }
  }

  private buildTabNavigationExtras(tab: HomeTabId, replaceUrl = false): NavigationExtras {
    return {
      queryParams: { [this.tabQueryParam]: tab },
      queryParamsHandling: 'merge',
      replaceUrl,
    };
  }

  private async ensureCanonicalRoute(tab: HomeTabId, path: string, queryTab: HomeTabId | null): Promise<void> {
    const pathTab = this.resolveTabFromPath(path);
    if (pathTab !== tab) {
      await this.navigateToTab(tab, this.buildTabNavigationExtras(tab, true));
      return;
    }

    if (queryTab !== tab) {
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { [this.tabQueryParam]: tab },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  private extractTabFromUrl(url: string): HomeTabId | null {
    const value = this.router.parseUrl(url).queryParams?.[this.tabQueryParam];
    return typeof value === 'string' ? this.resolveTabFromQueryParam(value) : null;
  }

  private resolveTabFromQueryParam(value: string | null | undefined): HomeTabId | null {
    return this.isHomeTabId(value) ? value : null;
  }

  private isHomeTabId(value: string | null | undefined): value is HomeTabId {
    return typeof value === 'string' && this.supportedTabs.has(value as HomeTabId);
  }

  private updateLayoutNavigationKeyForTab(tab: HomeTabId): void {
    const nextKey = this.resolveNavigationKeyFromTab(tab);
    if (nextKey && this.layoutNavigationKey() !== nextKey) {
      this.layoutNavigationKey.set(nextKey);
    }
  }

  private activateRelativeTab(index: number, step: number): void {
    const total = this.tabs.length;
    if (total > 0) {
      this.activateTabByIndex((index + step + total) % total);
    }
  }

  private activateTabByIndex(index: number): void {
    const tab = this.tabs[index];
    if (tab) {
      this.selectTab(tab.id);
    }
  }

  private queueFocusOnTab(tab: HomeTabId): void {
    queueMicrotask(() => this.focusTabById(tab));
  }

  private focusTabById(tab: HomeTabId): void {
    const index = this.tabs.findIndex((option) => option.id === tab);
    const directive = index >= 0 ? this.tabButtons?.toArray()[index] : undefined;
    directive?.focus();
  }

  private isHomeTabRoute(path: string | null | undefined): boolean {
    return Boolean(path && this.homeTabRoutes.has(path));
  }

  private isHomeTabCommand(commands: NavigationCommands): boolean {
    return commands.some((segment) => Boolean(segment && segment !== '/' && this.homeTabRoutes.has(segment)));
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { AppLayoutNavigationKey } from '@shared/layout/app-layout-context.token';
import { NavigationCommands, buildNavigationCommands } from '@shared/navigation/navigation.util';

interface ShellMenuEntry {
  readonly id: string;
  readonly labelKey: string;
  readonly navigationKey: AppLayoutNavigationKey;
  readonly commands: NavigationCommands;
}

interface ShellMenuViewEntry extends ShellMenuEntry {
  readonly isActive: boolean;
}

@Component({
  selector: 'app-app-shell-top-actions',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './app-shell-top-actions.component.html',
  styleUrl: './app-shell-top-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellTopActionsComponent {
  private readonly layoutContextStore = inject(AppLayoutContextStore);
  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly homeCommands = buildNavigationCommands(APP_CONFIG.routes.home);
  private readonly routeSearchCommands = buildNavigationCommands(APP_CONFIG.routes.routeSearch);
  private readonly mapCommands = buildNavigationCommands(APP_CONFIG.routes.map);
  private readonly favoritesCommands = buildNavigationCommands(APP_CONFIG.routes.favorites);
  private readonly homeRecentCommands = buildNavigationCommands(APP_CONFIG.routes.homeRecent);
  private readonly settingsCommands = buildNavigationCommands(APP_CONFIG.routes.settings);
  private readonly newsCommands = buildNavigationCommands(APP_CONFIG.routes.news);
  private readonly favoritesNavigationKeys: ReadonlySet<AppLayoutNavigationKey> = new Set([
    APP_CONFIG.routes.homeFavorites,
    APP_CONFIG.routes.favorites
  ]);
  private readonly moreNavigationKeys: ReadonlySet<AppLayoutNavigationKey> = new Set([
    APP_CONFIG.routes.homeRecent,
    APP_CONFIG.routes.settings,
    APP_CONFIG.routes.news
  ]);

  protected readonly homeLabelKey = APP_CONFIG.translationKeys.navigation.home;
  protected readonly routeSearchLabelKey = APP_CONFIG.translationKeys.navigation.routeSearch;
  protected readonly routeSearchShortLabelKey = APP_CONFIG.translationKeys.map.routes.title;
  protected readonly mapLabelKey = APP_CONFIG.translationKeys.navigation.map;
  protected readonly favoritesLabelKey = APP_CONFIG.translationKeys.navigation.favorites;
  protected readonly menuLabelKey = this.translation.topBar.menuLabel;
  protected readonly closeLabelKey = this.translation.dialogs.nearbyStops.close;
  protected readonly homeLinkCommands = [...this.homeCommands];
  protected readonly routeSearchLinkCommands = [...this.routeSearchCommands];
  protected readonly mapLinkCommands = [...this.mapCommands];
  protected readonly favoritesLinkCommands = [...this.favoritesCommands];
  protected menuOpen = false;

  private readonly entries: readonly ShellMenuEntry[] = Object.freeze([
    {
      id: 'recent',
      labelKey: this.translation.menu.recent,
      navigationKey: APP_CONFIG.routes.homeRecent,
      commands: this.homeRecentCommands
    },
    {
      id: 'news',
      labelKey: this.translation.menu.news,
      navigationKey: APP_CONFIG.routes.news,
      commands: this.newsCommands
    },
    {
      id: 'settings',
      labelKey: this.translation.menu.settings,
      navigationKey: APP_CONFIG.routes.settings,
      commands: this.settingsCommands
    }
  ]);

  protected readonly homeActive = computed(
    () => this.layoutContextStore.snapshot().activeNavigationKey === APP_CONFIG.routes.home
  );
  protected readonly routeSearchActive = computed(
    () => this.layoutContextStore.snapshot().activeNavigationKey === APP_CONFIG.routes.routeSearch
  );
  protected readonly mapActive = computed(
    () => this.layoutContextStore.snapshot().activeNavigationKey === APP_CONFIG.routes.map
  );
  protected readonly favoritesActive = computed(() => {
    const activeNavigationKey = this.layoutContextStore.snapshot().activeNavigationKey;
    return activeNavigationKey !== null && this.favoritesNavigationKeys.has(activeNavigationKey);
  });
  protected readonly moreActive = computed(() => {
    const activeNavigationKey = this.layoutContextStore.snapshot().activeNavigationKey;
    return activeNavigationKey !== null && this.moreNavigationKeys.has(activeNavigationKey);
  });
  protected readonly menuEntries = computed<readonly ShellMenuViewEntry[]>(() => {
    const activeNavigationKey = this.layoutContextStore.snapshot().activeNavigationKey;

    return this.entries.map((entry) => ({
      ...entry,
      isActive: entry.navigationKey === activeNavigationKey
    }));
  });

  protected openMenu(dialog: HTMLDialogElement): void {
    dialog.showModal();
    this.menuOpen = true;
  }

  protected handleDrawerPointerDown(event: PointerEvent, dialog: HTMLDialogElement): void {
    if (event.target === dialog) {
      dialog.close();
    }
  }
}

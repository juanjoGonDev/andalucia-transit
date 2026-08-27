import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { AppLayoutNavigationKey } from '@shared/layout/app-layout-context.token';
import { NavigationCommands, buildNavigationCommands } from '@shared/navigation/navigation.util';

interface ShellMenuEntry {
  readonly labelKey: string;
  readonly navigationKey: AppLayoutNavigationKey;
  readonly commands: NavigationCommands;
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

  protected readonly routes = APP_CONFIG.routes;
  protected readonly homeLabelKey = APP_CONFIG.translationKeys.navigation.home;
  protected readonly routeSearchLabelKey = APP_CONFIG.translationKeys.navigation.routeSearch;
  protected readonly routeSearchShortLabelKey = APP_CONFIG.translationKeys.map.routes.title;
  protected readonly mapLabelKey = APP_CONFIG.translationKeys.navigation.map;
  protected readonly favoritesLabelKey = APP_CONFIG.translationKeys.navigation.favorites;
  protected readonly menuLabelKey = this.translation.topBar.menuLabel;
  protected readonly closeLabelKey = this.translation.dialogs.nearbyStops.close;
  protected readonly homeLinkCommands = [...buildNavigationCommands(APP_CONFIG.routes.home)];
  protected readonly routeSearchLinkCommands = [
    ...buildNavigationCommands(APP_CONFIG.routes.routeSearch)
  ];
  protected readonly mapLinkCommands = [...buildNavigationCommands(APP_CONFIG.routes.map)];
  protected readonly favoritesLinkCommands = [
    ...buildNavigationCommands(APP_CONFIG.routes.favorites)
  ];
  protected readonly entries: readonly ShellMenuEntry[] = Object.freeze([
    {
      labelKey: this.translation.menu.recent,
      navigationKey: APP_CONFIG.routes.homeRecent,
      commands: buildNavigationCommands(APP_CONFIG.routes.homeRecent)
    },
    {
      labelKey: this.translation.menu.news,
      navigationKey: APP_CONFIG.routes.news,
      commands: buildNavigationCommands(APP_CONFIG.routes.news)
    },
    {
      labelKey: this.translation.menu.settings,
      navigationKey: APP_CONFIG.routes.settings,
      commands: buildNavigationCommands(APP_CONFIG.routes.settings)
    }
  ]);

  protected isActive(navigationKey: AppLayoutNavigationKey): boolean {
    return this.activeNavigationKey() === navigationKey;
  }

  protected favoritesActive(): boolean {
    const activeNavigationKey = this.activeNavigationKey();
    return (
      activeNavigationKey === APP_CONFIG.routes.homeFavorites ||
      activeNavigationKey === APP_CONFIG.routes.favorites
    );
  }

  protected moreActive(): boolean {
    const activeNavigationKey = this.activeNavigationKey();
    return this.entries.some((entry) => entry.navigationKey === activeNavigationKey);
  }

  protected openMenu(dialog: HTMLDialogElement, closeButton: HTMLButtonElement): void {
    dialog.showModal();
    closeButton.focus();
  }

  protected closeMenu(dialog: HTMLDialogElement, trigger: HTMLButtonElement): void {
    if (dialog.open) {
      dialog.close();
    }

    trigger.focus();
  }

  protected handleDrawerPointerDown(
    event: PointerEvent,
    dialog: HTMLDialogElement,
    trigger: HTMLButtonElement
  ): void {
    if (event.target === dialog) {
      this.closeMenu(dialog, trigger);
    }
  }

  private activeNavigationKey(): AppLayoutNavigationKey | null {
    return this.layoutContextStore.snapshot().activeNavigationKey;
  }
}

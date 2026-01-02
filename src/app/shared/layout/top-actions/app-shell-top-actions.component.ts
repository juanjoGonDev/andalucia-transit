import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal
} from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { HomeTabId } from '@features/home/home.types';
import {
  AccessibleButtonDirective,
  AccessibleButtonPopupToken
} from '@shared/a11y/accessible-button.directive';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { AppLayoutNavigationKey } from '@shared/layout/app-layout-context.token';
import { NavigationCommands, buildNavigationCommands } from '@shared/navigation/navigation.util';

interface ShellMenuEntry {
  readonly id: string;
  readonly labelKey: string;
  readonly navigationKey: AppLayoutNavigationKey | null;
  readonly action:
    | { readonly kind: 'home'; readonly tab: HomeTabId }
    | { readonly kind: 'navigation'; readonly commands: NavigationCommands };
  readonly disabled: boolean;
}

interface ShellMenuViewEntry extends ShellMenuEntry {
  readonly isActive: boolean;
}

const MENU_POPUP_ROLE: AccessibleButtonPopupToken = 'menu';
const FOCUSABLE_TAB_INDEX = 0;
const DISABLED_TAB_INDEX = -1;

@Component({
  selector: 'app-app-shell-top-actions',
  standalone: true,
  imports: [CommonModule, TranslateModule, AccessibleButtonDirective],
  templateUrl: './app-shell-top-actions.component.html',
  styleUrl: './app-shell-top-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellTopActionsComponent {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly layoutContextStore = inject(AppLayoutContextStore);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly tabQueryParam = APP_CONFIG.homeData.tabs.queryParam;
  private readonly homeCommands = buildNavigationCommands(APP_CONFIG.routes.home);
  private readonly homeRecentCommands = buildNavigationCommands(APP_CONFIG.routes.homeRecent);
  private readonly homeFavoritesCommands = buildNavigationCommands(APP_CONFIG.routes.homeFavorites);
  private readonly settingsCommands = buildNavigationCommands(APP_CONFIG.routes.settings);
  private readonly mapCommands = buildNavigationCommands(APP_CONFIG.routes.map);
  private readonly newsCommands = buildNavigationCommands(APP_CONFIG.routes.news);

  private readonly homeTabCommands: ReadonlyMap<HomeTabId, NavigationCommands> = new Map([
    ['search', this.homeCommands],
    ['recent', this.homeRecentCommands],
    ['favorites', this.homeFavoritesCommands]
  ]);

  protected readonly settingsLabelKey = this.translation.topBar.settingsLabel;
  protected readonly menuLabelKey = this.translation.topBar.menuLabel;
  protected readonly mapLabelKey = this.translation.topBar.mapLabel;
  protected readonly menuInProgressKey = this.translation.menu.inProgress;

  private readonly entries = signal<readonly ShellMenuEntry[]>([
    {
      id: 'recent',
      labelKey: this.translation.menu.recent,
      navigationKey: APP_CONFIG.routes.homeRecent,
      action: { kind: 'home', tab: 'recent' },
      disabled: false
    },
    {
      id: 'favorites',
      labelKey: this.translation.menu.favorites,
      navigationKey: APP_CONFIG.routes.homeFavorites,
      action: { kind: 'home', tab: 'favorites' },
      disabled: false
    },
    {
      id: 'settings',
      labelKey: this.translation.menu.settings,
      navigationKey: APP_CONFIG.routes.settings,
      action: { kind: 'navigation', commands: this.settingsCommands },
      disabled: false
    },
    {
      id: 'news',
      labelKey: this.translation.menu.news,
      navigationKey: APP_CONFIG.routes.news,
      action: { kind: 'navigation', commands: this.newsCommands },
      disabled: false
    }
  ]);

  protected readonly menuEntries = computed<readonly ShellMenuViewEntry[]>(() => {
    const activeNavigationKey = this.layoutContextStore.snapshot().activeNavigationKey;

    return this.entries().map((entry) => ({
      ...entry,
      isActive: entry.navigationKey !== null && entry.navigationKey === activeNavigationKey
    }));
  });
  protected readonly menuOpen = signal(false);
  protected readonly menuPopupRole = MENU_POPUP_ROLE;
  protected readonly focusableTabIndex = FOCUSABLE_TAB_INDEX;
  protected readonly disabledTabIndex = DISABLED_TAB_INDEX;

  private buildHomeTabNavigationExtras(tab: HomeTabId, replaceUrl = false): NavigationExtras {
    return {
      queryParams: { [this.tabQueryParam]: tab },
      queryParamsHandling: 'merge',
      replaceUrl,
    };
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    const target = event.target;

    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  protected async openSettings(): Promise<void> {
    await this.router.navigate(this.settingsCommands);
  }

  protected async openMap(): Promise<void> {
    await this.router.navigate(this.mapCommands);
  }

  protected async handleMenuEntry(entry: ShellMenuViewEntry): Promise<void> {
    if (entry.disabled) {
      return;
    }

    this.closeMenu();

    if (entry.action.kind === 'navigation') {
      await this.router.navigate(entry.action.commands);
      return;
    }

    const commands = this.homeTabCommands.get(entry.action.tab) ?? this.homeCommands;
    await this.router.navigate(commands, this.buildHomeTabNavigationExtras(entry.action.tab));
  }
}

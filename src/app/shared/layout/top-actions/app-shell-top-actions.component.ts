import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { AppLayoutContextStore } from '@shared/layout/app-layout-context.store';
import { AppLayoutNavigationKey } from '@shared/layout/app-layout-context.token';
import {
  LINE_DETAIL_BASE_SEGMENT,
  NavigationCommands,
  buildNavigationCommands
} from '@shared/navigation/navigation.util';

interface ShellMenuEntry {
  readonly labelKey: string;
  readonly icon: string;
  readonly navigationKey: AppLayoutNavigationKey;
  readonly commands: NavigationCommands;
}

const ESCAPE_KEY = 'Escape' as const;

@Component({
  selector: 'app-app-shell-top-actions',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './app-shell-top-actions.component.html',
  styleUrl: './app-shell-top-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellTopActionsComponent {
  @ViewChild('menuTrigger')
  private menuTrigger?: ElementRef<HTMLButtonElement>;

  private readonly layoutContextStore = inject(AppLayoutContextStore);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly translation = APP_CONFIG.translationKeys.home;

  protected readonly routes = APP_CONFIG.routes;
  protected readonly linesNavigationKey = LINE_DETAIL_BASE_SEGMENT;
  protected readonly homeLabelKey = APP_CONFIG.translationKeys.navigation.home;
  protected readonly linesLabelKey = APP_CONFIG.translationKeys.navigation.lines;
  protected readonly mapLabelKey = APP_CONFIG.translationKeys.navigation.map;
  protected readonly favoritesLabelKey = APP_CONFIG.translationKeys.navigation.favorites;
  protected readonly menuLabelKey = this.translation.topBar.menuLabel;
  protected readonly menuOpen = signal(false);
  protected readonly homeLinkCommands = [...buildNavigationCommands(APP_CONFIG.routes.home)];
  protected readonly linesLinkCommands = [...buildNavigationCommands(LINE_DETAIL_BASE_SEGMENT)];
  protected readonly mapLinkCommands = [...buildNavigationCommands(APP_CONFIG.routes.map)];
  protected readonly favoritesLinkCommands = [
    ...buildNavigationCommands(APP_CONFIG.routes.favorites)
  ];
  protected readonly entries: readonly ShellMenuEntry[] = Object.freeze([
    {
      labelKey: this.translation.menu.recent,
      icon: 'history',
      navigationKey: APP_CONFIG.routes.homeRecent,
      commands: buildNavigationCommands(APP_CONFIG.routes.homeRecent)
    },
    {
      labelKey: this.translation.menu.news,
      icon: 'newspaper',
      navigationKey: APP_CONFIG.routes.news,
      commands: buildNavigationCommands(APP_CONFIG.routes.news)
    },
    {
      labelKey: this.translation.menu.settings,
      icon: 'settings',
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
    return this.menuOpen() || this.entries.some((entry) => entry.navigationKey === activeNavigationKey);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);

    if (restoreFocus) {
      queueMicrotask(() => this.menuTrigger?.nativeElement.focus());
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== ESCAPE_KEY || !this.menuOpen()) {
      return;
    }

    event.preventDefault();
    this.closeMenu(true);
  }

  @HostListener('document:pointerdown', ['$event'])
  protected handleDocumentPointerDown(event: PointerEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    const target = event.target;

    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  private activeNavigationKey(): AppLayoutNavigationKey | null {
    return this.layoutContextStore.snapshot().activeNavigationKey;
  }
}

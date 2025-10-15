import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../../core/config';
import { HomeTabId } from '../../../features/home/home.types';
import { buildNavigationCommands, NavigationCommands } from '../../navigation/navigation.util';

type HomeIntent = (typeof APP_CONFIG.home.intents)[keyof typeof APP_CONFIG.home.intents];

interface ShellMenuEntry {
  readonly id: string;
  readonly labelKey: string;
  readonly action:
    | { readonly kind: 'home'; readonly tab: HomeTabId; readonly intent?: HomeIntent }
    | { readonly kind: 'navigation'; readonly commands: NavigationCommands };
  readonly disabled: boolean;
}

@Component({
  selector: 'app-app-shell-top-actions',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './app-shell-top-actions.component.html',
  styleUrl: './app-shell-top-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellTopActionsComponent {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly config = APP_CONFIG.home;
  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly homeCommands = buildNavigationCommands(APP_CONFIG.routes.home);
  private readonly settingsCommands = buildNavigationCommands(APP_CONFIG.routes.settings);
  private readonly mapCommands = buildNavigationCommands(APP_CONFIG.routes.map);

  protected readonly settingsLabelKey = this.translation.topBar.settingsLabel;
  protected readonly menuLabelKey = this.translation.topBar.menuLabel;
  protected readonly mapLabelKey = this.translation.topBar.mapLabel;
  protected readonly menuInProgressKey = this.translation.menu.inProgress;

  private readonly entries = signal<readonly ShellMenuEntry[]>([
    {
      id: 'recent',
      labelKey: this.translation.menu.recent,
      action: { kind: 'home', tab: 'recent' },
      disabled: false
    },
    {
      id: 'favorites',
      labelKey: this.translation.menu.favorites,
      action: { kind: 'home', tab: 'favorites' },
      disabled: false
    },
    {
      id: 'nearby',
      labelKey: this.translation.menu.nearby,
      action: { kind: 'home', tab: 'nearby', intent: 'nearby' },
      disabled: false
    },
    {
      id: 'settings',
      labelKey: this.translation.menu.settings,
      action: { kind: 'navigation', commands: this.settingsCommands },
      disabled: false
    },
    {
      id: 'news',
      labelKey: this.translation.menu.news,
      action: { kind: 'home', tab: 'search' },
      disabled: true
    }
  ]);

  protected readonly menuEntries = computed(() => this.entries());
  protected readonly menuOpen = signal(false);

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

  protected async handleMenuEntry(entry: ShellMenuEntry): Promise<void> {
    if (entry.disabled) {
      return;
    }

    this.closeMenu();

    if (entry.action.kind === 'navigation') {
      await this.router.navigate(entry.action.commands);
      return;
    }

    const queryParams: Record<string, string> = { [this.config.queryParams.tab]: entry.action.tab };

    if (entry.action.intent) {
      queryParams[this.config.queryParams.intent] = entry.action.intent;
    }

    await this.router.navigate(this.homeCommands, { queryParams });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { APP_CONFIG } from '../../core/config';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import {
  RouteSearchLineMatch,
  RouteSearchSelection,
  RouteSearchStateService
} from '../../domain/route-search/route-search-state.service';

interface BottomNavigationItem {
  readonly labelKey: string;
  readonly icon: MaterialSymbolName;
  readonly commands: readonly string[];
}

@Component({
  selector: 'app-route-search',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatCardModule, TranslateModule],
  templateUrl: './route-search.component.html',
  styleUrl: './route-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteSearchComponent {
  private static readonly ROOT_COMMAND = '/' as const;

  private readonly state = inject(RouteSearchStateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly translationKeys = APP_CONFIG.translationKeys.routeSearch;
  private readonly navigationKeys = APP_CONFIG.translationKeys.navigation;

  protected readonly bottomNavigationItems: readonly BottomNavigationItem[] = [
    {
      labelKey: this.navigationKeys.home,
      icon: 'home',
      commands: this.buildCommands(APP_CONFIG.routes.home)
    },
    {
      labelKey: this.navigationKeys.map,
      icon: 'map',
      commands: this.buildCommands(APP_CONFIG.routes.map)
    },
    {
      labelKey: this.navigationKeys.lines,
      icon: 'route',
      commands: this.buildCommands(APP_CONFIG.routes.routeSearch)
    }
  ];

  protected readonly selection = signal<RouteSearchSelection | null>(this.state.getSelection());
  protected readonly hasSelection = computed(() => this.selection() !== null);

  constructor() {
    this.state
      .selection$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.selection.set(value));
  }

  protected trackLineMatch(_: number, match: RouteSearchLineMatch): string {
    return `${match.lineId}-${match.direction}`;
  }

  private buildCommands(path: string): readonly string[] {
    if (!path) {
      return [RouteSearchComponent.ROOT_COMMAND];
    }

    return [RouteSearchComponent.ROOT_COMMAND, path];
  }
}

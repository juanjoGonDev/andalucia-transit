import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../../core/config';
import {
  BottomNavigationComponent,
  BottomNavigationItem
} from '../../ui/bottom-navigation/bottom-navigation.component';
import { MaterialSymbolName } from '../../ui/types/material-symbol-name';
import { buildNavigationCommands } from '../../navigation/navigation.util';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet, BottomNavigationComponent, TranslateModule],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private static readonly HOME_ICON: MaterialSymbolName = 'home';
  private static readonly MAP_ICON: MaterialSymbolName = 'map';
  private static readonly LINES_ICON: MaterialSymbolName = 'route';
  private static readonly SETTINGS_ICON: MaterialSymbolName = 'settings';

  private readonly navigationKeys = APP_CONFIG.translationKeys.navigation;

  protected readonly bottomNavigationItems: readonly BottomNavigationItem[] = [
    {
      labelKey: this.navigationKeys.home,
      icon: AppShellComponent.HOME_ICON,
      commands: buildNavigationCommands(APP_CONFIG.routes.home)
    },
    {
      labelKey: this.navigationKeys.map,
      icon: AppShellComponent.MAP_ICON,
      commands: buildNavigationCommands(APP_CONFIG.routes.map)
    },
    {
      labelKey: this.navigationKeys.settings,
      icon: AppShellComponent.SETTINGS_ICON,
      commands: buildNavigationCommands(APP_CONFIG.routes.settings)
    },
    {
      labelKey: this.navigationKeys.lines,
      icon: AppShellComponent.LINES_ICON,
      commands: buildNavigationCommands(APP_CONFIG.routes.routeSearch)
    }
  ];
}

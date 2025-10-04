import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../../core/config';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

interface NavigationItem {
  labelKey: string;
  commands: string[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatToolbarModule,
    TranslateModule,
    LanguageSwitcherComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  protected readonly appName = APP_CONFIG.appName;
  protected readonly navigationItems: NavigationItem[] = [
    {
      labelKey: APP_CONFIG.translationKeys.navigation.home,
      commands: this.createCommands(APP_CONFIG.routes.home)
    },
    {
      labelKey: APP_CONFIG.translationKeys.navigation.stopDetail,
      commands: this.createCommands(APP_CONFIG.routes.stopDetail)
    },
    {
      labelKey: APP_CONFIG.translationKeys.navigation.routeSearch,
      commands: this.createCommands(APP_CONFIG.routes.routeSearch)
    },
    {
      labelKey: APP_CONFIG.translationKeys.navigation.map,
      commands: this.createCommands(APP_CONFIG.routes.map)
    }
  ];

  private createCommands(path: string): string[] {
    if (!path) {
      return ['/'];
    }

    return ['/', path];
  }
}

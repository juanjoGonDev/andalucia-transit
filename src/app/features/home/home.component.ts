import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import { CardListItemComponent, CardListLayout, IconVariant } from '../../shared/ui/card-list-item/card-list-item.component';
import { SectionComponent } from '../../shared/ui/section/section.component';

interface HomeListItem {
  titleKey: string;
  subtitleKey?: string;
  leadingIcon: MaterialSymbolName;
  iconVariant?: IconVariant;
  layout?: CardListLayout;
  commands?: readonly string[];
  ariaLabelKey?: string;
}

interface BottomNavigationItem {
  labelKey: string;
  icon: MaterialSymbolName;
  commands: readonly string[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    CardListItemComponent,
    SectionComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private static readonly ROOT_COMMAND = '/' as const;

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly navigation = APP_CONFIG.translationKeys.navigation;
  private readonly pinIcon: MaterialSymbolName = 'pin_drop';
  private readonly locationIcon: MaterialSymbolName = 'my_location';
  private readonly favoriteIcons: readonly MaterialSymbolName[] = ['directions_bus', 'mail'] as const;

  protected readonly headerTitleKey = this.translation.header.title;
  protected readonly headerInfoLabelKey = this.translation.header.infoLabel;
  protected readonly infoIcon: MaterialSymbolName = 'info';
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly findNearbyTitleKey = this.translation.sections.findNearby.title;
  protected readonly findNearbyActionKey = this.translation.sections.findNearby.action;
  protected readonly favoritesTitleKey = this.translation.sections.favorites.title;

  protected readonly recentStops: HomeListItem[] =
    APP_CONFIG.translationKeys.home.sections.recentStops.items.map((titleKey) => ({
      titleKey,
      leadingIcon: this.pinIcon,
      commands: this.buildCommands(APP_CONFIG.routes.stopDetail)
    }));

  protected readonly locationAction: HomeListItem = {
    titleKey: this.findNearbyActionKey,
    leadingIcon: this.locationIcon,
    layout: 'action',
    iconVariant: 'soft',
    commands: this.buildCommands(APP_CONFIG.routes.map),
    ariaLabelKey: this.findNearbyActionKey
  };

  protected readonly favoriteStops: HomeListItem[] =
    APP_CONFIG.translationKeys.home.sections.favorites.items.map((item, index) => ({
      titleKey: item.title,
      subtitleKey: item.subtitle,
      leadingIcon: this.favoriteIcons[index] ?? 'directions_bus',
      iconVariant: 'soft',
      commands: this.buildCommands(APP_CONFIG.routes.stopDetail)
    }));

  protected readonly bottomNavigationItems: BottomNavigationItem[] = [
    {
      labelKey: this.navigation.home,
      icon: 'home',
      commands: this.buildCommands(APP_CONFIG.routes.home)
    },
    {
      labelKey: this.navigation.map,
      icon: 'map',
      commands: this.buildCommands(APP_CONFIG.routes.map)
    },
    {
      labelKey: this.navigation.lines,
      icon: 'route',
      commands: this.buildCommands(APP_CONFIG.routes.routeSearch)
    }
  ];

  protected readonly trailingIcon: MaterialSymbolName = 'chevron_right';

  private buildCommands(path: string): readonly string[] {
    if (!path) {
      return [HomeComponent.ROOT_COMMAND] as readonly string[];
    }

    return [HomeComponent.ROOT_COMMAND, path] as readonly string[];
  }
}

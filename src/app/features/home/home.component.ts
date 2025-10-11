import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { APP_CONFIG } from '../../core/config';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import { CardListItemComponent } from '../../shared/ui/card-list-item/card-list-item.component';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { HomeNearbyStopsDialogComponent } from './home-nearby-stops-dialog.component';
import { RouteSearchSelection, RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import { buildRouteSearchPath } from '../../domain/route-search/route-search-url.util';
import { StopNavigationItemComponent } from '../../shared/ui/stop-navigation-item/stop-navigation-item.component';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';

interface ActionListItem {
  titleKey: string;
  subtitleKey?: string;
  leadingIcon: MaterialSymbolName;
  ariaLabelKey?: string;
}

interface StopNavigationItemViewModel {
  id: string;
  titleKey: string;
  leadingIcon: MaterialSymbolName;
  subtitleKey?: string;
  iconVariant: 'plain' | 'soft';
  layout: 'list' | 'action';
  trailingIcon: MaterialSymbolName | null;
  ariaLabelKey?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatDialogModule,
    CardListItemComponent,
    SectionComponent,
    StopNavigationItemComponent,
    RouteSearchFormComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly routeSearchState = inject(RouteSearchStateService);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly routeSegments = APP_CONFIG.routeSegments.routeSearch;
  private readonly locationIcon: MaterialSymbolName = 'my_location';
  private readonly recentStopIcon: MaterialSymbolName = APP_CONFIG.homeData.recentStops.icon;
  private readonly recentStopsLimit = APP_CONFIG.homeData.recentStops.maxItems;

  protected readonly headerTitleKey = this.translation.header.title;
  protected readonly headerInfoLabelKey = this.translation.header.infoLabel;
  protected readonly infoIcon: MaterialSymbolName = 'info';
  protected readonly searchTitleKey = this.translation.sections.search.title;
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly findNearbyTitleKey = this.translation.sections.findNearby.title;
  protected readonly findNearbyActionKey = this.translation.sections.findNearby.action;
  protected readonly favoritesTitleKey = this.translation.sections.favorites.title;

  protected readonly trailingIcon: MaterialSymbolName = 'chevron_right';
  protected readonly recentStops: StopNavigationItemViewModel[] = this.buildRecentStops();

  protected readonly locationAction: ActionListItem = {
    titleKey: this.findNearbyActionKey,
    leadingIcon: this.locationIcon,
    ariaLabelKey: this.findNearbyActionKey
  };
  protected readonly locationActionLayout = 'action' as const;
  protected readonly locationActionIconVariant = 'soft' as const;

  protected readonly favoriteStops: StopNavigationItemViewModel[] = this.buildFavoriteStops();

  protected readonly currentSelection$ = this.routeSearchState.selection$;

  protected openNearbyStopsDialog(): void {
    this.dialog.open(HomeNearbyStopsDialogComponent);
  }

  protected async onSelectionConfirmed(selection: RouteSearchSelection): Promise<void> {
    this.routeSearchState.setSelection(selection);
    const commands = buildRouteSearchPath(
      selection.origin,
      selection.destination,
      selection.queryDate,
      {
        base: APP_CONFIG.routes.routeSearch,
        connector: this.routeSegments.connector,
        date: this.routeSegments.date
      }
    );
    await this.router.navigate(commands);
  }

  private buildRecentStops(): StopNavigationItemViewModel[] {
    return APP_CONFIG.homeData.recentStops.items
      .slice(0, this.recentStopsLimit)
      .map((item) => ({
        id: item.id,
        titleKey: item.titleKey,
        leadingIcon: this.recentStopIcon,
        iconVariant: 'soft',
        layout: 'list',
        trailingIcon: this.trailingIcon
      }));
  }

  private buildFavoriteStops(): StopNavigationItemViewModel[] {
    return APP_CONFIG.homeData.favoriteStops.items.map((item) => ({
      id: item.id,
      titleKey: item.titleKey,
      subtitleKey: item.subtitleKey,
      leadingIcon: item.leadingIcon,
      iconVariant: 'soft',
      layout: 'list',
      trailingIcon: this.trailingIcon
    }));
  }
}

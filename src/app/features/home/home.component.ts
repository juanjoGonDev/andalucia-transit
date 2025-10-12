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
import { RouteSearchExecutionService } from '../../domain/route-search/route-search-execution.service';
import { StopNavigationItemComponent } from '../../shared/ui/stop-navigation-item/stop-navigation-item.component';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';
import { HomeRecentSearchesComponent } from './recent-searches/home-recent-searches.component';

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
    RouteSearchFormComponent,
    HomeRecentSearchesComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly routeSearchState = inject(RouteSearchStateService);
  private readonly execution = inject(RouteSearchExecutionService);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly locationIcon: MaterialSymbolName = 'my_location';

  protected readonly headerTitleKey = this.translation.header.title;
  protected readonly headerInfoLabelKey = this.translation.header.infoLabel;
  protected readonly infoIcon: MaterialSymbolName = 'info';
  protected readonly searchTitleKey = this.translation.sections.search.title;
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly findNearbyTitleKey = this.translation.sections.findNearby.title;
  protected readonly findNearbyActionKey = this.translation.sections.findNearby.action;
  protected readonly favoritesTitleKey = this.translation.sections.favorites.title;

  protected readonly trailingIcon: MaterialSymbolName = 'chevron_right';

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
    const commands = this.execution.prepare(selection);
    await this.router.navigate(commands);
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

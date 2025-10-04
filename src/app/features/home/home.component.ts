import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { APP_CONFIG } from '../../core/config';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import { CardListItemComponent, CardListLayout, IconVariant } from '../../shared/ui/card-list-item/card-list-item.component';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { HomeNearbyStopsDialogComponent } from './home-nearby-stops-dialog.component';

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

interface RecentStopCard {
  titleKey: string;
  imageUrl: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    ReactiveFormsModule,
    MatDialogModule,
    CardListItemComponent,
    SectionComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private static readonly ROOT_COMMAND = '/' as const;

  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly navigation = APP_CONFIG.translationKeys.navigation;
  private readonly searchIds = APP_CONFIG.homeData.search;
  private readonly defaultLocale = APP_CONFIG.locales.default;
  private readonly isoDateFormat = APP_CONFIG.formats.isoDate;
  private readonly locationIcon: MaterialSymbolName = 'my_location';
  private readonly favoriteIcons: readonly MaterialSymbolName[] = ['directions_bus', 'mail'] as const;
  private readonly originIcon: MaterialSymbolName = 'my_location';
  private readonly destinationIcon: MaterialSymbolName = 'flag';
  private readonly dateIcon: MaterialSymbolName = 'calendar_today';

  protected readonly headerTitleKey = this.translation.header.title;
  protected readonly headerInfoLabelKey = this.translation.header.infoLabel;
  protected readonly infoIcon: MaterialSymbolName = 'info';
  protected readonly searchTitleKey = this.translation.sections.search.title;
  protected readonly searchOriginLabelKey = this.translation.sections.search.originLabel;
  protected readonly searchOriginPlaceholderKey = this.translation.sections.search.originPlaceholder;
  protected readonly searchDestinationLabelKey = this.translation.sections.search.destinationLabel;
  protected readonly searchDestinationPlaceholderKey =
    this.translation.sections.search.destinationPlaceholder;
  protected readonly searchDateLabelKey = this.translation.sections.search.dateLabel;
  protected readonly searchSubmitKey = this.translation.sections.search.submit;
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly findNearbyTitleKey = this.translation.sections.findNearby.title;
  protected readonly findNearbyActionKey = this.translation.sections.findNearby.action;
  protected readonly favoritesTitleKey = this.translation.sections.favorites.title;

  protected readonly recentStopCards: RecentStopCard[] = APP_CONFIG.homeData.recentStops.slice();

  protected readonly locationAction: HomeListItem = {
    titleKey: this.findNearbyActionKey,
    leadingIcon: this.locationIcon,
    layout: 'action',
    iconVariant: 'soft',
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
  protected readonly originFieldId = this.searchIds.originFieldId;
  protected readonly destinationFieldId = this.searchIds.destinationFieldId;
  protected readonly dateFieldId = this.searchIds.dateFieldId;

  private readonly minimumSearchDate = this.buildDefaultDate();
  private readonly minimumDateValidator: ValidatorFn = this.createMinimumDateValidator(
    this.minimumSearchDate
  );

  protected readonly minSearchDate = this.minimumSearchDate;

  protected readonly searchForm = this.formBuilder.nonNullable.group({
    origin: ['', Validators.required],
    destination: ['', Validators.required],
    date: [this.minimumSearchDate, [Validators.required, this.minimumDateValidator]]
  });

  private buildCommands(path: string): readonly string[] {
    if (!path) {
      return [HomeComponent.ROOT_COMMAND] as readonly string[];
    }

    return [HomeComponent.ROOT_COMMAND, path] as readonly string[];
  }

  protected onSearch(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const commands = this.buildCommands(APP_CONFIG.routes.routeSearch);
    void this.router.navigate([...commands]);
  }

  protected openNearbyStopsDialog(): void {
    this.dialog.open(HomeNearbyStopsDialogComponent);
  }

  protected get originIconName(): MaterialSymbolName {
    return this.originIcon;
  }

  protected get destinationIconName(): MaterialSymbolName {
    return this.destinationIcon;
  }

  protected get dateIconName(): MaterialSymbolName {
    return this.dateIcon;
  }

  private buildDefaultDate(): string {
    return formatDate(new Date(), this.isoDateFormat, this.defaultLocale);
  }

  private createMinimumDateValidator(minimum: string): ValidatorFn {
    return (control: AbstractControl<string | null>): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      return value < minimum ? { minDate: { min: minimum } } : null;
    };
  }
}

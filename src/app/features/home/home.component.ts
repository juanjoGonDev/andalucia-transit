import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  AbstractControl,
  FormControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  combineLatest
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs/operators';

import { APP_CONFIG } from '../../core/config';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import {
  CardListItemComponent,
  CardListLayout,
  IconVariant
} from '../../shared/ui/card-list-item/card-list-item.component';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { HomeNearbyStopsDialogComponent } from './home-nearby-stops-dialog.component';
import {
  MockTransitNetworkService,
  StopOption
} from '../../data/stops/mock-transit-network.service';

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
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly transitNetwork = inject(MockTransitNetworkService);

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
  private readonly recentStopIcon: MaterialSymbolName = APP_CONFIG.homeData.recentStops.icon;
  private readonly recentStopsLimit = APP_CONFIG.homeData.recentStops.maxItems;
  private readonly maxAutocompleteOptions = APP_CONFIG.homeData.search.maxAutocompleteOptions;
  private readonly searchDebounceMs = APP_CONFIG.homeData.search.debounceMs;

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
  protected readonly swapButtonLabelKey = this.translation.sections.search.swapLabel;
  protected readonly recentStopsTitleKey = this.translation.sections.recentStops.title;
  protected readonly findNearbyTitleKey = this.translation.sections.findNearby.title;
  protected readonly findNearbyActionKey = this.translation.sections.findNearby.action;
  protected readonly favoritesTitleKey = this.translation.sections.favorites.title;

  protected readonly trailingIcon: MaterialSymbolName = 'chevron_right';
  protected readonly recentStops: HomeListItem[] = this.buildRecentStops();
  protected readonly swapIcon: MaterialSymbolName = 'swap_vert';

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

  protected readonly originFieldId = this.searchIds.originFieldId;
  protected readonly destinationFieldId = this.searchIds.destinationFieldId;
  protected readonly dateFieldId = this.searchIds.dateFieldId;

  private readonly minimumSearchDate = this.buildDefaultDate();
  private readonly minimumDateValidator: ValidatorFn = this.createMinimumDateValidator(
    this.minimumSearchDate
  );
  private readonly stopSelectionValidator: ValidatorFn = this.createStopSelectionValidator();

  protected readonly minSearchDate = this.minimumSearchDate;

  protected readonly searchForm = this.formBuilder.group({
    origin: this.formBuilder.control<StopAutocompleteValue>(null, {
      validators: [this.stopSelectionValidator]
    }),
    destination: this.formBuilder.control<StopAutocompleteValue>(null, {
      validators: [this.stopSelectionValidator]
    }),
    date: this.formBuilder.nonNullable.control<string>(this.minimumSearchDate, [
      Validators.required,
      this.minimumDateValidator
    ])
  });

  private readonly originControl = this.searchForm.controls.origin as FormControl<StopAutocompleteValue>;
  private readonly destinationControl = this.searchForm.controls
    .destination as FormControl<StopAutocompleteValue>;

  private readonly originValue$ = this.originControl.valueChanges.pipe(
    startWith(this.originControl.value)
  );
  private readonly destinationValue$ = this.destinationControl.valueChanges.pipe(
    startWith(this.destinationControl.value)
  );

  private readonly selectedOrigin$ = this.originValue$.pipe(
    map((value) => this.toStopOption(value)),
    distinctUntilChanged((previous, current) => this.areSameStop(previous, current)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  private readonly selectedDestination$ = this.destinationValue$.pipe(
    map((value) => this.toStopOption(value)),
    distinctUntilChanged((previous, current) => this.areSameStop(previous, current)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly originQuery$ = this.originValue$.pipe(
    map((value) => this.toQuery(value)),
    debounceTime(this.searchDebounceMs),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  private readonly destinationQuery$ = this.destinationValue$.pipe(
    map((value) => this.toQuery(value)),
    debounceTime(this.searchDebounceMs),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly allowedOriginIds$ = this.selectedDestination$.pipe(
    map((destination) => (destination ? this.transitNetwork.getReachableStopIds(destination.id) : null)),
    distinctUntilChanged((previous, current) => this.areSameIdSets(previous, current)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly allowedDestinationIds$ = this.selectedOrigin$.pipe(
    map((origin) => (origin ? this.transitNetwork.getReachableStopIds(origin.id) : null)),
    distinctUntilChanged((previous, current) => this.areSameIdSets(previous, current)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly originOptions$: Observable<readonly StopOption[]> = combineLatest([
    this.originQuery$,
    this.allowedOriginIds$,
    this.selectedDestination$
  ]).pipe(
    switchMap(([query, allowedOriginIds, selectedDestination]) =>
      this.transitNetwork.searchStops({
        query,
        includeStopIds: allowedOriginIds ?? undefined,
        excludeStopId: selectedDestination?.id,
        limit: this.maxAutocompleteOptions
      })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly destinationOptions$: Observable<readonly StopOption[]> = combineLatest([
    this.destinationQuery$,
    this.allowedDestinationIds$,
    this.selectedOrigin$
  ]).pipe(
    switchMap(([query, allowedDestinationIds, selectedOrigin]) =>
      this.transitNetwork.searchStops({
        query,
        includeStopIds: allowedDestinationIds ?? undefined,
        excludeStopId: selectedOrigin?.id,
        limit: this.maxAutocompleteOptions
      })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly displayStopFn = (value: StopAutocompleteValue): string =>
    this.displayStop(value);

  constructor() {
    this.observeSelections();
  }

  private buildCommands(path: string): readonly string[] {
    if (!path) {
      return [HomeComponent.ROOT_COMMAND] as readonly string[];
    }

    return [HomeComponent.ROOT_COMMAND, path] as readonly string[];
  }

  protected onSearch(): void {
    const origin = this.toStopOption(this.originControl.value);
    const destination = this.toStopOption(this.destinationControl.value);

    if (!origin || !destination || this.searchForm.invalid) {
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

  protected displayStop(option: StopAutocompleteValue): string {
    if (!option) {
      return '';
    }

    if (typeof option === 'string') {
      return option;
    }

    return option.name;
  }

  protected trackStopOption(_: number, option: StopOption): string {
    return option.id;
  }

  protected swapStops(): void {
    const origin = this.toStopOption(this.originControl.value);
    const destination = this.toStopOption(this.destinationControl.value);

    if (!origin && !destination) {
      return;
    }

    this.originControl.setValue(destination ?? null);
    this.destinationControl.setValue(origin ?? null);
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

  private createStopSelectionValidator(): ValidatorFn {
    return (control: AbstractControl<StopAutocompleteValue>): ValidationErrors | null => {
      return this.toStopOption(control.value) ? null : { stopRequired: true };
    };
  }

  private observeSelections(): void {
    this.selectedOrigin$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((origin) => this.ensureDestinationCompatibility(origin));

    this.selectedDestination$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((destination) => this.ensureOriginCompatibility(destination));
  }

  private ensureDestinationCompatibility(origin: StopOption | null): void {
    const destination = this.toStopOption(this.destinationControl.value);

    if (!origin || !destination) {
      return;
    }

    const reachable = this.transitNetwork.getReachableStopIds(origin.id);

    if (!reachable.includes(destination.id)) {
      this.destinationControl.setValue(null);
    }
  }

  private ensureOriginCompatibility(destination: StopOption | null): void {
    const origin = this.toStopOption(this.originControl.value);

    if (!destination || !origin) {
      return;
    }

    const reachable = this.transitNetwork.getReachableStopIds(destination.id);

    if (!reachable.includes(origin.id)) {
      this.originControl.setValue(null);
    }
  }

  private toStopOption(value: StopAutocompleteValue): StopOption | null {
    if (!value || typeof value === 'string') {
      return null;
    }

    return value;
  }

  private toQuery(value: StopAutocompleteValue): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    return value;
  }

  private areSameStop(first: StopOption | null, second: StopOption | null): boolean {
    if (!first && !second) {
      return true;
    }

    if (!first || !second) {
      return false;
    }

    return first.id === second.id;
  }

  private areSameIdSets(
    first: readonly string[] | null,
    second: readonly string[] | null
  ): boolean {
    if (!first && !second) {
      return true;
    }

    if (!first || !second) {
      return false;
    }

    if (first.length !== second.length) {
      return false;
    }

    return first.every((value, index) => value === second[index]);
  }

  private buildRecentStops(): HomeListItem[] {
    return APP_CONFIG.homeData.recentStops.items
      .slice(0, this.recentStopsLimit)
      .map((titleKey) => ({
        titleKey,
        leadingIcon: this.recentStopIcon,
        iconVariant: 'soft'
      }));
  }
}

type StopAutocompleteValue = StopOption | string | null;

import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, firstValueFrom, of, timer } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs/operators';

import { APP_CONFIG } from '../../core/config';
import { MaterialSymbolName } from '../../shared/ui/types/material-symbol-name';
import { CardListItemComponent } from '../../shared/ui/card-list-item/card-list-item.component';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { HomeNearbyStopsDialogComponent } from './home-nearby-stops-dialog.component';
import {
  StopDirectoryOption,
  StopDirectoryService,
  StopSearchRequest
} from '../../data/stops/stop-directory.service';
import {
  StopConnection,
  StopLineSignature,
  StopConnectionsService,
  STOP_CONNECTION_DIRECTION
} from '../../data/route-search/stop-connections.service';
import {
  RouteSearchLineMatch,
  RouteSearchSelection,
  RouteSearchStateService
} from '../../domain/route-search/route-search-state.service';
import { StopNavigationItemComponent } from '../../shared/ui/stop-navigation-item/stop-navigation-item.component';

interface ActionListItem {
  titleKey: string;
  subtitleKey?: string;
  leadingIcon: MaterialSymbolName;
  ariaLabelKey?: string;
}

interface BottomNavigationItem {
  labelKey: string;
  icon: MaterialSymbolName;
  commands: readonly string[];
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

interface StopAutocompleteGroup {
  readonly id: string;
  readonly label: string;
  readonly municipality: string;
  readonly options: readonly StopDirectoryOption[];
}

const EMPTY_STOP_GROUPS: readonly StopAutocompleteGroup[] = Object.freeze([]);

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
    MatNativeDateModule,
    MatDatepickerModule,
    CardListItemComponent,
    SectionComponent,
    StopNavigationItemComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private static readonly ROOT_COMMAND = '/' as const;
  private static readonly START_OF_DAY = {
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0
  } as const;
  private static readonly INCOMPATIBLE_STOP_ERROR = 'incompatibleStopPair' as const;
  private static readonly EMPTY_STOP_IDS = Object.freeze([] as string[]);
  private static readonly SORT_LOCALE = 'es-ES' as const;

  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stopDirectory = inject(StopDirectoryService);
  private readonly stopConnections = inject(StopConnectionsService);
  private readonly routeSearchState = inject(RouteSearchStateService);


  private readonly translation = APP_CONFIG.translationKeys.home;
  private readonly navigation = APP_CONFIG.translationKeys.navigation;
  private readonly searchIds = APP_CONFIG.homeData.search;
  private readonly locationIcon: MaterialSymbolName = 'my_location';
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
  protected readonly recentStops: StopNavigationItemViewModel[] = this.buildRecentStops();
  protected readonly swapIcon: MaterialSymbolName = 'swap_vert';

  protected readonly locationAction: ActionListItem = {
    titleKey: this.findNearbyActionKey,
    leadingIcon: this.locationIcon,
    ariaLabelKey: this.findNearbyActionKey
  };
  protected readonly locationActionLayout = 'action' as const;
  protected readonly locationActionIconVariant = 'soft' as const;

  protected readonly favoriteStops: StopNavigationItemViewModel[] = this.buildFavoriteStops();

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
    date: this.formBuilder.nonNullable.control<Date>(this.minimumSearchDate, [
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
    switchMap((value) => this.buildQueryStream(value)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  private readonly destinationQuery$ = this.destinationValue$.pipe(
    switchMap((value) => this.buildQueryStream(value)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly originStopIds$ = this.selectedOrigin$.pipe(
    map((option) => option?.stopIds ?? HomeComponent.EMPTY_STOP_IDS),
    distinctUntilChanged((previous, current) => this.areSameStopIdList(previous, current))
  );

  private readonly destinationStopIds$ = this.selectedDestination$.pipe(
    map((option) => option?.stopIds ?? HomeComponent.EMPTY_STOP_IDS),
    distinctUntilChanged((previous, current) => this.areSameStopIdList(previous, current))
  );

  private readonly originConnections$ = this.originStopIds$.pipe(
    switchMap((stopIds) =>
      this.stopConnections.getConnections(stopIds, STOP_CONNECTION_DIRECTION.Forward)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly destinationConnections$ = this.destinationStopIds$.pipe(
    switchMap((stopIds) =>
      this.stopConnections.getConnections(stopIds, STOP_CONNECTION_DIRECTION.Backward)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly originOptions$: Observable<readonly StopDirectoryOption[]> = combineLatest([
    this.originQuery$,
    this.selectedDestination$,
    this.destinationConnections$
  ]).pipe(
    switchMap(([query, destination, connections]) =>
      this.stopDirectory
        .searchStops(this.buildOriginSearchRequest(query, destination, connections))
        .pipe(map((options) => this.filterOptionsByConnections(options, connections)))
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  protected readonly destinationOptions$: Observable<readonly StopDirectoryOption[]> = combineLatest([
    this.destinationQuery$,
    this.selectedOrigin$,
    this.originConnections$
  ]).pipe(
    switchMap(([query, origin, connections]) =>
      this.stopDirectory
        .searchStops(this.buildDestinationSearchRequest(query, origin, connections))
        .pipe(map((options) => this.filterOptionsByConnections(options, connections)))
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  protected readonly originOptionGroups$: Observable<readonly StopAutocompleteGroup[]> =
    this.originOptions$.pipe(map((options) => this.groupOptionsByNucleus(options)));

  protected readonly destinationOptionGroups$: Observable<readonly StopAutocompleteGroup[]> =
    this.destinationOptions$.pipe(map((options) => this.groupOptionsByNucleus(options)));

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

    if (!origin || !destination) {
      this.searchForm.markAllAsTouched();
      return;
    }

    void this.executeSearch(origin, destination);
  }

  private async executeSearch(
    origin: StopDirectoryOption,
    destination: StopDirectoryOption
  ): Promise<void> {
    const connections = await firstValueFrom(this.originConnections$);
    const lineMatches = this.collectLineMatches(origin, destination, connections);

    if (!lineMatches.length) {
      this.searchForm.markAllAsTouched();
      return;
    }

    this.searchForm.updateValueAndValidity();

    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const selection = this.createRouteSelection(origin, destination, lineMatches);
    this.routeSearchState.setSelection(selection);
    const commands = this.buildCommands(APP_CONFIG.routes.routeSearch);
    await this.router.navigate([...commands]);
  }

  protected openNearbyStopsDialog(): void {
    this.dialog.open(HomeNearbyStopsDialogComponent);
  }

  protected openSearchDatePicker(datepicker: MatDatepicker<Date>): void {
    datepicker.open();
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

  protected trackStopOption(_: number, option: StopDirectoryOption): string {
    return option.id;
  }

  protected trackStopGroup(_: number, group: StopAutocompleteGroup): string {
    return group.id;
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

  private groupOptionsByNucleus(
    options: readonly StopDirectoryOption[]
  ): readonly StopAutocompleteGroup[] {
    if (!options.length) {
      return EMPTY_STOP_GROUPS;
    }

    const groups = new Map<string, StopDirectoryOption[]>();

    for (const option of options) {
      const bucket = groups.get(option.nucleusId);

      if (bucket) {
        bucket.push(option);
      } else {
        groups.set(option.nucleusId, [option]);
      }
    }

    const mapped = Array.from(groups.entries(), ([id, members]) => ({
      id,
      label: members[0]?.nucleus ?? '',
      municipality: members[0]?.municipality ?? '',
      options: members
    }));

    mapped.sort((first, second) =>
      first.label.localeCompare(second.label, HomeComponent.SORT_LOCALE)
    );

    return Object.freeze(
      mapped.map((group) => ({
        id: group.id,
        label: group.label,
        municipality: group.municipality,
        options: Object.freeze([...group.options])
      }))
    );
  }

  private buildDefaultDate(): Date {
    return this.toStartOfDay(new Date());
  }

  private createMinimumDateValidator(minimum: Date): ValidatorFn {
    const normalizedMinimum = this.toStartOfDay(minimum);
    const minimumDayKey = this.toUtcDayKey(normalizedMinimum);

    return (control: AbstractControl<Date | null>): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      const valueDayKey = this.toUtcDayKey(value);

      return valueDayKey < minimumDayKey ? { minDate: { min: normalizedMinimum } } : null;
    };
  }

  private createStopSelectionValidator(): ValidatorFn {
    return (control: AbstractControl<StopAutocompleteValue>): ValidationErrors | null => {
      return this.toStopOption(control.value) ? null : { stopRequired: true };
    };
  }

  private observeSelections(): void {
    combineLatest([
      this.selectedOrigin$,
      this.selectedDestination$,
      this.originConnections$,
      this.destinationConnections$
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([origin, destination, originConnections, destinationConnections]) => {
        this.ensureDistinctStops(origin, destination);
        this.updateCompatibilityErrors(
          origin,
          destination,
          originConnections,
          destinationConnections
        );
      });
  }

  private ensureDistinctStops(
    origin: StopDirectoryOption | null,
    destination: StopDirectoryOption | null
  ): void {
    if (!origin || !destination) {
      return;
    }

    if (!this.hasStopIdIntersection(origin.stopIds, destination.stopIds)) {
      return;
    }

    this.destinationControl.setValue(null);
  }

  private updateCompatibilityErrors(
    origin: StopDirectoryOption | null,
    destination: StopDirectoryOption | null,
    originConnections: ReadonlyMap<string, StopConnection>,
    destinationConnections: ReadonlyMap<string, StopConnection>
  ): void {
    this.applyCompatibilityState(
      this.destinationControl,
      destination,
      originConnections,
      Boolean(origin)
    );
    this.applyCompatibilityState(
      this.originControl,
      origin,
      destinationConnections,
      Boolean(destination)
    );
  }

  private applyCompatibilityState(
    control: FormControl<StopAutocompleteValue>,
    option: StopDirectoryOption | null,
    connections: ReadonlyMap<string, StopConnection>,
    hasOppositeSelection: boolean
  ): void {
    if (!option) {
      this.clearCompatibilityError(control);
      return;
    }

    if (!hasOppositeSelection) {
      this.clearCompatibilityError(control);
      return;
    }

    if (connections.size && this.hasAnyStopInConnections(option.stopIds, connections)) {
      this.clearCompatibilityError(control);
      return;
    }

    this.applyCompatibilityError(control);
  }

  private applyCompatibilityError(control: FormControl<StopAutocompleteValue>): void {
    const current = control.errors ?? {};

    if (current[HomeComponent.INCOMPATIBLE_STOP_ERROR]) {
      return;
    }

    control.setErrors({ ...current, [HomeComponent.INCOMPATIBLE_STOP_ERROR]: true });
  }

  private clearCompatibilityError(control: FormControl<StopAutocompleteValue>): void {
    const current = control.errors;

    if (!current || !current[HomeComponent.INCOMPATIBLE_STOP_ERROR]) {
      return;
    }

    const { [HomeComponent.INCOMPATIBLE_STOP_ERROR]: _, ...remaining } = current;
    control.setErrors(Object.keys(remaining).length ? remaining : null);
  }

  private createRouteSelection(
    origin: StopDirectoryOption,
    destination: StopDirectoryOption,
    lineMatches: readonly RouteSearchLineMatch[]
  ): RouteSearchSelection {
    const queryDate = this.searchForm.controls.date.value ?? new Date();
    const normalizedMatches = Object.freeze(
      lineMatches.map((match) => ({
        lineId: match.lineId,
        direction: match.direction,
        originStopIds: match.originStopIds,
        destinationStopIds: match.destinationStopIds
      }))
    );

    return {
      origin,
      destination,
      queryDate,
      lineMatches: normalizedMatches
    } satisfies RouteSearchSelection;
  }

  private collectLineMatches(
    origin: StopDirectoryOption,
    destination: StopDirectoryOption,
    connections: ReadonlyMap<string, StopConnection>
  ): readonly RouteSearchLineMatch[] {
    const aggregates = new Map<string, LineAggregate>();

    for (const destinationStopId of destination.stopIds) {
      const connection = connections.get(destinationStopId);

      if (!connection) {
        continue;
      }

      const matchingOrigins = connection.originStopIds.filter((stopId) =>
        origin.stopIds.includes(stopId)
      );

      if (!matchingOrigins.length) {
        continue;
      }

      for (const signature of connection.lineSignatures) {
        const key = this.toLineKey(signature);
        const aggregate = aggregates.get(key) ?? {
          lineId: signature.lineId,
          direction: signature.direction,
          originIds: new Set<string>(),
          destinationIds: new Set<string>()
        };

        matchingOrigins.forEach((originStopId) => aggregate.originIds.add(originStopId));
        aggregate.destinationIds.add(destinationStopId);
        aggregates.set(key, aggregate);
      }
    }

    const matches: RouteSearchLineMatch[] = [];

    aggregates.forEach((aggregate) => {
      const orderedOrigins = this.orderStopIds(origin.stopIds, aggregate.originIds);
      const orderedDestinations = this.orderStopIds(
        destination.stopIds,
        aggregate.destinationIds
      );

      matches.push({
        lineId: aggregate.lineId,
        direction: aggregate.direction,
        originStopIds: orderedOrigins,
        destinationStopIds: orderedDestinations
      });
    });

    return Object.freeze(matches);
  }

  private filterOptionsByConnections(
    options: readonly StopDirectoryOption[],
    connections: ReadonlyMap<string, StopConnection>
  ): readonly StopDirectoryOption[] {
    if (!connections.size) {
      return options;
    }

    return options.filter((option) => this.hasAnyStopInConnections(option.stopIds, connections));
  }

  private buildIncludeStopIds(
    connections: ReadonlyMap<string, StopConnection>
  ): readonly string[] | undefined {
    if (!connections.size) {
      return undefined;
    }

    const ids = Array.from(connections.keys());

    return ids.slice(0, this.maxAutocompleteOptions);
  }

  private getOptionPrimaryStopId(option: StopDirectoryOption | null): string | null {
    if (!option || option.stopIds.length === 0) {
      return null;
    }

    return option.stopIds[0];
  }

  private toLineKey(signature: StopLineSignature): string {
    return `${signature.lineId}|${signature.direction}`;
  }

  private orderStopIds(
    reference: readonly string[],
    values: Set<string>
  ): readonly string[] {
    const remaining = new Set(values);
    const ordered: string[] = [];

    for (const id of reference) {
      if (remaining.has(id)) {
        ordered.push(id);
        remaining.delete(id);
      }
    }

    remaining.forEach((id) => ordered.push(id));

    return Object.freeze(ordered);
  }

  private hasAnyStopInConnections(
    stopIds: readonly string[],
    connections: ReadonlyMap<string, StopConnection>
  ): boolean {
    for (const stopId of stopIds) {
      if (connections.has(stopId)) {
        return true;
      }
    }

    return false;
  }

  private hasStopIdIntersection(
    first: readonly string[],
    second: readonly string[]
  ): boolean {
    const reference = new Set(first);

    return second.some((id) => reference.has(id));
  }

  private areSameStopIdList(
    first: readonly string[],
    second: readonly string[]
  ): boolean {
    if (first === second) {
      return true;
    }

    if (first.length !== second.length) {
      return false;
    }

    return first.every((value, index) => value === second[index]);
  }

  private toStopOption(value: StopAutocompleteValue): StopDirectoryOption | null {
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

  private buildOriginSearchRequest(
    query: string,
    destination: StopDirectoryOption | null,
    connections: ReadonlyMap<string, StopConnection>
  ): StopSearchRequest {
    return {
      query,
      excludeStopId: this.getOptionPrimaryStopId(destination) ?? undefined,
      includeStopIds: this.buildIncludeStopIds(connections),
      limit: this.maxAutocompleteOptions
    } satisfies StopSearchRequest;
  }

  private buildDestinationSearchRequest(
    query: string,
    origin: StopDirectoryOption | null,
    connections: ReadonlyMap<string, StopConnection>
  ): StopSearchRequest {
    return {
      query,
      excludeStopId: this.getOptionPrimaryStopId(origin) ?? undefined,
      includeStopIds: this.buildIncludeStopIds(connections),
      limit: this.maxAutocompleteOptions
    } satisfies StopSearchRequest;
  }

  private areSameStop(
    first: StopDirectoryOption | null,
    second: StopDirectoryOption | null
  ): boolean {
    if (!first && !second) {
      return true;
    }

    if (!first || !second) {
      return false;
    }

    return first.id === second.id;
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

  private toStartOfDay(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(
      HomeComponent.START_OF_DAY.hour,
      HomeComponent.START_OF_DAY.minute,
      HomeComponent.START_OF_DAY.second,
      HomeComponent.START_OF_DAY.millisecond
    );

    return normalizedDate;
  }

  private toUtcDayKey(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  private buildQueryStream(value: StopAutocompleteValue): Observable<string> {
    const query = this.toQuery(value);

    if (!query) {
      return of(query);
    }

    return timer(this.searchDebounceMs).pipe(map(() => query));
  }
}

interface LineAggregate {
  lineId: string;
  direction: number;
  originIds: Set<string>;
  destinationIds: Set<string>;
}

type StopAutocompleteValue = StopDirectoryOption | string | null;

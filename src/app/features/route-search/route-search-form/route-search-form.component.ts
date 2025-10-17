import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  firstValueFrom,
  forkJoin,
  of,
  timer
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../../core/config';
import {
  StopDirectoryFacade,
  StopDirectoryOption,
  StopDirectoryStopSignature,
  StopSearchRequest
} from '../../../domain/stops/stop-directory.facade';
import {
  StopConnectionsFacade,
  StopConnection,
  STOP_CONNECTION_DIRECTION,
  buildStopConnectionKey
} from '../../../domain/route-search/stop-connections.facade';
import { RouteSearchSelection } from '../../../domain/route-search/route-search-state.service';
import {
  collectRouteLineMatches,
  createRouteSearchSelection
} from '../../../domain/route-search/route-search-selection.util';
import { FavoritesFacade, StopFavorite } from '../../../domain/stops/favorites.facade';
import { MaterialSymbolName } from '../../../shared/ui/types/material-symbol-name';
import { GeolocationService } from '../../../core/services/geolocation.service';
import {
  NearbyStopResult,
  NearbyStopsService
} from '../../../core/services/nearby-stops.service';
import { GEOLOCATION_REQUEST_OPTIONS } from '../../../core/services/geolocation-request.options';
import { GeoCoordinate } from '../../../domain/utils/geo-distance.util';
import {
  NearbyStopOption,
  NearbyStopOptionsService
} from '../../../core/services/nearby-stop-options.service';
import { buildDistanceDisplay } from '../../../domain/utils/distance-display.util';
import { AccessibleButtonDirective } from '../../../shared/a11y/accessible-button.directive';

interface StopOptionDistanceLabel {
  readonly translationKey: string;
  readonly value: string;
}

type StopAutocompleteOption = StopDirectoryOption & {
  readonly distanceInMeters?: number;
  readonly distanceLabel?: StopOptionDistanceLabel;
};

type StopAutocompleteViewOption = StopAutocompleteOption & {
  readonly isFavorite: boolean;
};

interface StopAutocompleteGroup {
  readonly id: string;
  readonly label: string;
  readonly municipality: string;
  readonly translateLabel: boolean;
  readonly options: readonly StopAutocompleteViewOption[];
}

interface CategorizedOriginOptions {
  readonly recommended: readonly StopAutocompleteOption[];
  readonly favorites: readonly StopAutocompleteOption[];
  readonly others: readonly StopAutocompleteOption[];
}

const EMPTY_GROUPS: readonly StopAutocompleteGroup[] = Object.freeze([]);
const STOP_REQUIRED_ERROR = 'stopRequired' as const;
const MIN_DATE_ERROR = 'minDate' as const;
const EMPTY_STOP_SIGNATURES: readonly StopDirectoryStopSignature[] = Object.freeze(
  [] as StopDirectoryStopSignature[]
);
const EMPTY_OPTIONS: readonly StopAutocompleteOption[] = Object.freeze(
  [] as StopAutocompleteOption[]
);
const EMPTY_VIEW_OPTIONS: readonly StopAutocompleteViewOption[] = Object.freeze(
  [] as StopAutocompleteViewOption[]
);
const EMPTY_ORIGIN_OPTIONS: CategorizedOriginOptions = Object.freeze({
  recommended: EMPTY_OPTIONS,
  favorites: EMPTY_OPTIONS,
  others: EMPTY_OPTIONS
});

@Component({
  selector: 'app-route-search-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatNativeDateModule,
    MatDatepickerModule,
    AccessibleButtonDirective
  ],
  templateUrl: './route-search-form.component.html',
  styleUrl: './route-search-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteSearchFormComponent implements OnChanges {
  private static readonly START_OF_DAY = {
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0
  } as const;
  private static readonly SORT_LOCALE = 'es-ES' as const;

  private readonly formBuilder = inject(FormBuilder);
  private readonly stopDirectory = inject(StopDirectoryFacade);
  private readonly nearbyStopOptions = inject(NearbyStopOptionsService);
  private readonly stopConnections = inject(StopConnectionsFacade);
  private readonly favorites = inject(FavoritesFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly geolocation = inject(GeolocationService);
  private readonly nearbyStops = inject(NearbyStopsService);

  @Input() initialSelection: RouteSearchSelection | null = null;
  @Input() originDraft: StopAutocompleteOption | null = null;
  @Output() readonly selectionConfirmed = new EventEmitter<RouteSearchSelection>();

  private readonly translation = APP_CONFIG.translationKeys.home.sections.search;
  private readonly distanceTranslation = APP_CONFIG.translationKeys.home.dialogs.nearbyStops.distance;
  private readonly searchIds = APP_CONFIG.homeData.search;
  private readonly maxAutocompleteOptions = APP_CONFIG.homeData.search.maxAutocompleteOptions;
  private readonly searchDebounceMs = APP_CONFIG.homeData.search.debounceMs;
  private readonly nearbyGroupId = APP_CONFIG.homeData.search.nearbyGroupId;
  private readonly favoritesGroupId = 'favorites' as const;
  private readonly favoriteActiveIcon: MaterialSymbolName = APP_CONFIG.homeData.favoriteStops.activeIcon;
  private readonly favoriteInactiveIcon: MaterialSymbolName = APP_CONFIG.homeData.favoriteStops.inactiveIcon;

  private readonly minimumDate = this.buildDefaultDate();
  private readonly minimumDateValidator = this.createMinimumDateValidator(this.minimumDate);
  private readonly stopValidator = this.createStopValidator();

  readonly originFieldId = this.searchIds.originFieldId;
  readonly destinationFieldId = this.searchIds.destinationFieldId;
  readonly dateFieldId = this.searchIds.dateFieldId;
  readonly minSearchDate = this.minimumDate;

  readonly submitLabelKey = this.translation.submit;
  readonly originLabelKey = this.translation.originLabel;
  readonly destinationLabelKey = this.translation.destinationLabel;
  readonly dateLabelKey = this.translation.dateLabel;
  readonly originPlaceholderKey = this.translation.originPlaceholder;
  readonly destinationPlaceholderKey = this.translation.destinationPlaceholder;
  readonly swapLabelKey = this.translation.swapLabel;
  readonly noRoutesMessageKey = this.translation.noRoutes;
  readonly favoritesGroupLabelKey = this.translation.favoritesGroupLabel;
  readonly addFavoriteLabelKey = this.translation.addFavoriteLabel;
  readonly removeFavoriteLabelKey = this.translation.removeFavoriteLabel;

  readonly originIcon: MaterialSymbolName = 'my_location';
  readonly destinationIcon: MaterialSymbolName = 'flag';
  readonly dateIcon: MaterialSymbolName = 'calendar_today';
  readonly swapIcon: MaterialSymbolName = 'swap_vert';

  readonly searchForm: FormGroup<RouteSearchFormGroup> = this.formBuilder.group({
    origin: this.formBuilder.control<StopAutocompleteValue>(null, {
      validators: [this.stopValidator]
    }),
    destination: this.formBuilder.control<StopAutocompleteValue>(null, {
      validators: [this.stopValidator]
    }),
    date: this.formBuilder.nonNullable.control<Date>(this.minimumDate, {
      validators: [Validators.required, this.minimumDateValidator]
    })
  });

  private readonly originControl = this.searchForm.controls.origin as FormControl<StopAutocompleteValue>;
  private readonly destinationControl = this.searchForm.controls.destination as FormControl<StopAutocompleteValue>;
  private readonly dateControl = this.searchForm.controls.date;

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

  private readonly originSignatures$ = this.selectedOrigin$.pipe(
    map((option) => this.toStopSignatures(option)),
    distinctUntilChanged((first, second) => this.areSameStopSignatureList(first, second))
  );

  private readonly destinationSignatures$ = this.selectedDestination$.pipe(
    map((option) => this.toStopSignatures(option)),
    distinctUntilChanged((first, second) => this.areSameStopSignatureList(first, second))
  );

  private readonly originConnections$ = this.originSignatures$.pipe(
    switchMap((signatures) => this.loadBidirectionalConnections(signatures)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly destinationConnections$ = this.destinationSignatures$.pipe(
    switchMap((signatures) => this.loadBidirectionalConnections(signatures)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly favoriteOptions$ = this.favorites.favorites$.pipe(
    map((favorites) => favorites.map((favorite) => this.fromFavorite(favorite))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly favoriteIds$ = this.favorites.favorites$.pipe(
    map((favorites) => new Set(favorites.map((favorite) => favorite.id))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly destinationOptions$: Observable<readonly StopAutocompleteOption[]> = combineLatest([
    this.destinationQuery$,
    this.selectedOrigin$,
    this.originConnections$,
    this.favoriteOptions$
  ]).pipe(
    switchMap(([query, origin, connections, favorites]) =>
      this.stopDirectory
        .searchStops(
          this.buildDestinationSearchRequest(
            query,
            origin,
            connections,
            this.toStopSignaturesFromOptions(favorites)
          )
        )
        .pipe(map((options) => this.filterOptionsByConnections(options, connections)))
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  private readonly recommendedOriginOptions = new BehaviorSubject<readonly StopAutocompleteOption[]>(
    EMPTY_OPTIONS
  );

  private readonly originOptionsState$: Observable<CategorizedOriginOptions> = combineLatest([
    this.recommendedOriginOptions.asObservable(),
    this.favoriteOptions$,
    this.originQuery$,
    this.selectedDestination$,
    this.destinationConnections$
  ]).pipe(
    switchMap(([recommended, favorites, query, destination, connections]) =>
      this.stopDirectory
        .searchStops(
          this.buildOriginSearchRequest(
            query,
            destination,
            connections,
            this.toStopSignaturesFromOptions(recommended),
            this.toStopSignaturesFromOptions(favorites)
          )
        )
        .pipe(
          map((options) => this.filterOptionsByConnections(options, connections)),
          map((options) => this.categorizeOriginOptions(recommended, favorites, options))
        )
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly originGroups$: Observable<readonly StopAutocompleteGroup[]> = combineLatest([
    this.originOptionsState$,
    this.favoriteIds$
  ]).pipe(
    map(([options, favoriteIds]) =>
      this.buildOriginGroups(options.recommended, options.favorites, options.others, favoriteIds)
    )
  );
  readonly destinationGroups$: Observable<readonly StopAutocompleteGroup[]> = combineLatest([
    this.destinationOptions$,
    this.favoriteOptions$,
    this.favoriteIds$
  ]).pipe(
    map(([options, favorites, favoriteIds]) =>
      this.buildDestinationGroups(options, favorites, favoriteIds)
    )
  );

  readonly displayStop = (value: StopAutocompleteValue): string => {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.name;
  };

  readonly trackGroup = (_: number, group: StopAutocompleteGroup): string => group.id;
  readonly trackOption = (_: number, option: StopAutocompleteOption): string => option.id;

  readonly noRoutes$ = new BehaviorSubject<boolean>(false);
  protected readonly originLocationActionLabelKey = this.translation.originLocationActionLabel;
  protected originLocationLoading = false;

  private lastPatchedSelectionId: string | null = null;

  protected favoriteToggleIcon(option: StopAutocompleteViewOption): MaterialSymbolName {
    return option.isFavorite ? this.favoriteActiveIcon : this.favoriteInactiveIcon;
  }

  protected favoriteToggleLabel(option: StopAutocompleteViewOption): string {
    return option.isFavorite ? this.removeFavoriteLabelKey : this.addFavoriteLabelKey;
  }

  protected toggleFavorite(option: StopAutocompleteViewOption, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.favorites.toggle(option);
  }

  constructor() {
    this.observeSelections();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('initialSelection' in changes) {
      this.patchSelection(changes['initialSelection'].currentValue as RouteSearchSelection | null);
    }

    if ('originDraft' in changes) {
      this.applyOriginDraft(changes['originDraft'].currentValue as StopAutocompleteOption | null);
    }
  }

  focusDatePicker(datepicker: MatDatepicker<Date>): void {
    datepicker.open();
  }

  protected onSubmitTrigger(): void {
    if (this.searchForm.invalid) {
      return;
    }

    void this.submit();
  }

  async submit(): Promise<void> {
    const origin = this.toStopOption(this.originControl.value);
    const destination = this.toStopOption(this.destinationControl.value);

    if (!origin || !destination) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const selection = await this.buildSelection(origin, destination);

    if (!selection) {
      this.showNoRoutes();
      return;
    }

    this.hideNoRoutes();
    this.selectionConfirmed.emit(selection);
  }

  swap(): void {
    const origin = this.toStopOption(this.originControl.value);
    const destination = this.toStopOption(this.destinationControl.value);

    if (!origin && !destination) {
      return;
    }

    this.originControl.setValue(destination ?? null);
    this.destinationControl.setValue(origin ?? null);
  }

  async recommendOriginFromLocation(): Promise<void> {
    if (this.originLocationLoading) {
      return;
    }

    this.originLocationLoading = true;

    try {
      const position = await this.geolocation.getCurrentPosition(GEOLOCATION_REQUEST_OPTIONS);
      const coordinates: GeoCoordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      const nearbyStops = await this.nearbyStops.findClosestStops(coordinates);
      const options = await firstValueFrom(this.loadRecommendedOptions(nearbyStops));
      this.recommendedOriginOptions.next(options);
    } catch {
      this.recommendedOriginOptions.next(EMPTY_OPTIONS);
    } finally {
      this.originLocationLoading = false;
    }
  }

  private async buildSelection(
    origin: StopAutocompleteOption,
    destination: StopAutocompleteOption
  ): Promise<RouteSearchSelection | null> {
    this.hideNoRoutes();
    const connections = await firstValueFrom(
      this.loadBidirectionalConnections(this.toStopSignatures(origin))
    );
    const matches = collectRouteLineMatches(origin, destination, connections);

    if (!matches.length) {
      return null;
    }

    this.searchForm.updateValueAndValidity();

    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return null;
    }

    const queryDate = this.dateControl.value ?? new Date();
    return createRouteSearchSelection(origin, destination, matches, queryDate);
  }

  private buildOriginSearchRequest(
    query: string,
    destination: StopAutocompleteOption | null,
    connections: ReadonlyMap<string, StopConnection>,
    recommended: readonly StopDirectoryStopSignature[],
    favorites: readonly StopDirectoryStopSignature[]
  ): StopSearchRequest {
    const additional = recommended.length || favorites.length ? [...recommended, ...favorites] : EMPTY_STOP_SIGNATURES;

    return {
      query,
      excludeStopSignature: this.getPrimaryStopSignature(destination) ?? undefined,
      includeStopSignatures: this.buildIncludeSignatures(connections, additional),
      limit: this.maxAutocompleteOptions
    } satisfies StopSearchRequest;
  }

  private buildDestinationSearchRequest(
    query: string,
    origin: StopAutocompleteOption | null,
    connections: ReadonlyMap<string, StopConnection>,
    favorites: readonly StopDirectoryStopSignature[]
  ): StopSearchRequest {
    return {
      query,
      excludeStopSignature: this.getPrimaryStopSignature(origin) ?? undefined,
      includeStopSignatures: this.buildIncludeSignatures(connections, favorites),
      limit: this.maxAutocompleteOptions
    } satisfies StopSearchRequest;
  }

  private buildIncludeSignatures(
    connections: ReadonlyMap<string, StopConnection>,
    additional: readonly StopDirectoryStopSignature[] = EMPTY_STOP_SIGNATURES
  ): readonly StopDirectoryStopSignature[] | undefined {
    if (!connections.size && !additional.length) {
      return undefined;
    }

    const unique = new Map<string, StopDirectoryStopSignature>();

    for (const signature of additional) {
      const key = buildStopConnectionKey(signature.consortiumId, signature.stopId);

      if (!unique.has(key)) {
        unique.set(key, signature);
      }
    }

    connections.forEach((connection) => {
      const signature: StopDirectoryStopSignature = {
        consortiumId: connection.consortiumId,
        stopId: connection.stopId
      };
      const key = buildStopConnectionKey(signature.consortiumId, signature.stopId);

      if (!unique.has(key)) {
        unique.set(key, signature);
      }
    });

    return Array.from(unique.values()).slice(0, this.maxAutocompleteOptions);
  }

  private groupByNucleus(
    options: readonly StopAutocompleteOption[],
    favoriteIds: ReadonlySet<string>
  ): readonly StopAutocompleteGroup[] {
    if (!options.length) {
      return EMPTY_GROUPS;
    }

    const groups = new Map<string, StopAutocompleteOption[]>();

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
      translateLabel: false,
      options: members
    }));

    mapped.sort((first, second) =>
      first.label.localeCompare(second.label, RouteSearchFormComponent.SORT_LOCALE)
    );

    return Object.freeze(
      mapped.map((group) => ({
        id: group.id,
        label: group.label,
        municipality: group.municipality,
        translateLabel: group.translateLabel,
        options: this.toViewOptions(group.options, favoriteIds)
      }))
    );
  }

  private buildOriginGroups(
    recommended: readonly StopAutocompleteOption[],
    favorites: readonly StopAutocompleteOption[],
    others: readonly StopAutocompleteOption[],
    favoriteIds: ReadonlySet<string>
  ): readonly StopAutocompleteGroup[] {
    const uniqueRecommended = this.deduplicateOptions(recommended);
    const uniqueFavorites = this.deduplicateOptions(favorites);
    const baseGroups = this.groupByNucleus(others, favoriteIds);
    const groups: StopAutocompleteGroup[] = [];

    if (uniqueRecommended.length) {
      groups.push(
        Object.freeze({
          id: this.nearbyGroupId,
          label: this.translation.nearbyGroupLabel,
          municipality: this.translation.nearbyGroupLabel,
          translateLabel: true,
          options: this.toViewOptions(uniqueRecommended, favoriteIds)
        })
      );
    }

    if (uniqueFavorites.length) {
      groups.push(
        Object.freeze({
          id: this.favoritesGroupId,
          label: this.favoritesGroupLabelKey,
          municipality: this.favoritesGroupLabelKey,
          translateLabel: true,
          options: this.toViewOptions(uniqueFavorites, favoriteIds)
        })
      );
    }

    if (!groups.length) {
      return baseGroups;
    }

    return Object.freeze([...groups, ...baseGroups]);
  }

  private buildDestinationGroups(
    options: readonly StopAutocompleteOption[],
    favorites: readonly StopAutocompleteOption[],
    favoriteIds: ReadonlySet<string>
  ): readonly StopAutocompleteGroup[] {
    const uniqueFavorites = this.deduplicateOptions(favorites);
    const filteredFavorites = uniqueFavorites.filter((favorite) =>
      options.some((option) => option.id === favorite.id)
    );
    const remaining = this.excludeOptions(options, filteredFavorites);
    const baseGroups = this.groupByNucleus(remaining, favoriteIds);

    if (!filteredFavorites.length) {
      return baseGroups;
    }

    const favoritesGroup: StopAutocompleteGroup = Object.freeze({
      id: this.favoritesGroupId,
      label: this.favoritesGroupLabelKey,
      municipality: this.favoritesGroupLabelKey,
      translateLabel: true,
      options: this.toViewOptions(filteredFavorites, favoriteIds)
    });

    return Object.freeze([favoritesGroup, ...baseGroups]);
  }

  private filterOptionsByConnections(
    options: readonly StopAutocompleteOption[],
    connections: ReadonlyMap<string, StopConnection>
  ): readonly StopAutocompleteOption[] {
    if (!connections.size) {
      return options;
    }

    return options.filter((option) =>
      option.stopIds.some((id) => connections.has(buildStopConnectionKey(option.consortiumId, id)))
    );
  }

  private buildQueryStream(value: StopAutocompleteValue): Observable<string> {
    const query = this.toQuery(value);

    if (!query) {
      return of(query);
    }

    return timer(this.searchDebounceMs).pipe(map(() => query));
  }

  private loadRecommendedOptions(
    stops: readonly NearbyStopResult[]
  ): Observable<readonly StopAutocompleteOption[]> {
    if (!stops.length) {
      return of(EMPTY_OPTIONS);
    }

    return this.nearbyStopOptions.loadOptions(stops).pipe(
      map((options) => options.map((option) => this.withDistanceLabel(option))),
      map((options) => this.deduplicateOptions(options))
    );
  }

  private fromFavorite(favorite: StopFavorite): StopAutocompleteOption {
    return {
      id: favorite.id,
      code: favorite.code,
      name: favorite.name,
      municipality: favorite.municipality,
      municipalityId: favorite.municipalityId,
      nucleus: favorite.nucleus,
      nucleusId: favorite.nucleusId,
      consortiumId: favorite.consortiumId,
      stopIds: favorite.stopIds
    } satisfies StopAutocompleteOption;
  }

  private categorizeOriginOptions(
    recommended: readonly StopAutocompleteOption[],
    favorites: readonly StopAutocompleteOption[],
    options: readonly StopAutocompleteOption[]
  ): CategorizedOriginOptions {
    if (!recommended.length && !favorites.length) {
      return Object.freeze({
        recommended: EMPTY_OPTIONS,
        favorites: EMPTY_OPTIONS,
        others: options
      });
    }

    if (!options.length) {
      return EMPTY_ORIGIN_OPTIONS;
    }

    const resultIds = new Set(options.map((option) => option.id));
    const matchingRecommended = this.deduplicateOptions(
      recommended.filter((option) => resultIds.has(option.id))
    );
    const recommendedIds = new Set(matchingRecommended.map((option) => option.id));
    const matchingFavorites = this.deduplicateOptions(
      favorites.filter(
        (option) => resultIds.has(option.id) && !recommendedIds.has(option.id)
      )
    );
    const favoriteIds = new Set(matchingFavorites.map((option) => option.id));
    const remaining = Object.freeze(
      options.filter(
        (option) => !recommendedIds.has(option.id) && !favoriteIds.has(option.id)
      )
    );

    return Object.freeze({
      recommended: matchingRecommended,
      favorites: matchingFavorites,
      others: remaining
    });
  }

  private withDistanceLabel(option: NearbyStopOption): StopAutocompleteOption {
    const distance = buildDistanceDisplay(option.distanceInMeters, this.distanceTranslation);

    return {
      ...option,
      distanceLabel: {
        translationKey: distance.translationKey,
        value: distance.value
      }
    };
  }

  private deduplicateOptions(
    options: readonly StopAutocompleteOption[]
  ): readonly StopAutocompleteOption[] {
    if (!options.length) {
      return EMPTY_OPTIONS;
    }

    const unique = new Map<string, StopAutocompleteOption>();

    for (const option of options) {
      const existing = unique.get(option.id);

      if (!existing) {
        unique.set(option.id, option);
        continue;
      }

      const currentDistance = existing.distanceInMeters ?? Number.POSITIVE_INFINITY;
      const nextDistance = option.distanceInMeters ?? Number.POSITIVE_INFINITY;

      if (nextDistance < currentDistance) {
        unique.set(option.id, option);
      }
    }

    return Object.freeze(Array.from(unique.values(), (value) => ({ ...value })));
  }

  private excludeOptions(
    options: readonly StopAutocompleteOption[],
    excluded: readonly StopAutocompleteOption[]
  ): readonly StopAutocompleteOption[] {
    if (!excluded.length) {
      return options;
    }

    const excludedIds = new Set(excluded.map((option) => option.id));
    return options.filter((option) => !excludedIds.has(option.id));
  }

  private toViewOptions(
    options: readonly StopAutocompleteOption[],
    favoriteIds: ReadonlySet<string>
  ): readonly StopAutocompleteViewOption[] {
    if (!options.length) {
      return EMPTY_VIEW_OPTIONS;
    }

    return Object.freeze(
      options.map((option) => ({
        ...option,
        isFavorite: favoriteIds.has(option.id)
      }))
    );
  }

  private toStopSignaturesFromOptions(
    options: readonly StopAutocompleteOption[]
  ): readonly StopDirectoryStopSignature[] {
    if (!options.length) {
      return EMPTY_STOP_SIGNATURES;
    }

    const unique = new Map<string, StopDirectoryStopSignature>();

    for (const option of options) {
      for (const stopId of option.stopIds) {
        const signature: StopDirectoryStopSignature = {
          consortiumId: option.consortiumId,
          stopId
        };
        const key = buildStopConnectionKey(signature.consortiumId, signature.stopId);

        if (!unique.has(key)) {
          unique.set(key, signature);
        }
      }
    }

    return Array.from(unique.values());
  }

  private applyOriginDraft(option: StopAutocompleteOption | null): void {
    if (!option) {
      return;
    }

    const current = this.toStopOption(this.originControl.value);

    if (this.areSameStop(current, option)) {
      return;
    }

    this.originControl.setValue(option);
  }

  private observeSelections(): void {
    combineLatest([this.selectedOrigin$, this.selectedDestination$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([origin, destination]) => {
        this.ensureDistinctStops(origin, destination);
        this.hideNoRoutes();
      });
  }

  private ensureDistinctStops(
    origin: StopAutocompleteOption | null,
    destination: StopAutocompleteOption | null
  ): void {
    if (!origin || !destination) {
      return;
    }

    if (!this.hasIntersection(origin.stopIds, destination.stopIds)) {
      return;
    }

    this.destinationControl.setValue(null);
  }

  private hasIntersection(first: readonly string[], second: readonly string[]): boolean {
    return first.some((value) => second.includes(value));
  }

  private areSameStopSignature(
    first: StopDirectoryStopSignature,
    second: StopDirectoryStopSignature
  ): boolean {
    return first.consortiumId === second.consortiumId && first.stopId === second.stopId;
  }

  private areSameStopSignatureList(
    first: readonly StopDirectoryStopSignature[],
    second: readonly StopDirectoryStopSignature[]
  ): boolean {
    if (first === second) {
      return true;
    }

    if (first.length !== second.length) {
      return false;
    }

    return first.every((signature, index) => this.areSameStopSignature(signature, second[index]));
  }

  private areSameStop(
    first: StopAutocompleteOption | null,
    second: StopAutocompleteOption | null
  ): boolean {
    if (!first && !second) {
      return true;
    }

    if (!first || !second) {
      return false;
    }

    return first.id === second.id;
  }

  private toStopOption(value: StopAutocompleteValue): StopAutocompleteOption | null {
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

  private getPrimaryStopSignature(option: StopAutocompleteOption | null): StopDirectoryStopSignature | null {
    if (!option?.stopIds.length) {
      return null;
    }

    return {
      consortiumId: option.consortiumId,
      stopId: option.stopIds[0]
    } satisfies StopDirectoryStopSignature;
  }

  private toStopSignatures(
    option: StopAutocompleteOption | null
  ): readonly StopDirectoryStopSignature[] {
    if (!option?.stopIds.length) {
      return EMPTY_STOP_SIGNATURES;
    }

    return option.stopIds.map((stopId) => ({
      consortiumId: option.consortiumId,
      stopId
    } satisfies StopDirectoryStopSignature));
  }

  private createMinimumDateValidator(minimum: Date): ValidatorFn {
    const normalized = this.toStartOfDay(minimum);
    const minimumKey = this.toUtcKey(normalized);

    return (control: AbstractControl<Date | null>): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      const valueKey = this.toUtcKey(value);
      return valueKey < minimumKey ? { [MIN_DATE_ERROR]: { min: normalized } } : null;
    };
  }

  private createStopValidator(): ValidatorFn {
    return (control: AbstractControl<StopAutocompleteValue>): ValidationErrors | null => {
      return this.toStopOption(control.value) ? null : { [STOP_REQUIRED_ERROR]: true };
    };
  }

  private buildDefaultDate(): Date {
    return this.toStartOfDay(new Date());
  }

  private toStartOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(
      RouteSearchFormComponent.START_OF_DAY.hour,
      RouteSearchFormComponent.START_OF_DAY.minute,
      RouteSearchFormComponent.START_OF_DAY.second,
      RouteSearchFormComponent.START_OF_DAY.millisecond
    );
    return copy;
  }

  private toUtcKey(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  private patchSelection(selection: RouteSearchSelection | null): void {
    if (!selection) {
      return;
    }

    const identifier = this.buildSelectionIdentifier(selection);

    if (this.lastPatchedSelectionId === identifier) {
      return;
    }

    this.lastPatchedSelectionId = identifier;

    this.searchForm.patchValue(
      {
        origin: selection.origin,
        destination: selection.destination,
        date: new Date(selection.queryDate.getTime())
      },
      { emitEvent: false }
    );
  }

  private buildSelectionIdentifier(selection: RouteSearchSelection): string {
    return [selection.origin.id, selection.destination.id, selection.queryDate.toISOString()].join('|');
  }

  private showNoRoutes(): void {
    if (!this.noRoutes$.getValue()) {
      this.noRoutes$.next(true);
    }
  }

  private hideNoRoutes(): void {
    if (this.noRoutes$.getValue()) {
      this.noRoutes$.next(false);
    }
  }

  private loadBidirectionalConnections(
    signatures: readonly StopDirectoryStopSignature[]
  ): Observable<ReadonlyMap<string, StopConnection>> {
    if (!signatures.length) {
      return of(new Map<string, StopConnection>());
    }

    return forkJoin([
      this.stopConnections.getConnections(signatures, STOP_CONNECTION_DIRECTION.Forward),
      this.stopConnections.getConnections(signatures, STOP_CONNECTION_DIRECTION.Backward)
    ]).pipe(map((connections) => this.stopConnections.mergeConnections(connections)));
  }
}

type StopAutocompleteValue = StopAutocompleteOption | string | null;

interface RouteSearchFormGroup {
  readonly origin: FormControl<StopAutocompleteValue>;
  readonly destination: FormControl<StopAutocompleteValue>;
  readonly date: FormControl<Date>;
}

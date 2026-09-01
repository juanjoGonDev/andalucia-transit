import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  of,
  startWith,
  switchMap
} from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { FavoriteCollectionFacade } from '@domain/favorites/favorite-collection.facade';
import { LineFavorite } from '@domain/lines/line-favorites.facade';
import { FavoritesFacade, StopFavorite } from '@domain/stops/favorites.facade';
import {
  StopDirectoryFacade,
  StopDirectoryOption
} from '@domain/stops/stop-directory.facade';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import {
  NavigationCommands,
  buildLineDetailNavigation,
  buildStopDetailNavigation
} from '@shared/navigation/navigation.util';
import { InteractiveCardComponent } from '@shared/ui/cards/interactive-card/interactive-card.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '@shared/ui/confirm-dialog/confirm-dialog.component';
import { OverlayDialogService } from '@shared/ui/dialog/overlay-dialog.service';
import { AppTextFieldPrefixDirective } from '@shared/ui/forms/app-text-field-slots.directive';
import {
  AppTextFieldComponent,
  TEXT_FIELD_LABEL_MODES,
  TextFieldType
} from '@shared/ui/forms/app-text-field.component';

interface FavoriteStopListItem {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly municipality: string;
  readonly nucleus: string;
  readonly consortiumId: number;
  readonly stopIds: readonly string[];
}

interface FavoriteGroupView {
  readonly id: string;
  readonly municipality: string;
  readonly stops: readonly FavoriteStopListItem[];
}

type FavoriteSearchOption = StopDirectoryOption & {
  readonly isFavorite: boolean;
};

type FavoriteSearchState =
  | { readonly status: 'idle'; readonly options: readonly FavoriteSearchOption[] }
  | { readonly status: 'ready'; readonly options: readonly FavoriteSearchOption[] }
  | { readonly status: 'error'; readonly options: readonly FavoriteSearchOption[] };

const QUERY_LOCALE = 'es-ES' as const;
const NORMALIZE_FORM = 'NFD' as const;
const DIACRITIC_PATTERN = /\p{M}/gu;
const FAVORITES_CARD_HOST_CLASSES: readonly string[] = ['favorites-card'];
const FAVORITES_CARD_BODY_CLASSES: readonly string[] = ['favorites-card__body'];
const FAVORITES_CARD_REMOVE_CLASSES: readonly string[] = ['favorites-card__remove'];
const SEARCH_TEXT_FIELD_TYPE: TextFieldType = 'search';
const SEARCH_AUTOCOMPLETE_ATTRIBUTE = 'off';
const SEARCH_ICON_NAME = 'search' as const;
const ADD_ICON_NAME = 'add' as const;
const EMPTY_ADD_RESULTS: readonly FavoriteSearchOption[] = Object.freeze([]);

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    AccessibleButtonDirective,
    AppLayoutContentDirective,
    InteractiveCardComponent,
    AppTextFieldComponent,
    AppTextFieldPrefixDirective
  ],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesComponent {
  private readonly favoritesFacade = inject(FavoritesFacade);
  private readonly favoriteCollection = inject(FavoriteCollectionFacade);
  private readonly stopDirectory = inject(StopDirectoryFacade);
  private readonly dialog = inject(OverlayDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  private readonly translations = APP_CONFIG.translationKeys.favorites;
  private readonly favoriteIconName = APP_CONFIG.homeData.favoriteStops.icon;
  private readonly favoriteActiveIconName = APP_CONFIG.homeData.favoriteStops.activeIcon;
  private readonly favoriteInactiveIconName = APP_CONFIG.homeData.favoriteStops.inactiveIcon;
  private readonly removeIconName = APP_CONFIG.homeData.favoriteStops.removeIcon;
  private readonly addResultsLimit = APP_CONFIG.homeData.search.maxAutocompleteOptions;
  private readonly addSearchDebounceMs = APP_CONFIG.homeData.search.debounceMs;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.favorites;

  protected readonly searchLabelKey = this.translations.searchLabel;
  protected readonly searchPlaceholderKey = this.translations.searchPlaceholder;
  protected readonly searchFieldType = SEARCH_TEXT_FIELD_TYPE;
  protected readonly searchAutocompleteAttribute = SEARCH_AUTOCOMPLETE_ATTRIBUTE;
  protected readonly textFieldLabelModes = TEXT_FIELD_LABEL_MODES;
  protected readonly searchIcon = SEARCH_ICON_NAME;
  protected readonly addIcon = ADD_ICON_NAME;
  protected readonly clearAllLabelKey = this.translations.actions.clearAll;
  protected readonly removeLabelKey = this.translations.actions.remove;
  protected readonly addFavoriteLabelKey =
    APP_CONFIG.translationKeys.home.sections.search.addFavoriteLabel;
  protected readonly removeFavoriteLabelKey =
    APP_CONFIG.translationKeys.home.sections.search.removeFavoriteLabel;
  protected readonly codeLabelKey = this.translations.list.code;
  protected readonly nucleusLabelKey = this.translations.list.nucleus;
  protected readonly favoritesCardHostClasses = FAVORITES_CARD_HOST_CLASSES;
  protected readonly favoritesCardBodyClasses = FAVORITES_CARD_BODY_CLASSES;
  protected readonly favoritesCardRemoveClasses = FAVORITES_CARD_REMOVE_CLASSES;

  protected readonly searchControl = this.formBuilder.nonNullable.control('');
  protected readonly addSearchControl = this.formBuilder.nonNullable.control('');

  private readonly stopFavorites = signal<readonly StopFavorite[]>([]);
  private readonly lineFavorites = signal<readonly LineFavorite[]>([]);
  private readonly totalFavorites = signal(0);
  private readonly searchTerm = signal('');
  private readonly addModeSubject = new BehaviorSubject(false);
  private readonly addSearchRetry = new Subject<void>();

  protected readonly addMode$ = this.addModeSubject.asObservable();
  protected readonly hasFavorites = computed(() => this.totalFavorites() > 0);
  protected readonly stopGroups = computed(() =>
    this.buildStopGroups(this.stopFavorites(), this.searchTerm())
  );
  protected readonly filteredLines = computed(() =>
    this.filterLines(this.lineFavorites(), this.searchTerm())
  );
  protected readonly hasResults = computed(
    () => this.stopGroups().length > 0 || this.filteredLines().length > 0
  );

  private readonly addQuery$ = this.addSearchControl.valueChanges.pipe(
    startWith(this.addSearchControl.value),
    debounceTime(this.addSearchDebounceMs),
    map((value) => this.normalizeQuery(value)),
    distinctUntilChanged()
  );

  protected readonly addResultsState$: Observable<FavoriteSearchState> = combineLatest([
    this.addMode$,
    this.addQuery$,
    this.favoritesFacade.favorites$,
    this.addSearchRetry.pipe(startWith(undefined))
  ]).pipe(
    switchMap(([adding, query, favorites]) => {
      if (!adding || query.length < 2) {
        return of<FavoriteSearchState>({ status: 'idle', options: EMPTY_ADD_RESULTS });
      }

      const favoriteIds = new Set(favorites.map((favorite) => favorite.id));
      return this.stopDirectory.searchStops({ query, limit: this.addResultsLimit }).pipe(
        map(
          (options): FavoriteSearchState => ({
            status: 'ready',
            options: Object.freeze(
              options.map((option) => ({
                ...option,
                isFavorite: favoriteIds.has(option.id)
              }))
            )
          })
        ),
        catchError(() =>
          of<FavoriteSearchState>({ status: 'error', options: EMPTY_ADD_RESULTS })
        )
      );
    })
  );

  constructor() {
    this.observeFavorites();
    this.observeSearch();
  }

  protected trackGroup(_: number, group: FavoriteGroupView): string {
    return group.id;
  }

  protected trackStop(_: number, item: FavoriteStopListItem): string {
    return item.id;
  }

  protected trackLine(_: number, item: LineFavorite): string {
    return item.id;
  }

  protected trackSearchOption(_: number, option: FavoriteSearchOption): string {
    return option.id;
  }

  protected favoriteIcon(): string {
    return this.favoriteIconName;
  }

  protected removeIcon(): string {
    return this.removeIconName;
  }

  protected favoriteToggleIcon(option: FavoriteSearchOption): string {
    return option.isFavorite ? this.favoriteActiveIconName : this.favoriteInactiveIconName;
  }

  protected favoriteToggleLabel(option: FavoriteSearchOption): string {
    return option.isFavorite ? this.removeFavoriteLabelKey : this.addFavoriteLabelKey;
  }

  protected toggleAddMode(): void {
    this.addModeSubject.next(!this.addModeSubject.value);
  }

  protected retryAddSearch(): void {
    this.addSearchRetry.next();
  }

  protected toggleFavorite(option: FavoriteSearchOption): void {
    this.favoritesFacade.toggle(option);
  }

  protected async removeStop(item: FavoriteStopListItem): Promise<void> {
    const confirmed = await this.confirm({
      titleKey: this.translations.dialogs.remove.title,
      messageKey: this.translations.dialogs.remove.message,
      confirmKey: this.translations.dialogs.remove.confirm,
      cancelKey: this.translations.dialogs.remove.cancel,
      details: [
        { labelKey: this.translations.dialogs.details.name, value: item.name },
        { labelKey: this.translations.dialogs.details.code, value: item.code }
      ]
    });

    if (confirmed) {
      this.favoriteCollection.removeStop(item.id);
    }
  }

  protected async removeLine(item: LineFavorite): Promise<void> {
    const confirmed = await this.confirm({
      titleKey: this.removeFavoriteLabelKey,
      messageKey: this.removeFavoriteLabelKey,
      confirmKey: this.translations.dialogs.remove.confirm,
      cancelKey: this.translations.dialogs.remove.cancel,
      details: [
        { labelKey: this.translations.dialogs.details.name, value: item.name },
        { labelKey: this.translations.dialogs.details.code, value: item.code }
      ]
    });

    if (confirmed) {
      this.favoriteCollection.removeLine(item.id);
    }
  }

  protected async clearAll(): Promise<void> {
    const confirmed = await this.confirm({
      titleKey: this.translations.dialogs.clearAll.title,
      messageKey: this.translations.dialogs.clearAll.message,
      confirmKey: this.translations.dialogs.clearAll.confirm,
      cancelKey: this.translations.dialogs.clearAll.cancel,
      details: [
        {
          labelKey: this.translations.dialogs.details.count,
          value: this.totalFavorites().toString()
        }
      ]
    });

    if (confirmed) {
      this.favoriteCollection.clear();
    }
  }

  protected async onClearAllActivated(): Promise<void> {
    if (this.hasFavorites()) {
      await this.clearAll();
    }
  }

  protected async onRemoveStopActivated(item: FavoriteStopListItem): Promise<void> {
    await this.removeStop(item);
  }

  protected async onRemoveLineActivated(item: LineFavorite): Promise<void> {
    await this.removeLine(item);
  }

  protected stopDetailCommands(item: FavoriteStopListItem): readonly string[] {
    return this.buildStopDetailNavigation(item).commands;
  }

  protected stopDetailQueryParams(item: FavoriteStopListItem): Readonly<Record<string, string>> {
    return this.buildStopDetailNavigation(item).queryParams;
  }

  protected lineDetailCommands(item: LineFavorite): NavigationCommands {
    return buildLineDetailNavigation(item.consortiumId, item.lineId, item.name).commands;
  }

  private observeFavorites(): void {
    this.favoriteCollection.favorites$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((snapshot) => {
        this.stopFavorites.set(snapshot.stops);
        this.lineFavorites.set(snapshot.lines);
        this.totalFavorites.set(snapshot.total);
      });
  }

  private buildStopDetailNavigation(item: FavoriteStopListItem) {
    const stopId = item.stopIds[0] ?? item.id;
    return buildStopDetailNavigation(item.consortiumId, stopId);
  }

  private observeSearch(): void {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(this.normalizeQuery(value)));
  }

  private buildStopGroups(
    favorites: readonly StopFavorite[],
    query: string
  ): readonly FavoriteGroupView[] {
    const filtered = query
      ? favorites.filter((favorite) => this.matchesStopQuery(favorite, query))
      : favorites;
    if (!filtered.length) {
      return [];
    }

    const groups = new Map<string, FavoriteStopListItem[]>();
    for (const favorite of filtered) {
      const item = this.toStopListItem(favorite);
      const groupId = favorite.municipalityId || favorite.municipality;
      const bucket = groups.get(groupId);
      if (bucket) {
        bucket.push(item);
      } else {
        groups.set(groupId, [item]);
      }
    }

    const mapped = Array.from(groups.entries(), ([id, stops]) => ({
      id,
      municipality: stops[0]?.municipality ?? '',
      stops: stops.slice().sort((left, right) => left.name.localeCompare(right.name, QUERY_LOCALE))
    }));
    mapped.sort((left, right) => left.municipality.localeCompare(right.municipality, QUERY_LOCALE));

    return Object.freeze(
      mapped.map((group) => ({
        ...group,
        stops: Object.freeze(group.stops)
      }))
    );
  }

  private filterLines(favorites: readonly LineFavorite[], query: string): readonly LineFavorite[] {
    if (!query) {
      return favorites;
    }

    return Object.freeze(
      favorites.filter((favorite) =>
        [favorite.code, favorite.name, favorite.mode]
          .map((value) => this.normalizeValue(value))
          .some((value) => value.includes(query))
      )
    );
  }

  private toStopListItem(favorite: StopFavorite): FavoriteStopListItem {
    return {
      id: favorite.id,
      name: favorite.name,
      code: favorite.code,
      municipality: favorite.municipality,
      nucleus: favorite.nucleus,
      consortiumId: favorite.consortiumId,
      stopIds: favorite.stopIds
    };
  }

  private matchesStopQuery(favorite: StopFavorite, query: string): boolean {
    return [favorite.name, favorite.code, favorite.municipality, favorite.nucleus]
      .map((value) => this.normalizeValue(value))
      .some((value) => value.includes(query));
  }

  private normalizeQuery(value: string | null): string {
    return value ? this.normalizeValue(value) : '';
  }

  private normalizeValue(value: string): string {
    return value
      .normalize(NORMALIZE_FORM)
      .replace(DIACRITIC_PATTERN, '')
      .toLocaleLowerCase(QUERY_LOCALE);
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data,
        autoFocus: false
      }
    );
    return (await firstValueFrom(dialogRef.afterClosed())) === true;
  }
}

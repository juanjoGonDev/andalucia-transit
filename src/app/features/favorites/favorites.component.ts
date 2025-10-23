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
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { FavoritesFacade, StopFavorite } from '@domain/stops/favorites.facade';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
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

interface FavoriteListItem {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly municipality: string;
  readonly nucleus: string;
  readonly stopIds: readonly string[];
}

interface FavoriteGroupView {
  readonly id: string;
  readonly municipality: string;
  readonly stops: readonly FavoriteListItem[];
}

const QUERY_LOCALE = 'es-ES' as const;
const NORMALIZE_FORM = 'NFD' as const;
const DIACRITIC_PATTERN = /\p{M}/gu;
const FAVORITES_CARD_HOST_CLASSES: readonly string[] = ['favorites-card'];
const FAVORITES_CARD_BODY_CLASSES: readonly string[] = ['favorites-card__body'];
const FAVORITES_CARD_REMOVE_CLASSES: readonly string[] = ['favorites-card__remove'];
const SEARCH_TEXT_FIELD_TYPE: TextFieldType = 'search';
const SEARCH_AUTOCOMPLETE_ATTRIBUTE = 'off';
const SEARCH_ICON_NAME = 'search' as const;
const ROOT_ROUTE_SEGMENT = '/' as const;
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
  private readonly dialog = inject(OverlayDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  private readonly translations = APP_CONFIG.translationKeys.favorites;
  private readonly favoriteIconName = APP_CONFIG.homeData.favoriteStops.icon;
  private readonly removeIconName = APP_CONFIG.homeData.favoriteStops.removeIcon;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.favorites;

  protected readonly titleKey = this.translations.title;
  protected readonly descriptionKey = this.translations.description;
  protected readonly searchLabelKey = this.translations.searchLabel;
  protected readonly searchPlaceholderKey = this.translations.searchPlaceholder;
  protected readonly searchFieldType = SEARCH_TEXT_FIELD_TYPE;
  protected readonly searchAutocompleteAttribute = SEARCH_AUTOCOMPLETE_ATTRIBUTE;
  protected readonly textFieldLabelModes = TEXT_FIELD_LABEL_MODES;
  protected readonly searchIcon = SEARCH_ICON_NAME;
  protected readonly emptyKey = this.translations.empty;
  protected readonly clearAllLabelKey = this.translations.actions.clearAll;
  protected readonly removeLabelKey = this.translations.actions.remove;
  protected readonly codeLabelKey = this.translations.list.code;
  protected readonly nucleusLabelKey = this.translations.list.nucleus;
  protected readonly favoritesCardHostClasses = FAVORITES_CARD_HOST_CLASSES;
  protected readonly favoritesCardBodyClasses = FAVORITES_CARD_BODY_CLASSES;
  protected readonly favoritesCardRemoveClasses = FAVORITES_CARD_REMOVE_CLASSES;

  protected readonly searchControl = this.formBuilder.nonNullable.control('');

  private readonly favorites = signal<readonly StopFavorite[]>([]);
  private readonly searchTerm = signal('');
  private readonly stopDetailRouteKey = APP_CONFIG.routes.stopDetailBase;

  protected readonly hasFavorites = computed(() => this.favorites().length > 0);
  protected readonly groups = computed(() => this.buildGroups(this.favorites(), this.searchTerm()));
  protected readonly hasResults = computed(() => this.groups().length > 0);

  constructor() {
    this.observeFavorites();
    this.observeSearch();
  }

  protected trackGroup(_: number, group: FavoriteGroupView): string {
    return group.id;
  }

  protected trackStop(_: number, item: FavoriteListItem): string {
    return item.id;
  }

  protected favoriteIcon(): string {
    return this.favoriteIconName;
  }

  protected removeIcon(): string {
    return this.removeIconName;
  }

  protected async remove(item: FavoriteListItem): Promise<void> {
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

    if (!confirmed) {
      return;
    }

    this.favoritesFacade.remove(item.id);
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
          value: this.favorites().length.toString()
        }
      ]
    });

    if (!confirmed) {
      return;
    }

    this.favoritesFacade.clear();
  }

  protected async onClearAllActivated(): Promise<void> {
    if (!this.hasFavorites()) {
      return;
    }

    await this.clearAll();
  }

  protected async onRemoveActivated(item: FavoriteListItem): Promise<void> {
    await this.remove(item);
  }

  protected stopDetailCommands(item: FavoriteListItem): readonly string[] {
    return this.buildStopDetailCommands(item);
  }

  private observeFavorites(): void {
    this.favoritesFacade.favorites$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((favorites) => this.favorites.set(favorites));
  }

  private buildStopDetailCommands(item: FavoriteListItem): readonly string[] {
    const stopId = item.stopIds[0] ?? item.id;
    return [ROOT_ROUTE_SEGMENT, this.stopDetailRouteKey, stopId] as const;
  }

  private observeSearch(): void {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(this.normalizeQuery(value)));
  }

  private buildGroups(
    favorites: readonly StopFavorite[],
    query: string
  ): readonly FavoriteGroupView[] {
    if (!favorites.length) {
      return [];
    }

    const filtered = query
      ? favorites.filter((favorite) => this.matchesQuery(favorite, query))
      : favorites;

    if (!filtered.length) {
      return [];
    }

    const groups = new Map<string, FavoriteListItem[]>();

    for (const favorite of filtered) {
      const item = this.toListItem(favorite);
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
      stops: this.sortStops(stops)
    }));

    mapped.sort((first, second) => first.municipality.localeCompare(second.municipality, QUERY_LOCALE));

    return Object.freeze(
      mapped.map((group) => ({
        id: group.id,
        municipality: group.municipality,
        stops: Object.freeze(group.stops)
      }))
    );
  }

  private sortStops(stops: FavoriteListItem[]): FavoriteListItem[] {
    return stops
      .slice()
      .sort((first, second) => first.name.localeCompare(second.name, QUERY_LOCALE));
  }

  private toListItem(favorite: StopFavorite): FavoriteListItem {
    return {
      id: favorite.id,
      name: favorite.name,
      code: favorite.code,
      municipality: favorite.municipality,
      nucleus: favorite.nucleus,
      stopIds: favorite.stopIds
    } satisfies FavoriteListItem;
  }

  private matchesQuery(favorite: StopFavorite, query: string): boolean {
    const normalizedName = this.normalizeValue(favorite.name);
    const normalizedCode = this.normalizeValue(favorite.code);
    const normalizedMunicipality = this.normalizeValue(favorite.municipality);
    const normalizedNucleus = this.normalizeValue(favorite.nucleus);

    return (
      normalizedName.includes(query) ||
      normalizedCode.includes(query) ||
      normalizedMunicipality.includes(query) ||
      normalizedNucleus.includes(query)
    );
  }

  private normalizeQuery(value: string | null): string {
    if (!value) {
      return '';
    }

    return this.normalizeValue(value);
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

    const result = await firstValueFrom(dialogRef.afterClosed());
    return result === true;
  }
}

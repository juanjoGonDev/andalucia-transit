import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import {
  FavoriteCollectionFacade,
  FavoriteCollectionSnapshot
} from '@domain/favorites/favorite-collection.facade';
import { getFavoritesUiCopy } from '@features/favorites/favorites-ui.copy';
import {
  HomeFavoritePreviewItem,
  HomeFavoritesPreviewComponent
} from '@features/home/favorites-preview/home-favorites-preview.component';

const EMPTY_FAVORITE_COLLECTION: FavoriteCollectionSnapshot = {
  stops: [],
  lines: [],
  total: 0
};

@Component({
  selector: 'app-home-favorites-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule, HomeFavoritesPreviewComponent],
  templateUrl: './home-favorites-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeFavoritesPanelComponent {
  private readonly favoriteCollection = inject(FavoriteCollectionFacade);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly previewLimit = APP_CONFIG.homeData.favoriteStops.homePreviewLimit;
  private readonly favorites = signal<FavoriteCollectionSnapshot>(EMPTY_FAVORITE_COLLECTION);

  @Output() readonly openFavorites = new EventEmitter<void>();

  protected readonly copy = computed(() => getFavoritesUiCopy(this.language.currentLanguage()));
  protected readonly codeLabelKey = APP_CONFIG.translationKeys.favorites.list.code;
  protected readonly nucleusLabelKey = APP_CONFIG.translationKeys.favorites.list.nucleus;
  protected readonly hasFavorites = computed(() => this.favorites().total > 0);
  protected readonly preview = computed<readonly HomeFavoritePreviewItem[]>(() => {
    const snapshot = this.favorites();
    const limit = Math.max(this.previewLimit, 0);
    if (limit === 0 || snapshot.total === 0) {
      return [];
    }

    const items: HomeFavoritePreviewItem[] = [
      ...snapshot.stops.map((favorite) => ({ kind: 'stop' as const, favorite })),
      ...snapshot.lines.map((favorite) => ({ kind: 'line' as const, favorite }))
    ];
    items.sort((left, right) => left.favorite.name.localeCompare(right.favorite.name, 'es-ES'));
    return Object.freeze(items.slice(0, limit));
  });

  constructor() {
    this.favoriteCollection.favorites$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((favorites) => this.favorites.set(favorites));
  }
}

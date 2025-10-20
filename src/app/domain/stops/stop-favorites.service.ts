import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import {
  StopFavoriteStoredItem,
  StopFavoritesStorage
} from '../../data/stops/stop-favorites.storage';

export interface StopFavorite {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly consortiumId: number;
  readonly stopIds: readonly string[];
}

const EMPTY_FAVORITES: readonly StopFavorite[] = Object.freeze([] as StopFavorite[]);

@Injectable({ providedIn: 'root' })
export class StopFavoritesService {
  private readonly storage = inject(StopFavoritesStorage);
  private readonly favoritesSubject = new BehaviorSubject<readonly StopFavorite[]>(
    this.loadInitialFavorites()
  );
  private favoritesIndex = this.buildIndex(this.favoritesSubject.value);

  readonly favorites$ = this.favoritesSubject.asObservable();

  add(option: StopDirectoryOption): void {
    if (this.favoritesIndex.has(option.id)) {
      return;
    }

    const next = [...this.favoritesSubject.value, this.fromOption(option)];
    this.setFavorites(next);
  }

  remove(id: string): void {
    if (!this.favoritesIndex.has(id)) {
      return;
    }

    const next = this.favoritesSubject.value.filter((favorite) => favorite.id !== id);
    this.setFavorites(next);
  }

  clear(): void {
    if (!this.favoritesSubject.value.length) {
      return;
    }

    this.setFavorites([]);
  }

  toggle(option: StopDirectoryOption): void {
    if (this.favoritesIndex.has(option.id)) {
      this.remove(option.id);
      return;
    }

    this.add(option);
  }

  isFavorite(id: string): boolean {
    return this.favoritesIndex.has(id);
  }

  private loadInitialFavorites(): readonly StopFavorite[] {
    const stored = this.storage.load();

    if (!stored.length) {
      return EMPTY_FAVORITES;
    }

    const mapped = stored.map((item) => this.fromStoredItem(item));
    return this.sortFavorites(mapped);
  }

  private setFavorites(favorites: readonly StopFavorite[]): void {
    const sorted = this.sortFavorites(favorites);
    this.updateState(sorted, sorted.length === 0);
  }

  private updateState(favorites: readonly StopFavorite[], clearStorage: boolean): void {
    this.favoritesIndex = this.buildIndex(favorites);
    this.favoritesSubject.next(favorites);

    if (clearStorage) {
      this.storage.clear();
      return;
    }

    const stored = favorites.map((favorite) => this.toStoredItem(favorite));
    this.storage.save(stored);
  }

  private sortFavorites(favorites: readonly StopFavorite[]): readonly StopFavorite[] {
    if (!favorites.length) {
      return EMPTY_FAVORITES;
    }

    const sorted = [...favorites].sort((first, second) => {
      const byMunicipality = first.municipality.localeCompare(second.municipality, 'es-ES');

      if (byMunicipality !== 0) {
        return byMunicipality;
      }

      return first.name.localeCompare(second.name, 'es-ES');
    });

    return Object.freeze(sorted.map((favorite) => ({ ...favorite })));
  }

  private buildIndex(favorites: readonly StopFavorite[]): ReadonlyMap<string, StopFavorite> {
    return new Map(favorites.map((favorite) => [favorite.id, favorite] as const));
  }

  private fromOption(option: StopDirectoryOption): StopFavorite {
    return {
      id: option.id,
      code: option.code,
      name: option.name,
      municipality: option.municipality,
      municipalityId: option.municipalityId,
      nucleus: option.nucleus,
      nucleusId: option.nucleusId,
      consortiumId: option.consortiumId,
      stopIds: option.stopIds
    } satisfies StopFavorite;
  }

  private fromStoredItem(item: StopFavoriteStoredItem): StopFavorite {
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      municipality: item.municipality,
      municipalityId: item.municipalityId,
      nucleus: item.nucleus,
      nucleusId: item.nucleusId,
      consortiumId: item.consortiumId,
      stopIds: item.stopIds
    } satisfies StopFavorite;
  }

  private toStoredItem(item: StopFavorite): StopFavoriteStoredItem {
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      municipality: item.municipality,
      municipalityId: item.municipalityId,
      nucleus: item.nucleus,
      nucleusId: item.nucleusId,
      consortiumId: item.consortiumId,
      stopIds: item.stopIds
    } satisfies StopFavoriteStoredItem;
  }
}

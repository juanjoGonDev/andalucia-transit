import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  LineFavoriteStoredItem,
  LineFavoritesStorage
} from '@data/lines/line-favorites.storage';
import { normalizeLineDisplayName } from '@data/lines/line-metadata.util';
import { buildLineKey } from '@domain/lines/line-directory.service';

export interface LineFavoriteCandidate {
  readonly consortiumId: number;
  readonly lineId: string;
  readonly code: string;
  readonly name: string;
  readonly mode: string;
}

export interface LineFavorite extends LineFavoriteCandidate {
  readonly id: string;
}

const EMPTY_FAVORITES: readonly LineFavorite[] = Object.freeze([]);

@Injectable({ providedIn: 'root' })
export class LineFavoritesService {
  private readonly storage = inject(LineFavoritesStorage);
  private readonly favoritesSubject = new BehaviorSubject<readonly LineFavorite[]>(
    this.loadInitialFavorites()
  );
  private favoritesIndex = this.buildIndex(this.favoritesSubject.value);

  readonly favorites$ = this.favoritesSubject.asObservable();

  add(candidate: LineFavoriteCandidate): void {
    const favorite = this.fromCandidate(candidate);
    if (!favorite || this.favoritesIndex.has(favorite.id)) {
      return;
    }

    this.setFavorites([...this.favoritesSubject.value, favorite]);
  }

  remove(id: string): void {
    if (!this.favoritesIndex.has(id)) {
      return;
    }

    this.setFavorites(this.favoritesSubject.value.filter((favorite) => favorite.id !== id));
  }

  clear(): void {
    if (!this.favoritesSubject.value.length) {
      return;
    }

    this.setFavorites([]);
  }

  toggle(candidate: LineFavoriteCandidate): void {
    const id = buildLineKey(candidate.consortiumId, candidate.lineId);
    if (this.favoritesIndex.has(id)) {
      this.remove(id);
      return;
    }

    this.add(candidate);
  }

  isFavorite(id: string): boolean {
    return this.favoritesIndex.has(id);
  }

  private loadInitialFavorites(): readonly LineFavorite[] {
    const mapped = this.storage
      .load()
      .map((item) => this.fromStoredItem(item))
      .filter((item): item is LineFavorite => item !== null);
    return this.sortFavorites(mapped);
  }

  private fromCandidate(candidate: LineFavoriteCandidate): LineFavorite | null {
    const lineId = candidate.lineId.trim();
    const code = candidate.code.trim();
    const name = normalizeLineDisplayName(candidate.name);
    if (
      !Number.isSafeInteger(candidate.consortiumId) ||
      candidate.consortiumId <= 0 ||
      !lineId ||
      !code ||
      !name
    ) {
      return null;
    }

    return {
      id: buildLineKey(candidate.consortiumId, lineId),
      consortiumId: candidate.consortiumId,
      lineId,
      code,
      name,
      mode: candidate.mode.trim()
    };
  }

  private fromStoredItem(item: LineFavoriteStoredItem): LineFavorite | null {
    return this.fromCandidate(item);
  }

  private setFavorites(favorites: readonly LineFavorite[]): void {
    const sorted = this.sortFavorites(favorites);
    this.favoritesIndex = this.buildIndex(sorted);
    this.favoritesSubject.next(sorted);

    if (!sorted.length) {
      this.storage.clear();
      return;
    }

    this.storage.save(sorted.map((favorite) => this.toStoredItem(favorite)));
  }

  private sortFavorites(favorites: readonly LineFavorite[]): readonly LineFavorite[] {
    if (!favorites.length) {
      return EMPTY_FAVORITES;
    }

    const sorted = [...favorites].sort((left, right) => {
      const byCode = left.code.localeCompare(right.code, 'es-ES', { numeric: true });
      return byCode !== 0 ? byCode : left.name.localeCompare(right.name, 'es-ES');
    });
    return Object.freeze(sorted.map((favorite) => ({ ...favorite })));
  }

  private buildIndex(favorites: readonly LineFavorite[]): ReadonlyMap<string, LineFavorite> {
    return new Map(favorites.map((favorite) => [favorite.id, favorite] as const));
  }

  private toStoredItem(favorite: LineFavorite): LineFavoriteStoredItem {
    return {
      id: favorite.id,
      consortiumId: favorite.consortiumId,
      lineId: favorite.lineId,
      code: favorite.code,
      name: favorite.name,
      mode: favorite.mode
    };
  }
}

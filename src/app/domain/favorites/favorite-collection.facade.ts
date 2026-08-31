import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, shareReplay } from 'rxjs';
import { LineFavorite, LineFavoritesFacade } from '@domain/lines/line-favorites.facade';
import { FavoritesFacade, StopFavorite } from '@domain/stops/favorites.facade';

export interface FavoriteCollectionSnapshot {
  readonly stops: readonly StopFavorite[];
  readonly lines: readonly LineFavorite[];
  readonly total: number;
}

@Injectable({ providedIn: 'root' })
export class FavoriteCollectionFacade {
  private readonly stopFavorites = inject(FavoritesFacade);
  private readonly lineFavorites = inject(LineFavoritesFacade);

  readonly favorites$: Observable<FavoriteCollectionSnapshot> = combineLatest([
    this.stopFavorites.favorites$,
    this.lineFavorites.favorites$
  ]).pipe(
    map(([stops, lines]) => ({ stops, lines, total: stops.length + lines.length })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  removeStop(id: string): void {
    this.stopFavorites.remove(id);
  }

  removeLine(id: string): void {
    this.lineFavorites.remove(id);
  }

  clear(): void {
    this.stopFavorites.clear();
    this.lineFavorites.clear();
  }
}

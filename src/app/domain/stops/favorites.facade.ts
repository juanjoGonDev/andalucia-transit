import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { StopFavoritesService, StopFavorite } from './stop-favorites.service';
import type { StopDirectoryOption } from '../../data/stops/stop-directory.service';

@Injectable({ providedIn: 'root' })
export class FavoritesFacade {
  private readonly favorites = inject(StopFavoritesService);

  readonly favorites$: Observable<readonly StopFavorite[]> = this.favorites.favorites$;

  add(option: StopDirectoryOption): void {
    this.favorites.add(option);
  }

  remove(id: StopFavorite['id']): void {
    this.favorites.remove(id);
  }

  clear(): void {
    this.favorites.clear();
  }

  toggle(option: StopDirectoryOption): void {
    this.favorites.toggle(option);
  }

  isFavorite(id: StopFavorite['id']): boolean {
    return this.favorites.isFavorite(id);
  }
}

export type { StopFavorite } from './stop-favorites.service';

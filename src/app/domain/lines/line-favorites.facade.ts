import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LineFavorite, LineFavoriteCandidate, LineFavoritesService } from '@domain/lines/line-favorites.service';

@Injectable({ providedIn: 'root' })
export class LineFavoritesFacade {
  private readonly service = inject(LineFavoritesService);

  readonly favorites$: Observable<readonly LineFavorite[]> = this.service.favorites$;

  add(candidate: LineFavoriteCandidate): void {
    this.service.add(candidate);
  }

  remove(id: string): void {
    this.service.remove(id);
  }

  clear(): void {
    this.service.clear();
  }

  toggle(candidate: LineFavoriteCandidate): void {
    this.service.toggle(candidate);
  }

  isFavorite(id: string): boolean {
    return this.service.isFavorite(id);
  }
}

export type { LineFavorite, LineFavoriteCandidate } from '@domain/lines/line-favorites.service';

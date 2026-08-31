import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LineFavorite } from '@domain/lines/line-favorites.facade';
import { StopFavorite } from '@domain/stops/favorites.facade';
import {
  NavigationCommands,
  buildLineDetailNavigation,
  buildStopDetailNavigation
} from '@shared/navigation/navigation.util';
import { InteractiveCardComponent } from '@shared/ui/cards/interactive-card/interactive-card.component';

export type HomeFavoritePreviewItem =
  | { readonly kind: 'stop'; readonly favorite: StopFavorite }
  | { readonly kind: 'line'; readonly favorite: LineFavorite };

@Component({
  selector: 'app-home-favorites-preview',
  standalone: true,
  imports: [CommonModule, InteractiveCardComponent],
  templateUrl: './home-favorites-preview.component.html',
  styleUrl: './home-favorites-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeFavoritesPreviewComponent {
  @Input() favorites: readonly HomeFavoritePreviewItem[] = [];
  @Input() codeLabel = '';
  @Input() nucleusLabel = '';

  protected readonly cardBodyClasses = ['home-favorites-preview__card-body'] as const;

  protected trackByFavoriteId(_: number, item: HomeFavoritePreviewItem): string {
    return `${item.kind}:${item.favorite.id}`;
  }

  protected stopDetailCommands(favorite: StopFavorite): readonly string[] {
    return this.buildStopDetailNavigation(favorite).commands;
  }

  protected stopDetailQueryParams(favorite: StopFavorite): Readonly<Record<string, string>> {
    return this.buildStopDetailNavigation(favorite).queryParams;
  }

  protected lineDetailCommands(favorite: LineFavorite): NavigationCommands {
    return buildLineDetailNavigation(favorite.consortiumId, favorite.lineId).commands;
  }

  private buildStopDetailNavigation(favorite: StopFavorite) {
    const stopId = favorite.stopIds[0] ?? favorite.id;
    return buildStopDetailNavigation(favorite.consortiumId, stopId);
  }
}

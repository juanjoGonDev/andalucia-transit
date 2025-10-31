import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { StopFavorite } from '@domain/stops/favorites.facade';
import { InteractiveCardComponent } from '@shared/ui/cards/interactive-card/interactive-card.component';

@Component({
  selector: 'app-home-favorites-preview',
  standalone: true,
  imports: [CommonModule, InteractiveCardComponent],
  templateUrl: './home-favorites-preview.component.html',
  styleUrl: './home-favorites-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeFavoritesPreviewComponent {
  @Input() favorites: readonly StopFavorite[] = [];
  @Input() codeLabel = '';
  @Input() nucleusLabel = '';
  @Output() readonly favoriteSelected = new EventEmitter<StopFavorite>();

  protected readonly cardBodyClasses = ['home-favorites-preview__card-body'] as const;

  protected trackByFavoriteId(_: number, favorite: StopFavorite): string {
    return favorite.id;
  }

  protected handleFavoriteSelected(favorite: StopFavorite): void {
    this.favoriteSelected.emit(favorite);
  }
}

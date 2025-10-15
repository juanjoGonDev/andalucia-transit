import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

const HOME_LIST_CARD_REMOVE_ICON = 'close';

@Component({
  selector: 'app-home-list-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-list-card.component.html',
  styleUrls: ['./home-list-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeListCardComponent {
  @Input() removeAriaLabel: string | null = null;

  @Output() readonly primaryAction = new EventEmitter<void>();
  @Output() readonly removeAction = new EventEmitter<void>();

  protected readonly removeIcon = HOME_LIST_CARD_REMOVE_ICON;

  protected onPrimaryClick(): void {
    this.primaryAction.emit();
  }

  protected onRemoveClick(event: MouseEvent): void {
    event.stopPropagation();
    this.removeAction.emit();
  }
}

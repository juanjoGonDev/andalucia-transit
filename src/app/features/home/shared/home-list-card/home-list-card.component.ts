import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InteractiveCardComponent } from '../../../../shared/ui/cards/interactive-card/interactive-card.component';

const HOME_CARD_CLASS = 'recent-card';
const HOME_CARD_BODY_CLASS = 'recent-card__body';
const HOME_CARD_REMOVE_CLASS = 'recent-card__remove';

@Component({
  selector: 'app-home-list-card',
  standalone: true,
  imports: [CommonModule, InteractiveCardComponent],
  templateUrl: './home-list-card.component.html',
  styleUrls: ['./home-list-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeListCardComponent {
  @Input() removeAriaLabel: string | null = null;

  @Output() readonly primaryAction = new EventEmitter<void>();
  @Output() readonly removeAction = new EventEmitter<void>();

  protected readonly cardClasses: readonly string[] = [HOME_CARD_CLASS];
  protected readonly bodyClasses: readonly string[] = [HOME_CARD_BODY_CLASS];
  protected readonly removeClasses: readonly string[] = [HOME_CARD_REMOVE_CLASS];

  protected handlePrimaryActivated(): void {
    this.primaryAction.emit();
  }

  protected handleRemoveActivated(): void {
    this.removeAction.emit();
  }
}

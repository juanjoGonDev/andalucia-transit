import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { MaterialSymbolName } from '../types/material-symbol-name';
import { InteractiveCardComponent } from '../cards/interactive-card/interactive-card.component';

export type CardListLayout = 'list' | 'action';
export type IconVariant = 'plain' | 'soft';

const CARD_LIST_ITEM_CLASS = 'card-list-item';
const CARD_LIST_ITEM_ACTION_CLASS = 'card-list-item--action';
const CARD_LIST_ITEM_SOFT_ICON_CLASS = 'card-list-item--soft-icon';
const CARD_LIST_ITEM_LEADING_SOFT_CLASS = 'card-list-item__leading--soft';
const CARD_LIST_ITEM_LEADING_ACTION_CLASS = 'card-list-item__leading--action';
const CARD_LIST_ITEM_TRAILING_ICON_NAME: MaterialSymbolName = 'chevron_right';

@Component({
  selector: 'app-card-list-item',
  standalone: true,
  imports: [CommonModule, TranslateModule, InteractiveCardComponent],
  templateUrl: './card-list-item.component.html',
  styleUrl: './card-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardListItemComponent {
  @Input() leadingIcon: MaterialSymbolName | null = null;
  @Input({ required: true }) titleKey!: string;
  @Input() subtitleKey?: string;
  @Input() trailingIcon: MaterialSymbolName | null = CARD_LIST_ITEM_TRAILING_ICON_NAME;
  @Input() commands?: readonly string[];
  @Input() layout: CardListLayout = 'list';
  @Input() iconVariant: IconVariant = 'plain';
  @Input() ariaLabelKey?: string;
  @Output() action = new EventEmitter<void>();

  protected get bodyClassList(): readonly string[] {
    const classes = [CARD_LIST_ITEM_CLASS];

    if (this.layout === 'action') {
      classes.push(CARD_LIST_ITEM_ACTION_CLASS);
    }

    if (this.iconVariant === 'soft') {
      classes.push(CARD_LIST_ITEM_SOFT_ICON_CLASS);
    }

    return classes;
  }

  protected get leadingClassMap(): Record<string, boolean> {
    return {
      [CARD_LIST_ITEM_LEADING_SOFT_CLASS]: this.iconVariant === 'soft',
      [CARD_LIST_ITEM_LEADING_ACTION_CLASS]: this.layout === 'action'
    };
  }

  protected handlePrimaryActivated(): void {
    this.action.emit();
  }
}

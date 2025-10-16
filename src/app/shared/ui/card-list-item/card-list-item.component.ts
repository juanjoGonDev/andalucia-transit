import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MaterialSymbolName } from '../types/material-symbol-name';
import { AccessibleButtonDirective } from '../../a11y/accessible-button.directive';

export type CardListLayout = 'list' | 'action';
export type IconVariant = 'plain' | 'soft';

@Component({
  selector: 'app-card-list-item',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, AccessibleButtonDirective],
  templateUrl: './card-list-item.component.html',
  styleUrl: './card-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardListItemComponent {
  @Input() leadingIcon: MaterialSymbolName | null = null;
  @Input({ required: true }) titleKey!: string;
  @Input() subtitleKey?: string;
  @Input() trailingIcon: MaterialSymbolName | null = 'chevron_right';
  @Input() commands?: readonly string[];
  @Input() layout: CardListLayout = 'list';
  @Input() iconVariant: IconVariant = 'plain';
  @Input() ariaLabelKey?: string;
  @Output() action = new EventEmitter<void>();

  protected get hostClassMap(): Record<string, boolean> {
    return {
      'card-list-item--action': this.layout === 'action',
      'card-list-item--soft-icon': this.iconVariant === 'soft'
    };
  }

  protected get leadingClassMap(): Record<string, boolean> {
    return {
      'card-list-item__leading--soft': this.iconVariant === 'soft',
      'card-list-item__leading--action': this.layout === 'action'
    };
  }

  protected handleClick(): void {
    this.action.emit();
  }
}

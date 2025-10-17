import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../../core/config';
import { InteractiveCardComponent } from '../cards/interactive-card/interactive-card.component';
import { MaterialSymbolName } from '../types/material-symbol-name';

export type CardListLayout = 'list' | 'action';
export type IconVariant = 'plain' | 'soft';

const CARD_LIST_ITEM_CLASS = 'card-list-item';
const CARD_LIST_ITEM_ACTION_CLASS = 'card-list-item--action';
const CARD_LIST_ITEM_SOFT_ICON_CLASS = 'card-list-item--soft-icon';
const CARD_LIST_ITEM_LEADING_SOFT_CLASS = 'card-list-item__leading--soft';
const CARD_LIST_ITEM_LEADING_ACTION_CLASS = 'card-list-item__leading--action';
const CARD_LIST_ITEM_TRAILING_ICON_NAME: MaterialSymbolName = 'chevron_right';

@Component({
  selector: 'app-stop-navigation-item',
  standalone: true,
  imports: [CommonModule, TranslateModule, InteractiveCardComponent],
  templateUrl: './stop-navigation-item.component.html',
  styleUrl: './stop-navigation-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class StopNavigationItemComponent {
  private static readonly ROOT_COMMAND = '/' as const;

  private stopIdentifier = '';

  @Input({ required: true })
  set stopId(value: string) {
    this.stopIdentifier = value;
    this.navigationCommands = this.buildCommands(value);
  }
  get stopId(): string {
    return this.stopIdentifier;
  }

  @Input({ required: true }) leadingIcon!: MaterialSymbolName;
  @Input({ required: true }) titleKey!: string;
  @Input() subtitleKey?: string;
  @Input() iconVariant: IconVariant = 'plain';
  @Input() layout: CardListLayout = 'list';
  @Input() trailingIcon: MaterialSymbolName | null = CARD_LIST_ITEM_TRAILING_ICON_NAME;
  @Input() ariaLabelKey?: string;

  protected navigationCommands: readonly string[] = [];

  protected get bodyClassList(): readonly string[] {
    const classes: string[] = [CARD_LIST_ITEM_CLASS];

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

  protected get computedAriaLabelKey(): string {
    return this.ariaLabelKey ?? this.titleKey;
  }

  private buildCommands(stopId: string): readonly string[] {
    if (!stopId) {
      return [];
    }

    return [
      StopNavigationItemComponent.ROOT_COMMAND,
      APP_CONFIG.routes.stopDetailBase,
      stopId
    ] as const;
  }
}

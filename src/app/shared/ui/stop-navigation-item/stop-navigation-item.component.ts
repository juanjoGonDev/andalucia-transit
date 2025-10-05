import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { APP_CONFIG } from '../../../core/config';
import {
  CardListItemComponent,
  CardListLayout,
  IconVariant
} from '../card-list-item/card-list-item.component';
import { MaterialSymbolName } from '../types/material-symbol-name';

@Component({
  selector: 'app-stop-navigation-item',
  standalone: true,
  imports: [CommonModule, CardListItemComponent],
  templateUrl: './stop-navigation-item.component.html',
  styleUrl: './stop-navigation-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
  @Input() trailingIcon: MaterialSymbolName | null = 'chevron_right';
  @Input() ariaLabelKey?: string;

  protected navigationCommands: readonly string[] = [];

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

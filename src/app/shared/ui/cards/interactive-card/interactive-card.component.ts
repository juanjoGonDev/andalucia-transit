import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AccessibleButtonDirective } from '../../../a11y/accessible-button.directive';

const DEFAULT_REMOVE_ICON_NAME = 'close';
const MATERIAL_SYMBOLS_OUTLINED_CLASS = 'material-symbols-outlined';
const EMPTY_CLASS_LIST: readonly string[] = [];

@Component({
  selector: 'app-interactive-card',
  standalone: true,
  imports: [CommonModule, AccessibleButtonDirective],
  templateUrl: './interactive-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractiveCardComponent {
  @Input() removeAriaLabel: string | null = null;
  @Input() bodyClasses: readonly string[] = EMPTY_CLASS_LIST;
  @Input() removeClasses: readonly string[] = EMPTY_CLASS_LIST;
  @Input() removeIconName: string = DEFAULT_REMOVE_ICON_NAME;
  @Input() removeIconClass = MATERIAL_SYMBOLS_OUTLINED_CLASS;
  @Output() readonly primaryActivated = new EventEmitter<void>();
  @Output() readonly removeActivated = new EventEmitter<void>();

  protected handlePrimaryActivated(): void {
    this.primaryActivated.emit();
  }

  protected handleRemoveActivated(event: MouseEvent): void {
    event.stopPropagation();
    this.removeActivated.emit();
  }
}

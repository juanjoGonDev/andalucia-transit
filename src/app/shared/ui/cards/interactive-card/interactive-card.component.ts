import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AccessibleButtonDirective } from '../../../a11y/accessible-button.directive';

const DEFAULT_REMOVE_ICON_NAME = 'close';
const MATERIAL_SYMBOLS_OUTLINED_CLASS = 'material-symbols-outlined';
const EMPTY_CLASS_LIST: readonly string[] = [];
const LINK_ROLE = 'link';

@Component({
  selector: 'app-interactive-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AccessibleButtonDirective],
  templateUrl: './interactive-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractiveCardComponent {
  @Input() removeAriaLabel: string | null = null;
  @Input() bodyClasses: readonly string[] = EMPTY_CLASS_LIST;
  @Input() removeClasses: readonly string[] = EMPTY_CLASS_LIST;
  @Input() removeIconName: string = DEFAULT_REMOVE_ICON_NAME;
  @Input() removeIconClass = MATERIAL_SYMBOLS_OUTLINED_CLASS;
  @Input() primaryAriaLabel: string | null = null;
  @Input() primaryRole: string | null = null;
  @Input() primaryCommands: readonly string[] | null = null;
  @Output() readonly primaryActivated = new EventEmitter<void>();
  @Output() readonly removeActivated = new EventEmitter<void>();

  protected get computedPrimaryCommands(): readonly string[] | undefined {
    return this.primaryCommands ?? undefined;
  }

  protected get computedPrimaryRole(): string | null {
    if (this.primaryRole) {
      return this.primaryRole;
    }

    if (this.primaryCommands && this.primaryCommands.length > 0) {
      return LINK_ROLE;
    }

    return null;
  }

  protected handlePrimaryActivated(): void {
    this.primaryActivated.emit();
  }

  protected handleRemoveActivated(event: MouseEvent): void {
    event.stopPropagation();
    this.removeActivated.emit();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AccessibleButtonDirective } from '../../../a11y/accessible-button.directive';

const DEFAULT_REMOVE_ICON_NAME = 'close';
const MATERIAL_SYMBOLS_OUTLINED_CLASS = 'material-symbols-outlined';
const LINK_ROLE = 'link';
const INTERACTIVE_CARD_HOST_CLASS = 'interactive-card';
const INTERACTIVE_CARD_BODY_CLASS = 'interactive-card__body';
const INTERACTIVE_CARD_REMOVE_CLASS = 'interactive-card__remove';

@Component({
  selector: 'app-interactive-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AccessibleButtonDirective],
  templateUrl: './interactive-card.component.html',
  styleUrls: ['./interactive-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractiveCardComponent {
  @Input() removeAriaLabel: string | null = null;
  @Input() removeIconName: string = DEFAULT_REMOVE_ICON_NAME;
  @Input() removeIconClass = MATERIAL_SYMBOLS_OUTLINED_CLASS;
  @Input() primaryAriaLabel: string | null = null;
  @Input() primaryRole: string | null = null;
  @Input() primaryCommands: readonly string[] | null = null;
  @Input() primaryPressed: boolean | null = null;
  @Output() readonly primaryActivated = new EventEmitter<void>();
  @Output() readonly removeActivated = new EventEmitter<void>();

  private bodyClassList: readonly string[] = [INTERACTIVE_CARD_BODY_CLASS];
  private removeClassList: readonly string[] = [INTERACTIVE_CARD_REMOVE_CLASS];

  @HostBinding(`class.${INTERACTIVE_CARD_HOST_CLASS}`)
  protected readonly hostClass = true;

  @Input()
  set bodyClasses(value: readonly string[] | undefined) {
    this.bodyClassList = this.mergeClasses(value, INTERACTIVE_CARD_BODY_CLASS);
  }

  get bodyClasses(): readonly string[] {
    return this.bodyClassList;
  }

  @Input()
  set removeClasses(value: readonly string[] | undefined) {
    this.removeClassList = this.mergeClasses(value, INTERACTIVE_CARD_REMOVE_CLASS);
  }

  get removeClasses(): readonly string[] {
    return this.removeClassList;
  }

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

  private mergeClasses(
    classes: readonly string[] | undefined,
    baseClass: string
  ): readonly string[] {
    if (!classes || classes.length === 0) {
      return [baseClass];
    }

    return [baseClass, ...classes];
  }
}

import { Directive, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';

const KEYBOARD_ENTER = 'Enter' as const;
const KEYBOARD_SPACE = ' ' as const;
const ARIA_TRUE = 'true' as const;
const ARIA_FALSE = 'false' as const;

@Directive({
  selector: '[appAccessibleButton]',
  standalone: true,
  exportAs: 'appAccessibleButton'
})
export class AccessibleButtonDirective {
  @Input() appAccessibleButtonDisabled = false;
  @Input() appAccessibleButtonRole: string | null = null;
  @Input() appAccessibleButtonPressed: boolean | null = null;
  @Input() appAccessibleButtonChecked: boolean | null = null;
  @Output() readonly appAccessibleButtonActivated = new EventEmitter<MouseEvent>();

  @HostBinding('attr.role')
  get role(): string {
    return this.appAccessibleButtonRole ?? 'button';
  }

  @HostBinding('attr.tabindex')
  get tabIndex(): number {
    return this.appAccessibleButtonDisabled ? -1 : 0;
  }

  @HostBinding('attr.aria-disabled')
  get ariaDisabled(): 'true' | null {
    return this.appAccessibleButtonDisabled ? 'true' : null;
  }

  @HostBinding('attr.aria-pressed')
  get ariaPressed(): 'true' | 'false' | null {
    if (this.appAccessibleButtonPressed === null) {
      return null;
    }

    return this.appAccessibleButtonPressed ? ARIA_TRUE : ARIA_FALSE;
  }

  @HostBinding('attr.aria-checked')
  get ariaChecked(): 'true' | 'false' | null {
    if (this.appAccessibleButtonChecked === null) {
      return null;
    }

    return this.appAccessibleButtonChecked ? ARIA_TRUE : ARIA_FALSE;
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.shouldHandleActivation(event)) {
      return;
    }

    event.preventDefault();
    this.invokeHostClick(event);
  }

  @HostListener('keyup', ['$event'])
  onKeyup(event: KeyboardEvent): void {
    if (!this.shouldHandleActivation(event)) {
      return;
    }

    event.preventDefault();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (!this.appAccessibleButtonDisabled) {
      this.appAccessibleButtonActivated.emit(event);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  private shouldHandleActivation(event: KeyboardEvent): boolean {
    if (this.appAccessibleButtonDisabled) {
      return false;
    }

    return event.key === KEYBOARD_ENTER || event.key === KEYBOARD_SPACE;
  }

  private invokeHostClick(event: KeyboardEvent): void {
    const host = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

    if (!host) {
      return;
    }

    host.click();
  }
}

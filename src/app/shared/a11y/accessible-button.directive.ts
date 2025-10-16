import { Directive, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';

const KEYBOARD_ENTER = 'Enter' as const;
const KEYBOARD_SPACE = ' ' as const;

@Directive({
  selector: '[appAccessibleButton]',
  standalone: true,
  exportAs: 'appAccessibleButton'
})
export class AccessibleButtonDirective {
  @Input() appAccessibleButtonDisabled = false;
  @Input() appAccessibleButtonRole: string | null = null;
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

import {
  Directive,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  inject
} from '@angular/core';

export type AccessibleButtonPopupToken = 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
type AccessibleButtonPopupValue = boolean | AccessibleButtonPopupToken;

const KEYBOARD_ENTER = 'Enter' as const;
const KEYBOARD_SPACE = ' ' as const;
const ARIA_TRUE = 'true' as const;
const ARIA_FALSE = 'false' as const;
const CURSOR_POINTER = 'pointer' as const;
const CURSOR_NOT_ALLOWED = 'not-allowed' as const;

@Directive({
  selector: '[appAccessibleButton]',
  standalone: true,
  exportAs: 'appAccessibleButton'
})
export class AccessibleButtonDirective {
  private readonly hostElementRef = inject(ElementRef<HTMLElement>);
  @Input() appAccessibleButtonDisabled = false;
  @Input() appAccessibleButtonRole: string | null = null;
  @Input() appAccessibleButtonPressed: boolean | null = null;
  @Input() appAccessibleButtonChecked: boolean | null = null;
  @Input() appAccessibleButtonExpanded: boolean | null = null;
  @Input() appAccessibleButtonHasPopup: AccessibleButtonPopupValue | null = null;
  @Output() readonly appAccessibleButtonActivated = new EventEmitter<MouseEvent>();

  @HostBinding('attr.role')
  get role(): string | null {
    if (this.appAccessibleButtonRole) {
      return this.appAccessibleButtonRole;
    }

    if (this.isAnchorWithHref()) {
      return null;
    }

    return 'button';
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

  @HostBinding('attr.aria-expanded')
  get ariaExpanded(): 'true' | 'false' | null {
    if (this.appAccessibleButtonExpanded === null) {
      return null;
    }

    return this.appAccessibleButtonExpanded ? ARIA_TRUE : ARIA_FALSE;
  }

  @HostBinding('attr.aria-haspopup')
  get ariaHasPopup(): AccessibleButtonPopupToken | 'true' | 'false' | null {
    if (this.appAccessibleButtonHasPopup === null) {
      return null;
    }

    if (typeof this.appAccessibleButtonHasPopup === 'boolean') {
      return this.appAccessibleButtonHasPopup ? ARIA_TRUE : ARIA_FALSE;
    }

    return this.appAccessibleButtonHasPopup;
  }

  @HostBinding('style.cursor')
  get cursor(): string {
    return this.appAccessibleButtonDisabled ? CURSOR_NOT_ALLOWED : CURSOR_POINTER;
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.shouldSimulateActivation(event)) {
      return;
    }

    event.preventDefault();
    this.invokeHostClick(event);
  }

  @HostListener('keyup', ['$event'])
  onKeyup(event: KeyboardEvent): void {
    if (!this.shouldSimulateActivation(event)) {
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

  private shouldSimulateActivation(event: KeyboardEvent): boolean {
    if (this.appAccessibleButtonDisabled) {
      return false;
    }

    if (event.key === KEYBOARD_SPACE) {
      if (this.role === 'link') {
        return false;
      }

      return !this.isAnchorWithHref();
    }

    if (event.key === KEYBOARD_ENTER) {
      if (this.isAnchorWithHref()) {
        return false;
      }

      return true;
    }

    return false;
  }

  private invokeHostClick(event: KeyboardEvent): void {
    const host = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

    if (!host) {
      return;
    }

    host.click();
  }

  private isAnchorWithHref(): boolean {
    const element = this.hostElementRef.nativeElement;

    return element instanceof HTMLAnchorElement && element.hasAttribute('href');
  }
}

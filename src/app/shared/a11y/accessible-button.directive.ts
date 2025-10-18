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
type LegacyKeyboardEvent = KeyboardEvent & { keyIdentifier?: string };

const ENTER_KEY_VALUES = ['Enter', 'Return'] as const;
const ENTER_CODE = 'Enter' as const;
const ENTER_KEY_CODE = 13 as const;
const ENTER_KEY_IDENTIFIERS = ['Enter', 'U+000D'] as const;
const SPACE_KEY_VALUES = [' ', 'Space', 'Spacebar'] as const;
const SPACE_CODE = 'Space' as const;
const SPACE_KEY_CODE = 32 as const;
const SPACE_KEY_IDENTIFIERS = ['U+0020', 'Spacebar'] as const;
const ARIA_TRUE = 'true' as const;
const ARIA_FALSE = 'false' as const;
const CURSOR_POINTER = 'pointer' as const;
const CURSOR_NOT_ALLOWED = 'not-allowed' as const;
const ROLE_BUTTON = 'button' as const;
const ROLE_LINK = 'link' as const;
const HREF_ATTRIBUTE = 'href' as const;
const TAB_INDEX_ENABLED = 0 as const;
const TAB_INDEX_DISABLED = -1 as const;

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

    return ROLE_BUTTON;
  }

  @HostBinding('attr.tabindex')
  get tabIndex(): number {
    return this.appAccessibleButtonDisabled ? TAB_INDEX_DISABLED : TAB_INDEX_ENABLED;
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

  private spaceActivationPending = false;

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.appAccessibleButtonDisabled) {
      this.cancelSpaceActivation();
      return;
    }

    if (this.isEnterKey(event)) {
      if (this.isAnchorWithHref()) {
        return;
      }

      event.preventDefault();
      this.invokeHostClick(event);
      return;
    }

    if (this.isSpaceKey(event)) {
      if (this.isAnchorWithHref()) {
        return;
      }

      if (this.role === ROLE_LINK) {
        this.cancelSpaceActivation();
        return;
      }

      event.preventDefault();
      this.spaceActivationPending = true;
    }
  }

  @HostListener('keyup', ['$event'])
  onKeyup(event: KeyboardEvent): void {
    if (this.appAccessibleButtonDisabled) {
      this.cancelSpaceActivation();
      return;
    }

    if (this.isEnterKey(event)) {
      if (this.isAnchorWithHref()) {
        return;
      }

      event.preventDefault();
      return;
    }

    if (this.isSpaceKey(event)) {
      if (!this.spaceActivationPending) {
        return;
      }

      this.cancelSpaceActivation();

      if (this.isAnchorWithHref()) {
        return;
      }

      if (this.role === ROLE_LINK) {
        return;
      }

      event.preventDefault();
      this.invokeHostClick(event);
    }
  }

  @HostListener('blur')
  onBlur(): void {
    this.cancelSpaceActivation();
  }

  @HostListener('focusout')
  onFocusOut(): void {
    this.cancelSpaceActivation();
  }

  @HostListener('document:keyup', ['$event'])
  onDocumentKeyup(event: KeyboardEvent): void {
    if (!this.spaceActivationPending) {
      return;
    }

    if (!this.isSpaceKey(event)) {
      return;
    }

    this.cancelSpaceActivation();
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

  private invokeHostClick(event: KeyboardEvent): void {
    const host = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

    if (!host) {
      return;
    }

    host.click();
  }

  private isEnterKey(event: KeyboardEvent): boolean {
    if (ENTER_KEY_VALUES.some((value) => value === event.key)) {
      return true;
    }

    if (event.code === ENTER_CODE) {
      return true;
    }

    if (event.keyCode === ENTER_KEY_CODE || event.which === ENTER_KEY_CODE) {
      return true;
    }

    const legacyEvent = event as LegacyKeyboardEvent;

    return ENTER_KEY_IDENTIFIERS.some((identifier) => legacyEvent.keyIdentifier === identifier);
  }

  private isSpaceKey(event: KeyboardEvent): boolean {
    if (SPACE_KEY_VALUES.some((identifier) => identifier === event.key)) {
      return true;
    }

    if (event.code === SPACE_CODE) {
      return true;
    }

    if (event.keyCode === SPACE_KEY_CODE || event.which === SPACE_KEY_CODE) {
      return true;
    }

    const legacyEvent = event as LegacyKeyboardEvent;

    return SPACE_KEY_IDENTIFIERS.some((identifier) => legacyEvent.keyIdentifier === identifier);
  }

  private isAnchorWithHref(): boolean {
    const element = this.hostElementRef.nativeElement;

    return element instanceof HTMLAnchorElement && element.hasAttribute(HREF_ATTRIBUTE);
  }

  private cancelSpaceActivation(): void {
    this.spaceActivationPending = false;
  }
}

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

import {
  KeyMatcher,
  createKeyMatcher,
  matchesKey
} from './key-event-matchers';

export type AccessibleButtonPopupToken = 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
type AccessibleButtonPopupValue = boolean | AccessibleButtonPopupToken;

const KEY_VALUE_ENTER = 'Enter' as const;
const KEY_VALUE_RETURN = 'Return' as const;
const KEY_VALUE_SPACE = ' ' as const;
const KEY_VALUE_SPACE_NAME = 'Space' as const;
const KEY_VALUE_SPACEBAR = 'Spacebar' as const;
const KEY_IDENTIFIER_ENTER = 'Enter' as const;
const KEY_IDENTIFIER_ENTER_CODE = 'U+000D' as const;
const KEY_IDENTIFIER_SPACE = 'U+0020' as const;
const KEY_IDENTIFIER_SPACEBAR = 'Spacebar' as const;
const KEY_CODE_ENTER = 13 as const;
const KEY_CODE_SPACE = 32 as const;
const KEY_CODE_NAME_ENTER = 'Enter' as const;
const KEY_CODE_NAME_SPACE = 'Space' as const;

const ENTER_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_ENTER, KEY_VALUE_RETURN],
  codeValues: [KEY_CODE_NAME_ENTER],
  keyCodes: [KEY_CODE_ENTER],
  keyIdentifiers: [KEY_IDENTIFIER_ENTER, KEY_IDENTIFIER_ENTER_CODE]
});

const SPACE_KEY_MATCHER: KeyMatcher = createKeyMatcher({
  keyValues: [KEY_VALUE_SPACE, KEY_VALUE_SPACE_NAME, KEY_VALUE_SPACEBAR],
  codeValues: [KEY_CODE_NAME_SPACE],
  keyCodes: [KEY_CODE_SPACE],
  keyIdentifiers: [KEY_IDENTIFIER_SPACE, KEY_IDENTIFIER_SPACEBAR]
});
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
    return this.resolveRole();
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

    const resolvedRole = this.resolveRole();

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

      if (resolvedRole === ROLE_LINK) {
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

    const resolvedRole = this.resolveRole();

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

      if (resolvedRole === ROLE_LINK) {
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
    return matchesKey(event, ENTER_KEY_MATCHER);
  }

  private isSpaceKey(event: KeyboardEvent): boolean {
    return matchesKey(event, SPACE_KEY_MATCHER);
  }

  private isAnchorWithHref(): boolean {
    const element = this.hostElementRef.nativeElement;

    return element instanceof HTMLAnchorElement && element.hasAttribute(HREF_ATTRIBUTE);
  }

  private cancelSpaceActivation(): void {
    this.spaceActivationPending = false;
  }

  private resolveRole(): string | null {
    if (this.appAccessibleButtonRole) {
      return this.appAccessibleButtonRole;
    }

    if (this.isAnchorWithHref()) {
      return null;
    }

    return ROLE_BUTTON;
  }

}

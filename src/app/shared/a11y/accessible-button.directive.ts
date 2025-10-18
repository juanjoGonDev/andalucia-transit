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

interface KeyMatcher {
  readonly keyValues?: ReadonlySet<string>;
  readonly codeValues?: ReadonlySet<string>;
  readonly keyCodes?: ReadonlySet<number>;
  readonly keyIdentifiers?: ReadonlySet<string>;
}

const ENTER_KEY_VALUES: ReadonlySet<string> = new Set(['Enter', 'Return']);
const ENTER_CODE_VALUES: ReadonlySet<string> = new Set(['Enter']);
const ENTER_KEY_CODES: ReadonlySet<number> = new Set([13]);
const ENTER_KEY_IDENTIFIERS: ReadonlySet<string> = new Set(['Enter', 'U+000D']);
const SPACE_KEY_VALUES: ReadonlySet<string> = new Set([' ', 'Space', 'Spacebar']);
const SPACE_CODE_VALUES: ReadonlySet<string> = new Set(['Space']);
const SPACE_KEY_CODES: ReadonlySet<number> = new Set([32]);
const SPACE_KEY_IDENTIFIERS: ReadonlySet<string> = new Set(['U+0020', 'Spacebar']);
const ENTER_KEY_MATCHER: KeyMatcher = {
  keyValues: ENTER_KEY_VALUES,
  codeValues: ENTER_CODE_VALUES,
  keyCodes: ENTER_KEY_CODES,
  keyIdentifiers: ENTER_KEY_IDENTIFIERS
};
const SPACE_KEY_MATCHER: KeyMatcher = {
  keyValues: SPACE_KEY_VALUES,
  codeValues: SPACE_CODE_VALUES,
  keyCodes: SPACE_KEY_CODES,
  keyIdentifiers: SPACE_KEY_IDENTIFIERS
};
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
    return this.matchesKey(event, ENTER_KEY_MATCHER);
  }

  private isSpaceKey(event: KeyboardEvent): boolean {
    return this.matchesKey(event, SPACE_KEY_MATCHER);
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

  private matchesKey(event: KeyboardEvent, matcher: KeyMatcher): boolean {
    if (matcher.keyValues && event.key && matcher.keyValues.has(event.key)) {
      return true;
    }

    if (matcher.codeValues && event.code && matcher.codeValues.has(event.code)) {
      return true;
    }

    if (matcher.keyCodes) {
      const keyCode = this.resolveKeyCode(event);

      if (keyCode !== null && matcher.keyCodes.has(keyCode)) {
        return true;
      }
    }

    if (matcher.keyIdentifiers) {
      const legacyEvent = event as LegacyKeyboardEvent;

      if (legacyEvent.keyIdentifier && matcher.keyIdentifiers.has(legacyEvent.keyIdentifier)) {
        return true;
      }
    }

    return false;
  }

  private resolveKeyCode(event: KeyboardEvent): number | null {
    if (typeof event.keyCode === 'number') {
      return event.keyCode;
    }

    if (typeof event.which === 'number') {
      return event.which;
    }

    return null;
  }
}

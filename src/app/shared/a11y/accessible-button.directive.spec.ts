import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AccessibleButtonDirective, AccessibleButtonPopupToken } from './accessible-button.directive';

type ExtendedKeyboardEvent = KeyboardEvent & { keyIdentifier?: string };

const ENTER_KEY_CODE = 13 as const;
const ENTER_CODE = 'Enter' as const;
const ENTER_KEY_IDENTIFIERS = ['Enter', 'U+000D'] as const;
const SPACE_KEY_CODE = 32 as const;
const SPACE_CODE = 'Space' as const;
const SPACE_KEY_IDENTIFIER = 'U+0020' as const;

function setKeyboardEventNumberProperty(
  event: KeyboardEvent,
  property: 'keyCode' | 'which',
  value: number
): void {
  Object.defineProperty(event, property, {
    configurable: true,
    value
  });
}

function setKeyboardEventIdentifier(event: ExtendedKeyboardEvent, value: string): void {
  Object.defineProperty(event, 'keyIdentifier', {
    configurable: true,
    value
  });
}

@Component({
  standalone: true,
  imports: [AccessibleButtonDirective],
  template: `
    <div
      appAccessibleButton
      [appAccessibleButtonDisabled]="disabled"
      [appAccessibleButtonRole]="role"
      [appAccessibleButtonPressed]="pressed"
      [appAccessibleButtonChecked]="checked"
      [appAccessibleButtonExpanded]="expanded"
      [appAccessibleButtonHasPopup]="hasPopup"
      (appAccessibleButtonActivated)="onActivated($event)"
    >
      Action
    </div>
  `
})
class HostComponent {
  disabled = false;
  role: string | null = null;
  pressed: boolean | null = null;
  checked: boolean | null = null;
  expanded: boolean | null = null;
  hasPopup: boolean | AccessibleButtonPopupToken | null = null;
  readonly onActivated: jasmine.Spy<(event: MouseEvent) => void> = jasmine.createSpy();
}

@Component({
  standalone: true,
  imports: [AccessibleButtonDirective],
  template: `
    <a
      appAccessibleButton
      [attr.href]="href"
      (appAccessibleButtonActivated)="onActivated($event)"
    >
      Navigate
    </a>
  `
})
class AnchorHostComponent {
  href = '#target';
  readonly onActivated: jasmine.Spy<(event: MouseEvent) => void> = jasmine.createSpy();
}

describe('AccessibleButtonDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let hostComponent: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent]
    });

    fixture = TestBed.createComponent(HostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should expose button semantics when enabled', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.getAttribute('role')).toBe('button');
    expect(nativeElement.getAttribute('tabindex')).toBe('0');
    expect(nativeElement.getAttribute('aria-disabled')).toBeNull();
  });

  it('should set pointer cursor when enabled', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.style.cursor).toBe('pointer');
  });

  it('should apply configured role when provided', () => {
    hostComponent.role = 'menuitem';
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.getAttribute('role')).toBe('menuitem');
  });

  it('should disable keyboard focus and mark aria-disabled when disabled', () => {
    hostComponent.disabled = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.getAttribute('tabindex')).toBe('-1');
    expect(nativeElement.getAttribute('aria-disabled')).toBe('true');
  });

  it('should set not-allowed cursor when disabled', () => {
    hostComponent.disabled = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.style.cursor).toBe('not-allowed');
  });

  it('should expose pressed state when provided', () => {
    hostComponent.pressed = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.getAttribute('aria-pressed')).toBe('true');

    hostComponent.pressed = false;
    fixture.detectChanges();

    expect(nativeElement.getAttribute('aria-pressed')).toBe('false');

    hostComponent.pressed = null;
    fixture.detectChanges();

    expect(nativeElement.hasAttribute('aria-pressed')).toBeFalse();
  });

  it('should expose checked state when provided', () => {
    hostComponent.checked = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.getAttribute('aria-checked')).toBe('true');

    hostComponent.checked = false;
    fixture.detectChanges();

    expect(nativeElement.getAttribute('aria-checked')).toBe('false');

    hostComponent.checked = null;
    fixture.detectChanges();

    expect(nativeElement.hasAttribute('aria-checked')).toBeFalse();
  });

  it('should expose expanded state when provided', () => {
    hostComponent.expanded = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.getAttribute('aria-expanded')).toBe('true');

    hostComponent.expanded = false;
    fixture.detectChanges();

    expect(nativeElement.getAttribute('aria-expanded')).toBe('false');

    hostComponent.expanded = null;
    fixture.detectChanges();

    expect(nativeElement.hasAttribute('aria-expanded')).toBeFalse();
  });

  it('should expose popup role when provided', () => {
    hostComponent.hasPopup = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    expect(nativeElement.getAttribute('aria-haspopup')).toBe('true');

    hostComponent.hasPopup = false;
    fixture.detectChanges();

    expect(nativeElement.getAttribute('aria-haspopup')).toBe('false');

    hostComponent.hasPopup = 'menu';
    fixture.detectChanges();

    expect(nativeElement.getAttribute('aria-haspopup')).toBe('menu');

    hostComponent.hasPopup = null;
    fixture.detectChanges();

    expect(nativeElement.hasAttribute('aria-haspopup')).toBeFalse();
  });

  it('should emit activation on pointer click when enabled', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should prevent activation when disabled', () => {
    hostComponent.disabled = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(hostComponent.onActivated).not.toHaveBeenCalled();
  });

  it('should trigger activation on enter keydown', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    nativeElement.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should trigger activation on space keyup', () => {
    hostComponent.onActivated.calls.reset();
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    const keydownEvent = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    nativeElement.dispatchEvent(keydownEvent);

    expect(keydownEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).not.toHaveBeenCalled();

    const keyupEvent = new KeyboardEvent('keyup', { key: ' ', cancelable: true });
    nativeElement.dispatchEvent(keyupEvent);

    expect(keyupEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should treat alternate space key values as activation triggers', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;
    const alternateKeys: readonly string[] = ['Space', 'Spacebar'];

    for (const key of alternateKeys) {
      hostComponent.onActivated.calls.reset();

      const keydownEvent = new KeyboardEvent('keydown', { key, cancelable: true });
      nativeElement.dispatchEvent(keydownEvent);

      expect(keydownEvent.defaultPrevented).toBeTrue();
      expect(hostComponent.onActivated).not.toHaveBeenCalled();

      const keyupEvent = new KeyboardEvent('keyup', { key, cancelable: true });
      nativeElement.dispatchEvent(keyupEvent);

      expect(keyupEvent.defaultPrevented).toBeTrue();
      expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
    }
  });

  it('should treat alternate enter key values as activation triggers', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;
    const alternateKeys: readonly string[] = ['Return'];

    for (const key of alternateKeys) {
      hostComponent.onActivated.calls.reset();

      const keydownEvent = new KeyboardEvent('keydown', { key, cancelable: true });
      nativeElement.dispatchEvent(keydownEvent);

      expect(keydownEvent.defaultPrevented).toBeTrue();
      expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
    }
  });

  it('should treat enter keyboard code as activation trigger when key is empty', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    hostComponent.onActivated.calls.reset();

    const keydownEvent = new KeyboardEvent('keydown', {
      key: '',
      code: ENTER_CODE,
      cancelable: true
    });
    nativeElement.dispatchEvent(keydownEvent);

    expect(keydownEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should treat legacy enter keyCode values as activation triggers', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    hostComponent.onActivated.calls.reset();

    const keydownEvent = new KeyboardEvent('keydown', { key: '', cancelable: true });
    setKeyboardEventNumberProperty(keydownEvent, 'keyCode', ENTER_KEY_CODE);
    setKeyboardEventNumberProperty(keydownEvent, 'which', ENTER_KEY_CODE);
    nativeElement.dispatchEvent(keydownEvent);

    expect(keydownEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should treat legacy enter keyIdentifier values as activation triggers', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    for (const identifier of ENTER_KEY_IDENTIFIERS) {
      hostComponent.onActivated.calls.reset();

      const keydownEvent = new KeyboardEvent('keydown', { key: '', cancelable: true });
      setKeyboardEventIdentifier(keydownEvent, identifier);
      nativeElement.dispatchEvent(keydownEvent);

      expect(keydownEvent.defaultPrevented).toBeTrue();
      expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
    }
  });

  it('should treat space keyboard code as activation trigger when key is empty', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    hostComponent.onActivated.calls.reset();

    const keydownEvent = new KeyboardEvent('keydown', {
      key: '',
      code: SPACE_CODE,
      cancelable: true
    });
    nativeElement.dispatchEvent(keydownEvent);

    expect(keydownEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).not.toHaveBeenCalled();

    const keyupEvent = new KeyboardEvent('keyup', {
      key: '',
      code: SPACE_CODE,
      cancelable: true
    });
    nativeElement.dispatchEvent(keyupEvent);

    expect(keyupEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should treat legacy keyCode values as activation triggers', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    hostComponent.onActivated.calls.reset();

    const keydownEvent = new KeyboardEvent('keydown', { key: '', cancelable: true });
    setKeyboardEventNumberProperty(keydownEvent, 'keyCode', SPACE_KEY_CODE);
    setKeyboardEventNumberProperty(keydownEvent, 'which', SPACE_KEY_CODE);
    nativeElement.dispatchEvent(keydownEvent);

    expect(keydownEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).not.toHaveBeenCalled();

    const keyupEvent = new KeyboardEvent('keyup', { key: '', cancelable: true });
    setKeyboardEventNumberProperty(keyupEvent, 'keyCode', SPACE_KEY_CODE);
    setKeyboardEventNumberProperty(keyupEvent, 'which', SPACE_KEY_CODE);
    nativeElement.dispatchEvent(keyupEvent);

    expect(keyupEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should treat legacy keyIdentifier values as activation triggers', () => {
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    hostComponent.onActivated.calls.reset();

    const keydownEvent = new KeyboardEvent('keydown', { key: '', cancelable: true });
    setKeyboardEventIdentifier(keydownEvent, SPACE_KEY_IDENTIFIER);
    nativeElement.dispatchEvent(keydownEvent);

    expect(keydownEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).not.toHaveBeenCalled();

    const keyupEvent = new KeyboardEvent('keyup', { key: '', cancelable: true });
    setKeyboardEventIdentifier(keyupEvent, SPACE_KEY_IDENTIFIER);
    nativeElement.dispatchEvent(keyupEvent);

    expect(keyupEvent.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should prevent default on enter when the host exposes a link role without an href', () => {
    hostComponent.onActivated.calls.reset();
    hostComponent.role = 'link';
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    nativeElement.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });

  it('should not trigger activation on space when the host exposes a link role without an href', () => {
    hostComponent.onActivated.calls.reset();
    hostComponent.role = 'link';
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    const spaceDownEvent = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    nativeElement.dispatchEvent(spaceDownEvent);

    expect(spaceDownEvent.defaultPrevented).toBeFalse();
    expect(hostComponent.onActivated).not.toHaveBeenCalled();

    const spaceUpEvent = new KeyboardEvent('keyup', { key: ' ', cancelable: true });
    nativeElement.dispatchEvent(spaceUpEvent);

    expect(spaceUpEvent.defaultPrevented).toBeFalse();
    expect(hostComponent.onActivated).not.toHaveBeenCalled();
  });
});

describe('AccessibleButtonDirective with anchor host', () => {
  let fixture: ComponentFixture<AnchorHostComponent>;
  let hostComponent: AnchorHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AnchorHostComponent]
    });

    fixture = TestBed.createComponent(AnchorHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not block native navigation keys on anchors with href', () => {
    const element = fixture.debugElement.query(By.css('a'));
    const nativeElement = element.nativeElement as HTMLAnchorElement;

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    nativeElement.dispatchEvent(enterEvent);

    expect(enterEvent.defaultPrevented).toBeFalse();

    const spaceKeys: readonly string[] = [' ', 'Space', 'Spacebar'];

    for (const key of spaceKeys) {
      const spaceDownEvent = new KeyboardEvent('keydown', { key, cancelable: true });
      nativeElement.dispatchEvent(spaceDownEvent);

      expect(spaceDownEvent.defaultPrevented).toBeFalse();

      const spaceUpEvent = new KeyboardEvent('keyup', { key, cancelable: true });
      nativeElement.dispatchEvent(spaceUpEvent);

      expect(spaceUpEvent.defaultPrevented).toBeFalse();
    }
  });

  it('should not override the native link role when not configured', () => {
    const element = fixture.debugElement.query(By.css('a'));
    const nativeElement = element.nativeElement as HTMLAnchorElement;

    expect(nativeElement.hasAttribute('role')).toBeFalse();
  });

  it('should emit activation when the anchor is clicked', () => {
    const element = fixture.debugElement.query(By.css('a'));
    const nativeElement = element.nativeElement as HTMLAnchorElement;

    nativeElement.click();

    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });
});

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AccessibleButtonDirective } from './accessible-button.directive';

@Component({
  standalone: true,
  imports: [AccessibleButtonDirective],
  template: `
    <div
      appAccessibleButton
      [appAccessibleButtonDisabled]="disabled"
      [appAccessibleButtonRole]="role"
      (appAccessibleButtonActivated)="onActivated($event)"
    >
      Action
    </div>
  `
})
class HostComponent {
  disabled = false;
  role: string | null = null;
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

  it('should trigger activation on space keydown', () => {
    hostComponent.onActivated.calls.reset();
    const element = fixture.debugElement.query(By.directive(AccessibleButtonDirective));
    const nativeElement = element.nativeElement as HTMLElement;

    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    nativeElement.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(hostComponent.onActivated).toHaveBeenCalledTimes(1);
  });
});

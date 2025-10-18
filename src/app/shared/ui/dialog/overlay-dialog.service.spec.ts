import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, flushMicrotasks } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import {
  OverlayDialogConfig,
  OverlayDialogRef,
  OverlayDialogRole,
  OverlayDialogService
} from './overlay-dialog.service';

const CONTAINER_SELECTOR = 'app-overlay-dialog-container';
const SURFACE_SELECTOR = '.mdc-dialog__surface';
const TRIGGER_SELECTOR = 'button';
const ALERT_ROLE: OverlayDialogRole = 'alertdialog';
const DEFAULT_ROLE: OverlayDialogRole = 'dialog';
const TRIGGER_LABEL = 'Open dialog';
const ACTION_LABEL = 'Confirm action';

@Component({
  standalone: true,
  template: '<button type="button">' + TRIGGER_LABEL + '</button>'
})
class TestHostComponent {
  private readonly dialog = inject(OverlayDialogService);

  openDialog(config?: OverlayDialogConfig<unknown>): OverlayDialogRef<unknown> {
    return this.dialog.open(TestDialogComponent, config);
  }
}

@Component({
  standalone: true,
  template: '<button type="button">' + ACTION_LABEL + '</button>'
})
class TestDialogComponent {}

describe('OverlayDialogService accessibility', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let overlayContainer: OverlayContainer;
  let overlayElement: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverlayModule, NoopAnimationsModule, TestHostComponent]
    });

    overlayContainer = TestBed.inject(OverlayContainer);
    overlayElement = overlayContainer.getContainerElement();
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('should focus the dialog content and restore focus after close', fakeAsync(() => {
    const hostElement = fixture.nativeElement as HTMLElement;
    const trigger = hostElement.querySelector<HTMLButtonElement>(TRIGGER_SELECTOR);
    expect(trigger).not.toBeNull();
    trigger?.focus();

    const dialogRef = fixture.componentInstance.openDialog({ role: ALERT_ROLE });
    fixture.detectChanges();
    flushMicrotasks();
    flush();

    const container = overlayElement.querySelector(CONTAINER_SELECTOR) as HTMLElement | null;
    expect(container).not.toBeNull();
    expect(container?.getAttribute('role')).toBe(ALERT_ROLE);
    expect(container?.getAttribute('aria-modal')).toBe('true');
    expect(container?.querySelector(SURFACE_SELECTOR)).not.toBeNull();

    const focusedElement = document.activeElement as HTMLElement | null;
    expect(focusedElement?.textContent?.trim()).toBe(ACTION_LABEL);

    dialogRef.close();
    flushMicrotasks();
    flush();

    expect(document.activeElement).toBe(trigger);
  }));

  it('should respect autoFocus configuration', fakeAsync(() => {
    const hostElement = fixture.nativeElement as HTMLElement;
    const trigger = hostElement.querySelector<HTMLButtonElement>(TRIGGER_SELECTOR);
    expect(trigger).not.toBeNull();
    trigger?.focus();

    const dialogRef = fixture.componentInstance.openDialog({ autoFocus: false });
    fixture.detectChanges();
    flushMicrotasks();
    flush();

    const container = overlayElement.querySelector(CONTAINER_SELECTOR) as HTMLElement | null;
    expect(container).not.toBeNull();
    expect(container?.getAttribute('role')).toBe(DEFAULT_ROLE);

    expect(document.activeElement).toBe(trigger);

    dialogRef.close();
    flushMicrotasks();
    flush();

    expect(document.activeElement).toBe(trigger);
  }));
});

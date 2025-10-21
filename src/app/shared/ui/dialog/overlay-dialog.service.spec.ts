import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, flushMicrotasks } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OVERLAY_DIALOG_SURFACE_CLASS } from '@shared/ui/dialog/overlay-dialog-container.component';
import {
  OverlayDialogConfig,
  OverlayDialogRef,
  OverlayDialogRole,
  OverlayDialogService
} from '@shared/ui/dialog/overlay-dialog.service';

const CONTAINER_SELECTOR = 'app-overlay-dialog-container';
const SURFACE_SELECTOR = `.${OVERLAY_DIALOG_SURFACE_CLASS}`;
const OVERLAY_PANE_SELECTOR = '.cdk-overlay-pane';
const OVERLAY_BACKDROP_SELECTOR = '.cdk-overlay-backdrop';
const TRIGGER_SELECTOR = 'button';
const ALERT_ROLE: OverlayDialogRole = 'alertdialog';
const DEFAULT_ROLE: OverlayDialogRole = 'dialog';
const TRIGGER_LABEL = 'Open dialog';
const ACTION_LABEL = 'Confirm action';

interface KeyDispatchOptions {
  readonly key?: string;
  readonly code?: string;
  readonly keyCode?: number;
  readonly which?: number;
  readonly keyIdentifier?: string;
}

const dispatchKeydown = (target: HTMLElement, options: KeyDispatchOptions): void => {
  const event = new KeyboardEvent('keydown', {
    key: options.key ?? '',
    code: options.code ?? '',
    bubbles: true
  });

  if (options.key !== undefined) {
    Object.defineProperty(event, 'key', { get: () => options.key as string });
  }

  if (options.keyCode !== undefined) {
    Object.defineProperty(event, 'keyCode', { get: () => options.keyCode });
  }

  if (options.which !== undefined) {
    Object.defineProperty(event, 'which', { get: () => options.which });
  }

  if (options.keyIdentifier !== undefined) {
    Object.defineProperty(event, 'keyIdentifier', { get: () => options.keyIdentifier });
  }

  target.dispatchEvent(event);
};

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

  it('should close the dialog when escape key variants are pressed', fakeAsync(() => {
    const variants: readonly KeyDispatchOptions[] = [
      { key: 'Escape' },
      { key: 'Esc' },
      { code: 'Escape' },
      { keyCode: 27 },
      { which: 27 },
      { keyIdentifier: 'U+001B' }
    ];

    for (const variant of variants) {
      const dialogRef = fixture.componentInstance.openDialog();
      fixture.detectChanges();
      flushMicrotasks();
      flush();

      const pane = overlayElement.querySelector<HTMLElement>(OVERLAY_PANE_SELECTOR);
      expect(pane).not.toBeNull();

      const closedSpy = jasmine.createSpy('closed');
      dialogRef.afterClosed().subscribe(closedSpy);

      dispatchKeydown(pane as HTMLElement, variant);
      flushMicrotasks();
      flush();

      expect(closedSpy).withContext(JSON.stringify(variant)).toHaveBeenCalledTimes(1);
    }
  }));

  it('should ignore escape and backdrop interactions when closing is disabled', fakeAsync(() => {
    const dialogRef = fixture.componentInstance.openDialog({ disableClose: true });
    fixture.detectChanges();
    flushMicrotasks();
    flush();

    const pane = overlayElement.querySelector<HTMLElement>(OVERLAY_PANE_SELECTOR);
    expect(pane).not.toBeNull();

    const backdrop = overlayElement.querySelector<HTMLElement>(OVERLAY_BACKDROP_SELECTOR);
    expect(backdrop).not.toBeNull();

    const closedSpy = jasmine.createSpy('closed');
    dialogRef.afterClosed().subscribe(closedSpy);

    dispatchKeydown(pane as HTMLElement, { key: 'Escape' });
    flushMicrotasks();
    flush();

    expect(closedSpy).not.toHaveBeenCalled();

    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushMicrotasks();
    flush();

    expect(closedSpy).not.toHaveBeenCalled();

    dialogRef.close();
    flushMicrotasks();
    flush();

    expect(closedSpy).toHaveBeenCalledTimes(1);
  }));
});

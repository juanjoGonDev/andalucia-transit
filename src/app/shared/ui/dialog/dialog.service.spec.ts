import { ApplicationRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';

import { DialogService } from './dialog.service';
import { DialogRef } from './dialog-ref';
import { DialogSurfaceComponent } from './dialog-surface.component';
import { DialogTitleDirective } from './dialog-title.directive';
import { DialogDescriptionDirective } from './dialog-description.directive';
import { DialogFooterDirective } from './dialog-footer.directive';

@Component({
  standalone: true,
  imports: [DialogSurfaceComponent, DialogTitleDirective, DialogDescriptionDirective, DialogFooterDirective],
  template: `
    <ui-dialog-surface>
      <h2 uiDialogTitle>{{ title }}</h2>
      <p uiDialogDescription>{{ description }}</p>
      <p>{{ body }}</p>
      <div uiDialogFooter>
        <button type="button" class="btn btn--primary" (click)="close()">Close</button>
      </div>
    </ui-dialog-surface>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestDialogContentComponent {
  protected readonly title = 'Title';
  protected readonly description = 'Description';
  protected readonly body = 'Body';
  private readonly dialogRef = inject(DialogRef<void>);

  protected close(): void {
    this.dialogRef.close();
  }
}

describe('DialogService', () => {
  let service: DialogService;
  let overlayContainer: OverlayContainer;
  let appRef: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverlayModule],
      providers: [DialogService]
    });

    service = TestBed.inject(DialogService);
    overlayContainer = TestBed.inject(OverlayContainer);
    appRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('renders the dialog container with accessible identifiers', fakeAsync(() => {
    service.open(TestDialogContentComponent);
    flush();
    appRef.tick();
    const container = overlayContainer.getContainerElement();
    const dialogElement = container.querySelector('.dialog') as HTMLElement | null;

    expect(dialogElement).not.toBeNull();
    expect(dialogElement?.getAttribute('aria-labelledby')).toMatch(/^dialog-title-/);
    expect(dialogElement?.getAttribute('aria-describedby')).toMatch(/^dialog-description-/);
  }));

  it('closes when Escape is pressed by default', fakeAsync(() => {
    service.open(TestDialogContentComponent);
    flush();
    appRef.tick();
    const container = overlayContainer.getContainerElement();
    const pane = container.querySelector('.cdk-overlay-pane') as HTMLElement;

    pane.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flush();

    expect(container.querySelector('.dialog')).toBeNull();
  }));

  it('respects preventClose for backdrop and keyboard interactions', fakeAsync(() => {
    const ref = service.open(TestDialogContentComponent, { preventClose: true });
    flush();
    appRef.tick();
    const container = overlayContainer.getContainerElement();
    const backdrop = container.querySelector('.cdk-overlay-backdrop') as HTMLElement;
    const pane = container.querySelector('.cdk-overlay-pane') as HTMLElement;

    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    pane.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flush();
    appRef.tick();

    expect(container.querySelector('.dialog')).not.toBeNull();

    ref.close();
  }));
});

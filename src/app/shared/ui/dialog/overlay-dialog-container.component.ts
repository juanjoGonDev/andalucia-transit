import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ElementRef,
  HostBinding,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { CdkPortalOutlet, ComponentPortal, PortalModule } from '@angular/cdk/portal';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { OverlayDialogRole } from './overlay-dialog.service';

export const OVERLAY_DIALOG_CONTAINER_CLASS = 'app-overlay-dialog__container';
export const OVERLAY_DIALOG_SURFACE_CLASS = 'app-overlay-dialog__surface';

@Component({
  selector: 'app-overlay-dialog-container',
  standalone: true,
  imports: [PortalModule],
  template: `
    <div class="${OVERLAY_DIALOG_SURFACE_CLASS}">
      <ng-template cdkPortalOutlet></ng-template>
    </div>
  `,
  styleUrl: './overlay-dialog-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: OVERLAY_DIALOG_CONTAINER_CLASS
  }
})
export class OverlayDialogContainerComponent implements AfterViewInit, OnDestroy {
  @ViewChild(CdkPortalOutlet, { static: true })
  private portalOutlet!: CdkPortalOutlet;
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly focusTrapFactory = inject(FocusTrapFactory);

  private focusTrap: FocusTrap | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;
  private autoFocus = true;
  private roleValue: OverlayDialogRole = 'dialog';

  @HostBinding('attr.role')
  protected get role(): OverlayDialogRole {
    return this.roleValue;
  }

  @HostBinding('attr.tabindex')
  protected readonly tabIndex = -1;

  @HostBinding('attr.aria-modal')
  protected readonly ariaModal = 'true';

  initialize(role: OverlayDialogRole, autoFocus: boolean): void {
    this.roleValue = role;
    this.autoFocus = autoFocus;
  }

  attachComponent<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    return this.portalOutlet.attachComponentPortal(portal);
  }

  focusInitial(): void {
    this.focusTrap?.focusInitialElementWhenReady();
  }

  restoreFocus(): void {
    this.previouslyFocusedElement?.focus();
  }

  ngAfterViewInit(): void {
    this.previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.focusTrap = this.focusTrapFactory.create(this.elementRef.nativeElement);

    if (this.autoFocus) {
      queueMicrotask(() => this.focusInitial());
    }
  }

  ngOnDestroy(): void {
    this.focusTrap?.destroy();
  }
}

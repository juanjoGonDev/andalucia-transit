import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { CdkPortalOutlet, ComponentPortal, PortalModule } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ElementRef,
  HostBinding,
  InjectionToken,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { OverlayDialogRole } from '@shared/ui/dialog/overlay-dialog.service';

export const OVERLAY_DIALOG_CONTAINER_CLASS = 'app-overlay-dialog__container';
export const OVERLAY_DIALOG_SURFACE_CLASS = 'app-overlay-dialog__surface';

type ActiveElementContainer = Document | ShadowRoot;

export interface OverlayDialogAriaAdapter {
  setLabelledBy(value: string): void;
  setDescribedBy(value: string | null): void;
}

export const OVERLAY_DIALOG_ARIA_ADAPTER = new InjectionToken<OverlayDialogAriaAdapter>(
  'OVERLAY_DIALOG_ARIA_ADAPTER'
);

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
  },
  providers: [
    {
      provide: OVERLAY_DIALOG_ARIA_ADAPTER,
      useExisting: OverlayDialogContainerComponent
    }
  ]
})
export class OverlayDialogContainerComponent
  implements AfterViewInit, OnDestroy, OverlayDialogAriaAdapter
{
  @ViewChild(CdkPortalOutlet, { static: true })
  private portalOutlet!: CdkPortalOutlet;
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly documentRef = inject(DOCUMENT, { optional: true }) as Document | null;
  private readonly focusTrapFactory = inject(FocusTrapFactory);

  private focusTrap: FocusTrap | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;
  private autoFocus = true;
  private roleValue: OverlayDialogRole = 'dialog';
  private labelledBy: string | null = null;
  private describedBy: string | null = null;

  @HostBinding('attr.role')
  protected get role(): OverlayDialogRole {
    return this.roleValue;
  }

  @HostBinding('attr.tabindex')
  protected readonly tabIndex = -1;

  @HostBinding('attr.aria-modal')
  protected readonly ariaModal = 'true';

  @HostBinding('attr.aria-labelledby')
  protected get ariaLabelledBy(): string | null {
    return this.labelledBy;
  }

  @HostBinding('attr.aria-describedby')
  protected get ariaDescribedBy(): string | null {
    return this.describedBy;
  }

  initialize(role: OverlayDialogRole, autoFocus: boolean): void {
    this.roleValue = role;
    this.autoFocus = autoFocus;
  }

  attachComponent<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    return this.portalOutlet.attachComponentPortal(portal);
  }

  setLabelledBy(value: string): void {
    this.labelledBy = value.trim().length > 0 ? value : null;
  }

  setDescribedBy(value: string | null): void {
    if (!value) {
      this.describedBy = null;
      return;
    }

    this.describedBy = value.trim().length > 0 ? value : null;
  }

  focusInitial(): void {
    this.focusTrap?.focusInitialElementWhenReady();
  }

  restoreFocus(): void {
    if (!this.previouslyFocusedElement || !this.previouslyFocusedElement.isConnected) {
      return;
    }

    this.previouslyFocusedElement.focus();
  }

  ngAfterViewInit(): void {
    const activeElement = this.resolveActiveElement();
    this.previouslyFocusedElement =
      activeElement instanceof HTMLElement ? activeElement : null;
    this.focusTrap = this.focusTrapFactory.create(this.elementRef.nativeElement);

    if (this.autoFocus) {
      queueMicrotask(() => this.focusInitial());
    }
  }

  ngOnDestroy(): void {
    this.focusTrap?.destroy();
  }

  private resolveActiveElement(): Element | null {
    const rootNode = this.elementRef.nativeElement.getRootNode();

    if (this.isActiveElementContainer(rootNode)) {
      return rootNode.activeElement;
    }

    const ownerDocument = this.elementRef.nativeElement.ownerDocument;

    if (ownerDocument?.activeElement) {
      return ownerDocument.activeElement;
    }

    return this.documentRef?.activeElement ?? null;
  }

  private isActiveElementContainer(
    candidate: Node | Document | ShadowRoot | null
  ): candidate is ActiveElementContainer {
    if (!candidate) {
      return false;
    }

    return typeof (candidate as ActiveElementContainer).activeElement !== 'undefined';
  }
}

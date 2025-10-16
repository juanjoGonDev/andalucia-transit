import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  DestroyRef,
  ElementRef,
  HostBinding,
  Renderer2,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { PortalModule, ComponentPortal, CdkPortalOutlet } from '@angular/cdk/portal';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DialogContext } from './dialog-context';
import { DIALOG_CONFIG, DialogResolvedConfig } from './dialog.config';

@Component({
  selector: 'app-dialog-container,ui-dialog-container',
  standalone: true,
  imports: [PortalModule],
  template: `
    <ng-template cdkPortalOutlet></ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dialog',
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1'
  }
})
export class DialogContainerComponent implements AfterViewInit, OnDestroy {
  @ViewChild(CdkPortalOutlet, { static: true })
  private readonly portalOutlet!: CdkPortalOutlet;

  @HostBinding('attr.aria-labelledby')
  protected labelledBy: string | null;

  @HostBinding('attr.aria-describedby')
  protected describedBy: string | null;

  private readonly context = inject(DialogContext);
  private readonly config = inject(DIALOG_CONFIG) as DialogResolvedConfig<unknown>;
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);
  private focusTrap: FocusTrap | null = null;

  constructor() {
    this.labelledBy = this.config.ariaLabelledBy;
    this.describedBy = this.config.ariaDescribedBy;

    this.context.titleId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.labelledBy = id ?? this.config.ariaLabelledBy;
        if (this.labelledBy === null) {
          this.renderer.removeAttribute(this.elementRef.nativeElement, 'aria-labelledby');
        } else {
          this.renderer.setAttribute(
            this.elementRef.nativeElement,
            'aria-labelledby',
            this.labelledBy
          );
        }
        this.changeDetector.markForCheck();
      });

    this.context.descriptionId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.describedBy = id ?? this.config.ariaDescribedBy;
        if (this.describedBy === null) {
          this.renderer.removeAttribute(this.elementRef.nativeElement, 'aria-describedby');
        } else {
          this.renderer.setAttribute(
            this.elementRef.nativeElement,
            'aria-describedby',
            this.describedBy
          );
        }
        this.changeDetector.markForCheck();
      });

  }

  @HostBinding('class.dialog--sm')
  protected get isSmall(): boolean {
    return this.config.size === 'sm';
  }

  @HostBinding('class.dialog--md')
  protected get isMedium(): boolean {
    return this.config.size === 'md';
  }

  @HostBinding('class.dialog--lg')
  protected get isLarge(): boolean {
    return this.config.size === 'lg';
  }

  @HostBinding('class.dialog--xl')
  protected get isExtraLarge(): boolean {
    return this.config.size === 'xl';
  }

  ngAfterViewInit(): void {
    this.focusTrap = this.focusTrapFactory.create(this.elementRef.nativeElement);
    this.focusTrap.focusInitialElementWhenReady();
  }

  attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    return this.portalOutlet.attachComponentPortal(portal);
  }

  ngOnDestroy(): void {
    this.focusTrap?.destroy();
  }
}

import { Injectable, Injector, StaticProvider, inject } from '@angular/core';
import { Overlay, OverlayConfig } from '@angular/cdk/overlay';
import { ComponentPortal, ComponentType } from '@angular/cdk/portal';
import { filter, takeUntil } from 'rxjs';

import { DialogContainerComponent } from './dialog-container.component';
import { DialogContext } from './dialog-context';
import { DialogRef } from './dialog-ref';
import { DIALOG_CONFIG, DIALOG_DATA, DialogConfig, DialogResolvedConfig } from './dialog.config';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  open<TComponent, TResult = unknown, TData = unknown>(
    component: ComponentType<TComponent>,
    config?: DialogConfig<TData>
  ): DialogRef<TResult> {
    const resolvedConfig = this.resolveConfig(config);
    const overlayRef = this.overlay.create(this.createOverlayConfig(resolvedConfig));
    const dialogRef = new DialogRef<TResult>(overlayRef);
    const context = new DialogContext();
    const providers: StaticProvider[] = [
      { provide: DialogRef, useValue: dialogRef },
      { provide: DialogContext, useValue: context },
      { provide: DIALOG_CONFIG, useValue: resolvedConfig },
      { provide: DIALOG_DATA, useValue: resolvedConfig.data }
    ];
    const injector = Injector.create({ parent: this.injector, providers });
    const containerPortal = new ComponentPortal(DialogContainerComponent, null, injector);
    const containerRef = overlayRef.attach(containerPortal);
    containerRef.instance.attachComponentPortal(new ComponentPortal(component, null, injector));
    this.setupDismissHandlers(dialogRef, resolvedConfig);
    return dialogRef;
  }

  private resolveConfig<TData>(config?: DialogConfig<TData>): DialogResolvedConfig<TData> {
    return {
      data: config?.data,
      size: config?.size ?? 'md',
      preventClose: config?.preventClose ?? false,
      ariaLabelledBy: config?.ariaLabelledBy ?? null,
      ariaDescribedBy: config?.ariaDescribedBy ?? null
    };
  }

  private createOverlayConfig<TData>(config: DialogResolvedConfig<TData>): OverlayConfig {
    return new OverlayConfig({
      hasBackdrop: true,
      disposeOnNavigation: true,
      backdropClass: 'dialog-backdrop',
      panelClass: ['dialog-panel', `dialog-panel--${config.size}`],
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically()
    });
  }

  private setupDismissHandlers<TData, TResult>(
    dialogRef: DialogRef<TResult>,
    config: DialogResolvedConfig<TData>
  ): void {
    if (config.preventClose) {
      return;
    }

    dialogRef
      .backdropClicks()
      .pipe(takeUntil(dialogRef.afterClosed()))
      .subscribe(() => {
        dialogRef.close();
      });

    dialogRef
      .keydownEvents()
      .pipe(
        filter((event) => event.key === 'Escape'),
        takeUntil(dialogRef.afterClosed())
      )
      .subscribe(() => {
        dialogRef.close();
      });
  }
}

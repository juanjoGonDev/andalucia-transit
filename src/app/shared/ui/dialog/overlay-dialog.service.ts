import { Injectable, inject } from '@angular/core';
import { ComponentType } from '@angular/cdk/overlay';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';

export type OverlayDialogRole = 'dialog' | 'alertdialog';

export interface OverlayDialogConfig<TData> {
  readonly data?: TData;
  readonly autoFocus?: boolean;
  readonly role?: OverlayDialogRole;
  readonly panelClass?: string | readonly string[];
  readonly backdropClass?: string | readonly string[];
  readonly disableClose?: boolean;
  readonly hasBackdrop?: boolean;
  readonly closeOnNavigation?: boolean;
  readonly width?: string;
  readonly maxWidth?: string;
}

const toClassList = (
  value: string | readonly string[] | undefined
): string | string[] | undefined => {
  if (typeof value === 'string' || value === undefined) {
    return value;
  }

  return Array.from(value);
};

export interface OverlayDialogRef<TResult> {
  afterClosed(): Observable<TResult | undefined>;
  close(value?: TResult): void;
}

class MatOverlayDialogRef<TResult> implements OverlayDialogRef<TResult> {
  constructor(private readonly ref: MatDialogRef<unknown, TResult>) {}

  afterClosed(): Observable<TResult | undefined> {
    return this.ref.afterClosed();
  }

  close(value?: TResult): void {
    this.ref.close(value);
  }
}

@Injectable({ providedIn: 'root' })
export class OverlayDialogService {
  private readonly dialog = inject(MatDialog);

  open<TComponent, TData, TResult>(
    component: ComponentType<TComponent>,
    config: OverlayDialogConfig<TData> = {}
  ): OverlayDialogRef<TResult> {
    const dialogConfig: MatDialogConfig<TData> = {
      autoFocus: config.autoFocus ?? true,
      role: config.role,
      panelClass: toClassList(config.panelClass),
      backdropClass: toClassList(config.backdropClass),
      disableClose: config.disableClose,
      hasBackdrop: config.hasBackdrop,
      closeOnNavigation: config.closeOnNavigation,
      width: config.width,
      maxWidth: config.maxWidth,
      data: config.data ?? null
    };

    const ref = this.dialog.open(component, dialogConfig);
    return new MatOverlayDialogRef<TResult>(ref as MatDialogRef<unknown, TResult>);
  }
}

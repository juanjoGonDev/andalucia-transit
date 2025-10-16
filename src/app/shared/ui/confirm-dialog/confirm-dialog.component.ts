import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DialogLayoutComponent } from '../dialog/dialog-layout.component';
import { AccessibleButtonDirective } from '../../a11y/accessible-button.directive';
import {
  injectOverlayDialogRef,
  provideOverlayDialogRef
} from '../dialog/overlay-dialog.service';

export interface ConfirmDialogData {
  readonly titleKey: string;
  readonly messageKey: string;
  readonly confirmKey: string;
  readonly cancelKey: string;
  readonly details?: readonly ConfirmDialogDetail[];
}

export interface ConfirmDialogDetail {
  readonly labelKey: string;
  readonly value: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, DialogLayoutComponent, AccessibleButtonDirective],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideOverlayDialogRef<ConfirmDialogComponent, boolean>()]
})
export class ConfirmDialogComponent {
  protected readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = injectOverlayDialogRef<boolean>();

  protected confirm(): void {
    this.dialogRef.close(true);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}

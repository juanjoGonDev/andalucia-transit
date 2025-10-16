import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { DialogRef } from '../dialog/dialog-ref';
import { DIALOG_DATA } from '../dialog/dialog.config';
import { DialogSurfaceComponent } from '../dialog/dialog-surface.component';
import { DialogTitleDirective } from '../dialog/dialog-title.directive';
import { DialogDescriptionDirective } from '../dialog/dialog-description.directive';
import { DialogFooterDirective } from '../dialog/dialog-footer.directive';

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
  imports: [
    CommonModule,
    TranslateModule,
    DialogSurfaceComponent,
    DialogTitleDirective,
    DialogDescriptionDirective,
    DialogFooterDirective
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  protected readonly data: ConfirmDialogData = inject(DIALOG_DATA) as ConfirmDialogData;
  private readonly dialogRef = inject(DialogRef<boolean>);

  protected confirm(): void {
    this.dialogRef.close(true);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}

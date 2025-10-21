import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AccessibleButtonDirective } from '@shared/a11y/accessible-button.directive';
import { DialogLayoutComponent } from '@shared/ui/dialog/dialog-layout.component';
import {
  injectOverlayDialogData,
  injectOverlayDialogRef,
} from '@shared/ui/dialog/overlay-dialog.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  protected readonly data: ConfirmDialogData = injectOverlayDialogData<ConfirmDialogData>();
  private readonly dialogRef = injectOverlayDialogRef<boolean>();

  protected confirm(): void {
    this.dialogRef.close(true);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}

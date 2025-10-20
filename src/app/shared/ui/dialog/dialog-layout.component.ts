import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  OVERLAY_DIALOG_ARIA_ADAPTER,
  OverlayDialogAriaAdapter
} from './overlay-dialog-container.component';

@Component({
  selector: 'app-dialog-layout',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dialog-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-dialog' }
})
export class DialogLayoutComponent {
  private static nextId = 0;

  private readonly ariaAdapter = inject(OVERLAY_DIALOG_ARIA_ADAPTER, {
    optional: true
  }) as OverlayDialogAriaAdapter | null;
  private readonly baseId = `app-dialog-${DialogLayoutComponent.nextId++}`;
  protected readonly titleId = `${this.baseId}-title`;
  protected descriptionId: string | null = null;
  private descriptionKeyValue: string | null = null;

  constructor() {
    this.ariaAdapter?.setLabelledBy(this.titleId);
  }

  @Input({ required: true })
  titleKey!: string;

  @Input()
  set descriptionKey(value: string | null) {
    if (this.descriptionKeyValue === value) {
      return;
    }

    this.descriptionKeyValue = value;
    this.updateDescription();
  }

  get descriptionKey(): string | null {
    return this.descriptionKeyValue;
  }

  private updateDescription(): void {
    if (!this.descriptionKeyValue) {
      this.descriptionId = null;
      this.ariaAdapter?.setDescribedBy(null);
      return;
    }

    this.descriptionId = `${this.baseId}-description`;
    this.ariaAdapter?.setDescribedBy(this.descriptionId);
  }
}

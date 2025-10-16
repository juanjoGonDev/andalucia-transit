import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

const LABEL_ID_SUFFIX = 'label';
const HINT_ID_SUFFIX = 'hint';
const ERROR_ID_SUFFIX = 'error';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './form-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'appFormField',
  host: {
    class: 'field'
  }
})
export class FormFieldComponent {
  @Input({ required: true }) controlId!: string;
  @Input() labelKey?: string;
  @Input() hintKey?: string;
  @Input() errorKey?: string;
  @Input() hintId?: string;
  @Input() errorId?: string;
  @Input() describedByIds: readonly string[] = [];

  get labelId(): string | null {
    return this.labelKey ? `${this.controlId}-${LABEL_ID_SUFFIX}` : null;
  }

  get resolvedHintId(): string | null {
    if (!this.hintKey) {
      return null;
    }
    return this.hintId ?? `${this.controlId}-${HINT_ID_SUFFIX}`;
  }

  get resolvedErrorId(): string | null {
    if (!this.errorKey) {
      return null;
    }
    return this.errorId ?? `${this.controlId}-${ERROR_ID_SUFFIX}`;
  }

  get describedBy(): string | null {
    const ids: string[] = [];
    if (this.describedByIds.length > 0) {
      ids.push(...this.describedByIds);
    }
    const hintId = this.resolvedHintId;
    if (hintId) {
      ids.push(hintId);
    }
    const errorId = this.resolvedErrorId;
    if (errorId) {
      ids.push(errorId);
    }
    return ids.length > 0 ? ids.join(' ') : null;
  }
}

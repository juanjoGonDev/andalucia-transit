import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
  CONTROL_BASE_CLASS,
  CONTROL_SIZE_CLASS_MAP,
  CONTROL_TONE_CLASS_MAP,
  CONTROL_VARIANT_CLASS_MAP,
  ControlSize,
  ControlTone,
  ControlVariant
} from '../control/control.options';

type TextareaValue = string | null;

const DEFAULT_ROWS = 4;
const MIN_ROWS = 2;

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './textarea.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: TextareaComponent
    }
  ]
})
export class TextareaComponent implements ControlValueAccessor {
  private readonly variantSignal = signal<ControlVariant>('outline');
  private readonly sizeSignal = signal<ControlSize>('md');
  private readonly toneSignal = signal<ControlTone>('neutral');
  private readonly rowCountSignal = signal<number>(DEFAULT_ROWS);

  readonly classList = computed(() => [
    CONTROL_BASE_CLASS,
    CONTROL_VARIANT_CLASS_MAP[this.variantSignal()],
    CONTROL_SIZE_CLASS_MAP[this.sizeSignal()],
    CONTROL_TONE_CLASS_MAP[this.toneSignal()]
  ]);

  private onChange: (value: TextareaValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private isDisabled = false;
  private viewValue = '';

  @Input() id?: string;
  @Input() name?: string;
  @Input() placeholderKey?: string;
  @Input() describedBy?: string;
  @Input() readonly = false;
  @Input() required = false;
  @Input() invalid = false;

  @Input()
  set variant(value: ControlVariant) {
    this.variantSignal.set(value);
  }

  @Input()
  set size(value: ControlSize) {
    this.sizeSignal.set(value);
  }

  @Input()
  set tone(value: ControlTone) {
    this.toneSignal.set(value);
  }

  get rows(): number {
    return this.rowCountSignal();
  }

  @Input()
  set rows(value: number | undefined) {
    const candidate = value ?? DEFAULT_ROWS;
    this.rowCountSignal.set(candidate < MIN_ROWS ? MIN_ROWS : candidate);
  }

  get value(): string {
    return this.viewValue;
  }

  writeValue(value: TextareaValue): void {
    this.viewValue = value ?? '';
  }

  registerOnChange(callback: (value: TextareaValue) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) {
      return;
    }
    this.viewValue = target.value;
    this.onChange(this.viewValue);
  }

  handleBlur(): void {
    this.onTouched();
  }

  get disabled(): boolean {
    return this.isDisabled;
  }
}

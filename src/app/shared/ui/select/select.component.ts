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

export type SelectValue = string | null;

type TranslationPrimitive = string | number | boolean;
export type SelectTranslationParams = Readonly<Record<string, TranslationPrimitive>>;

export interface SelectOption {
  readonly value: string;
  readonly labelKey: string;
  readonly labelParams?: SelectTranslationParams;
  readonly disabled?: boolean;
}

const EMPTY_VALUE = '';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: SelectComponent
    }
  ]
})
export class SelectComponent implements ControlValueAccessor {
  private readonly variantSignal = signal<ControlVariant>('outline');
  private readonly sizeSignal = signal<ControlSize>('md');
  private readonly toneSignal = signal<ControlTone>('neutral');
  private readonly optionsSignal = signal<readonly SelectOption[]>([]);

  readonly optionList = this.optionsSignal.asReadonly();
  readonly classList = computed(() => [
    CONTROL_BASE_CLASS,
    CONTROL_VARIANT_CLASS_MAP[this.variantSignal()],
    CONTROL_SIZE_CLASS_MAP[this.sizeSignal()],
    CONTROL_TONE_CLASS_MAP[this.toneSignal()]
  ]);
  readonly emptyValue = EMPTY_VALUE;

  private onChange: (value: SelectValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private isDisabled = false;
  private viewValue = EMPTY_VALUE;

  @Input() id?: string;
  @Input() name?: string;
  @Input() placeholderKey?: string;
  @Input() describedBy?: string;
  @Input() required = false;
  @Input() invalid = false;

  @Input()
  set options(value: readonly SelectOption[] | undefined) {
    this.optionsSignal.set(value ?? []);
  }

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

  get value(): SelectValue {
    return this.viewValue === EMPTY_VALUE ? null : this.viewValue;
  }

  writeValue(value: SelectValue): void {
    this.viewValue = value ?? EMPTY_VALUE;
  }

  registerOnChange(callback: (value: SelectValue) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    this.viewValue = target.value;
    this.onChange(this.value);
  }

  handleBlur(): void {
    this.onTouched();
  }

  get disabled(): boolean {
    return this.isDisabled;
  }
}

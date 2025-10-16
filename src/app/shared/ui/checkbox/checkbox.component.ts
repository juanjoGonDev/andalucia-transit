import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
  CONTROL_CHOICE_CLASS,
  CONTROL_CHOICE_DISABLED_CLASS,
  CONTROL_CHOICE_INPUT_CLASS,
  CONTROL_CHOICE_LABEL_CLASS,
  CONTROL_INDICATOR_CHECKBOX_CLASS,
  CONTROL_INDICATOR_CLASS,
  CONTROL_INDICATOR_MARK_CLASS,
  CONTROL_SIZE_CLASS_MAP,
  CONTROL_TONE_CLASS_MAP,
  CONTROL_VARIANT_CLASS_MAP,
  ControlSize,
  ControlTone,
  ControlVariant
} from '../control/control.options';
import { TranslationParams } from '../types/translation-params';

const ARIA_CHECKED_TRUE = 'true';
const ARIA_CHECKED_FALSE = 'false';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: CheckboxComponent
    }
  ]
})
export class CheckboxComponent implements ControlValueAccessor {
  private readonly variantSignal = signal<ControlVariant>('outline');
  private readonly sizeSignal = signal<ControlSize>('md');
  private readonly toneSignal = signal<ControlTone>('neutral');
  private readonly disabledSignal = signal(false);

  readonly indicatorClasses = computed(() => [
    CONTROL_INDICATOR_CLASS,
    CONTROL_INDICATOR_CHECKBOX_CLASS,
    CONTROL_VARIANT_CLASS_MAP[this.variantSignal()],
    CONTROL_SIZE_CLASS_MAP[this.sizeSignal()],
    CONTROL_TONE_CLASS_MAP[this.toneSignal()]
  ]);

  readonly hostClasses = computed(() => {
    const classes: string[] = [CONTROL_CHOICE_CLASS];
    if (this.disabledSignal()) {
      classes.push(CONTROL_CHOICE_DISABLED_CLASS);
    }
    return classes;
  });

  readonly inputClass = CONTROL_CHOICE_INPUT_CLASS;
  readonly labelClass = CONTROL_CHOICE_LABEL_CLASS;
  readonly indicatorMarkClass = CONTROL_INDICATOR_MARK_CLASS;

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private viewValue = false;

  @Input() id?: string;
  @Input() name?: string;
  @Input() labelKey?: string;
  @Input() labelParams?: TranslationParams;
  @Input() describedBy?: string;
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

  get value(): boolean {
    return this.viewValue;
  }

  get disabled(): boolean {
    return this.disabledSignal();
  }

  writeValue(value: boolean | null): void {
    this.viewValue = Boolean(value);
  }

  registerOnChange(callback: (value: boolean) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledSignal.set(isDisabled);
  }

  handleChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }
    this.viewValue = target.checked;
    this.onChange(this.viewValue);
  }

  handleBlur(): void {
    this.onTouched();
  }

  get ariaChecked(): string {
    return this.viewValue ? ARIA_CHECKED_TRUE : ARIA_CHECKED_FALSE;
  }
}

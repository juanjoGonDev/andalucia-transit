import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
  CONTROL_CHOICE_CLASS,
  CONTROL_CHOICE_DISABLED_CLASS,
  CONTROL_CHOICE_GROUP_CLASS,
  CONTROL_CHOICE_GROUP_HORIZONTAL_CLASS,
  CONTROL_CHOICE_INPUT_CLASS,
  CONTROL_CHOICE_LABEL_CLASS,
  CONTROL_INDICATOR_CLASS,
  CONTROL_INDICATOR_DOT_CLASS,
  CONTROL_INDICATOR_RADIO_CLASS,
  CONTROL_SIZE_CLASS_MAP,
  CONTROL_TONE_CLASS_MAP,
  CONTROL_VARIANT_CLASS_MAP,
  ControlSize,
  ControlTone,
  ControlVariant
} from '../control/control.options';
import { TranslationParams } from '../types/translation-params';

export type RadioValue = string | null;
export type RadioOrientation = 'vertical' | 'horizontal';

export interface RadioOption {
  readonly value: string;
  readonly labelKey: string;
  readonly labelParams?: TranslationParams;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-radio',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './radio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: RadioComponent
    }
  ]
})
export class RadioComponent implements ControlValueAccessor {
  private readonly variantSignal = signal<ControlVariant>('outline');
  private readonly sizeSignal = signal<ControlSize>('md');
  private readonly toneSignal = signal<ControlTone>('neutral');
  private readonly disabledSignal = signal(false);
  private readonly optionsSignal = signal<readonly RadioOption[]>([]);
  private readonly orientationSignal = signal<RadioOrientation>('vertical');

  readonly optionList = this.optionsSignal.asReadonly();
  readonly indicatorClasses = computed(() => [
    CONTROL_INDICATOR_CLASS,
    CONTROL_INDICATOR_RADIO_CLASS,
    CONTROL_VARIANT_CLASS_MAP[this.variantSignal()],
    CONTROL_SIZE_CLASS_MAP[this.sizeSignal()],
    CONTROL_TONE_CLASS_MAP[this.toneSignal()]
  ]);
  readonly groupClasses = computed(() => {
    const classes: string[] = [CONTROL_CHOICE_GROUP_CLASS];
    if (this.orientationSignal() === 'horizontal') {
      classes.push(CONTROL_CHOICE_GROUP_HORIZONTAL_CLASS);
    }
    return classes;
  });

  readonly inputClass = CONTROL_CHOICE_INPUT_CLASS;
  readonly labelClass = CONTROL_CHOICE_LABEL_CLASS;
  readonly indicatorDotClass = CONTROL_INDICATOR_DOT_CLASS;
  readonly groupRole = 'radiogroup' as const;

  private onChange: (value: RadioValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private viewValue: RadioValue = null;

  @Input() name?: string;
  @Input() describedBy?: string;
  @Input() required = false;
  @Input() invalid = false;

  @Input()
  set options(value: readonly RadioOption[] | undefined) {
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

  @Input()
  set orientation(value: RadioOrientation) {
    this.orientationSignal.set(value);
  }

  get value(): RadioValue {
    return this.viewValue;
  }

  get disabled(): boolean {
    return this.disabledSignal();
  }

  writeValue(value: RadioValue): void {
    this.viewValue = value ?? null;
  }

  registerOnChange(callback: (value: RadioValue) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledSignal.set(isDisabled);
  }

  selectOption(value: string): void {
    this.viewValue = value;
    this.onChange(this.viewValue);
  }

  handleBlur(): void {
    this.onTouched();
  }

  optionLabelClasses(optionDisabled: boolean | undefined): readonly string[] {
    const classes: string[] = [CONTROL_CHOICE_CLASS];
    if (this.disabledSignal() || optionDisabled) {
      classes.push(CONTROL_CHOICE_DISABLED_CLASS);
    }
    return classes;
  }

  trackByOption(_: number, option: RadioOption): string {
    return option.value;
  }
}

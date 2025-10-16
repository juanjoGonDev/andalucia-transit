import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

type ControlVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'subtle';
type ControlSize = 'sm' | 'md' | 'lg';
type ControlTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';
type InputType = 'text' | 'email' | 'number' | 'password' | 'search' | 'tel' | 'url';
type InputValue = string | null;

type AutoCompleteAttribute =
  | 'additional-name'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'bday'
  | 'bday-year'
  | 'country'
  | 'current-password'
  | 'email'
  | 'family-name'
  | 'given-name'
  | 'honorific-prefix'
  | 'honorific-suffix'
  | 'name'
  | 'new-password'
  | 'off'
  | 'one-time-code'
  | 'organization'
  | 'postal-code'
  | 'street-address'
  | 'tel'
  | 'username';

type InputMode = 'decimal' | 'email' | 'none' | 'numeric' | 'search' | 'tel' | 'text' | 'url';

const CONTROL_BASE_CLASS = 'control';
const VARIANT_CLASS_MAP: Record<ControlVariant, string> = {
  primary: 'control--primary',
  secondary: 'control--secondary',
  ghost: 'control--ghost',
  outline: 'control--outline',
  destructive: 'control--destructive',
  subtle: 'control--subtle'
};
const SIZE_CLASS_MAP: Record<ControlSize, string> = {
  sm: 'control--sm',
  md: 'control--md',
  lg: 'control--lg'
};
const TONE_CLASS_MAP: Record<ControlTone, string> = {
  neutral: 'control--tone-neutral',
  info: 'control--tone-info',
  success: 'control--tone-success',
  warning: 'control--tone-warning',
  error: 'control--tone-error'
};

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: InputComponent
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
  private readonly variantSignal = signal<ControlVariant>('outline');
  private readonly sizeSignal = signal<ControlSize>('md');
  private readonly toneSignal = signal<ControlTone>('neutral');

  readonly classList = computed(() => [
    CONTROL_BASE_CLASS,
    VARIANT_CLASS_MAP[this.variantSignal()],
    SIZE_CLASS_MAP[this.sizeSignal()],
    TONE_CLASS_MAP[this.toneSignal()]
  ]);

  private onChange: (value: InputValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private isDisabled = false;
  private viewValue = '';

  @Input() id?: string;
  @Input() name?: string;
  @Input() placeholderKey?: string;
  @Input() autocomplete?: AutoCompleteAttribute;
  @Input() inputMode?: InputMode;
  @Input() type: InputType = 'text';
  @Input() readonly = false;
  @Input() required = false;
  @Input() describedBy?: string;
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

  get value(): string {
    return this.viewValue;
  }

  writeValue(value: InputValue): void {
    this.viewValue = value ?? '';
  }

  registerOnChange(callback: (value: InputValue) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
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

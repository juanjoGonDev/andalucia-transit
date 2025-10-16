import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  HostBinding,
  Input,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  AppTextFieldHintDirective,
  AppTextFieldPrefixDirective,
  AppTextFieldSuffixDirective,
} from './app-text-field-slots.directive';

const TEXT_FIELD_ID_PREFIX = 'app-text-field';
const TEXT_FIELD_ID_SEPARATOR = '-';
const TEXT_FIELD_HINT_SEGMENT = 'hint';
const DEFAULT_TEXT_FIELD_TYPE: TextFieldType = 'text';
const DEFAULT_AUTOCOMPLETE_ATTRIBUTE = 'off';
const NOOP_VALUE_CALLBACK = (_value: string): void => undefined;
const NOOP_VOID_CALLBACK = (): void => undefined;

export type TextFieldType = 'text' | 'search' | 'email' | 'tel' | 'url' | 'password';

@Component({
  selector: 'app-text-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-text-field.component.html',
  styleUrls: ['./app-text-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppTextFieldComponent),
      multi: true,
    },
  ],
})
export class AppTextFieldComponent implements ControlValueAccessor {
  private static idCounter = 0;

  @Input({ required: true }) label = '';
  @Input() placeholder = '';
  @Input() autocomplete: string = DEFAULT_AUTOCOMPLETE_ATTRIBUTE;
  @Input() type: TextFieldType = DEFAULT_TEXT_FIELD_TYPE;
  @Input() readonly = false;
  @Input() name?: string;

  @ContentChild(AppTextFieldPrefixDirective) prefix?: AppTextFieldPrefixDirective;
  @ContentChild(AppTextFieldSuffixDirective) suffix?: AppTextFieldSuffixDirective;
  @ContentChild(AppTextFieldHintDirective) hint?: AppTextFieldHintDirective;

  @HostBinding('class.app-text-field-host')
  readonly hostClass = true;

  private providedFieldId?: string;
  private readonly generatedFieldId = this.buildFieldId();

  value = '';
  isDisabled = false;
  isFocused = false;

  private onChange: (value: string) => void = NOOP_VALUE_CALLBACK;
  private onTouched: () => void = NOOP_VOID_CALLBACK;

  @Input()
  set fieldId(value: string | undefined) {
    this.providedFieldId = value;
  }

  get inputId(): string {
    return this.providedFieldId ?? this.generatedFieldId;
  }

  get hintId(): string | null {
    if (!this.hasHint) {
      return null;
    }

    return `${this.inputId}${TEXT_FIELD_ID_SEPARATOR}${TEXT_FIELD_HINT_SEGMENT}`;
  }

  get hasPrefix(): boolean {
    return Boolean(this.prefix);
  }

  get hasSuffix(): boolean {
    return Boolean(this.suffix);
  }

  get hasHint(): boolean {
    return Boolean(this.hint);
  }

  writeValue(value: string | null | undefined): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  handleFocus(): void {
    this.isFocused = true;
  }

  handleBlur(): void {
    this.isFocused = false;
    this.onTouched();
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    if (!target) {
      return;
    }

    this.value = target.value;
    this.onChange(this.value);
  }

  private buildFieldId(): string {
    const currentId = AppTextFieldComponent.idCounter;
    AppTextFieldComponent.idCounter += 1;

    return `${TEXT_FIELD_ID_PREFIX}${TEXT_FIELD_ID_SEPARATOR}${currentId}`;
  }
}

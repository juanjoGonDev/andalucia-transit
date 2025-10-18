import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild,
  inject,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AppTextFieldComponent, TextFieldType } from './app-text-field.component';

const EMPTY_STRING = '';
const DEFAULT_AUTOCOMPLETE_ATTRIBUTE = 'off';
const TEXT_FIELD_INPUT_TYPE: TextFieldType = 'text';
const ISO_DATE_SEPARATOR = '-';
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const PATTERN_YEAR_INDEX = 1;
const PATTERN_MONTH_INDEX = 2;
const PATTERN_DAY_INDEX = 3;
const DECIMAL_RADIX = 10;
const MONTH_OFFSET = 1;
const MIN_MONTH = 1;
const MAX_MONTH = 12;
const MIN_DAY = 1;
const MAX_DAY = 31;
const PAD_LENGTH_TWO = 2;
const PAD_LENGTH_FOUR = 4;
const ZERO_STRING = '0';
const NOOP_DATE_CALLBACK = (_value: Date | null): void => undefined;
const NOOP_VOID_CALLBACK = (): void => undefined;

export type AppDateFormatter = (value: Date) => string;
export type AppDateParser = (value: string) => Date | null;

const defaultDateFormatter: AppDateFormatter = (value) => {
  const year = value.getUTCFullYear().toString().padStart(PAD_LENGTH_FOUR, ZERO_STRING);
  const month = (value.getUTCMonth() + MONTH_OFFSET)
    .toString()
    .padStart(PAD_LENGTH_TWO, ZERO_STRING);
  const day = value.getUTCDate().toString().padStart(PAD_LENGTH_TWO, ZERO_STRING);

  return `${year}${ISO_DATE_SEPARATOR}${month}${ISO_DATE_SEPARATOR}${day}`;
};

const defaultDateParser: AppDateParser = (rawValue) => {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === EMPTY_STRING) {
    return null;
  }

  const match = trimmedValue.match(ISO_DATE_PATTERN);

  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[PATTERN_YEAR_INDEX], DECIMAL_RADIX);
  const month = Number.parseInt(match[PATTERN_MONTH_INDEX], DECIMAL_RADIX);
  const day = Number.parseInt(match[PATTERN_DAY_INDEX], DECIMAL_RADIX);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  if (month < MIN_MONTH || month > MAX_MONTH) {
    return null;
  }

  if (day < MIN_DAY || day > MAX_DAY) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - MONTH_OFFSET, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + MONTH_OFFSET !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate;
};

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [
    CommonModule,
    AppTextFieldComponent,
  ],
  templateUrl: './app-date-picker.component.html',
  styleUrls: ['./app-date-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppDatePickerComponent),
      multi: true,
    },
  ],
})
export class AppDatePickerComponent implements ControlValueAccessor, AfterViewInit {
  @Input({ required: true }) label = EMPTY_STRING;
  @Input() placeholder = EMPTY_STRING;
  @Input() autocomplete: string = DEFAULT_AUTOCOMPLETE_ATTRIBUTE;
  @Input() readonly = false;
  @Input() describedBy: readonly string[] | string | undefined;
  @Input() name?: string;
  @Input() fieldId?: string;
  @Input() formatter: AppDateFormatter = defaultDateFormatter;
  @Input() parser: AppDateParser = defaultDateParser;

  @Output() readonly valueChange = new EventEmitter<Date | null>();
  @Output() readonly focusChange = new EventEmitter<boolean>();
  @Output() readonly keydownEvent = new EventEmitter<KeyboardEvent>();
  @Output() readonly inputValueChange = new EventEmitter<string>();

  @HostBinding('class.app-date-picker-host')
  readonly hostClass = true;

  @ViewChild(AppTextFieldComponent)
  private textField?: AppTextFieldComponent;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private onChange: (value: Date | null) => void = NOOP_DATE_CALLBACK;
  private onTouched: () => void = NOOP_VOID_CALLBACK;

  protected displayValue = EMPTY_STRING;
  protected selectedDate: Date | null = null;
  protected isDisabled = false;
  protected readonly inputType: TextFieldType = TEXT_FIELD_INPUT_TYPE;

  ngAfterViewInit(): void {
    this.applyTextFieldState();
  }

  writeValue(value: Date | string | null | undefined): void {
    if (value instanceof Date) {
      this.selectedDate = value;
      this.displayValue = this.formatter(value);
      this.applyTextFieldState();
      return;
    }

    if (typeof value === 'string') {
      const parsedDate = this.parser(value);

      this.selectedDate = parsedDate;
      this.displayValue = parsedDate ? this.formatter(parsedDate) : value.trim();
      this.applyTextFieldState();
      return;
    }

    this.selectedDate = null;
    this.displayValue = EMPTY_STRING;
    this.applyTextFieldState();
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.applyTextFieldState();
  }

  handleTextFieldValueChange(value: string): void {
    const parsedDate = this.parser(value);

    this.selectedDate = parsedDate;
    this.displayValue = parsedDate ? this.formatter(parsedDate) : EMPTY_STRING;
    this.onChange(parsedDate);
    this.valueChange.emit(parsedDate);
    this.inputValueChange.emit(value);
    this.applyTextFieldState();
  }

  handleFocusChange(isFocused: boolean): void {
    if (!isFocused) {
      this.onTouched();
    }

    this.focusChange.emit(isFocused);
  }

  handleKeydown(event: KeyboardEvent): void {
    this.keydownEvent.emit(event);
  }

  get hasValue(): boolean {
    return this.selectedDate !== null;
  }

  private applyTextFieldState(): void {
    if (!this.textField) {
      return;
    }

    this.textField.writeValue(this.displayValue);
    this.textField.setDisabledState(this.isDisabled);
    this.changeDetectorRef.markForCheck();
  }
}

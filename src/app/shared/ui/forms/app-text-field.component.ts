import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Optional,
  Output,
  Self,
  ViewChild,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
const ARIA_ATTRIBUTE_SEPARATOR = ' ';
const ARIA_TRUE = 'true';
const EMPTY_STRING = '';
const DESCRIBED_BY_SEPARATOR_PATTERN = /\s+/u;
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
})
export class AppTextFieldComponent implements ControlValueAccessor {
  private static idCounter = 0;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Input({ required: true }) label = '';
  @Input() placeholder = '';
  @Input() autocomplete: string = DEFAULT_AUTOCOMPLETE_ATTRIBUTE;
  @Input() type: TextFieldType = DEFAULT_TEXT_FIELD_TYPE;
  @Input() readonly = false;
  @Input() required = false;
  @Input() name?: string;
  @Input()
  set describedBy(value: string | readonly string[] | undefined) {
    this.additionalDescribedByIds = AppTextFieldComponent.normalizeDescribedByInput(value);
  }

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly focusChange = new EventEmitter<boolean>();
  @Output() readonly keydownEvent = new EventEmitter<KeyboardEvent>();

  @ContentChild(AppTextFieldPrefixDirective) prefix?: AppTextFieldPrefixDirective;
  @ContentChild(AppTextFieldSuffixDirective) suffix?: AppTextFieldSuffixDirective;
  @ContentChild(AppTextFieldHintDirective) hint?: AppTextFieldHintDirective;
  @ViewChild('nativeInput') nativeInput?: ElementRef<HTMLInputElement>;

  @HostBinding('class.app-text-field-host')
  readonly hostClass = true;

  private providedFieldId?: string;
  private readonly generatedFieldId = this.buildFieldId();
  private additionalDescribedByIds: readonly string[] = [];

  value = '';
  isDisabled = false;
  isFocused = false;

  private readonly destroyRef = inject(DestroyRef);

  private onChange: (value: string) => void = NOOP_VALUE_CALLBACK;
  private onTouched: () => void = NOOP_VOID_CALLBACK;

  constructor(@Self() @Optional() private readonly ngControl: NgControl | null) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
      this.ngControl.statusChanges
        ?.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.changeDetectorRef.markForCheck());
      this.ngControl.valueChanges
        ?.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.changeDetectorRef.markForCheck());
    }
  }

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

  get ariaDescribedByAttribute(): string | null {
    const collectedIds: string[] = [];
    const hintIdentifier = this.hintId;

    if (hintIdentifier) {
      collectedIds.push(hintIdentifier);
    }

    collectedIds.push(...this.additionalDescribedByIds);

    if (collectedIds.length === 0) {
      return null;
    }

    return collectedIds.join(ARIA_ATTRIBUTE_SEPARATOR);
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

  get ariaInvalidAttribute(): 'true' | null {
    return this.shouldDisplayInvalidState() ? (ARIA_TRUE as 'true') : null;
  }

  get ariaRequiredAttribute(): 'true' | null {
    return this.required ? (ARIA_TRUE as 'true') : null;
  }

  get invalid(): boolean {
    return this.shouldDisplayInvalidState();
  }

  writeValue(value: string | null | undefined): void {
    this.value = value ?? '';
    this.changeDetectorRef.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;

    if (isDisabled && this.isFocused) {
      this.blurInputAfterDisable();
    }

    this.changeDetectorRef.markForCheck();
  }

  handleFocus(): void {
    if (this.isDisabled) {
      return;
    }

    this.isFocused = true;
    this.focusChange.emit(true);
    this.changeDetectorRef.markForCheck();
  }

  handleBlur(): void {
    this.applyBlurState();
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    if (!target) {
      return;
    }

    this.value = target.value;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.changeDetectorRef.markForCheck();
  }

  handleKeydown(event: KeyboardEvent): void {
    this.keydownEvent.emit(event);
  }

  private buildFieldId(): string {
    const currentId = AppTextFieldComponent.idCounter;
    AppTextFieldComponent.idCounter += 1;

    return `${TEXT_FIELD_ID_PREFIX}${TEXT_FIELD_ID_SEPARATOR}${currentId}`;
  }

  private blurInputAfterDisable(): void {
    const inputElement = this.nativeInput?.nativeElement ?? null;

    if (inputElement) {
      inputElement.blur();
      queueMicrotask(() => {
        this.applyBlurState();
      });
      return;
    }

    this.applyBlurState();
  }

  private applyBlurState(): void {
    if (!this.isFocused) {
      return;
    }

    this.isFocused = false;
    this.onTouched();
    this.focusChange.emit(false);
    this.changeDetectorRef.markForCheck();
  }

  private static normalizeDescribedByInput(
    value: string | readonly string[] | undefined,
  ): string[] {
    if (!value) {
      return [];
    }

    if (typeof value === 'string') {
      return AppTextFieldComponent.splitDescribedByString(value);
    }

    return value.map((identifier) => identifier.trim()).filter((identifier) => identifier !== EMPTY_STRING);
  }

  private static splitDescribedByString(value: string): string[] {
    const trimmedValue = value.trim();

    if (trimmedValue === EMPTY_STRING) {
      return [];
    }

    return trimmedValue
      .split(DESCRIBED_BY_SEPARATOR_PATTERN)
      .map((identifier) => identifier.trim())
      .filter((identifier) => identifier !== EMPTY_STRING);
  }

  private shouldDisplayInvalidState(): boolean {
    const control = this.ngControl?.control;

    if (!control) {
      return false;
    }

    if (!control.invalid) {
      return false;
    }

    return control.touched || control.dirty;
  }
}

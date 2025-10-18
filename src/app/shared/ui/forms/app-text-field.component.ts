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
  Output,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  FormControlStatus,
  NgControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  AppTextFieldErrorDirective,
  AppTextFieldHintDirective,
  AppTextFieldPrefixDirective,
  AppTextFieldSuffixDirective,
} from './app-text-field-slots.directive';

const TEXT_FIELD_ID_PREFIX = 'app-text-field';
const TEXT_FIELD_ID_SEPARATOR = '-';
const TEXT_FIELD_HINT_SEGMENT = 'hint';
const TEXT_FIELD_ERROR_SEGMENT = 'error';
const DEFAULT_TEXT_FIELD_TYPE: TextFieldType = 'text';
const DEFAULT_AUTOCOMPLETE_ATTRIBUTE = 'off';
const ARIA_ATTRIBUTE_SEPARATOR = ' ';
const ARIA_TRUE = 'true';
const REQUIRED_ERROR_KEY = 'required';
const EMPTY_STRING = '';
const DESCRIBED_BY_SEPARATOR_PATTERN = /\s+/u;
const NOOP_VALUE_CALLBACK = (_value: string): void => undefined;
const NOOP_VOID_CALLBACK = (): void => undefined;
const DEFAULT_CONTROL_STATUS: FormControlStatus = 'VALID';
const PENDING_CONTROL_STATUS: FormControlStatus = 'PENDING';

export type TextFieldType = 'text' | 'search' | 'email' | 'tel' | 'url' | 'password';

interface AppTextFieldErrorContext {
  readonly $implicit: ValidationErrors | null;
  readonly control: AbstractControl | null;
  readonly errors: ValidationErrors | null;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly status: FormControlStatus;
}

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
  private static readonly requiredValidatorProbe = new FormControl<string>(EMPTY_STRING, {
    nonNullable: true,
  });

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  private readonly destroyRef = inject(DestroyRef);

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

  @Input()
  set errorTemplate(value: TemplateRef<unknown> | null | undefined) {
    this.forwardedErrorTemplate = value ?? null;
    this.changeDetectorRef.markForCheck();
  }

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly focusChange = new EventEmitter<boolean>();
  @Output() readonly keydownEvent = new EventEmitter<KeyboardEvent>();

  @ContentChild(AppTextFieldPrefixDirective, { descendants: true })
  prefix?: AppTextFieldPrefixDirective;
  @ContentChild(AppTextFieldSuffixDirective, { descendants: true })
  suffix?: AppTextFieldSuffixDirective;
  @ContentChild(AppTextFieldHintDirective, { descendants: true })
  hint?: AppTextFieldHintDirective;
  @ContentChild(AppTextFieldErrorDirective, { descendants: true })
  error?: AppTextFieldErrorDirective;
  @ViewChild('nativeInput') nativeInput?: ElementRef<HTMLInputElement>;

  @HostBinding('class.app-text-field-host')
  readonly hostClass = true;

  private providedFieldId?: string;
  private readonly generatedFieldId = this.buildFieldId();
  private additionalDescribedByIds: readonly string[] = [];

  value = '';
  isDisabled = false;
  isFocused = false;
  private externalControl: AbstractControl | null = null;
  private externalControlSubscriptions: Subscription[] = [];
  private forwardedErrorTemplate: TemplateRef<unknown> | null = null;

  private onChange: (value: string) => void = NOOP_VALUE_CALLBACK;
  private onTouched: () => void = NOOP_VOID_CALLBACK;

  constructor() {
    this.initializeNgControl();
    this.destroyRef.onDestroy(() => this.teardownExternalControlSubscriptions());
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
    const errorIdentifier = this.errorId;

    if (this.shouldDisplayHint) {
      const hintIdentifier = this.hintId;

      if (hintIdentifier) {
        collectedIds.push(hintIdentifier);
      }
    }

    if (errorIdentifier) {
      collectedIds.push(errorIdentifier);
    }

    collectedIds.push(...this.additionalDescribedByIds);

    const uniqueIdentifiers = AppTextFieldComponent.createUniqueIdentifiers(collectedIds);

    if (uniqueIdentifiers.length === 0) {
      return null;
    }

    return uniqueIdentifiers.join(ARIA_ATTRIBUTE_SEPARATOR);
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
    return this.isRequired ? (ARIA_TRUE as 'true') : null;
  }

  get ariaBusyAttribute(): 'true' | null {
    return this.isControlPending(this.resolveControl()) ? (ARIA_TRUE as 'true') : null;
  }

  get ariaErrormessageAttribute(): string | null {
    return this.errorId;
  }

  get requiredAttribute(): '' | null {
    return this.isRequired ? EMPTY_STRING : null;
  }

  get invalid(): boolean {
    return this.shouldDisplayInvalidState();
  }

  get shouldDisplayHint(): boolean {
    return this.hasHint && !this.shouldDisplayError;
  }

  get shouldDisplayError(): boolean {
    return this.hasErrorContent && this.invalid;
  }

  get errorTemplateOutlet(): TemplateRef<unknown> | null {
    if (this.error) {
      return this.error.templateRef;
    }

    return this.forwardedErrorTemplate;
  }

  get errorTemplateContext(): AppTextFieldErrorContext {
    const control = this.resolveControl();
    const errors = control?.errors ?? null;
    const status = control?.status ?? DEFAULT_CONTROL_STATUS;

    return {
      $implicit: errors,
      control,
      errors,
      dirty: Boolean(control?.dirty),
      touched: Boolean(control?.touched),
      pending: this.isControlPending(control),
      status,
    };
  }

  get errorId(): string | null {
    if (!this.shouldDisplayError) {
      return null;
    }

    return `${this.inputId}${TEXT_FIELD_ID_SEPARATOR}${TEXT_FIELD_ERROR_SEGMENT}`;
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

  private get isRequired(): boolean {
    if (this.required) {
      return true;
    }

    return this.hasRequiredValidator();
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

  private static createUniqueIdentifiers(identifiers: readonly string[]): string[] {
    const seen = new Set<string>();
    const uniqueIdentifiers: string[] = [];

    identifiers.forEach((identifier) => {
      if (seen.has(identifier)) {
        return;
      }

      seen.add(identifier);
      uniqueIdentifiers.push(identifier);
    });

    return uniqueIdentifiers;
  }

  private get hasErrorContent(): boolean {
    return Boolean(this.errorTemplateOutlet);
  }

  private shouldDisplayInvalidState(): boolean {
    const control = this.resolveControl();

    if (!control) {
      return false;
    }

    if (!control.invalid) {
      return false;
    }

    return control.touched || control.dirty;
  }

  private hasRequiredValidator(): boolean {
    const control = this.resolveControl();

    if (!control) {
      return false;
    }

    if (typeof control.hasValidator === 'function') {
      if (control.hasValidator(Validators.required) || control.hasValidator(Validators.requiredTrue)) {
        return true;
      }
    }

    return AppTextFieldComponent.validatorIncludesRequired(control.validator);
  }

  private initializeNgControl(): void {
    if (!this.ngControl) {
      return;
    }

    this.ngControl.valueAccessor = this;
    this.registerExternalControl(this.ngControl.control);
  }

  private static validatorIncludesRequired(validator: ValidatorFn | null): boolean {
    if (!validator) {
      return false;
    }

    try {
      AppTextFieldComponent.requiredValidatorProbe.setValue(EMPTY_STRING, {
        emitEvent: false,
        onlySelf: true,
      });
      const validationResult = validator(AppTextFieldComponent.requiredValidatorProbe);

      return Boolean(validationResult && REQUIRED_ERROR_KEY in validationResult);
    } catch {
      return false;
    }
  }

  registerExternalControl(control: AbstractControl | null): void {
    if (this.externalControl === control) {
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.teardownExternalControlSubscriptions();
    this.externalControl = control;

    if (!control) {
      this.changeDetectorRef.markForCheck();
      return;
    }

    const statusSubscription = control.statusChanges?.subscribe(() => this.changeDetectorRef.markForCheck());
    if (statusSubscription) {
      this.externalControlSubscriptions.push(statusSubscription);
    }

    const valueSubscription = control.valueChanges?.subscribe(() => this.changeDetectorRef.markForCheck());
    if (valueSubscription) {
      this.externalControlSubscriptions.push(valueSubscription);
    }

    this.changeDetectorRef.markForCheck();
  }

  private resolveControl(): AbstractControl | null {
    if (this.externalControl) {
      return this.externalControl;
    }

    return this.ngControl?.control ?? null;
  }

  private isControlPending(control: AbstractControl | null): boolean {
    if (!control) {
      return false;
    }

    return control.pending || control.status === PENDING_CONTROL_STATUS;
  }

  private teardownExternalControlSubscriptions(): void {
    this.externalControlSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.externalControlSubscriptions = [];
  }
}

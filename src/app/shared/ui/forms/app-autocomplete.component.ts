import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AppTextFieldComponent } from './app-text-field.component';

const DEFAULT_AUTOCOMPLETE_ATTRIBUTE = 'off';
const EMPTY_STRING = '';
const AUTOCOMPLETE_PANEL_ROLE = 'listbox';
const AUTOCOMPLETE_OPTION_ROLE = 'option';
const COMBOBOX_ROLE = 'combobox';
const ARIA_AUTOCOMPLETE_LIST = 'list';
const KEY_ARROW_DOWN = 'ArrowDown';
const KEY_ARROW_UP = 'ArrowUp';
const KEY_ENTER = 'Enter';
const KEY_ESCAPE = 'Escape';
const PANEL_ID_PREFIX = 'app-autocomplete-panel';
const OPTION_ID_PREFIX = 'app-autocomplete-option';
const OPTION_ID_SEPARATOR = '-';
const ARIA_ATTRIBUTE_SEPARATOR = ' ';

export interface AppAutocompleteOption<T> {
  readonly value: T;
  readonly label: string;
  readonly describedByIds?: readonly string[];
}

export type AppAutocompleteDisplayFn<T> = (option: AppAutocompleteOption<T>) => string;

export interface AppAutocompleteSelection<T> {
  readonly option: AppAutocompleteOption<T>;
  readonly index: number;
}

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [
    CommonModule,
    AppTextFieldComponent,
  ],
  templateUrl: './app-autocomplete.component.html',
  styleUrls: ['./app-autocomplete.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppAutocompleteComponent),
      multi: true,
    },
  ],
})
export class AppAutocompleteComponent<T> implements ControlValueAccessor {
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private static instanceCounter = 0;
  private readonly generatedPanelId = this.createPanelId();

  @Input({ required: true }) label = EMPTY_STRING;
  @Input() placeholder = EMPTY_STRING;
  @Input() autocomplete: string = DEFAULT_AUTOCOMPLETE_ATTRIBUTE;
  @Input() readonly = false;
  @Input() describedBy: readonly string[] | string | undefined;
  @Input() name?: string;
  @Input() fieldId?: string;
  @Input() displayWith?: AppAutocompleteDisplayFn<T>;
  @Input() options: readonly AppAutocompleteOption<T>[] = [];

  @Output() readonly selectionChange = new EventEmitter<AppAutocompleteSelection<T>>();
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly panelVisibilityChange = new EventEmitter<boolean>();

  @HostBinding('class.app-autocomplete-host')
  readonly hostClass = true;

  value = EMPTY_STRING;
  isDisabled = false;
  isPanelOpen = false;
  activeOptionIndex = -1;

  readonly comboboxRole = COMBOBOX_ROLE;
  readonly panelRole = AUTOCOMPLETE_PANEL_ROLE;
  readonly optionRole = AUTOCOMPLETE_OPTION_ROLE;
  readonly ariaAutocomplete = ARIA_AUTOCOMPLETE_LIST;

  writeValue(value: string | null | undefined): void {
    this.value = value ?? EMPTY_STRING;
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

  handleValueChange(nextValue: string): void {
    this.value = nextValue;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  handleFocusChange(isFocused: boolean): void {
    if (this.isDisabled || this.readonly) {
      if (!isFocused) {
        this.closePanel();
      }

      return;
    }

    if (isFocused) {
      this.openPanel();
      return;
    }

    this.closePanel();
    this.onTouched();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (this.isDisabled) {
      return;
    }

    if (!this.isPanelOpen && (event.key === KEY_ARROW_DOWN || event.key === KEY_ENTER)) {
      this.openPanel();
    }

    if (!this.isPanelOpen) {
      return;
    }

    switch (event.key) {
      case KEY_ARROW_DOWN:
        this.moveActiveOption(1);
        event.preventDefault();
        break;
      case KEY_ARROW_UP:
        this.moveActiveOption(-1);
        event.preventDefault();
        break;
      case KEY_ENTER:
        this.commitActiveOption();
        event.preventDefault();
        break;
      case KEY_ESCAPE:
        this.closePanel();
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  handleOptionClick(option: AppAutocompleteOption<T>, index: number): void {
    this.selectOption(option, index);
  }

  get activeOptionId(): string | null {
    if (this.activeOptionIndex < 0) {
      return null;
    }

    return this.getOptionId(this.activeOptionIndex);
  }

  get panelId(): string {
    return this.fieldId ? `${this.fieldId}${OPTION_ID_SEPARATOR}panel` : this.generatedPanelId;
  }

  get hasOptions(): boolean {
    return this.options.length > 0;
  }

  get ariaExpanded(): boolean {
    return this.isPanelOpen;
  }

  private openPanel(): void {
    if (!this.hasOptions) {
      return;
    }

    this.isPanelOpen = true;
    this.activeOptionIndex = -1;
    this.panelVisibilityChange.emit(true);
  }

  private closePanel(): void {
    if (!this.isPanelOpen) {
      return;
    }

    this.isPanelOpen = false;
    this.activeOptionIndex = -1;
    this.panelVisibilityChange.emit(false);
  }

  private moveActiveOption(delta: number): void {
    if (!this.hasOptions) {
      return;
    }

    const nextIndex = this.resolveActiveIndex(delta);
    this.activeOptionIndex = nextIndex;
  }

  private resolveActiveIndex(delta: number): number {
    const optionsLength = this.options.length;

    if (optionsLength === 0) {
      return -1;
    }

    const normalizedDelta = delta % optionsLength;
    const tentativeIndex = this.activeOptionIndex + normalizedDelta;

    if (tentativeIndex < 0) {
      return optionsLength - 1;
    }

    if (tentativeIndex >= optionsLength) {
      return 0;
    }

    return tentativeIndex;
  }

  private commitActiveOption(): void {
    if (this.activeOptionIndex < 0) {
      return;
    }

    const option = this.options[this.activeOptionIndex];
    this.selectOption(option, this.activeOptionIndex);
  }

  private selectOption(option: AppAutocompleteOption<T>, index: number): void {
    const displayLabel = this.resolveOptionLabel(option);
    this.value = displayLabel;
    this.onChange(displayLabel);
    this.selectionChange.emit({ option, index });
    this.valueChange.emit(displayLabel);
    this.closePanel();
    this.onTouched();
  }

  resolveOptionLabel(option: AppAutocompleteOption<T>): string {
    if (this.displayWith) {
      return this.displayWith(option);
    }

    return option.label;
  }

  getOptionId(index: number): string {
    const baseId = this.fieldId ?? `${OPTION_ID_PREFIX}${OPTION_ID_SEPARATOR}${this.generatedPanelId}`;

    return `${baseId}${OPTION_ID_SEPARATOR}${index}`;
  }

  getOptionDescribedBy(option: AppAutocompleteOption<T>): string | null {
    if (!option.describedByIds || option.describedByIds.length === 0) {
      return null;
    }

    return option.describedByIds.join(ARIA_ATTRIBUTE_SEPARATOR);
  }

  private createPanelId(): string {
    const currentId = AppAutocompleteComponent.instanceCounter;
    AppAutocompleteComponent.instanceCounter += 1;

    return `${PANEL_ID_PREFIX}${OPTION_ID_SEPARATOR}${currentId}`;
  }
}

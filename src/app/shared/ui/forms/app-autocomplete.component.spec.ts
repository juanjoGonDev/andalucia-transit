import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppAutocompleteComponent, AppAutocompleteOption } from '@shared/ui/forms/app-autocomplete.component';
import { AppTextFieldErrorDirective } from '@shared/ui/forms/app-text-field-slots.directive';

interface OptionValue {
  readonly id: number;
}

const TEXT_FIELD_SELECTOR = 'app-text-field';
const PANEL_SELECTOR = '.app-autocomplete__panel';
const OPTION_SELECTOR = '.app-autocomplete__option';
const INPUT_SELECTOR = 'input';
const ROLE_ATTRIBUTE = 'role';
const ARIA_AUTOCOMPLETE_ATTRIBUTE = 'aria-autocomplete';
const ARIA_CONTROLS_ATTRIBUTE = 'aria-controls';
const ARIA_EXPANDED_ATTRIBUTE = 'aria-expanded';
const ARIA_ACTIVE_DESCENDANT_ATTRIBUTE = 'aria-activedescendant';
const ARIA_SELECTED_ATTRIBUTE = 'aria-selected';
const ARIA_DESCRIBEDBY_ATTRIBUTE = 'aria-describedby';
const ARIA_INVALID_ATTRIBUTE = 'aria-invalid';
const COMBOBOX_ROLE = 'combobox';
const LIST_AUTOCOMPLETE_VALUE = 'list';
const TRUE_STRING = 'true';
const FALSE_STRING = 'false';
const TEXT_FIELD_NOT_FOUND_ERROR_MESSAGE = 'Text field element not found';
const INPUT_NOT_FOUND_ERROR_MESSAGE = 'Autocomplete input not found';
const ERROR_NOT_FOUND_ERROR_MESSAGE = 'Autocomplete error not found';
const KEYDOWN_EVENT_TYPE = 'keydown';
const KEY_ARROW_DOWN = 'ArrowDown';
const KEY_ARROW_UP = 'ArrowUp';
const KEY_ENTER = 'Enter';
const KEY_ESCAPE = 'Escape';
const FIRST_OPTION_INDEX = 0;
const LAST_OPTION_INDEX = 2;
const FIRST_OPTION_DESCRIPTION_ID = 'first-description';
const REQUIRED_ERROR_MESSAGE = 'This field is required';

const OPTIONS: readonly AppAutocompleteOption<OptionValue>[] = [
  { value: { id: 1 }, label: 'First', describedByIds: [FIRST_OPTION_DESCRIPTION_ID] },
  { value: { id: 2 }, label: 'Second' },
  { value: { id: 3 }, label: 'Third' },
];

const ensureElement = <TElement extends Element>(element: TElement | null, message: string): TElement => {
  if (!element) {
    throw new Error(message);
  }

  return element;
};

@Component({
  selector: 'app-autocomplete-host',
  standalone: true,
  imports: [CommonModule, AppAutocompleteComponent],
  template: `
    <app-autocomplete
      label="Label"
      placeholder="Placeholder"
      [options]="options"
      (selectionChange)="onSelection($event.option.label)"
    ></app-autocomplete>
  `,
})
class AppAutocompleteHostComponent {
  options = OPTIONS;
  lastSelection?: string;

  onSelection(label: string): void {
    this.lastSelection = label;
  }
}

describe('AppAutocompleteComponent', () => {
  let fixture: ComponentFixture<AppAutocompleteHostComponent>;
  let host: AppAutocompleteHostComponent;
  let component: AppAutocompleteComponent<OptionValue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppAutocompleteHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppAutocompleteHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance as AppAutocompleteComponent<OptionValue>;
  });

  function queryTextFieldElement(): HTMLElement {
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector(TEXT_FIELD_SELECTOR) as HTMLElement | null;

    if (!element) {
      throw new Error(TEXT_FIELD_NOT_FOUND_ERROR_MESSAGE);
    }

    return element;
  }

  function queryInputElement(): HTMLInputElement {
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

    if (!element) {
      throw new Error(INPUT_NOT_FOUND_ERROR_MESSAGE);
    }

    return element;
  }

  function queryOptionElements(): HTMLElement[] {
    fixture.detectChanges();
    const elements = fixture.nativeElement.querySelectorAll(OPTION_SELECTOR) as NodeListOf<HTMLElement>;

    return Array.from(elements);
  }

  it('opens the panel when receiving focus with available options', () => {
    component.handleFocusChange(true);

    expect(component.isPanelOpen).toBeTrue();
    expect(component.ariaExpanded).toBeTrue();
  });

  it('navigates options with arrow keys and selects the active option on enter', () => {
    component.handleFocusChange(true);
    component.handleKeydown(new KeyboardEvent(KEYDOWN_EVENT_TYPE, { key: KEY_ARROW_DOWN }));
    component.handleKeydown(new KeyboardEvent(KEYDOWN_EVENT_TYPE, { key: KEY_ENTER }));

    expect(host.lastSelection).toBe('First');
    expect(component.value).toBe('First');
    expect(component.isPanelOpen).toBeFalse();
  });

  it('selects an option when clicked', () => {
    component.handleFocusChange(true);
    component.handleOptionClick(OPTIONS[1], 1);

    expect(host.lastSelection).toBe('Second');
    expect(component.value).toBe('Second');
  });

  it('applies combobox aria metadata to the text field host', () => {
    let textFieldElement = queryTextFieldElement();
    const inputElement = queryInputElement();

    expect(textFieldElement.getAttribute(ROLE_ATTRIBUTE)).toBe(COMBOBOX_ROLE);
    expect(textFieldElement.getAttribute(ARIA_AUTOCOMPLETE_ATTRIBUTE)).toBe(LIST_AUTOCOMPLETE_VALUE);
    expect(textFieldElement.getAttribute(ARIA_CONTROLS_ATTRIBUTE)).toBe(component.panelId);

    inputElement.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    textFieldElement = queryTextFieldElement();

    expect(textFieldElement.getAttribute(ARIA_EXPANDED_ATTRIBUTE)).toBe(TRUE_STRING);

    inputElement.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    textFieldElement = queryTextFieldElement();

    expect(textFieldElement.getAttribute(ARIA_EXPANDED_ATTRIBUTE)).toBe(FALSE_STRING);
  });

  it('updates aria-activedescendant and option selection while navigating with the keyboard', () => {
    const inputElement = queryInputElement();

    inputElement.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    inputElement.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT_TYPE, { key: KEY_ARROW_DOWN }));
    fixture.detectChanges();

    let textFieldElement = queryTextFieldElement();
    let options = queryOptionElements();

    expect(options.length).toBeGreaterThan(0);
    expect(textFieldElement.getAttribute(ARIA_ACTIVE_DESCENDANT_ATTRIBUTE)).toBe(component.activeOptionId);
    expect(options[FIRST_OPTION_INDEX].getAttribute(ARIA_SELECTED_ATTRIBUTE)).toBe(TRUE_STRING);
    expect(options[FIRST_OPTION_INDEX].getAttribute(ARIA_DESCRIBEDBY_ATTRIBUTE)).toBe(FIRST_OPTION_DESCRIPTION_ID);

    inputElement.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT_TYPE, { key: KEY_ARROW_UP }));
    fixture.detectChanges();

    textFieldElement = queryTextFieldElement();
    options = queryOptionElements();

    expect(component.activeOptionIndex).toBe(LAST_OPTION_INDEX);
    expect(textFieldElement.getAttribute(ARIA_ACTIVE_DESCENDANT_ATTRIBUTE)).toBe(component.activeOptionId);
    expect(options[FIRST_OPTION_INDEX].getAttribute(ARIA_SELECTED_ATTRIBUTE)).toBe(FALSE_STRING);
    expect(options[LAST_OPTION_INDEX].getAttribute(ARIA_SELECTED_ATTRIBUTE)).toBe(TRUE_STRING);
  });

  it('closes the panel and clears aria-activedescendant when escape is pressed', () => {
    const inputElement = queryInputElement();

    inputElement.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    inputElement.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT_TYPE, { key: KEY_ARROW_DOWN }));
    fixture.detectChanges();

    inputElement.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT_TYPE, { key: KEY_ESCAPE }));
    fixture.detectChanges();

    const textFieldElement = queryTextFieldElement();

    expect(component.isPanelOpen).toBeFalse();
    expect(textFieldElement.getAttribute(ARIA_EXPANDED_ATTRIBUTE)).toBe(FALSE_STRING);
    expect(textFieldElement.getAttribute(ARIA_ACTIVE_DESCENDANT_ATTRIBUTE)).toBeNull();
    expect(fixture.nativeElement.querySelector(PANEL_SELECTOR)).toBeNull();
  });

  it('writes incoming values to the nested text field', () => {
    component.writeValue('Preset value');
    fixture.detectChanges();

    const inputElement = queryInputElement();

    expect(inputElement.value).toBe('Preset value');
  });

  it('disables the nested text field when requested by the form control', () => {
    component.setDisabledState(true);
    fixture.detectChanges();

    const inputElement = queryInputElement();

    expect(inputElement.disabled).toBeTrue();
  });
});

describe('AppAutocompleteComponent form integration', () => {
  let fixture: ComponentFixture<AppAutocompleteFormHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppAutocompleteFormHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppAutocompleteFormHostComponent);
    fixture.detectChanges();
  });

  it('announces projected errors when the control is invalid and touched', async () => {
    const host = fixture.componentInstance;
    const control = host.form.controls.city;

    control.markAsTouched();
    control.updateValueAndValidity();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const inputElement = ensureElement(
      fixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null,
      INPUT_NOT_FOUND_ERROR_MESSAGE,
    );
    const errorElement = ensureElement(
      fixture.nativeElement.querySelector('.app-text-field__error') as HTMLElement | null,
      ERROR_NOT_FOUND_ERROR_MESSAGE,
    );
    const describedByAttribute = inputElement.getAttribute(ARIA_DESCRIBEDBY_ATTRIBUTE);

    expect(control.invalid).toBeTrue();
    expect(control.touched).toBeTrue();
    expect(errorElement.textContent?.trim()).toBe(REQUIRED_ERROR_MESSAGE);
    expect(inputElement.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBe(TRUE_STRING);
    expect(inputElement.getAttribute('aria-errormessage')).toBe(errorElement.id);
    expect(describedByAttribute).not.toBeNull();
    expect(describedByAttribute?.split(' ').includes(errorElement.id)).toBeTrue();
  });

  it('reflects control validity through the aria-invalid attribute', async () => {
    const host = fixture.componentInstance;
    const control = host.form.controls.city;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const inputElement = ensureElement(
      fixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null,
      INPUT_NOT_FOUND_ERROR_MESSAGE,
    );

    expect(control.invalid).toBeTrue();
    expect(inputElement.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBe(TRUE_STRING);

    control.setValue(OPTIONS[0].label);
    control.markAsTouched();
    control.updateValueAndValidity();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(control.valid).toBeTrue();
    expect(inputElement.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBeNull();

    control.setValue('');
    control.updateValueAndValidity();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(control.invalid).toBeTrue();
    expect(inputElement.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBe(TRUE_STRING);
  });
});

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AppAutocompleteComponent, AppTextFieldErrorDirective],
  template: `
    <form [formGroup]="form">
      <app-autocomplete label="City" formControlName="city" [options]="options">
        <ng-template appTextFieldError>
          <span>{{ errorMessage }}</span>
        </ng-template>
      </app-autocomplete>
    </form>
  `,
})
class AppAutocompleteFormHostComponent {
  readonly errorMessage = REQUIRED_ERROR_MESSAGE;
  readonly options = OPTIONS;
  readonly form = new FormGroup<{ city: FormControl<string | null> }>({
    city: new FormControl<string | null>(null, { validators: Validators.required }),
  });
}

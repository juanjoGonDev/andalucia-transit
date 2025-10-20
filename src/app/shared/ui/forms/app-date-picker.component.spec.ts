import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppDatePickerComponent } from './app-date-picker.component';
import { AppTextFieldErrorDirective } from './app-text-field-slots.directive';

const ISO_DATE_EXAMPLE = '2025-01-02';
const INVALID_DATE_VALUE = '2025-02-30';
const TRIMMED_EMPTY_VALUE = '   ';
const REQUIRED_ERROR_MESSAGE = 'This field is required';
const ARIA_INVALID_ATTRIBUTE = 'aria-invalid';
const TRUE_STRING = 'true';
const VALID_DATE = new Date(Date.UTC(2025, 0, 2));

const ensureDate = (value: Date | null): Date => {
  if (!value) {
    throw new Error('Expected date value');
  }

  return value;
};

const ensureElement = <T extends Element>(element: T | null): T => {
  if (!element) {
    throw new Error('Expected element');
  }

  return element;
};

describe('AppDatePickerComponent', () => {
  let fixture: ComponentFixture<AppDatePickerComponent>;
  let component: AppDatePickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppDatePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppDatePickerComponent);
    component = fixture.componentInstance;
    component.label = 'Start date';
    fixture.detectChanges();
  });

  it('formats incoming date values using the default formatter', () => {
    const incomingDate = new Date(Date.UTC(2025, 0, 2));

    component.writeValue(incomingDate);
    fixture.detectChanges();

    const inputElement: HTMLInputElement = fixture.nativeElement.querySelector('input');

    expect(inputElement.value).toBe(ISO_DATE_EXAMPLE);
  });

  it('parses user input and propagates parsed dates', () => {
    const emittedValues: (Date | null)[] = [];
    let propagatedValue: Date | null = null;

    component.valueChange.subscribe((value) => emittedValues.push(value));
    component.registerOnChange((value) => {
      propagatedValue = value;
    });

    component.handleTextFieldValueChange(ISO_DATE_EXAMPLE);
    fixture.detectChanges();

    expect(emittedValues.length).toBe(1);
    const emittedDate = ensureDate(emittedValues[0]);
    const resolvedPropagatedValue = ensureDate(propagatedValue);

    expect(emittedDate.toISOString().startsWith(ISO_DATE_EXAMPLE)).toBeTrue();
    expect(resolvedPropagatedValue.toISOString().startsWith(ISO_DATE_EXAMPLE)).toBeTrue();
  });

  it('clears the current selection when input is blank or invalid', () => {
    const emittedValues: (Date | null)[] = [];

    component.valueChange.subscribe((value) => emittedValues.push(value));

    component.handleTextFieldValueChange(TRIMMED_EMPTY_VALUE);
    fixture.detectChanges();

    component.handleTextFieldValueChange(INVALID_DATE_VALUE);
    fixture.detectChanges();

    const lastEmittedValue = emittedValues[emittedValues.length - 1];

    expect(component.hasValue).toBeFalse();
    expect(lastEmittedValue).toBeNull();
  });

  it('disables the nested text field when requested by the form control', () => {
    component.setDisabledState(true);
    fixture.detectChanges();

    const inputElement: HTMLInputElement = fixture.nativeElement.querySelector('input');

    expect(inputElement.disabled).toBeTrue();
  });
});

describe('AppDatePickerComponent projected error content', () => {
  let fixture: ComponentFixture<AppDatePickerErrorHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppDatePickerErrorHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppDatePickerErrorHostComponent);
    fixture.detectChanges();
  });

  it('announces projected errors through accessible attributes', async () => {
    const control = fixture.componentInstance.form.controls.date;

    control.markAsTouched();
    control.updateValueAndValidity();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(control.invalid).toBeTrue();
    expect(control.touched).toBeTrue();

    const inputElement = ensureElement(
      fixture.nativeElement.querySelector('input') as HTMLInputElement | null,
    );
    const errorElement = ensureElement(
      fixture.nativeElement.querySelector('.app-text-field__error') as HTMLElement | null,
    );
    const describedByAttribute = inputElement.getAttribute('aria-describedby');

    expect(errorElement.textContent?.trim()).toBe(REQUIRED_ERROR_MESSAGE);
    expect(inputElement.getAttribute('aria-errormessage')).toBe(errorElement.id);
    expect(describedByAttribute).not.toBeNull();
    expect(describedByAttribute?.split(' ').includes(errorElement.id)).toBeTrue();
  });

  it('reflects control validity through the aria-invalid attribute', async () => {
    const control = fixture.componentInstance.form.controls.date;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const inputElement = ensureElement(
      fixture.nativeElement.querySelector('input') as HTMLInputElement | null,
    );

    expect(control.invalid).toBeTrue();
    expect(inputElement.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBe(TRUE_STRING);

    control.setValue(VALID_DATE);
    control.updateValueAndValidity();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(control.valid).toBeTrue();
    expect(inputElement.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBeNull();

    control.setValue(null);
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
  imports: [ReactiveFormsModule, AppDatePickerComponent, AppTextFieldErrorDirective],
  template: `
    <form [formGroup]="form">
      <app-date-picker label="Start date" formControlName="date">
        <ng-template appTextFieldError>
          <span>{{ errorMessage }}</span>
        </ng-template>
      </app-date-picker>
    </form>
  `,
})
class AppDatePickerErrorHostComponent {
  readonly errorMessage = REQUIRED_ERROR_MESSAGE;
  readonly form = new FormGroup<{ date: FormControl<Date | null> }>({
    date: new FormControl<Date | null>(null, { validators: Validators.required }),
  });
}

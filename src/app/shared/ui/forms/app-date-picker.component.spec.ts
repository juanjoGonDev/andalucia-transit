import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppDatePickerComponent } from './app-date-picker.component';

const ISO_DATE_EXAMPLE = '2025-01-02';
const INVALID_DATE_VALUE = '2025-02-30';
const TRIMMED_EMPTY_VALUE = '   ';

const ensureDate = (value: Date | null): Date => {
  if (!value) {
    throw new Error('Expected date value');
  }

  return value;
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

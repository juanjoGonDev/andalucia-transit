import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AppTextFieldComponent } from './app-text-field.component';
import { AppTextFieldHintDirective } from './app-text-field-slots.directive';

type DescribedByInput = string | readonly string[] | undefined;

const INPUT_SELECTOR = 'input';
const LABEL_SELECTOR = 'label';
const FIELD_SELECTOR = '.app-text-field';
const MISSING_INPUT_ERROR_MESSAGE = 'Input element not found';
const MISSING_LABEL_ERROR_MESSAGE = 'Label element not found';
const KEYDOWN_EVENT_TYPE = 'keydown';
const SAMPLE_KEY = 'A';
const FOCUSED_CLASS = 'app-text-field--focused';
const INVALID_CLASS = 'app-text-field--invalid';

@Component({
  selector: 'app-text-field-host',
  standalone: true,
  imports: [CommonModule, AppTextFieldComponent, AppTextFieldHintDirective],
  template: `
    <app-text-field
      [label]="label"
      [placeholder]="placeholder"
      [describedBy]="describedBy"
      [fieldId]="fieldId"
      [required]="required"
      (keydownEvent)="recordKey($event)"
    >
      <span *ngIf="showHint" appTextFieldHint>{{ hintText }}</span>
    </app-text-field>
  `,
})
class AppTextFieldHostComponent {
  label = 'Label';
  placeholder = 'Placeholder';
  describedBy: DescribedByInput;
  showHint = false;
  readonly fieldId = 'custom-field';
  readonly hintText = 'Hint';
  readonly recordedKeys: string[] = [];
  required = false;

  recordKey(event: KeyboardEvent): void {
    this.recordedKeys.push(event.key);
  }
}

@Component({
  selector: 'app-text-field-reactive-host',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppTextFieldComponent],
  template: `
    <form [formGroup]="form">
      <app-text-field
        label="Label"
        formControlName="field"
        [required]="required"
      ></app-text-field>
    </form>
  `,
})
class AppTextFieldReactiveHostComponent {
  readonly form = new FormGroup({
    field: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  required = false;
}

describe('AppTextFieldComponent', () => {
  let fixture: ComponentFixture<AppTextFieldHostComponent>;
  let host: AppTextFieldHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTextFieldHostComponent, AppTextFieldReactiveHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppTextFieldHostComponent);
    host = fixture.componentInstance;
  });

  function queryInput(): HTMLInputElement {
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

    if (!element) {
      throw new Error(MISSING_INPUT_ERROR_MESSAGE);
    }

    return element;
  }

  function queryLabel(): HTMLLabelElement {
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector(LABEL_SELECTOR) as HTMLLabelElement | null;

    if (!element) {
      throw new Error(MISSING_LABEL_ERROR_MESSAGE);
    }

    return element;
  }

  function queryField(): HTMLElement {
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector(FIELD_SELECTOR) as HTMLElement | null;

    if (!element) {
      throw new Error('Field element not found');
    }

    return element;
  }

  function resolveComponent(): AppTextFieldComponent {
    fixture.detectChanges();
    const debugElement = fixture.debugElement.children.find((child) => child.componentInstance instanceof AppTextFieldComponent);

    if (!debugElement) {
      throw new Error('Text field component not found');
    }

    return debugElement.componentInstance as AppTextFieldComponent;
  }

  it('combines hint and describedBy identifiers', () => {
    host.describedBy = 'external-description';
    host.showHint = true;

    const input = queryInput();

    expect(input.getAttribute('aria-describedby')).toBe('custom-field-hint external-description');
  });

  it('joins multiple describedBy identifiers provided as an array', () => {
    host.describedBy = ['first-description', 'second-description'];

    const input = queryInput();

    expect(input.getAttribute('aria-describedby')).toBe('first-description second-description');
  });

  it('removes aria-describedby when no identifiers are available', () => {
    const input = queryInput();

    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('associates the label with the generated input identifier', () => {
    const input = queryInput();
    const label = queryLabel();

    expect(label.getAttribute('for')).toBe(input.id);
  });

  it('emits keyboard events through the keydown output', () => {
    const input = queryInput();

    input.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT_TYPE, { key: SAMPLE_KEY }));
    fixture.detectChanges();

    expect(host.recordedKeys).toEqual([SAMPLE_KEY]);
  });

  it('adds the focused class when the input gains focus', () => {
    const input = queryInput();
    const field = queryField();

    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    expect(field.classList).toContain(FOCUSED_CLASS);
  });

  it('removes the focused class after the input blurs', () => {
    const input = queryInput();
    const field = queryField();

    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    input.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(field.classList).not.toContain(FOCUSED_CLASS);
  });

  it('ignores focus attempts when the control is disabled', () => {
    const input = queryInput();
    const field = queryField();
    const componentInstance = resolveComponent();

    componentInstance.setDisabledState(true);
    fixture.detectChanges();

    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    expect(field.classList).not.toContain(FOCUSED_CLASS);
  });

  it('clears focus and emits blur semantics when disabling a focused control', fakeAsync(() => {
    const input = queryInput();
    const field = queryField();
    const componentInstance = resolveComponent();
    let touched = false;
    const focusChangeSpy = spyOn(componentInstance.focusChange, 'emit');
    const blurSpy = spyOn(input, 'blur');

    componentInstance.registerOnTouched(() => {
      touched = true;
    });

    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    componentInstance.setDisabledState(true);
    flush();
    fixture.detectChanges();

    expect(field.classList).not.toContain(FOCUSED_CLASS);
    expect(focusChangeSpy).toHaveBeenCalledWith(false);
    const blurEmissions = (focusChangeSpy.calls.allArgs() as readonly [boolean][]).filter(([isFocused]) => isFocused === false).length;
    expect(blurEmissions).toBe(1);
    expect(touched).toBeTrue();
    expect(blurSpy).toHaveBeenCalled();
  }));

  it('sets required semantics when the input binding requests it', () => {
    host.required = true;

    const input = queryInput();

    expect(input.required).toBeTrue();
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('derives required semantics from the reactive control validator', () => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

    expect(input).not.toBeNull();
    expect(input?.required).toBeTrue();
    expect(input?.getAttribute('aria-required')).toBe('true');
  });

  it('keeps required semantics when the control lacks hasValidator', () => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveFixture.detectChanges();

    const hostComponent = reactiveFixture.componentInstance;
    const control = hostComponent.form.get('field') as FormControl<string> | null;

    expect(control).not.toBeNull();

    if (!control) {
      throw new Error('Form control not found');
    }

    control.setValue('content', { emitEvent: false });

    const overrideTarget: FormControl<string> & {
      hasValidator?: ((validator: ValidatorFn) => boolean) | undefined;
    } = control as FormControl<string> & {
      hasValidator?: ((validator: ValidatorFn) => boolean) | undefined;
    };

    Reflect.deleteProperty(overrideTarget, 'hasValidator');
    overrideTarget.updateValueAndValidity({ emitEvent: false });

    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

    expect(input).not.toBeNull();
    expect(input?.required).toBeTrue();
    expect(input?.getAttribute('aria-required')).toBe('true');
  });

  it('exposes invalid state only after the control becomes touched', () => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;
    const field = reactiveFixture.nativeElement.querySelector(FIELD_SELECTOR) as HTMLElement | null;

    expect(input).not.toBeNull();
    expect(field).not.toBeNull();
    expect(field?.classList).not.toContain(INVALID_CLASS);
    expect(input?.getAttribute('aria-invalid')).toBeNull();

    input?.dispatchEvent(new FocusEvent('focus'));
    reactiveFixture.detectChanges();
    input?.dispatchEvent(new FocusEvent('blur'));
    reactiveFixture.detectChanges();

    expect(field?.classList).toContain(INVALID_CLASS);
    expect(input?.getAttribute('aria-invalid')).toBe('true');
  });

  it('clears invalid state once the control becomes valid', () => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;
    const field = reactiveFixture.nativeElement.querySelector(FIELD_SELECTOR) as HTMLElement | null;

    input?.dispatchEvent(new FocusEvent('focus'));
    reactiveFixture.detectChanges();
    input?.dispatchEvent(new FocusEvent('blur'));
    reactiveFixture.detectChanges();

    if (input) {
      input.value = 'content';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    reactiveFixture.detectChanges();

    expect(field?.classList).not.toContain(INVALID_CLASS);
    expect(input?.getAttribute('aria-invalid')).toBeNull();
  });
});

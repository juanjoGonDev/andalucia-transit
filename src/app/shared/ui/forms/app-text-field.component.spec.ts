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
import { By } from '@angular/platform-browser';
import { AppTextFieldErrorDirective, AppTextFieldHintDirective } from '@shared/ui/forms/app-text-field-slots.directive';
import { AppTextFieldComponent } from '@shared/ui/forms/app-text-field.component';

type DescribedByInput = string | readonly string[] | undefined;

const INPUT_SELECTOR = 'input';
const LABEL_SELECTOR = 'label';
const FIELD_SELECTOR = '.app-text-field';
const ERROR_SELECTOR = '.app-text-field__error';
const HINT_SELECTOR = '.app-text-field__hint';
const MISSING_INPUT_ERROR_MESSAGE = 'Input element not found';
const MISSING_LABEL_ERROR_MESSAGE = 'Label element not found';
const KEYDOWN_EVENT_TYPE = 'keydown';
const SAMPLE_KEY = 'A';
const FOCUSED_CLASS = 'app-text-field--focused';
const INVALID_CLASS = 'app-text-field--invalid';
const ARIA_INVALID_ATTRIBUTE = 'aria-invalid';
const ARIA_TRUE = 'true';
const ARIA_FALSE = 'false';

@Component({
  selector: 'app-text-field-host',
  standalone: true,
  imports: [CommonModule, AppTextFieldComponent, AppTextFieldHintDirective, AppTextFieldErrorDirective],
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
      <ng-template appTextFieldError>
        <span *ngIf="showError">{{ errorText }}</span>
      </ng-template>
    </app-text-field>
  `,
})
class AppTextFieldHostComponent {
  label = 'Label';
  placeholder = 'Placeholder';
  describedBy: DescribedByInput;
  showHint = false;
  showError = false;
  readonly fieldId = 'custom-field';
  readonly hintText = 'Hint';
  readonly errorText = 'Error';
  readonly recordedKeys: string[] = [];
  required = false;

  recordKey(event: KeyboardEvent): void {
    this.recordedKeys.push(event.key);
  }
}

@Component({
  selector: 'app-text-field-reactive-host',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppTextFieldComponent,
    AppTextFieldHintDirective,
    AppTextFieldErrorDirective,
  ],
  template: `
    <form [formGroup]="form">
      <app-text-field
        label="Label"
        formControlName="field"
        [required]="required"
        [describedBy]="describedBy"
      >
        <span *ngIf="showHint" appTextFieldHint>{{ hintText }}</span>
        <ng-template appTextFieldError>
          <span *ngIf="showError">{{ errorText }}</span>
        </ng-template>
      </app-text-field>
    </form>
  `,
})
class AppTextFieldReactiveHostComponent {
  readonly form = new FormGroup({
    field: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  required = false;
  showError = false;
  showHint = false;
  readonly errorText = 'Error';
  readonly hintText = 'Hint';
  describedBy: DescribedByInput;
}

@Component({
  selector: 'app-text-field-error-context-host',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppTextFieldComponent,
    AppTextFieldHintDirective,
    AppTextFieldErrorDirective,
  ],
  template: `
    <form [formGroup]="form">
      <app-text-field label="Label" formControlName="field">
        <ng-template
          appTextFieldError
          let-errors
          let-control="control"
          let-dirty="dirty"
          let-touched="touched"
        >
          <span class="context-errors">{{ errors?.required ? 'required' : 'none' }}</span>
          <span class="context-control-invalid">{{ control?.invalid ? 'invalid' : 'valid' }}</span>
          <span class="context-dirty">{{ dirty }}</span>
          <span class="context-touched">{{ touched }}</span>
        </ng-template>
      </app-text-field>
    </form>
  `,
})
class AppTextFieldErrorContextHostComponent {
  readonly form = new FormGroup({
    field: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  get control(): FormControl<string> {
    const field = this.form.get('field');

    if (!(field instanceof FormControl)) {
      throw new Error('Control not found');
    }

    return field;
  }
}

describe('AppTextFieldComponent', () => {
  let fixture: ComponentFixture<AppTextFieldHostComponent>;
  let host: AppTextFieldHostComponent;
  let reactiveFixture: ComponentFixture<AppTextFieldReactiveHostComponent>;
  let reactiveHost: AppTextFieldReactiveHostComponent;
  let errorContextFixture: ComponentFixture<AppTextFieldErrorContextHostComponent>;
  let errorContextHost: AppTextFieldErrorContextHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppTextFieldHostComponent,
        AppTextFieldReactiveHostComponent,
        AppTextFieldErrorContextHostComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppTextFieldHostComponent);
    host = fixture.componentInstance;
    reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveHost = reactiveFixture.componentInstance;
    errorContextFixture = TestBed.createComponent(AppTextFieldErrorContextHostComponent);
    errorContextHost = errorContextFixture.componentInstance;
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

  function queryReactiveInput(): HTMLInputElement {
    reactiveFixture.detectChanges();
    const element = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

    if (!element) {
      throw new Error(MISSING_INPUT_ERROR_MESSAGE);
    }

    return element;
  }

  function resolveReactiveControl(): FormControl<string> {
    const control = reactiveHost.form.get('field');

    if (!(control instanceof FormControl)) {
      throw new Error('Reactive control not found');
    }

    return control;
  }

  function resolveReactiveComponent(): AppTextFieldComponent {
    reactiveFixture.detectChanges();
    const debugElement = reactiveFixture.debugElement.query(By.directive(AppTextFieldComponent));

    if (!debugElement) {
      throw new Error('Reactive text field component not found');
    }

    return debugElement.componentInstance as AppTextFieldComponent;
  }

  it('combines hint and describedBy identifiers', () => {
    host.describedBy = 'external-description';
    host.showHint = true;

    const input = queryInput();

    expect(input.getAttribute('aria-describedby')).toBe('custom-field-hint external-description');
  });

  it('renders hint content when provided without error state', () => {
    host.showHint = true;

    const input = queryInput();
    const hintElement = fixture.nativeElement.querySelector(HINT_SELECTOR) as HTMLElement | null;

    expect(hintElement).not.toBeNull();
    expect(hintElement?.textContent?.trim()).toBe(host.hintText);
    expect(input.getAttribute('aria-describedby')).toBe(`${host.fieldId}-hint`);
  });

  it('joins multiple describedBy identifiers provided as an array', () => {
    host.describedBy = ['first-description', 'second-description'];

    const input = queryInput();

    expect(input.getAttribute('aria-describedby')).toBe('first-description second-description');
  });

  it('deduplicates describedBy identifiers while preserving order', () => {
    host.showHint = true;
    const hintIdentifier = `${host.fieldId}-hint`;
    host.describedBy = [
      hintIdentifier,
      'external-description',
      hintIdentifier,
      'external-description',
    ];

    const input = queryInput();

    expect(input.getAttribute('aria-describedby')).toBe(`${hintIdentifier} external-description`);
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

  it('exposes aria-errormessage when the reactive control is invalid', fakeAsync(() => {
    reactiveHost.showError = true;

    const control = resolveReactiveControl();
    control.markAsTouched();
    reactiveFixture.detectChanges();
    flush();

    const input = queryReactiveInput();
    const errorIdentifier = input.getAttribute('aria-errormessage');

    expect(errorIdentifier).toBe(`${input.id}-error`);
    expect(input.getAttribute('aria-describedby')).toBe(errorIdentifier);
  }));

  it('deduplicates error identifiers when describedBy already references the error', fakeAsync(() => {
    reactiveHost.showError = true;
    reactiveFixture.detectChanges();
    const control = resolveReactiveControl();
    const componentInstance = resolveReactiveComponent();
    const errorIdentifier = `${componentInstance.inputId}-error`;

    reactiveHost.describedBy = [errorIdentifier, 'external-info', errorIdentifier];
    reactiveFixture.detectChanges();
    control.markAsTouched();
    reactiveFixture.detectChanges();
    flush();

    const input = queryReactiveInput();

    expect(input.getAttribute('aria-describedby')).toBe(`${errorIdentifier} external-info`);
  }));

  it('removes aria-errormessage when the reactive control becomes valid', fakeAsync(() => {
    reactiveHost.showError = true;

    const control = resolveReactiveControl();
    control.markAsTouched();
    reactiveFixture.detectChanges();
    flush();

    control.setValue('value');
    reactiveFixture.detectChanges();
    flush();

    const input = queryReactiveInput();

    expect(input.getAttribute('aria-errormessage')).toBeNull();
  }));

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
    expect(input.getAttribute('aria-required')).toBe(ARIA_TRUE);
  });

  it('derives required semantics from the reactive control validator', () => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

    expect(input).not.toBeNull();
    expect(input?.required).toBeTrue();
    expect(input?.getAttribute('aria-required')).toBe(ARIA_TRUE);
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
    expect(input?.getAttribute('aria-required')).toBe(ARIA_TRUE);
  });

  it('defers visual invalid state until interaction while announcing invalid metadata immediately', () => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;
    const field = reactiveFixture.nativeElement.querySelector(FIELD_SELECTOR) as HTMLElement | null;

    if (!input) {
      throw new Error(MISSING_INPUT_ERROR_MESSAGE);
    }

    expect(field).not.toBeNull();
    expect(field?.classList).not.toContain(INVALID_CLASS);
    expect(input.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBe(ARIA_TRUE);

    input.dispatchEvent(new FocusEvent('focus'));
    reactiveFixture.detectChanges();
    input.dispatchEvent(new FocusEvent('blur'));
    reactiveFixture.detectChanges();

    expect(field?.classList).toContain(INVALID_CLASS);
    expect(input.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBe(ARIA_TRUE);
  });

  it('clears invalid state once the control becomes valid', () => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;
    const field = reactiveFixture.nativeElement.querySelector(FIELD_SELECTOR) as HTMLElement | null;

    if (!input) {
      throw new Error(MISSING_INPUT_ERROR_MESSAGE);
    }

    expect(input.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBe(ARIA_TRUE);

    input.dispatchEvent(new FocusEvent('focus'));
    reactiveFixture.detectChanges();
    input.dispatchEvent(new FocusEvent('blur'));
    reactiveFixture.detectChanges();

    input.value = 'content';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    reactiveFixture.detectChanges();

    expect(field?.classList).not.toContain(INVALID_CLASS);
    expect(input.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBeNull();

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    reactiveFixture.detectChanges();

    expect(input.getAttribute(ARIA_INVALID_ATTRIBUTE)).toBe(ARIA_TRUE);
  });

  it('reflects pending control state through aria-busy metadata', fakeAsync(() => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    reactiveFixture.detectChanges();

    const textFieldDebugElement = reactiveFixture.debugElement.query(By.directive(AppTextFieldComponent));

    if (!textFieldDebugElement) {
      throw new Error('Text field component not found');
    }

    const textFieldInstance = textFieldDebugElement.componentInstance as AppTextFieldComponent;
    const manualControl = new FormControl('', { nonNullable: true });

    textFieldInstance.registerExternalControl(manualControl);
    manualControl.markAsPending();
    flush();
    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

    if (!input) {
      throw new Error(MISSING_INPUT_ERROR_MESSAGE);
    }

    expect(manualControl.status).toBe('PENDING');
    expect(input.getAttribute('aria-busy')).toBe(ARIA_TRUE);

    manualControl.setValue('resolved');
    manualControl.updateValueAndValidity();
    flush();
    reactiveFixture.detectChanges();

    expect(manualControl.status).not.toBe('PENDING');
    expect(textFieldInstance.ariaBusyAttribute).toBe('false');
    expect(input.getAttribute('aria-busy')).toBe(ARIA_FALSE);
  }));

  it('projects error content and updates describedBy metadata when the control is invalid', () => {
    const reactiveFixture = TestBed.createComponent(AppTextFieldReactiveHostComponent);
    const reactiveHost = reactiveFixture.componentInstance;
    reactiveHost.showHint = true;
    reactiveHost.showError = true;
    reactiveFixture.detectChanges();

    const input = reactiveFixture.nativeElement.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

    if (!input) {
      throw new Error(MISSING_INPUT_ERROR_MESSAGE);
    }

    input?.dispatchEvent(new FocusEvent('focus'));
    reactiveFixture.detectChanges();
    input?.dispatchEvent(new FocusEvent('blur'));
    reactiveFixture.detectChanges();

    const errorElement = reactiveFixture.nativeElement.querySelector(ERROR_SELECTOR) as HTMLElement | null;

    expect(errorElement).not.toBeNull();
    expect(errorElement?.textContent?.trim()).toBe(reactiveHost.errorText);
    expect(reactiveFixture.nativeElement.querySelector(HINT_SELECTOR)).toBeNull();

    const expectedErrorId = `${input.id}-error`;

    expect(input.getAttribute('aria-errormessage')).toBe(expectedErrorId);
    expect(input.getAttribute('aria-describedby')).toBe(expectedErrorId);

    input.value = 'content';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    reactiveFixture.detectChanges();

    expect(reactiveFixture.nativeElement.querySelector(ERROR_SELECTOR)).toBeNull();
    const hintElement = reactiveFixture.nativeElement.querySelector(HINT_SELECTOR) as HTMLElement | null;

    expect(hintElement).not.toBeNull();
    expect(hintElement?.textContent?.trim()).toBe(reactiveHost.hintText);

    expect(input.getAttribute('aria-errormessage')).toBeNull();
    const updatedDescribedBy = input.getAttribute('aria-describedby') ?? '';
    const updatedParts = updatedDescribedBy.split(' ').filter((part) => part !== '');
    const expectedHintId = `${input.id}-hint`;

    expect(updatedParts).toContain(expectedHintId);
    expect(updatedParts).not.toContain(expectedErrorId);
  });

  it('provides control context to projected error templates', fakeAsync(() => {
    errorContextFixture.detectChanges();
    const control = errorContextHost.control;
    const componentDebugElement = errorContextFixture.debugElement.query(By.directive(AppTextFieldComponent));

    if (!componentDebugElement) {
      throw new Error('Text field component not found in error context host');
    }

    const componentInstance = componentDebugElement.componentInstance as AppTextFieldComponent;

    control.markAsPending();
    errorContextFixture.detectChanges();
    flush();

    let context = componentInstance.errorTemplateContext;

    expect(context.pending).toBeTrue();
    expect(context.status).toBe(control.status);

    control.markAsTouched();
    control.markAsDirty();
    control.updateValueAndValidity();
    errorContextFixture.detectChanges();
    flush();

    context = componentInstance.errorTemplateContext;

    expect(context.errors?.['required']).toBeTrue();
    expect(context.control).toBe(control);
    expect(context.dirty).toBeTrue();
    expect(context.touched).toBeTrue();
    expect(context.pending).toBeFalse();
    expect(context.status).toBe(control.status);

    control.setValue('valid');
    control.updateValueAndValidity();
    errorContextFixture.detectChanges();
    flush();

    context = componentInstance.errorTemplateContext;

    expect(context.errors).toBeNull();
    expect(context.control).toBe(control);
    expect(context.dirty).toBeTrue();
    expect(context.touched).toBeTrue();
    expect(context.pending).toBeFalse();
    expect(context.status).toBe(control.status);
  }));
});

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTextFieldComponent } from './app-text-field.component';
import { AppTextFieldHintDirective } from './app-text-field-slots.directive';

type DescribedByInput = string | readonly string[] | undefined;

const INPUT_SELECTOR = 'input';
const LABEL_SELECTOR = 'label';
const MISSING_INPUT_ERROR_MESSAGE = 'Input element not found';
const MISSING_LABEL_ERROR_MESSAGE = 'Label element not found';
const KEYDOWN_EVENT_TYPE = 'keydown';
const SAMPLE_KEY = 'A';

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

  recordKey(event: KeyboardEvent): void {
    this.recordedKeys.push(event.key);
  }
}

describe('AppTextFieldComponent', () => {
  let fixture: ComponentFixture<AppTextFieldHostComponent>;
  let host: AppTextFieldHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTextFieldHostComponent],
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
});

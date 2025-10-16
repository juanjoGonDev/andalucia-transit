import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTextFieldComponent } from './app-text-field.component';
import { AppTextFieldHintDirective } from './app-text-field-slots.directive';

type DescribedByInput = string | readonly string[] | undefined;

const INPUT_SELECTOR = 'input';
const MISSING_INPUT_ERROR_MESSAGE = 'Input element not found';

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
});

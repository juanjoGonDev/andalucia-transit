import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppAutocompleteComponent, AppAutocompleteOption } from './app-autocomplete.component';

interface OptionValue {
  readonly id: number;
}

const OPTIONS: readonly AppAutocompleteOption<OptionValue>[] = [
  { value: { id: 1 }, label: 'First' },
  { value: { id: 2 }, label: 'Second' },
  { value: { id: 3 }, label: 'Third' },
];

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

  it('opens the panel when receiving focus with available options', () => {
    component.handleFocusChange(true);

    expect(component.isPanelOpen).toBeTrue();
    expect(component.ariaExpanded).toBeTrue();
  });

  it('navigates options with arrow keys and selects the active option on enter', () => {
    component.handleFocusChange(true);
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

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
});

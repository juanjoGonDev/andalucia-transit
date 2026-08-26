import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AppAutocompleteComponent,
  AppAutocompleteOption,
} from '@shared/ui/forms/app-autocomplete.component';

interface OptionValue {
  readonly id: number;
}

const OPTIONS: readonly AppAutocompleteOption<OptionValue>[] = [
  { value: { id: 1 }, label: 'First' },
];

@Component({
  standalone: true,
  imports: [AppAutocompleteComponent],
  template: `
    <app-autocomplete label="Search" [options]="options"></app-autocomplete>
  `,
})
class DynamicOptionsHostComponent {
  options: readonly AppAutocompleteOption<OptionValue>[] = [];
}

describe('AppAutocompleteComponent dynamic options', () => {
  let fixture: ComponentFixture<DynamicOptionsHostComponent>;
  let component: AppAutocompleteComponent<OptionValue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicOptionsHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicOptionsHostComponent);
    fixture.detectChanges();
    component = fixture.debugElement.children[0]
      .componentInstance as AppAutocompleteComponent<OptionValue>;
  });

  it('opens results that arrive while the input remains focused', () => {
    component.handleFocusChange(true);
    expect(component.isPanelOpen).toBeFalse();

    fixture.componentInstance.options = OPTIONS;
    fixture.detectChanges();

    expect(component.isPanelOpen).toBeTrue();
    expect(component.ariaExpanded).toBeTrue();
  });

  it('closes the panel when a focused search no longer has results', () => {
    fixture.componentInstance.options = OPTIONS;
    fixture.detectChanges();
    component.handleFocusChange(true);
    expect(component.isPanelOpen).toBeTrue();

    fixture.componentInstance.options = [];
    fixture.detectChanges();

    expect(component.isPanelOpen).toBeFalse();
    expect(component.ariaExpanded).toBeFalse();
  });
});

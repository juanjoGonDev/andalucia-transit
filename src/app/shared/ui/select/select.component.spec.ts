import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SelectComponent, SelectOption } from './select.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('SelectComponent', () => {
  let fixture: ComponentFixture<SelectComponent>;
  let component: SelectComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SelectComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the control with the default configuration', () => {
    expect(component.classList()).toEqual([
      'control',
      'control--outline',
      'control--md',
      'control--tone-neutral'
    ]);
    expect(component.value).toBeNull();
  });

  it('renders options and propagates value changes', () => {
    const options: SelectOption[] = [
      { value: 'se', labelKey: 'province.sevilla' },
      { value: 'ma', labelKey: 'province.malaga' }
    ];
    component.options = options;
    fixture.detectChanges();

    const selectElement: HTMLSelectElement | null = fixture.nativeElement.querySelector('select');
    if (!selectElement) {
      throw new Error('select element not found');
    }
    const optionElements = Array.from(selectElement.options);
    expect(optionElements.length).toBe(2);

    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    selectElement.value = 'ma';
    selectElement.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith('ma');
    expect(component.value).toBe('ma');
  });
});

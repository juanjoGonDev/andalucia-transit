import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { CheckboxComponent } from './checkbox.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('CheckboxComponent', () => {
  let fixture: ComponentFixture<CheckboxComponent>;
  let component: CheckboxComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CheckboxComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the control with the default configuration', () => {
    expect(component.indicatorClasses()).toEqual([
      'control-indicator',
      'control-indicator--checkbox',
      'control--outline',
      'control--md',
      'control--tone-neutral'
    ]);
    expect(component.value).toBeFalse();
    expect(component.disabled).toBeFalse();
  });

  it('propagates value changes when toggled', () => {
    const inputElement: HTMLInputElement | null = fixture.nativeElement.querySelector('input');
    if (!inputElement) {
      throw new Error('checkbox input not found');
    }
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    inputElement.checked = true;
    inputElement.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(component.value).toBeTrue();
  });

  it('reflects disabled state', () => {
    component.setDisabledState(true);
    fixture.detectChanges();

    expect(component.hostClasses()).toContain('control-choice--disabled');
  });
});

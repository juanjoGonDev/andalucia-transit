import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { InputComponent } from './input.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('InputComponent', () => {
  let fixture: ComponentFixture<InputComponent>;
  let component: InputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        InputComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
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
  });

  it('propagates value changes to registered listeners', () => {
    const inputElement = fixture.nativeElement.querySelector('input');
    if (!inputElement) {
      throw new Error('input element not found');
    }
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    inputElement.value = 'Granada';
    inputElement.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('Granada');
  });
});

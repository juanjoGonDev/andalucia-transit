import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { TextareaComponent } from './textarea.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('TextareaComponent', () => {
  let fixture: ComponentFixture<TextareaComponent>;
  let component: TextareaComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TextareaComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TextareaComponent);
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
    expect(component.rows).toBe(4);
  });

  it('propagates value changes to registered listeners', () => {
    const textareaElement = fixture.nativeElement.querySelector('textarea');
    if (!textareaElement) {
      throw new Error('textarea element not found');
    }
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    textareaElement.value = 'Sevilla';
    textareaElement.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('Sevilla');
  });

  it('respects the minimum row count', () => {
    component.rows = 1;
    fixture.detectChanges();

    expect(component.rows).toBe(2);
  });
});

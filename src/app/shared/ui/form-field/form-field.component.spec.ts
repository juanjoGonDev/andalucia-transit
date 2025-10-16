import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { FormFieldComponent } from './form-field.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('FormFieldComponent', () => {
  let fixture: ComponentFixture<FormFieldComponent>;
  let component: FormFieldComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormFieldComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    component.controlId = 'route-name';
    component.labelKey = 'form.route.label';
    component.hintKey = 'form.route.hint';
    component.errorKey = 'form.route.error';
    fixture.detectChanges();
  });

  it('exposes IDs for associated field metadata', () => {
    expect(component.labelId).toBe('route-name-label');
    expect(component.resolvedHintId).toBe('route-name-hint');
    expect(component.resolvedErrorId).toBe('route-name-error');
  });

  it('combines hint and error identifiers for aria-describedby bindings', () => {
    expect(component.describedBy).toBe('route-name-hint route-name-error');
  });
});

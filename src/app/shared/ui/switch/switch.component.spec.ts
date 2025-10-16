import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SwitchComponent } from './switch.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('SwitchComponent', () => {
  let fixture: ComponentFixture<SwitchComponent>;
  let component: SwitchComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SwitchComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SwitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes with default styling', () => {
    expect(component.trackClasses()).toEqual([
      'control-switch',
      'control--primary',
      'control--md',
      'control--tone-neutral'
    ]);
    expect(component.value).toBeFalse();
  });

  it('propagates checked state changes', () => {
    const inputElement: HTMLInputElement | null = fixture.nativeElement.querySelector('input');
    if (!inputElement) {
      throw new Error('switch input not found');
    }
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    inputElement.checked = true;
    inputElement.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(component.value).toBeTrue();
  });

  it('disables interaction when requested', () => {
    component.setDisabledState(true);
    fixture.detectChanges();

    expect(component.hostClasses()).toContain('control-choice--disabled');
  });
});

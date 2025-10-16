import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { RadioComponent, RadioOption, RadioOrientation } from './radio.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('RadioComponent', () => {
  let fixture: ComponentFixture<RadioComponent>;
  let component: RadioComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RadioComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RadioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes with default options', () => {
    expect(component.indicatorClasses()).toEqual([
      'control-indicator',
      'control-indicator--radio',
      'control--outline',
      'control--md',
      'control--tone-neutral'
    ]);
    expect(component.value).toBeNull();
  });

  it('renders options and updates value on selection', () => {
    const options: RadioOption[] = [
      { value: 'bus', labelKey: 'mode.bus' },
      { value: 'tram', labelKey: 'mode.tram' }
    ];
    component.options = options;
    component.name = 'transport-mode';
    fixture.detectChanges();

    const inputElements: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="radio"]')
    );
    expect(inputElements.length).toBe(2);

    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    inputElements[1].checked = true;
    inputElements[1].dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith('tram');
    expect(component.value).toBe('tram');
  });

  it('applies horizontal orientation class when requested', () => {
    const orientation: RadioOrientation = 'horizontal';
    component.orientation = orientation;
    fixture.detectChanges();

    const groupElement: HTMLElement | null = fixture.nativeElement.querySelector('[role="radiogroup"]');
    if (!groupElement) {
      throw new Error('radiogroup not found');
    }
    expect(groupElement.classList.contains('control-choice-group--horizontal')).toBeTrue();
  });
});

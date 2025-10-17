import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { InteractiveCardComponent } from './interactive-card.component';

const BODY_CLASS = 'card-body';
const REMOVE_CLASS = 'card-remove';
const REMOVE_LABEL = 'Remove item';
const DEFAULT_REMOVE_ICON = 'close';
const MATERIAL_SYMBOLS_OUTLINED = 'material-symbols-outlined';

@Component({
  selector: 'app-host-card',
  standalone: true,
  imports: [CommonModule, InteractiveCardComponent],
  template: `
    <app-interactive-card
      [ngClass]="cardClasses"
      [bodyClasses]="bodyClasses"
      [removeClasses]="removeClasses"
      [removeAriaLabel]="removeAriaLabel"
      [removeIconName]="removeIconName"
      [removeIconClass]="removeIconClass"
      (primaryActivated)="primary.emit()"
      (removeActivated)="remove.emit()"
    >
      <ng-content></ng-content>
    </app-interactive-card>
  `
})
class HostCardComponent {
  @Input() cardClasses: readonly string[] = [];
  @Input() bodyClasses: readonly string[] = [];
  @Input() removeClasses: readonly string[] = [];
  @Input() removeAriaLabel: string | null = null;
  @Input() removeIconName = DEFAULT_REMOVE_ICON;
  @Input() removeIconClass = MATERIAL_SYMBOLS_OUTLINED;
  @Output() readonly primary = new EventEmitter<void>();
  @Output() readonly remove = new EventEmitter<void>();
}

describe('InteractiveCardComponent', () => {
  let fixture: ComponentFixture<HostCardComponent>;
  let host: HostCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostCardComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits primary activation when the main body is triggered', () => {
    const primarySpy = jasmine.createSpy('primary');
    host.primary.subscribe(primarySpy);
    host.bodyClasses = [BODY_CLASS];

    fixture.detectChanges();

    const body = fixture.debugElement.query(By.css(`.${BODY_CLASS}`));
    body.nativeElement.click();

    expect(primarySpy).toHaveBeenCalled();
  });

  it('renders remove section when aria label is provided', () => {
    host.removeAriaLabel = REMOVE_LABEL;
    host.removeClasses = [REMOVE_CLASS];

    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css(`.${REMOVE_CLASS}`));

    expect(removeButton).not.toBeNull();
  });

  it('emits remove activation when the remove section is triggered', () => {
    const removeSpy = jasmine.createSpy('remove');
    host.remove.subscribe(removeSpy);
    host.removeAriaLabel = REMOVE_LABEL;
    host.removeClasses = [REMOVE_CLASS];

    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css(`.${REMOVE_CLASS}`));
    removeButton!.nativeElement.click();

    expect(removeSpy).toHaveBeenCalled();
  });
});

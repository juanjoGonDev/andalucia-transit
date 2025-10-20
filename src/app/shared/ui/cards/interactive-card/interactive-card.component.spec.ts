import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { InteractiveCardComponent } from '@shared/ui/cards/interactive-card/interactive-card.component';

const BODY_CLASS = 'card-body';
const REMOVE_CLASS = 'card-remove';
const REMOVE_LABEL = 'Remove item';
const DEFAULT_REMOVE_ICON = 'close';
const MATERIAL_SYMBOLS_OUTLINED = 'material-symbols-outlined';
const PRIMARY_ARIA_LABEL = 'Open item';
const LINK_ROLE = 'link';
const ROUTER_COMMAND: readonly string[] = ['/home'];
const INTERACTIVE_CARD_SELECTOR = 'app-interactive-card';
const BASE_HOST_CLASS = 'interactive-card';
const BASE_BODY_CLASS = 'interactive-card__body';
const BASE_REMOVE_CLASS = 'interactive-card__remove';

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
      [primaryAriaLabel]="primaryAriaLabel"
      [primaryRole]="primaryRole"
      [primaryCommands]="primaryCommands"
      [primaryPressed]="primaryPressed"
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
  @Input() primaryAriaLabel: string | null = null;
  @Input() primaryRole: string | null = null;
  @Input() primaryCommands: readonly string[] | null = null;
  @Input() primaryPressed: boolean | null = null;
  @Output() readonly primary = new EventEmitter<void>();
  @Output() readonly remove = new EventEmitter<void>();
}

describe('InteractiveCardComponent', () => {
  let fixture: ComponentFixture<HostCardComponent>;
  let host: HostCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostCardComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HostCardComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function queryInteractiveCard(): HTMLElement {
    const element = fixture.nativeElement.querySelector(INTERACTIVE_CARD_SELECTOR) as HTMLElement | null;

    if (!element) {
      throw new Error('Interactive card not found');
    }

    return element;
  }

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

  it('applies the provided aria label to the primary section', () => {
    host.primaryAriaLabel = PRIMARY_ARIA_LABEL;
    host.bodyClasses = [BODY_CLASS];

    fixture.detectChanges();

    const primary = fixture.debugElement.query(By.css(`.${BODY_CLASS}`));

    expect(primary.attributes['aria-label']).toBe(PRIMARY_ARIA_LABEL);
  });

  it('assigns link role when router commands are supplied', () => {
    host.primaryCommands = ROUTER_COMMAND;
    host.bodyClasses = [BODY_CLASS];

    fixture.detectChanges();

    const primary = fixture.debugElement.query(By.css(`.${BODY_CLASS}`));

    expect(primary.attributes['role']).toBe(LINK_ROLE);
  });

  it('applies the base classes to the body and remove sections', () => {
    host.bodyClasses = [BODY_CLASS];
    host.removeAriaLabel = REMOVE_LABEL;
    host.removeClasses = [REMOVE_CLASS];

    fixture.detectChanges();

    const body = fixture.debugElement.query(By.css(`.${BODY_CLASS}`));
    const remove = fixture.debugElement.query(By.css(`.${REMOVE_CLASS}`));

    expect(remove).not.toBeNull();
    expect(body.nativeElement.classList).toContain(BASE_BODY_CLASS);
    expect(remove!.nativeElement.classList).toContain(BASE_REMOVE_CLASS);
  });

  it('decorates the host element with the base class', () => {
    const card = queryInteractiveCard();

    expect(card.classList).toContain(BASE_HOST_CLASS);
  });

  it('applies pressed state to the primary section when provided', () => {
    host.primaryRole = 'button';
    host.primaryPressed = true;
    host.bodyClasses = [BODY_CLASS];

    fixture.detectChanges();

    const primary = fixture.debugElement.query(By.css(`.${BODY_CLASS}`));

    expect(primary.attributes['aria-pressed']).toBe('true');
  });
});

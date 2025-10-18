import { ComponentFixture, TestBed } from '@angular/core/testing';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayDialogContainerComponent } from './overlay-dialog-container.component';

describe('OverlayDialogContainerComponent', () => {
  let fixture: ComponentFixture<OverlayDialogContainerComponent>;
  let component: OverlayDialogContainerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverlayDialogContainerComponent, A11yModule]
    });

    fixture = TestBed.createComponent(OverlayDialogContainerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should track focus using the host document when the injected document is unavailable', () => {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    document.body.appendChild(trigger);
    trigger.focus();

    const internals = component as unknown as {
      documentRef: Document | null;
      previouslyFocusedElement: HTMLElement | null;
    };

    internals.documentRef = null;
    component.initialize('dialog', false);
    fixture.detectChanges();

    expect(internals.previouslyFocusedElement).toBe(trigger);

    trigger.blur();
    component.restoreFocus();

    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});

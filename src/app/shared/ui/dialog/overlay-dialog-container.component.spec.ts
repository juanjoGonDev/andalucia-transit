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

  it('should expose aria-labelledby when a label identifier is registered', () => {
    component.initialize('dialog', false);
    component.setLabelledBy('dialog-title');
    fixture.detectChanges();

    expect(fixture.nativeElement.getAttribute('aria-labelledby')).toBe('dialog-title');
  });

  it('should clear aria-labelledby when provided with an empty label identifier', () => {
    component.initialize('dialog', false);
    component.setLabelledBy('dialog-title');
    component.setLabelledBy('');
    fixture.detectChanges();

    expect(fixture.nativeElement.hasAttribute('aria-labelledby')).toBeFalse();
  });

  it('should expose aria-describedby when a description identifier is registered', () => {
    component.initialize('dialog', false);
    component.setDescribedBy('dialog-description');
    fixture.detectChanges();

    expect(fixture.nativeElement.getAttribute('aria-describedby')).toBe('dialog-description');
  });

  it('should clear aria-describedby when no description identifier is supplied', () => {
    component.initialize('dialog', false);
    component.setDescribedBy('dialog-description');
    component.setDescribedBy(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.hasAttribute('aria-describedby')).toBeFalse();
  });
});

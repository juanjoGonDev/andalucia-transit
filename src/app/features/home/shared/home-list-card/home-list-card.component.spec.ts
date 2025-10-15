import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { HomeListCardComponent } from './home-list-card.component';

describe('HomeListCardComponent', () => {
  let fixture: ComponentFixture<HomeListCardComponent>;
  let component: HomeListCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeListCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeListCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits when the primary action is triggered', () => {
    const primarySpy = jasmine.createSpy('primary');
    component.primaryAction.subscribe(primarySpy);

    const button = fixture.debugElement.query(By.css('.recent-card__body'));
    button.nativeElement.click();

    expect(primarySpy).toHaveBeenCalled();
  });

  it('emits remove action when available', () => {
    const removeSpy = jasmine.createSpy('remove');
    component.removeAction.subscribe(removeSpy);
    fixture.componentRef.setInput('removeAriaLabel', 'Remove card');
    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css('.recent-card__remove'));

    expect(removeButton).not.toBeNull();

    removeButton!.nativeElement.click();

    expect(removeSpy).toHaveBeenCalled();
  });

  it('does not render remove button when no label is provided', () => {
    component.removeAriaLabel = null;
    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css('.recent-card__remove'));

    expect(removeButton).toBeNull();
  });
});

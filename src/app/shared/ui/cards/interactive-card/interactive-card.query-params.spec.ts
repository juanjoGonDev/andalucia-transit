import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink, provideRouter } from '@angular/router';
import { InteractiveCardComponent } from '@shared/ui/cards/interactive-card/interactive-card.component';

describe('InteractiveCardComponent router query params', () => {
  let fixture: ComponentFixture<InteractiveCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractiveCardComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(InteractiveCardComponent);
  });

  it('forwards primary query params to RouterLink', () => {
    fixture.componentRef.setInput('primaryCommands', ['/', 'stop-detail', '119']);
    fixture.componentRef.setInput('primaryQueryParams', { consortiumId: '7' });
    fixture.detectChanges();

    const routerLink = fixture.debugElement.query(By.directive(RouterLink)).injector.get(RouterLink);

    expect(routerLink.queryParams).toEqual({ consortiumId: '7' });
  });
});

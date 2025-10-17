import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { APP_CONFIG } from '../../../core/config';
import { InteractiveCardComponent } from '../cards/interactive-card/interactive-card.component';
import { StopNavigationItemComponent } from './stop-navigation-item.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('StopNavigationItemComponent', () => {
  let fixture: ComponentFixture<StopNavigationItemComponent>;
  let component: StopNavigationItemComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        StopNavigationItemComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StopNavigationItemComponent);
    component = fixture.componentInstance;
    component.stopId = 'stop-main-street';
    component.leadingIcon = 'pin_drop';
    component.titleKey = 'home.sections.recentStops.items.mainStreet';
    fixture.detectChanges();
  });

  it('builds router commands targeting the stop detail route', () => {
    const card = fixture.debugElement
      .query(By.directive(InteractiveCardComponent))
      .componentInstance as InteractiveCardComponent;

    expect(card.primaryCommands).toEqual([
      '/',
      APP_CONFIG.routes.stopDetailBase,
      'stop-main-street'
    ]);
  });

  it('updates the navigation commands when the stop identifier changes', () => {
    component.stopId = 'stop-oakwood-plaza';
    fixture.detectChanges();

    const expectedCommands = [
      '/',
      APP_CONFIG.routes.stopDetailBase,
      'stop-oakwood-plaza'
    ] as const;

    expect((component as unknown as { navigationCommands: readonly string[] }).navigationCommands).toEqual(
      expectedCommands
    );

  });
});

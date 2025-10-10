import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { HomeComponent } from './home.component';
import { RouteSearchSelection, RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import { APP_CONFIG } from '../../core/config';
import { MatDialog } from '@angular/material/dialog';
import { CardListItemComponent } from '../../shared/ui/card-list-item/card-list-item.component';
import { StopNavigationItemComponent } from '../../shared/ui/stop-navigation-item/stop-navigation-item.component';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

class RouteSearchStateStub {
  selection: RouteSearchSelection | null = null;
  selection$ = of<RouteSearchSelection | null>(null);

  setSelection(selection: RouteSearchSelection): void {
    this.selection = selection;
  }
}

@Component({
  selector: 'app-route-search-form',
  standalone: true,
  template: ''
})
class RouteSearchFormStubComponent {
  @Input() initialSelection: RouteSearchSelection | null = null;
  @Output() readonly selectionConfirmed = new EventEmitter<RouteSearchSelection>();
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let router: Router;
  let routeSearchState: RouteSearchStateStub;
  const dialogStub = { open: jasmine.createSpy('open') };
  const originOption: StopDirectoryOption = {
    id: 'origin',
    code: '001',
    name: 'Origin Stop',
    municipality: 'Origin',
    municipalityId: 'origin-mun',
    nucleus: 'Origin',
    nucleusId: 'origin-nuc',
    consortiumId: 7,
    stopIds: ['origin-stop']
  };
  const destinationOption: StopDirectoryOption = {
    id: 'destination',
    code: '002',
    name: 'Destination Stop',
    municipality: 'Destination',
    municipalityId: 'destination-mun',
    nucleus: 'Destination',
    nucleusId: 'destination-nuc',
    consortiumId: 7,
    stopIds: ['destination-stop']
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HomeComponent,
        RouteSearchFormStubComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: dialogStub },
        { provide: RouteSearchStateService, useClass: RouteSearchStateStub }
      ]
    })
      .overrideComponent(HomeComponent, {
        remove: { imports: [RouteSearchFormComponent] },
        add: {
          imports: [RouteSearchFormStubComponent],
          providers: [{ provide: MatDialog, useValue: dialogStub }]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    router = TestBed.inject(Router);
    routeSearchState = TestBed.inject(RouteSearchStateService) as unknown as RouteSearchStateStub;
    dialogStub.open.calls.reset();
    fixture.detectChanges();
  });

  it('navigates to the route results page when the form emits a selection', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const selection: RouteSearchSelection = {
      origin: originOption,
      destination: destinationOption,
      queryDate: new Date('2025-10-07T00:00:00Z'),
      lineMatches: []
    };

    (fixture.componentInstance as unknown as HomeComponentPublicApi).onSelectionConfirmed(selection);
    tick();

    expect(routeSearchState.selection).toBe(selection);
    expect(navigateSpy).toHaveBeenCalled();
  }));

  it('opens the nearby stops dialog when clicking the action card', () => {
    const button = fixture.debugElement
      .query(By.css('.home__main app-section:nth-of-type(3) app-card-list-item'))
      .componentInstance as CardListItemComponent;

    button.action.emit();
    expect(dialogStub.open).toHaveBeenCalled();
  });

  it('renders the configured recent stops', () => {
    const recentList = fixture.debugElement.query(By.css('.home__recent-list'));
    const navigationItems = recentList.queryAll(By.directive(StopNavigationItemComponent));
    const expectedCount = Math.min(
      APP_CONFIG.homeData.recentStops.items.length,
      APP_CONFIG.homeData.recentStops.maxItems
    );

    expect(navigationItems.length).toBe(expectedCount);
  });
});

interface HomeComponentPublicApi {
  onSelectionConfirmed(selection: RouteSearchSelection): Promise<void>;
}

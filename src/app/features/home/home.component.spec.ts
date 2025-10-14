import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { HomeComponent } from './home.component';
import { RouteSearchSelection, RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import { MatDialog } from '@angular/material/dialog';
import { RouteSearchFormComponent } from '../route-search/route-search-form/route-search-form.component';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { RouteSearchExecutionService } from '../../domain/route-search/route-search-execution.service';
import { HomeRecentSearchesComponent } from './recent-searches/home-recent-searches.component';

class ImmediateIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: readonly number[] = [0];
  private readonly observedTargets = new Set<Element>();

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element): void {
    this.observedTargets.add(target);
    queueMicrotask(() => {
      const rect = target.getBoundingClientRect();
      const entry: IntersectionObserverEntry = {
        time: 0,
        target,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: rect,
        rootBounds: null,
        intersectionRect: rect
      };

      this.callback([entry], this);
    });
  }

  unobserve(target: Element): void {
    this.observedTargets.delete(target);
  }

  disconnect(): void {
    this.observedTargets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

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

class RouteSearchExecutionStub {
  prepare = jasmine.createSpy('prepare').and.returnValue(['', 'routes']);
}

@Component({
  selector: 'app-route-search-form',
  standalone: true,
  template: ''
})
class RouteSearchFormStubComponent {
  @Input() initialSelection: RouteSearchSelection | null = null;
  @Input() originDraft: StopDirectoryOption | null = null;
  @Output() readonly selectionConfirmed = new EventEmitter<RouteSearchSelection>();
}

@Component({
  selector: 'app-home-recent-searches',
  standalone: true,
  template: ''
})
class HomeRecentSearchesStubComponent {}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let router: Router;
  let execution: RouteSearchExecutionStub;
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;
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
        { provide: RouteSearchStateService, useClass: RouteSearchStateStub },
        { provide: RouteSearchExecutionService, useClass: RouteSearchExecutionStub }
      ]
    })
      .overrideComponent(HomeComponent, {
        remove: { imports: [RouteSearchFormComponent, HomeRecentSearchesComponent] },
        add: {
          imports: [RouteSearchFormStubComponent, HomeRecentSearchesStubComponent],
          providers: [{ provide: MatDialog, useValue: dialogStub }]
        }
      })
      .compileComponents();

    originalIntersectionObserver = window.IntersectionObserver;
    (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      ImmediateIntersectionObserver;

    fixture = TestBed.createComponent(HomeComponent);
    router = TestBed.inject(Router);
    execution = TestBed.inject(RouteSearchExecutionService) as unknown as RouteSearchExecutionStub;
    dialogStub.open.calls.reset();
    fixture.detectChanges();
  });

  afterEach(() => {
    if (originalIntersectionObserver) {
      (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
        originalIntersectionObserver;
    } else {
      delete (window as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    }
  });

  it('navigates to the route results page when the form emits a selection', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const selection: RouteSearchSelection = {
      origin: originOption,
      destination: destinationOption,
      queryDate: new Date('2025-10-07T00:00:00Z'),
      lineMatches: []
    };

    (fixture.componentInstance as unknown as HomeComponentTestingApi).onSelectionConfirmed(selection);
    tick();

    expect(execution.prepare).toHaveBeenCalledWith(selection);
    expect(navigateSpy).toHaveBeenCalled();
  }));

  it('opens the nearby stops dialog when clicking the quick action button', async () => {
    const component = fixture.componentInstance as unknown as HomeComponentTestingApi;
    const openSpy = spyOn(component, 'openNearbyStopsDialog').and.callThrough();
    const buttonDebug = fixture.debugElement.query(By.css('.home__quick-action'));
    expect(buttonDebug).not.toBeNull();
    const button = buttonDebug!.nativeElement as HTMLButtonElement;

    button.click();
    expect(openSpy).toHaveBeenCalled();
    await openSpy.calls.mostRecent().returnValue;
    expect(dialogStub.open).toHaveBeenCalled();
  });

  it('renders the recent searches component', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const recent = fixture.debugElement.queryAll(By.directive(HomeRecentSearchesStubComponent));
    expect(recent.length).toBeGreaterThan(0);
  });
});

interface HomeComponentTestingApi {
  onSelectionConfirmed(selection: RouteSearchSelection): Promise<void>;
  openNearbyStopsDialog(): Promise<void>;
}

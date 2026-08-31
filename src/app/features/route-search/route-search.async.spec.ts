import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import {
  RouteSearchResultsService,
  RouteSearchResultsViewModel
} from '@domain/route-search/route-search-results.service';
import { RouteSearchSelectionResolverService } from '@domain/route-search/route-search-selection-resolver.service';
import { RouteSearchSelection, RouteSearchStateService } from '@domain/route-search/route-search-state.service';
import { StopDirectoryFacade, StopDirectoryOption } from '@domain/stops/stop-directory.facade';
import { RouteSearchFormComponent } from '@features/route-search/route-search-form/route-search-form.component';
import { RouteSearchComponent } from '@features/route-search/route-search.component';

class TranslateTestingLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      'home.sections.recentStops.previewLoading': 'Loading schedules',
      'home.sections.recentStops.previewError': 'Could not load schedules',
      'home.dialogs.nearbyStops.retry': 'Try again',
      'routeSearch.emptyResults': 'No routes found',
      'routeSearch.emptyResultsDescription': 'Try another combination',
      'routeSearch.emptyResultsAction': 'Adjust search'
    });
  }
}

class ResultsStub {
  readonly streams: Subject<RouteSearchResultsViewModel>[] = [];
  readonly loadResults = jasmine.createSpy('loadResults').and.callFake(() => {
    const stream = new Subject<RouteSearchResultsViewModel>();
    this.streams.push(stream);
    return stream.asObservable();
  });
}

@Component({ selector: 'app-route-search-form', standalone: true, template: '' })
class RouteSearchFormStubComponent {
  @Input() initialSelection: RouteSearchSelection | null = null;
  @Input() originDraft: StopDirectoryOption | null = null;
  @Output() readonly selectionConfirmed = new EventEmitter<RouteSearchSelection>();
  focusOriginField = jasmine.createSpy('focusOriginField');
}

class ActivatedRouteStub {
  private readonly params = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  private readonly query = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  readonly paramMap = this.params.asObservable();
  readonly queryParamMap = this.query.asObservable();
  readonly snapshot = {
    paramMap: convertToParamMap({}),
    queryParamMap: convertToParamMap({})
  };
}

class StopDirectoryFacadeStub {
  getOptionByStopId() {
    return of(null);
  }

  getOptionByStopSignature() {
    return of(null);
  }
}

describe('RouteSearchComponent async feedback', () => {
  let fixture: ComponentFixture<RouteSearchComponent>;
  let results: ResultsStub;
  let state: RouteSearchStateService;

  const origin: StopDirectoryOption = {
    id: 'alpha',
    code: 'alpha',
    name: 'Alpha Station',
    municipality: 'Alpha City',
    municipalityId: 'mun-alpha',
    nucleus: 'Alpha',
    nucleusId: 'nuc-alpha',
    consortiumId: 7,
    stopIds: ['alpha']
  };
  const destination: StopDirectoryOption = {
    id: 'beta',
    code: 'beta',
    name: 'Beta Terminal',
    municipality: 'Beta City',
    municipalityId: 'mun-beta',
    nucleus: 'Beta',
    nucleusId: 'nuc-beta',
    consortiumId: 7,
    stopIds: ['beta']
  };
  const selection: RouteSearchSelection = {
    origin,
    destination,
    queryDate: new Date('2026-08-25T00:00:00Z'),
    lineMatches: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouteSearchComponent,
        RouteSearchFormStubComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateTestingLoader } })
      ],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: RouteSearchResultsService, useClass: ResultsStub },
        {
          provide: RouteSearchSelectionResolverService,
          useValue: { resolveFromSlugs: () => of(null) }
        },
        { provide: StopDirectoryFacade, useClass: StopDirectoryFacadeStub }
      ]
    })
      .overrideComponent(RouteSearchComponent, {
        remove: { imports: [RouteSearchFormComponent] },
        add: { imports: [RouteSearchFormStubComponent] }
      })
      .compileComponents();

    results = TestBed.inject(RouteSearchResultsService) as unknown as ResultsStub;
    state = TestBed.inject(RouteSearchStateService);
    fixture = TestBed.createComponent(RouteSearchComponent);
  });

  it('shows loading instead of a false empty result while schedules are pending', () => {
    state.setSelection(selection);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.app-loading-indicator'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.route-search__empty-title'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.route-search__results')).attributes['aria-busy']).toBe(
      'true'
    );
  });

  it('shows a recoverable error and retries without discarding the selection', () => {
    state.setSelection(selection);
    fixture.detectChanges();

    results.streams[0].error(new Error('network'));
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('.app-async-status--error'));
    expect(error).not.toBeNull();

    const retry = error.query(By.css('.app-outline-button'));
    retry.triggerEventHandler('appAccessibleButtonActivated', {});
    fixture.detectChanges();

    expect(results.loadResults).toHaveBeenCalledTimes(2);
    expect(state.getSelection()).toEqual(selection);
    expect(fixture.debugElement.query(By.css('.app-loading-indicator'))).not.toBeNull();
  });

  it('renders the empty result only after the request completes successfully', () => {
    state.setSelection(selection);
    fixture.detectChanges();

    results.streams[0].next({ departures: [], hasUpcoming: false, nextDepartureId: null });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.route-search__empty-title'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.app-loading-indicator'))).toBeNull();
  });
});

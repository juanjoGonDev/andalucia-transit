import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute, ParamMap, Router, convertToParamMap, provideRouter } from '@angular/router';

import { RouteSearchComponent } from './route-search.component';
import {
  RouteSearchDepartureView,
  RouteSearchResultsService,
  RouteSearchResultsViewModel
} from '../../domain/route-search/route-search-results.service';
import { RouteSearchSelection, RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { RouteSearchSelectionResolverService } from '../../domain/route-search/route-search-selection-resolver.service';
import { buildDateSlug } from '../../domain/route-search/route-search-url.util';
import { RouteSearchFormComponent } from './route-search-form/route-search-form.component';
import { UPCOMING_EARLY_MARKER, PAST_DELAY_MARKER } from '../../domain/utils/progress.util';

class TranslateTestingLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

class RouteSearchResultsServiceStub {
  public viewModel: RouteSearchResultsViewModel = {
    departures: [],
    hasUpcoming: false,
    nextDepartureId: null
  };

  loadResults(): ReturnType<RouteSearchResultsService['loadResults']> {
    return of(this.viewModel);
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

class RouteSearchSelectionResolverServiceStub {
  resolveFromSlugs = jasmine
    .createSpy<
      RouteSearchSelectionResolverService['resolveFromSlugs']
    >('resolveFromSlugs')
    .and.returnValue(of(null));
}

class ActivatedRouteStub {
  private readonly subject = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  readonly paramMap = this.subject.asObservable();
  snapshot = { paramMap: convertToParamMap({}) };

  emit(params: Record<string, string>): void {
    const map = convertToParamMap(params);
    this.snapshot = { paramMap: map };
    this.subject.next(map);
  }
}

describe('RouteSearchComponent', () => {
  let fixture: ComponentFixture<RouteSearchComponent>;
  let state: RouteSearchStateService;
  let resultsService: RouteSearchResultsServiceStub;
  let resolver: RouteSearchSelectionResolverServiceStub;
  let activatedRoute: ActivatedRouteStub;

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

  beforeEach(async () => {
    activatedRoute = new ActivatedRouteStub();

    await TestBed.configureTestingModule({
      imports: [
        RouteSearchComponent,
        RouteSearchFormStubComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateTestingLoader }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: RouteSearchResultsService, useClass: RouteSearchResultsServiceStub },
        {
          provide: RouteSearchSelectionResolverService,
          useClass: RouteSearchSelectionResolverServiceStub
        },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    })
      .overrideComponent(RouteSearchComponent, {
        remove: { imports: [RouteSearchFormComponent] },
        add: { imports: [RouteSearchFormStubComponent] }
      })
      .compileComponents();

    state = TestBed.inject(RouteSearchStateService);
    resultsService = TestBed.inject(
      RouteSearchResultsService
    ) as unknown as RouteSearchResultsServiceStub;
    resolver = TestBed.inject(
      RouteSearchSelectionResolverService
    ) as unknown as RouteSearchSelectionResolverServiceStub;
    fixture = TestBed.createComponent(RouteSearchComponent);
  });

  it('renders the selected route summary and departures', () => {
    const departure: RouteSearchDepartureView = {
      id: 'service-1',
      lineId: 'L1',
      lineCode: '001',
      direction: 0,
      destination: 'Beta Terminal',
      originStopId: 'alpha',
      arrivalTime: new Date('2025-02-02T08:05:00Z'),
      relativeLabel: '5m',
      waitTimeSeconds: 300,
      kind: 'upcoming',
      isNext: true,
      isMostRecentPast: false,
      isAccessible: true,
      isUniversityOnly: false,
      isHolidayService: true,
      showUpcomingProgress: true,
      progressPercentage: 75,
      pastProgressPercentage: 0,
      upcomingMarkers: [UPCOMING_EARLY_MARKER],
      pastMarkers: [],
      upcomingHints: [
        {
          startTime: new Date('2025-02-02T07:55:00Z'),
          endTime: new Date('2025-02-02T08:00:00Z')
        }
      ],
      pastHints: [],
      destinationArrivalTime: new Date('2025-02-02T08:20:00Z'),
      travelDurationLabel: '15m'
    } satisfies RouteSearchDepartureView;

    resultsService.viewModel = {
      departures: [departure],
      hasUpcoming: true,
      nextDepartureId: 'service-1'
    } satisfies RouteSearchResultsViewModel;

    state.setSelection({
      origin,
      destination,
      queryDate: new Date('2025-02-02T00:00:00Z'),
      lineMatches: []
    });

    fixture.detectChanges();

    const summaryValues = fixture.debugElement
      .queryAll(By.css('.route-search__summary-value'))
      .map((debugElement) => (debugElement.nativeElement as HTMLElement).textContent?.trim() ?? '');

    expect(summaryValues.some((value) => value.includes('Alpha Station'))).toBeTrue();
    expect(summaryValues.some((value) => value.includes('Beta Terminal'))).toBeTrue();

    const item = fixture.debugElement.query(By.css('.route-search__item'));
    expect(item).not.toBeNull();
    const lineLabel = item?.query(By.css('.route-search__item-line'))?.nativeElement as HTMLElement;
    expect(lineLabel.textContent).toContain('001');
    const holidayBadge = item?.query(By.css('.route-search__item-frequency'));
    expect(holidayBadge).not.toBeNull();
    const arrival = item?.query(By.css('.route-search__item-arrival'));
    expect(arrival).not.toBeNull();
  });

  it('navigates when the search form emits a new selection', async () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const form = fixture.debugElement
      .query(By.directive(RouteSearchFormStubComponent))
      .componentInstance as RouteSearchFormStubComponent;

    const selection = {
      origin,
      destination,
      queryDate: new Date('2025-02-02T00:00:00Z'),
      lineMatches: []
    } satisfies RouteSearchSelection;

    form.selectionConfirmed.emit(selection);
    fixture.detectChanges();

    expect(state.getSelection()).toEqual(selection);
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('shows the empty state when no selection is available', () => {
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('.route-search__empty'));
    expect(empty).not.toBeNull();
  });

  it('renders the bottom navigation component', () => {
    fixture.detectChanges();

    const nav = fixture.debugElement.query(By.css('app-bottom-navigation'));
    expect(nav).not.toBeNull();
  });

  it('shows the no upcoming message when all lines lack future services', () => {
    resultsService.viewModel = {
      departures: [
        {
          id: 'past-1',
          lineId: 'L9',
          lineCode: '009',
          direction: 1,
          destination: 'Beta Terminal',
          originStopId: 'alpha',
          arrivalTime: new Date('2025-02-02T07:30:00Z'),
          relativeLabel: '10m',
          waitTimeSeconds: 600,
          kind: 'past',
          isNext: false,
          isMostRecentPast: true,
          isAccessible: false,
          isUniversityOnly: false,
          isHolidayService: false,
          showUpcomingProgress: false,
          progressPercentage: 0,
          pastProgressPercentage: 33,
          upcomingMarkers: [],
          pastMarkers: [PAST_DELAY_MARKER],
          upcomingHints: [],
          pastHints: [
            {
              startTime: new Date('2025-02-02T07:35:00Z'),
              endTime: new Date('2025-02-02T07:40:00Z')
            }
          ],
          destinationArrivalTime: new Date('2025-02-02T07:45:00Z'),
          travelDurationLabel: '15m'
        }
      ],
      hasUpcoming: false,
      nextDepartureId: null
    } satisfies RouteSearchResultsViewModel;

    state.setSelection({
      origin,
      destination,
      queryDate: new Date('2025-02-02T00:00:00Z'),
      lineMatches: []
    });

    fixture.detectChanges();

    const message = fixture.debugElement.query(By.css('.route-search__no-upcoming'));
    expect(message).not.toBeNull();
  });

  it('restores the selection from route parameters when state is empty', () => {
    const departure: RouteSearchDepartureView = {
      id: 'service-10',
      lineId: 'L2',
      lineCode: '040',
      direction: 1,
      destination: 'Beta Terminal',
      originStopId: 'alpha',
      arrivalTime: new Date('2025-02-02T08:20:00Z'),
      relativeLabel: '15m',
      waitTimeSeconds: 900,
      kind: 'upcoming',
      isNext: true,
      isMostRecentPast: false,
      isAccessible: true,
      isUniversityOnly: false,
      isHolidayService: false,
      showUpcomingProgress: true,
      progressPercentage: 50,
      pastProgressPercentage: 0,
      upcomingMarkers: [UPCOMING_EARLY_MARKER],
      pastMarkers: [],
      upcomingHints: [
        {
          startTime: new Date('2025-02-02T08:10:00Z'),
          endTime: new Date('2025-02-02T08:15:00Z')
        }
      ],
      pastHints: [],
      destinationArrivalTime: new Date('2025-02-02T08:35:00Z'),
      travelDurationLabel: '15m'
    } satisfies RouteSearchDepartureView;

    resultsService.viewModel = {
      departures: [departure],
      hasUpcoming: true,
      nextDepartureId: 'service-10'
    } satisfies RouteSearchResultsViewModel;

    resolver.resolveFromSlugs.and.returnValue(
      of({
        origin,
        destination,
        queryDate: new Date('2025-02-02T00:00:00Z'),
        lineMatches: [
          {
            lineId: 'L2',
            lineCode: '040',
            direction: 1,
            originStopIds: ['alpha'],
            destinationStopIds: ['beta']
          }
        ]
      })
    );

    activatedRoute.emit({
      originSlug: 'alpha-station--alpha',
      destinationSlug: 'beta-terminal--beta',
      dateSlug: buildDateSlug(new Date('2025-02-02T00:00:00Z'))
    });

    fixture.detectChanges();

    const summaryValues = fixture.debugElement
      .queryAll(By.css('.route-search__summary-value'))
      .map((debugElement) => (debugElement.nativeElement as HTMLElement).textContent?.trim() ?? '');

    expect(summaryValues.some((value) => value.includes('Alpha Station'))).toBeTrue();
    expect(summaryValues.some((value) => value.includes('Beta Terminal'))).toBeTrue();
  });
});

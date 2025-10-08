import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter } from '@angular/router';

import { RouteSearchComponent } from './route-search.component';
import {
  RouteSearchLineItem,
  RouteSearchLineView,
  RouteSearchResultsService,
  RouteSearchResultsViewModel
} from '../../domain/route-search/route-search-results.service';
import { RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { RouteSearchSelectionResolverService } from '../../domain/route-search/route-search-selection-resolver.service';
import { buildDateSlug } from '../../domain/route-search/route-search-url.util';

class TranslateTestingLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

class RouteSearchResultsServiceStub {
  public viewModel: RouteSearchResultsViewModel = { lines: [] };

  loadResults(): ReturnType<RouteSearchResultsService['loadResults']> {
    return of(this.viewModel);
  }
}

class RouteSearchSelectionResolverServiceStub {
  resolveFromSlugs = jasmine
    .createSpy<
      RouteSearchSelectionResolverService['resolveFromSlugs']
    >('resolveFromSlugs')
    .and.returnValue(of(null));
}

describe('RouteSearchComponent', () => {
  let fixture: ComponentFixture<RouteSearchComponent>;
  let state: RouteSearchStateService;
  let resultsService: RouteSearchResultsServiceStub;
  let resolver: RouteSearchSelectionResolverServiceStub;
  let paramMapSubject: BehaviorSubject<ParamMap>;

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
    paramMapSubject = new BehaviorSubject<ParamMap>(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [
        RouteSearchComponent,
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
        { provide: ActivatedRoute, useValue: { paramMap: paramMapSubject.asObservable() } }
      ]
    }).compileComponents();

    state = TestBed.inject(RouteSearchStateService);
    resultsService = TestBed.inject(
      RouteSearchResultsService
    ) as unknown as RouteSearchResultsServiceStub;
    resolver = TestBed.inject(
      RouteSearchSelectionResolverService
    ) as unknown as RouteSearchSelectionResolverServiceStub;
    fixture = TestBed.createComponent(RouteSearchComponent);
  });

  it('renders the selected route summary and timeline items', () => {
    const line: RouteSearchLineView = {
      lineId: 'L1',
      lineCode: '001',
      direction: 0,
      hasUpcoming: true,
      items: [
        {
          id: 'service-1',
          originStopId: 'alpha',
          arrivalTime: new Date('2025-02-02T08:05:00Z'),
          relativeLabel: '5m',
          waitTimeSeconds: 300,
          kind: 'upcoming',
          isNext: true,
          isAccessible: true,
          isUniversityOnly: false,
          progressPercentage: 75
        }
      ] satisfies RouteSearchLineItem[]
    } satisfies RouteSearchLineView;

    resultsService.viewModel = { lines: [line] } satisfies RouteSearchResultsViewModel;

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

    const lineCard = fixture.debugElement.query(By.css('.route-search__line'));
    expect(lineCard).not.toBeNull();
    const lineLabel = lineCard?.query(By.css('.route-search__line-code'))?.nativeElement as HTMLElement;
    expect(lineLabel.textContent).toContain('001');
    const item = lineCard?.query(By.css('.route-search__item'));
    expect(item).not.toBeNull();
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
      lines: [
        {
          lineId: 'L9',
          lineCode: '009',
          direction: 1,
          hasUpcoming: false,
          items: [
            {
              id: 'past-1',
              originStopId: 'alpha',
              arrivalTime: new Date('2025-02-02T07:30:00Z'),
              relativeLabel: '10m',
              waitTimeSeconds: 600,
              kind: 'past',
              isNext: false,
              isAccessible: false,
              isUniversityOnly: false,
              progressPercentage: 0
            }
          ]
        }
      ]
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
    const line: RouteSearchLineView = {
      lineId: 'L2',
      lineCode: '040',
      direction: 1,
      hasUpcoming: true,
      items: [
        {
          id: 'service-10',
          originStopId: 'alpha',
          arrivalTime: new Date('2025-02-02T08:20:00Z'),
          relativeLabel: '15m',
          waitTimeSeconds: 900,
          kind: 'upcoming',
          isNext: true,
          isAccessible: true,
          isUniversityOnly: false,
          progressPercentage: 50
        }
      ] satisfies RouteSearchLineItem[]
    } satisfies RouteSearchLineView;

    resultsService.viewModel = { lines: [line] } satisfies RouteSearchResultsViewModel;

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

    paramMapSubject.next(
      convertToParamMap({
        originSlug: 'alpha-station--alpha',
        destinationSlug: 'beta-terminal--beta',
        dateSlug: buildDateSlug(new Date('2025-02-02T00:00:00Z'))
      })
    );

    fixture.detectChanges();

    const summaryValues = fixture.debugElement
      .queryAll(By.css('.route-search__summary-value'))
      .map((debugElement) => (debugElement.nativeElement as HTMLElement).textContent?.trim() ?? '');

    expect(summaryValues.some((value) => value.includes('Alpha Station'))).toBeTrue();
    expect(summaryValues.some((value) => value.includes('Beta Terminal'))).toBeTrue();
  });
});

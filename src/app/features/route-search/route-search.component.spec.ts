import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

import { RouteSearchComponent } from './route-search.component';
import { RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';

class TranslateTestingLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({});
  }
}

describe('RouteSearchComponent', () => {
  let fixture: ComponentFixture<RouteSearchComponent>;
  let state: RouteSearchStateService;

  const origin: StopDirectoryOption = {
    id: 'alpha',
    code: 'alpha',
    name: 'Alpha Station',
    municipality: 'Alpha City',
    nucleus: 'Alpha',
    consortiumId: 7,
    stopIds: ['alpha']
  };

  const destination: StopDirectoryOption = {
    id: 'beta',
    code: 'beta',
    name: 'Beta Terminal',
    municipality: 'Beta City',
    nucleus: 'Beta',
    consortiumId: 7,
    stopIds: ['beta']
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouteSearchComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateTestingLoader }
        })
      ],
      providers: [provideRouter([])]
    }).compileComponents();

    state = TestBed.inject(RouteSearchStateService);
    fixture = TestBed.createComponent(RouteSearchComponent);
  });

  it('renders the selected route summary and line matches', () => {
    state.setSelection({
      origin,
      destination,
      queryDate: new Date('2025-02-02T00:00:00Z'),
      lineMatches: [
        {
          lineId: 'L1',
          direction: 0,
          originStopIds: ['alpha'],
          destinationStopIds: ['beta']
        }
      ]
    });

    fixture.detectChanges();

    const summaryValues = fixture.debugElement
      .queryAll(By.css('.route-search__summary .route-search__value'))
      .map((debugElement) => (debugElement.nativeElement as HTMLElement).textContent?.trim() ?? '');

    expect(summaryValues.some((value) => value.includes('Alpha Station'))).toBeTrue();
    expect(summaryValues.some((value) => value.includes('Beta Terminal'))).toBeTrue();

    const lineCard = fixture.debugElement.query(By.css('.route-search__result-card'));
    expect(lineCard).not.toBeNull();
    const lineLabel = lineCard.query(By.css('.route-search__line')).nativeElement as HTMLElement;
    expect(lineLabel.textContent).toContain('L1');
  });

  it('shows the empty state when no selection is available', () => {
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('.route-search__empty'));
    expect(empty).not.toBeNull();
  });

  it('renders bottom navigation links', () => {
    fixture.detectChanges();

    const navItems = fixture.debugElement.queryAll(By.css('.route-search__bottom-nav-item'));
    expect(navItems.length).toBeGreaterThanOrEqual(3);
  });
});

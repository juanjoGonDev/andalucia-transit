import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { HomeRecentSearchesComponent } from './home-recent-searches.component';
import {
  RouteSearchHistoryEntry,
  RouteSearchHistoryService
} from '../../../domain/route-search/route-search-history.service';
import { RouteSearchPreviewService, RouteSearchPreview } from '../../../domain/route-search/route-search-preview.service';
import { RouteSearchExecutionService } from '../../../domain/route-search/route-search-execution.service';
import { RouteSearchSelection } from '../../../domain/route-search/route-search-state.service';
import { StopDirectoryOption } from '../../../data/stops/stop-directory.service';

type PreviewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly preview: RouteSearchPreview };

interface ComponentStateItem {
  readonly preview: PreviewState;
}

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      'home.sections.recentStops.empty': 'Empty',
      'home.sections.recentStops.searchDate': 'Search for {{date}}',
      'home.sections.recentStops.searchDateToday': 'Today',
      'home.sections.recentStops.next': 'Next',
      'home.sections.recentStops.previous': 'Previous',
      'home.sections.recentStops.previewLoading': 'Loading',
      'home.sections.recentStops.previewError': 'Error',
      'home.sections.recentStops.noPreview': 'No results',
      'home.sections.recentStops.actions.remove': 'Remove',
      'home.sections.recentStops.actions.clearAll': 'Clear all',
      'home.dialogs.recentStops.remove.title': 'Remove?',
      'home.dialogs.recentStops.remove.message': 'Message',
      'home.dialogs.recentStops.remove.confirm': 'Confirm',
      'home.dialogs.recentStops.remove.cancel': 'Cancel',
      'home.dialogs.recentStops.clearAll.title': 'Clear?',
      'home.dialogs.recentStops.clearAll.message': 'Clear message',
      'home.dialogs.recentStops.clearAll.confirm': 'Confirm',
      'home.dialogs.recentStops.clearAll.cancel': 'Cancel',
      'routeSearch.upcomingLabel': 'In {{time}}',
      'routeSearch.pastLabel': '{{time}} ago'
    });
  }
}

class RouteSearchHistoryStub {
  private readonly subject = new BehaviorSubject<readonly RouteSearchHistoryEntry[]>([]);
  readonly entries$ = this.subject.asObservable();
  readonly remove = jasmine.createSpy('remove');
  readonly clear = jasmine.createSpy('clear');

  emit(entries: readonly RouteSearchHistoryEntry[]): void {
    this.subject.next(entries);
  }
}

class RouteSearchPreviewStub {
  loadPreview = jasmine.createSpy('loadPreview');
}

class RouteSearchExecutionStub {
  prepare = jasmine.createSpy('prepare').and.returnValue(['', 'routes']);
}

describe('HomeRecentSearchesComponent', () => {
  let fixture: ComponentFixture<HomeRecentSearchesComponent>;
  let history: RouteSearchHistoryStub;
  let preview: RouteSearchPreviewStub;
  let execution: RouteSearchExecutionStub;
  const dialogOpenSpy = jasmine
    .createSpy('open')
    .and.returnValue({ afterClosed: () => of(true) });
  const dialogStub = { open: dialogOpenSpy } as unknown as MatDialog;
  const navigateSpy = jasmine.createSpy('navigate').and.resolveTo(true);
  const routerStub = { navigate: navigateSpy } as unknown as Router;

  beforeEach(async () => {
    history = new RouteSearchHistoryStub();
    preview = new RouteSearchPreviewStub();
    execution = new RouteSearchExecutionStub();

    TestBed.configureTestingModule({
      imports: [
        HomeRecentSearchesComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: RouteSearchHistoryService, useValue: history },
        { provide: RouteSearchPreviewService, useValue: preview },
        { provide: RouteSearchExecutionService, useValue: execution },
        { provide: MatDialog, useValue: dialogStub },
        { provide: Router, useValue: routerStub }
      ]
    });

    TestBed.overrideProvider(MatDialog, { useValue: dialogStub });
    TestBed.overrideProvider(Router, { useValue: routerStub });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(HomeRecentSearchesComponent);
    TestBed.inject(TranslateService).use('en');
    fixture.detectChanges();
    dialogOpenSpy.calls.reset();
    navigateSpy.calls.reset();
  });

  it('shows the empty state when there are no recent searches', () => {
    const empty = fixture.debugElement.query(By.css('.home-recent__empty'));
    expect(empty.nativeElement.textContent).toContain('Empty');
  });

  it('renders a recent entry with preview information', fakeAsync(() => {
    const entry = buildEntry('entry-1', new Date('2025-01-01T00:00:00Z'));
    preview.loadPreview.and.returnValue(of<RouteSearchPreview>({
      next: {
        id: 'next',
        lineCode: 'L1',
        destination: 'Destination',
        arrivalTime: new Date('2025-01-01T10:00:00Z'),
        relativeLabel: '5 min',
        kind: 'upcoming'
      },
      previous: null
    }));

    history.emit([entry]);
    flushMicrotasks();
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();

    const items = (
      fixture.componentInstance as unknown as { readonly items: () => readonly ComponentStateItem[] }
    ).items();
    const previewState = items[0]?.preview;

    expect(previewState).toBeDefined();
    expect(previewState?.status).toBe('ready');
    if (previewState?.status === 'ready') {
      expect(previewState.preview.next).not.toBeNull();
    }

    fixture.detectChanges();

    const route = fixture.debugElement.query(By.css('.home-recent__route'));
    expect(route.nativeElement.textContent).toContain('Origin');
    const previewContainer = fixture.debugElement.query(By.css('.home-recent__preview'));
    expect(previewContainer).not.toBeNull();
  }));

  it('navigates when selecting an entry', fakeAsync(() => {
    const entry = buildEntry('entry-2', new Date('2025-01-01T00:00:00Z'));
    preview.loadPreview.and.returnValue(of({ next: null, previous: null }));
    history.emit([entry]);
    tick();
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.home-recent__main'));
    button.nativeElement.click();
    tick();

    expect(execution.prepare).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalled();
  }));

  it('removes an entry after confirmation', fakeAsync(() => {
    const entry = buildEntry('entry-3', new Date('2025-01-01T00:00:00Z'));
    preview.loadPreview.and.returnValue(of({ next: null, previous: null }));
    history.emit([entry]);
    tick();
    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css('.home-recent__remove'));
    removeButton.nativeElement.click();
    tick();

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(history.remove).toHaveBeenCalledWith('entry-3');
  }));

  it('clears all entries after confirmation', fakeAsync(() => {
    preview.loadPreview.and.returnValue(of({ next: null, previous: null }));
    history.emit([buildEntry('entry-4', new Date('2025-01-01T00:00:00Z'))]);
    tick();
    fixture.detectChanges();

    const clearButton = fixture.debugElement.query(By.css('.home-recent__clear'));
    clearButton.nativeElement.click();
    tick();

    expect(history.clear).toHaveBeenCalled();
  }));

  function buildEntry(id: string, queryDate: Date): RouteSearchHistoryEntry {
    return {
      id,
      executedAt: new Date('2025-01-05T12:00:00Z'),
      selection: buildSelection(queryDate)
    };
  }

  function buildSelection(queryDate: Date): RouteSearchSelection {
    const option: StopDirectoryOption = {
      id: 'origin',
      code: '001',
      name: 'Origin',
      municipality: 'Origin',
      municipalityId: 'origin-mun',
      nucleus: 'Origin',
      nucleusId: 'origin-nuc',
      consortiumId: 1,
      stopIds: ['origin-stop']
    };

    return {
      origin: option,
      destination: option,
      queryDate,
      lineMatches: []
    };
  }
});

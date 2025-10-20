import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { TranslateCompiler, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { ActivatedRoute, Router } from '@angular/router';

import {
  OverlayDialogConfig,
  OverlayDialogRef,
  OverlayDialogService
} from '../../../shared/ui/dialog/overlay-dialog.service';

import { HomeRecentSearchesComponent } from './home-recent-searches.component';
import { RouteSearchHistoryEntry } from '../../../domain/route-search/route-search-history.service';
import { RouteSearchSelection } from '../../../domain/route-search/route-search-state.service';
import { StopDirectoryOption } from '../../../domain/stops/stop-directory.facade';
import { RouteSearchPreview } from '../../../domain/route-search/route-search-preview.service';
import { RecentSearchesFacade } from '../../../domain/route-search/recent-searches.facade';

type PreviewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'disabled' }
  | { readonly status: 'ready'; readonly entries: readonly { readonly id: string }[] };

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
      'home.sections.recentStops.previewDisabled': 'Preview disabled',
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

class RecentSearchesFacadeStub {
  private readonly entriesSubject = new BehaviorSubject<readonly RouteSearchHistoryEntry[]>([]);
  private readonly previewEnabledSubject = new BehaviorSubject<boolean>(true);

  readonly entries$ = this.entriesSubject.asObservable();
  readonly previewEnabled$ = this.previewEnabledSubject.asObservable();
  readonly prepareNavigation = jasmine
    .createSpy('prepareNavigation')
    .and.returnValue(['', 'routes']);
  readonly loadPreview = jasmine
    .createSpy('loadPreview')
    .and.returnValue(of<RouteSearchPreview>({ next: null, previous: null }));
  readonly remove = jasmine.createSpy('remove');
  readonly clear = jasmine.createSpy('clear');
  readonly previewEnabled = jasmine
    .createSpy('previewEnabled')
    .and.callFake(() => this.previewEnabledSubject.value);

  emitEntries(entries: readonly RouteSearchHistoryEntry[]): void {
    this.entriesSubject.next(entries);
  }

  setPreviewEnabled(enabled: boolean): void {
    this.previewEnabledSubject.next(enabled);
  }
}

class OverlayDialogServiceStub {
  private response$ = of(true);
  readonly open = jasmine
    .createSpy('open')
    .and.callFake((_: unknown, __?: OverlayDialogConfig<unknown>) => {
      const ref: OverlayDialogRef<boolean> = {
        afterClosed: () => this.response$,
        close: () => undefined
      };
      return ref;
    });

  setResponse(value: boolean): void {
    this.response$ = of(value);
  }
}

describe('HomeRecentSearchesComponent', () => {
  let fixture: ComponentFixture<HomeRecentSearchesComponent>;
  let facade: RecentSearchesFacadeStub;
  let dialog: OverlayDialogServiceStub;
  const navigateSpy = jasmine.createSpy('navigate').and.resolveTo(true);
  const routerStub = { navigate: navigateSpy } as unknown as Router;

  beforeEach(async () => {
    facade = new RecentSearchesFacadeStub();
    dialog = new OverlayDialogServiceStub();
    const activatedRouteStub = { snapshot: {}, url: of([]) } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [
        HomeRecentSearchesComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        { provide: OverlayDialogService, useValue: dialog },
        { provide: Router, useValue: routerStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: RecentSearchesFacade, useValue: facade }
      ]
    });

    TestBed.overrideProvider(OverlayDialogService, { useValue: dialog });
    TestBed.overrideProvider(Router, { useValue: routerStub });
    TestBed.overrideProvider(ActivatedRoute, { useValue: activatedRouteStub });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(HomeRecentSearchesComponent);
    TestBed.inject(TranslateService).use('en');
    fixture.detectChanges();
    dialog.open.calls.reset();
    navigateSpy.calls.reset();
  });

  it('shows the empty state when there are no recent searches', () => {
    const empty = fixture.debugElement.query(By.css('.home-recent__empty'));
    expect(empty.nativeElement.textContent).toContain('Empty');
  });

  it('renders a recent entry with preview information', fakeAsync(() => {
    const entry = buildEntry('entry-1', new Date('2025-01-01T00:00:00Z'));
    facade.loadPreview.and.returnValue(of<RouteSearchPreview>({
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

    facade.emitEntries([entry]);
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
      expect(previewState.entries.length).toBeGreaterThan(0);
    }

    fixture.detectChanges();

    const route = fixture.debugElement.query(By.css('.recent-card__route'));
    expect(route.nativeElement.textContent).toContain('Origin');
    const previewContainer = fixture.debugElement.query(By.css('.recent-card__preview'));
    expect(previewContainer).not.toBeNull();
    const line = fixture.debugElement.query(By.css('.recent-preview-entry__line'));
    expect(line.nativeElement.textContent.trim()).toBe('L1');
    const time = fixture.debugElement.query(By.css('.recent-preview-entry__time'));
    expect(time.nativeElement.classList).toContain('recent-preview-entry__time--next');
  }));

  it('shows the previous preview before the upcoming preview', fakeAsync(() => {
    const entry = buildEntry('entry-order', new Date('2025-01-01T00:00:00Z'));
    facade.loadPreview.and.returnValue(
      of<RouteSearchPreview>({
        next: {
          id: 'next-order',
          lineCode: 'L2',
          destination: 'Destination next',
          arrivalTime: new Date('2025-01-01T11:30:00Z'),
          relativeLabel: 'in 2 min',
          kind: 'upcoming'
        },
        previous: {
          id: 'previous-order',
          lineCode: 'L1',
          destination: 'Destination previous',
          arrivalTime: new Date('2025-01-01T11:00:00Z'),
          relativeLabel: '3 min ago',
          kind: 'past'
        }
      })
    );

    facade.emitEntries([entry]);
    flushMicrotasks();
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();

    const entriesDebug = fixture.debugElement.queryAll(By.css('.recent-preview-entry'));

    expect(entriesDebug.length).toBe(2);
    expect(entriesDebug[0]?.nativeElement.classList).toContain('recent-preview-entry--previous');
    expect(entriesDebug[1]?.nativeElement.classList).toContain('recent-preview-entry--next');
    const previousTime = entriesDebug[0]?.query(By.css('.recent-preview-entry__time'));
    const nextTime = entriesDebug[1]?.query(By.css('.recent-preview-entry__time'));
    expect(previousTime).toBeTruthy();
    expect(nextTime).toBeTruthy();
    expect(previousTime?.nativeElement.classList).toContain('recent-preview-entry__time--previous');
    expect(nextTime?.nativeElement.classList).toContain('recent-preview-entry__time--next');
  }));

  it('shows a disabled message when preview calculations are turned off', fakeAsync(() => {
    facade.setPreviewEnabled(false);
    const entry = buildEntry('entry-disabled', new Date('2025-01-01T00:00:00Z'));
    facade.loadPreview.and.returnValue(of<RouteSearchPreview>({ next: null, previous: null }));

    facade.emitEntries([entry]);
    flushMicrotasks();
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.css('.recent-card__status--disabled'));
    expect(status).not.toBeNull();
    expect(facade.loadPreview).not.toHaveBeenCalled();
  }));

  it('updates the preview when the stream emits new departures', fakeAsync(() => {
    const entry = buildEntry('entry-stream', new Date('2025-01-01T00:00:00Z'));
    const stream = new Subject<RouteSearchPreview>();
    facade.loadPreview.and.returnValue(stream.asObservable());

    facade.emitEntries([entry]);
    flushMicrotasks();
    fixture.detectChanges();

    stream.next({
      next: {
        id: 'next-1',
        lineCode: 'L1',
        destination: 'Destination 1',
        arrivalTime: new Date('2025-01-01T11:00:00Z'),
        relativeLabel: '5 min',
        kind: 'upcoming'
      },
      previous: null
    });
    tick();
    fixture.detectChanges();

    let items = (
      fixture.componentInstance as unknown as { readonly items: () => readonly ComponentStateItem[] }
    ).items();
    let previewState = items[0]?.preview;

    expect(previewState?.status).toBe('ready');
    if (previewState?.status === 'ready') {
      expect(previewState.entries[0]?.id).toBe('next-1');
    }

    stream.next({
      next: {
        id: 'next-2',
        lineCode: 'L2',
        destination: 'Destination 2',
        arrivalTime: new Date('2025-01-01T11:30:00Z'),
        relativeLabel: '2 min',
        kind: 'upcoming'
      },
      previous: null
    });
    tick();
    fixture.detectChanges();

    items = (
      fixture.componentInstance as unknown as { readonly items: () => readonly ComponentStateItem[] }
    ).items();
    previewState = items[0]?.preview;

    expect(previewState?.status).toBe('ready');
    if (previewState?.status === 'ready') {
      expect(previewState.entries[0]?.id).toBe('next-2');
    }

    stream.complete();
  }));

  it('navigates when selecting an entry', fakeAsync(() => {
    const entry = buildEntry('entry-2', new Date('2025-01-01T00:00:00Z'));
    facade.loadPreview.and.returnValue(of({ next: null, previous: null }));
    facade.emitEntries([entry]);
    tick();
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.recent-card__body'));
    button.nativeElement.click();
    tick();

    expect(facade.prepareNavigation).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalled();
  }));

  it('removes an entry after confirmation', fakeAsync(() => {
    const entry = buildEntry('entry-3', new Date('2025-01-01T00:00:00Z'));
    facade.loadPreview.and.returnValue(of({ next: null, previous: null }));
    facade.emitEntries([entry]);
    tick();
    fixture.detectChanges();

    const removeButton = fixture.debugElement.query(By.css('.recent-card__remove'));
    removeButton.nativeElement.click();
    tick();

    expect(dialog.open).toHaveBeenCalled();
    expect(facade.remove).toHaveBeenCalledWith('entry-3');
  }));

  it('clears all entries after confirmation', fakeAsync(() => {
    facade.loadPreview.and.returnValue(of({ next: null, previous: null }));
    facade.emitEntries([buildEntry('entry-4', new Date('2025-01-01T00:00:00Z'))]);
    tick();
    fixture.detectChanges();

    fixture.componentInstance.clearAll();
    flushMicrotasks();

    expect(facade.clear).toHaveBeenCalled();
  }));

  it('emits items state changes when entries update', fakeAsync(() => {
    const states: boolean[] = [];
    fixture.componentInstance.itemsStateChange.subscribe((state) => states.push(state));

    facade.emitEntries([buildEntry('entry-5', new Date('2025-01-01T00:00:00Z'))]);
    tick();
    fixture.detectChanges();

    facade.emitEntries([]);
    tick();
    fixture.detectChanges();

    expect(states).toEqual([true, false]);
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

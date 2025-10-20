import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { skip } from 'rxjs/operators';
import { RecentSearchesFacade } from './recent-searches.facade';
import { RouteSearchExecutionService } from './route-search-execution.service';
import {
  RouteSearchHistoryEntry,
  RouteSearchHistoryService
} from './route-search-history.service';
import { RouteSearchPreferencesService } from './route-search-preferences.service';
import { RouteSearchPreview, RouteSearchPreviewService } from './route-search-preview.service';
import { RouteSearchSelection } from './route-search-state.service';

describe('RecentSearchesFacade', () => {
  let entriesSubject: BehaviorSubject<readonly RouteSearchHistoryEntry[]>;
  let history: jasmine.SpyObj<RouteSearchHistoryService>;
  let preview: jasmine.SpyObj<RouteSearchPreviewService>;
  let execution: jasmine.SpyObj<RouteSearchExecutionService>;
  let preferences: jasmine.SpyObj<RouteSearchPreferencesService>;
  let facade: RecentSearchesFacade;
  const selection: RouteSearchSelection = {
    origin: {
      id: 'origin',
      code: '001',
      name: 'Origin',
      municipality: 'Origin',
      municipalityId: 'origin-municipality',
      nucleus: 'Origin',
      nucleusId: 'origin-nucleus',
      consortiumId: 1,
      stopIds: ['origin-stop']
    },
    destination: {
      id: 'destination',
      code: '002',
      name: 'Destination',
      municipality: 'Destination',
      municipalityId: 'destination-municipality',
      nucleus: 'Destination',
      nucleusId: 'destination-nucleus',
      consortiumId: 1,
      stopIds: ['destination-stop']
    },
    queryDate: new Date('2025-01-01T00:00:00Z'),
    lineMatches: []
  };

  beforeEach(() => {
    entriesSubject = new BehaviorSubject<readonly RouteSearchHistoryEntry[]>([]);
    history = jasmine.createSpyObj<RouteSearchHistoryService>(
      'RouteSearchHistoryService',
      ['remove', 'clear'],
      { entries$: entriesSubject.asObservable() }
    );
    preview = jasmine.createSpyObj<RouteSearchPreviewService>('RouteSearchPreviewService', ['loadPreview']);
    execution = jasmine.createSpyObj<RouteSearchExecutionService>('RouteSearchExecutionService', ['prepare']);
    const previewEnabledSubject = new BehaviorSubject<boolean>(true);
    preferences = jasmine.createSpyObj<RouteSearchPreferencesService>(
      'RouteSearchPreferencesService',
      ['previewEnabled'],
      { previewEnabled$: previewEnabledSubject.asObservable() }
    );
    preferences.previewEnabled.and.callFake(() => previewEnabledSubject.value);

    TestBed.configureTestingModule({
      providers: [
        RecentSearchesFacade,
        { provide: RouteSearchHistoryService, useValue: history },
        { provide: RouteSearchPreviewService, useValue: preview },
        { provide: RouteSearchExecutionService, useValue: execution },
        { provide: RouteSearchPreferencesService, useValue: preferences }
      ]
    });

    facade = TestBed.inject(RecentSearchesFacade);
  });

  it('exposes history entries', async () => {
    const entry: RouteSearchHistoryEntry = {
      id: 'entry',
      executedAt: new Date('2025-01-05T12:00:00Z'),
      selection
    };
    const promise = firstValueFrom(facade.entries$.pipe(skip(1)));
    entriesSubject.next([entry]);

    await expectAsync(promise).toBeResolvedTo([entry]);
  });

  it('delegates navigation preparation to the execution service', () => {
    execution.prepare.and.returnValue(['', 'route']);

    const commands = facade.prepareNavigation(selection);

    expect(commands).toEqual(['', 'route']);
    expect(execution.prepare).toHaveBeenCalledWith(selection);
  });

  it('loads previews through the preview service', async () => {
    const previewValue: RouteSearchPreview = { next: null, previous: null };
    preview.loadPreview.and.returnValue(of(previewValue));

    const result = await firstValueFrom(facade.loadPreview(selection));

    expect(result).toBe(previewValue);
    expect(preview.loadPreview).toHaveBeenCalledWith(selection);
  });

  it('removes entries through the history service', () => {
    facade.remove('recent-id');

    expect(history.remove).toHaveBeenCalledWith('recent-id');
  });

  it('clears entries through the history service', () => {
    facade.clear();

    expect(history.clear).toHaveBeenCalled();
  });

  it('exposes preview preference state', async () => {
    const state = await firstValueFrom(facade.previewEnabled$);

    expect(state).toBeTrue();
    expect(facade.previewEnabled()).toBeTrue();
    expect(preferences.previewEnabled).toHaveBeenCalled();
  });
});

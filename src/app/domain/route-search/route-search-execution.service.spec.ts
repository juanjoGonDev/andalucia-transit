import { TestBed } from '@angular/core/testing';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { RouteSearchExecutionService } from './route-search-execution.service';
import { RouteSearchHistoryService } from './route-search-history.service';
import { RouteSearchSelection, RouteSearchStateService } from './route-search-state.service';

class RouteSearchStateStub {
  setSelection = jasmine.createSpy('setSelection');
}

class RouteSearchHistoryStub {
  record = jasmine.createSpy('record');
}

describe('RouteSearchExecutionService', () => {
  let service: RouteSearchExecutionService;
  let state: RouteSearchStateStub;
  let history: RouteSearchHistoryStub;
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
  const selection: RouteSearchSelection = {
    origin: option,
    destination: option,
    queryDate: new Date('2025-01-01T00:00:00Z'),
    lineMatches: []
  };

  beforeEach(() => {
    state = new RouteSearchStateStub();
    history = new RouteSearchHistoryStub();

    TestBed.configureTestingModule({
      providers: [
        { provide: RouteSearchStateService, useValue: state },
        { provide: RouteSearchHistoryService, useValue: history }
      ]
    });

    service = TestBed.inject(RouteSearchExecutionService);
  });

  it('stores the selection and records it in history', () => {
    const commands = service.prepare(selection);

    expect(state.setSelection).toHaveBeenCalledWith(selection);
    expect(history.record).toHaveBeenCalled();
    const [recordedSelection, recordedDate] = history.record.calls.mostRecent().args;
    expect(recordedSelection).toBe(selection);
    expect(recordedDate instanceof Date).toBeTrue();
    expect(commands).toContain('routes');
  });
});

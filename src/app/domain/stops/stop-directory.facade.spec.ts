import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StopDirectoryService } from '@data/stops/stop-directory.service';
import { StopDirectoryFacade, StopSearchRequest } from '@domain/stops/stop-directory.facade';

describe('StopDirectoryFacade', () => {
  let service: jasmine.SpyObj<StopDirectoryService>;
  let facade: StopDirectoryFacade;

  beforeEach(() => {
    service = jasmine.createSpyObj<StopDirectoryService>('StopDirectoryService', [
      'getOptionByStopId',
      'getStopById',
      'getOptionByStopSignature',
      'getStopBySignature',
      'searchStops'
    ]);

    TestBed.configureTestingModule({
      providers: [StopDirectoryFacade, { provide: StopDirectoryService, useValue: service }]
    });

    facade = TestBed.inject(StopDirectoryFacade);
  });

  it('delegates getOptionByStopId to the directory service', () => {
    const expected$ = of(null);
    service.getOptionByStopId.and.returnValue(expected$);

    const result$ = facade.getOptionByStopId('stop-plaza');

    expect(result$).toBe(expected$);
    expect(service.getOptionByStopId).toHaveBeenCalledWith('stop-plaza');
  });

  it('delegates getRecordByStopId to the directory service', () => {
    const expected$ = of(null);
    service.getStopById.and.returnValue(expected$);

    const result$ = facade.getRecordByStopId('stop-avenida');

    expect(result$).toBe(expected$);
    expect(service.getStopById).toHaveBeenCalledWith('stop-avenida');
  });

  it('delegates consortium-aware option lookup to the directory service', () => {
    const expected$ = of(null);
    service.getOptionByStopSignature.and.returnValue(expected$);

    const result$ = facade.getOptionByStopSignature(7, 'stop-avenida');

    expect(result$).toBe(expected$);
    expect(service.getOptionByStopSignature).toHaveBeenCalledWith(7, 'stop-avenida');
  });

  it('delegates consortium-aware record lookup to the directory service', () => {
    const expected$ = of(null);
    service.getStopBySignature.and.returnValue(expected$);

    const result$ = facade.getRecordByStopSignature(7, 'stop-avenida');

    expect(result$).toBe(expected$);
    expect(service.getStopBySignature).toHaveBeenCalledWith(7, 'stop-avenida');
  });

  it('delegates searchStops to the directory service', () => {
    const expected$ = of([]);
    service.searchStops.and.returnValue(expected$);

    const request: StopSearchRequest = { query: 'avenida', limit: 10 };
    const result$ = facade.searchStops(request);

    expect(result$).toBe(expected$);
    expect(service.searchStops).toHaveBeenCalledWith(request);
  });
});

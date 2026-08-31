import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  StopDirectoryOption,
  StopDirectoryRecord,
  StopDirectoryService
} from '@data/stops/stop-directory.service';
import { StopDirectoryFacade, StopSearchRequest } from '@domain/stops/stop-directory.facade';

const OPTION_WITH_SENTINEL: StopDirectoryOption = {
  id: '7:stop-plaza',
  code: '2125',
  name: 'Ada Byron IES (Universidad)',
  municipality: 'Málaga',
  municipalityId: 'malaga',
  nucleus: 'NN',
  nucleusId: 'missing',
  consortiumId: 7,
  stopIds: ['stop-plaza']
};

const RECORD_WITH_SENTINEL: StopDirectoryRecord = {
  consortiumId: 7,
  stopId: 'stop-plaza',
  stopCode: '2125',
  name: 'Ada Byron IES (Universidad)',
  municipality: 'Málaga',
  municipalityId: 'malaga',
  nucleus: ' nn ',
  nucleusId: 'missing',
  zone: null,
  location: { latitude: 36.72, longitude: -4.42 }
};

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

  it('normalizes option metadata while delegating stop-id lookup', async () => {
    service.getOptionByStopId.and.returnValue(of(OPTION_WITH_SENTINEL));

    const result = await firstValueFrom(facade.getOptionByStopId('stop-plaza'));

    expect(service.getOptionByStopId).toHaveBeenCalledWith('stop-plaza');
    expect(result?.nucleus).toBe('');
  });

  it('normalizes record metadata while delegating stop-id lookup', async () => {
    service.getStopById.and.returnValue(of(RECORD_WITH_SENTINEL));

    const result = await firstValueFrom(facade.getRecordByStopId('stop-plaza'));

    expect(service.getStopById).toHaveBeenCalledWith('stop-plaza');
    expect(result?.nucleus).toBe('');
  });

  it('normalizes consortium-aware option and record lookups', async () => {
    service.getOptionByStopSignature.and.returnValue(of(OPTION_WITH_SENTINEL));
    service.getStopBySignature.and.returnValue(of(RECORD_WITH_SENTINEL));

    const option = await firstValueFrom(facade.getOptionByStopSignature(7, 'stop-plaza'));
    const record = await firstValueFrom(facade.getRecordByStopSignature(7, 'stop-plaza'));

    expect(service.getOptionByStopSignature).toHaveBeenCalledWith(7, 'stop-plaza');
    expect(service.getStopBySignature).toHaveBeenCalledWith(7, 'stop-plaza');
    expect(option?.nucleus).toBe('');
    expect(record?.nucleus).toBe('');
  });

  it('normalizes search results without changing legitimate nucleus names', async () => {
    service.searchStops.and.returnValue(
      of([
        OPTION_WITH_SENTINEL,
        { ...OPTION_WITH_SENTINEL, id: '7:central', nucleus: 'Málaga Centro' }
      ])
    );
    const request: StopSearchRequest = { query: 'malaga', limit: 10 };

    const result = await firstValueFrom(facade.searchStops(request));

    expect(service.searchStops).toHaveBeenCalledWith(request);
    expect(result.map((option) => option.nucleus)).toEqual(['', 'Málaga Centro']);
  });

  it('preserves missing lookups as null', async () => {
    service.getOptionByStopId.and.returnValue(of(null));
    service.getStopById.and.returnValue(of(null));

    expect(await firstValueFrom(facade.getOptionByStopId('missing'))).toBeNull();
    expect(await firstValueFrom(facade.getRecordByStopId('missing'))).toBeNull();
  });
});

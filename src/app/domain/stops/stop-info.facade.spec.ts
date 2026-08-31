import { HttpErrorResponse } from '@angular/common/http';
import { Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { filter, skip } from 'rxjs/operators';
import { SupportedLanguage } from '@core/config';
import { LanguageService } from '@core/services/language.service';
import { StopDirectoryRecord, StopDirectoryService } from '@data/stops/stop-directory.service';
import { StopInfoRecord, StopInfoService } from '@data/stops/stop-info.service';
import { StopInfoFacade, StopInformationState } from '@domain/stops/stop-info.facade';

class LanguageServiceStub {
  private readonly languageSignal = signal<SupportedLanguage>('es');

  get currentLanguage(): Signal<SupportedLanguage> {
    return this.languageSignal.asReadonly();
  }
}

const isReadyState = (
  state: StopInformationState
): state is Extract<StopInformationState, { status: 'ready' }> => state.status === 'ready';

const isNotFoundState = (
  state: StopInformationState
): state is Extract<StopInformationState, { status: 'notFound' }> => state.status === 'notFound';

const isErrorState = (state: StopInformationState): state is Extract<StopInformationState, { status: 'error' }> =>
  state.status === 'error';

describe('StopInfoFacade', () => {
  let facade: StopInfoFacade;
  let stopInfoService: jasmine.SpyObj<StopInfoService>;
  let stopDirectoryService: jasmine.SpyObj<StopDirectoryService>;

  const directoryRecord: StopDirectoryRecord = {
    consortiumId: 7,
    stopId: '56',
    stopCode: '056',
    name: 'Campus Universitario-I',
    municipality: 'Jaén',
    municipalityId: 'mun-1',
    nucleus: 'Jaén',
    nucleusId: 'nuc-1',
    zone: 'A',
    location: { latitude: 37.78574, longitude: -3.77469 }
  } as const;

  const infoRecord: StopInfoRecord = {
    stopNumber: '56',
    consortiumId: 7,
    nucleusId: '1',
    municipalityId: '1',
    zoneId: 'A',
    name: 'Campus Universitario-I',
    description: 'Bus stop',
    observations: 'Main road access',
    isMain: true,
    isInactive: false,
    municipality: 'Jaén',
    nucleus: 'Jaén',
    location: { latitude: 37.78574, longitude: -3.77469 },
    correspondences: ['M02-06', 'M02-07']
  } as const;

  beforeEach(() => {
    stopInfoService = jasmine.createSpyObj<StopInfoService>('StopInfoService', ['loadStopInformation']);
    stopDirectoryService = jasmine.createSpyObj<StopDirectoryService>('StopDirectoryService', [
      'getStopBySignature'
    ]);

    TestBed.configureTestingModule({
      providers: [
        StopInfoFacade,
        { provide: StopInfoService, useValue: stopInfoService },
        { provide: StopDirectoryService, useValue: stopDirectoryService },
        { provide: LanguageService, useClass: LanguageServiceStub }
      ]
    });

    facade = TestBed.inject(StopInfoFacade);
  });

  it('emits a live ready state when the API request succeeds', async () => {
    stopDirectoryService.getStopBySignature.and.returnValue(of(directoryRecord));
    stopInfoService.loadStopInformation.and.returnValue(of(infoRecord));

    const readyStatePromise = firstValueFrom(facade.state$.pipe(filter(isReadyState)));

    facade.selectStop(7, '56');

    const readyState = await readyStatePromise;

    expect(stopInfoService.loadStopInformation).toHaveBeenCalledWith(7, '56', 'es');
    expect(readyState.source).toBe('live');
    expect(readyState.detail.name).toBe('Campus Universitario-I');
  });

  it('falls back to offline data when the API request fails', async () => {
    stopDirectoryService.getStopBySignature.and.returnValue(of(directoryRecord));
    stopInfoService.loadStopInformation.and.returnValue(throwError(() => new Error('Offline')));

    const readyStatePromise = firstValueFrom(facade.state$.pipe(filter(isReadyState)));

    facade.selectStop(7, '56');

    const readyState = await readyStatePromise;

    expect(readyState.source).toBe('offline');
    expect(readyState.detail.stopCode).toBe('056');
  });

  it('emits a not-found state when the stop does not exist', async () => {
    stopDirectoryService.getStopBySignature.and.returnValue(of(directoryRecord));
    stopInfoService.loadStopInformation.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );

    const notFoundPromise = firstValueFrom(facade.state$.pipe(filter(isNotFoundState)));

    facade.selectStop(7, '9999');

    const notFoundState = await notFoundPromise;

    expect(notFoundState.fallback).not.toBeNull();

    if (!notFoundState.fallback) {
      throw new Error('Fallback detail missing');
    }

    expect(notFoundState.fallback.stopCode).toBe('056');
  });

  it('emits an error state when no fallback is available', async () => {
    stopDirectoryService.getStopBySignature.and.returnValue(of(null));
    stopInfoService.loadStopInformation.and.returnValue(throwError(() => new Error('Offline')));

    const errorStatePromise = firstValueFrom(facade.state$.pipe(filter(isErrorState)));

    facade.selectStop(4, '102');

    const errorState = await errorStatePromise;

    expect(errorState).toEqual({ status: 'error', fallback: null });
  });

  it('refreshes the current stop on demand', async () => {
    stopDirectoryService.getStopBySignature.and.returnValue(of(directoryRecord));
    stopInfoService.loadStopInformation.and.returnValue(of(infoRecord));

    const readyStates = facade.state$.pipe(filter(isReadyState));
    const firstReadyPromise = firstValueFrom(readyStates);
    const secondReadyPromise = firstValueFrom(readyStates.pipe(skip(1)));

    facade.selectStop(7, '56');

    await firstReadyPromise;

    facade.refresh();

    await secondReadyPromise;

    expect(stopInfoService.loadStopInformation).toHaveBeenCalledTimes(2);
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import { SupportedLanguage } from '../../core/config';
import { LanguageService } from '../../core/services/language.service';
import { StopDirectoryRecord, StopDirectoryService } from '../../data/stops/stop-directory.service';
import { StopInfoRecord, StopInfoService } from '../../data/stops/stop-info.service';

interface StopSelection {
  readonly consortiumId: number;
  readonly stopNumber: string;
}

export interface StopInformationDetail {
  readonly consortiumId: number;
  readonly stopNumber: string;
  readonly stopCode: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly observations: string | null;
  readonly correspondences: readonly string[];
  readonly municipality: string | null;
  readonly nucleus: string | null;
  readonly zone: string | null;
  readonly location: { readonly latitude: number; readonly longitude: number } | null;
  readonly isMain: boolean | null;
  readonly isInactive: boolean | null;
}

export type StopInformationSource = 'live' | 'offline';

export type StopInformationState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly fallback: StopInformationDetail | null }
  | { readonly status: 'ready'; readonly detail: StopInformationDetail; readonly source: StopInformationSource }
  | { readonly status: 'notFound'; readonly fallback: StopInformationDetail | null }
  | { readonly status: 'error'; readonly fallback: StopInformationDetail | null };

const REFRESH_SIGNAL: void = undefined;

const isSelectionEqual = (left: StopSelection | null, right: StopSelection | null): boolean => {
  if (left === right) {
    return true;
  }

  if (left === null || right === null) {
    return false;
  }

  return left.consortiumId === right.consortiumId && left.stopNumber === right.stopNumber;
};

const normalizeStopNumber = (stopNumber: string): string => stopNumber.trim();

const buildDetailFromInfo = (
  selection: StopSelection,
  info: StopInfoRecord,
  directory: StopDirectoryRecord | null
): StopInformationDetail => ({
  consortiumId: selection.consortiumId,
  stopNumber: info.stopNumber,
  stopCode: directory?.stopCode ?? null,
  name: info.name,
  description: info.description,
  observations: info.observations,
  correspondences: info.correspondences,
  municipality: info.municipality ?? directory?.municipality ?? null,
  nucleus: info.nucleus ?? directory?.nucleus ?? null,
  zone: info.zoneId ?? directory?.zone ?? null,
  location: info.location ?? directory?.location ?? null,
  isMain: info.isMain,
  isInactive: info.isInactive
});

const buildDetailFromDirectory = (
  selection: StopSelection,
  directory: StopDirectoryRecord
): StopInformationDetail => ({
  consortiumId: selection.consortiumId,
  stopNumber: selection.stopNumber,
  stopCode: directory.stopCode,
  name: directory.name,
  description: null,
  observations: null,
  correspondences: [],
  municipality: directory.municipality,
  nucleus: directory.nucleus,
  zone: directory.zone,
  location: directory.location,
  isMain: null,
  isInactive: null
});

const createLoadingState = (fallback: StopInformationDetail | null): StopInformationState => ({
  status: 'loading',
  fallback
});

const createReadyState = (
  detail: StopInformationDetail,
  source: StopInformationSource
): StopInformationState => ({
  status: 'ready',
  detail,
  source
});

const createNotFoundState = (fallback: StopInformationDetail | null): StopInformationState => ({
  status: 'notFound',
  fallback
});

const createErrorState = (fallback: StopInformationDetail | null): StopInformationState => ({
  status: 'error',
  fallback
});

const IDLE_STATE: StopInformationState = { status: 'idle' };

@Injectable({ providedIn: 'root' })
export class StopInfoFacade {
  private readonly stopInfoService = inject(StopInfoService);
  private readonly stopDirectoryService = inject(StopDirectoryService);
  private readonly languageService = inject(LanguageService);

  private readonly selection = new BehaviorSubject<StopSelection | null>(null);
  private readonly refreshTrigger = new Subject<void>();
  private readonly language$ = toObservable(this.languageService.currentLanguage);

  readonly state$: Observable<StopInformationState> = combineLatest([
    this.selection.pipe(distinctUntilChanged(isSelectionEqual)),
    this.language$,
    this.refreshTrigger.pipe(startWith(REFRESH_SIGNAL))
  ]).pipe(
    switchMap(([selection, language]) => {
      if (!selection) {
        return of(IDLE_STATE);
      }

      return this.fetchStopInformation(selection, language);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  selectStop(consortiumId: number, stopNumber: string): void {
    const normalizedNumber = normalizeStopNumber(stopNumber);

    if (normalizedNumber.length === 0) {
      this.selection.next(null);
      return;
    }

    this.selection.next({ consortiumId, stopNumber: normalizedNumber });
  }

  refresh(): void {
    this.refreshTrigger.next();
  }

  private fetchStopInformation(
    selection: StopSelection,
    language: SupportedLanguage
  ): Observable<StopInformationState> {
    return this.stopDirectoryService
      .getStopBySignature(selection.consortiumId, selection.stopNumber)
      .pipe(
        switchMap((directory) => {
          const fallbackDetail = directory ? buildDetailFromDirectory(selection, directory) : null;

          return this.stopInfoService
            .loadStopInformation(selection.consortiumId, selection.stopNumber, language)
            .pipe(
              map((info) =>
                createReadyState(
                  buildDetailFromInfo(selection, info, directory ?? null),
                  'live'
                )
              ),
              startWith(createLoadingState(fallbackDetail)),
              catchError((error) => this.handleLoadError(error, fallbackDetail))
            );
        }),
        startWith(createLoadingState(null))
      );
  }

  private handleLoadError(
    error: unknown,
    fallbackDetail: StopInformationDetail | null
  ): Observable<StopInformationState> {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return of(createNotFoundState(fallbackDetail));
    }

    if (fallbackDetail) {
      return of(createReadyState(fallbackDetail, 'offline'));
    }

    return of(createErrorState(null));
  }
}

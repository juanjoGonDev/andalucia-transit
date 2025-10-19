import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { map, distinctUntilChanged, shareReplay } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { APP_CONFIG } from '../../core/config';
import { StopInfoFacade, StopInformationDetail, StopInformationState } from '../../domain/stops/stop-info.facade';
import { AppLayoutContentDirective } from '../../shared/layout/app-layout-content.directive';
import { AccessibleButtonDirective } from '../../shared/a11y/accessible-button.directive';

interface StopInfoRouteSelection {
  readonly consortiumId: number;
  readonly stopNumber: string;
}

const STOP_INFO_HOME_REDIRECT = ["/", APP_CONFIG.routes.home] as const;

const areSelectionsEqual = (
  left: StopInfoRouteSelection | null,
  right: StopInfoRouteSelection | null
): boolean => {
  if (left === right) {
    return true;
  }

  if (left === null || right === null) {
    return false;
  }

  return left.consortiumId === right.consortiumId && left.stopNumber === right.stopNumber;
};

const normalizeStopNumber = (value: string | null): string => (value ?? '').trim();

const parseConsortiumId = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const toSelection = (paramMap: ParamMap): StopInfoRouteSelection | null => {
  const consortiumParam = paramMap.get(APP_CONFIG.routeParams.stopInfo.consortiumId);
  const stopParam = paramMap.get(APP_CONFIG.routeParams.stopInfo.stopNumber);
  const consortiumId = parseConsortiumId(consortiumParam);
  const stopNumber = normalizeStopNumber(stopParam);

  if (consortiumId === null || stopNumber.length === 0) {
    return null;
  }

  return { consortiumId, stopNumber };
};

const isReadyState = (
  state: StopInformationState
): state is Extract<StopInformationState, { status: 'ready' }> => state.status === 'ready';

const isNotFoundState = (
  state: StopInformationState
): state is Extract<StopInformationState, { status: 'notFound' }> => state.status === 'notFound';

const isErrorState = (
  state: StopInformationState
): state is Extract<StopInformationState, { status: 'error' }> => state.status === 'error';

const isLoadingState = (
  state: StopInformationState
): state is Extract<StopInformationState, { status: 'loading' }> => state.status === 'loading';

@Component({
  selector: 'app-stop-info',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AppLayoutContentDirective,
    AccessibleButtonDirective
  ],
  templateUrl: './stop-info.component.html',
  styleUrls: ['./stop-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StopInfoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly facade = inject(StopInfoFacade);

  protected readonly translation = APP_CONFIG.translationKeys.stopInfo;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.stopInfoBase;
  protected readonly state$ = this.facade.state$;
  protected readonly labels = this.translation.labels;
  protected readonly statusKeys = this.translation.status;
  protected readonly actionKeys = this.translation.actions;
  protected readonly tagKeys = this.translation.tags;

  private readonly selection$ = this.route.paramMap.pipe(
    map((params) => toSelection(params)),
    distinctUntilChanged(areSelectionsEqual),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.selection$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selection) => {
        if (!selection) {
          void this.router.navigate(STOP_INFO_HOME_REDIRECT);
          return;
        }

        this.facade.selectStop(selection.consortiumId, selection.stopNumber);
      });
  }

  protected refresh(): void {
    this.facade.refresh();
  }

  protected trackCorrespondence(_: number, code: string): string {
    return code;
  }

  protected trackTag(_: number, tag: string): string {
    return tag;
  }

  protected isReady(state: StopInformationState): state is Extract<StopInformationState, { status: 'ready' }> {
    return isReadyState(state);
  }

  protected isNotFound(state: StopInformationState): state is Extract<StopInformationState, { status: 'notFound' }> {
    return isNotFoundState(state);
  }

  protected isError(state: StopInformationState): state is Extract<StopInformationState, { status: 'error' }> {
    return isErrorState(state);
  }

  protected isLoading(state: StopInformationState): state is Extract<StopInformationState, { status: 'loading' }> {
    return isLoadingState(state);
  }

  protected showTag(detail: StopInformationDetail, tag: 'main' | 'inactive'): boolean {
    if (tag === 'main') {
      return detail.isMain === true;
    }

    if (tag === 'inactive') {
      return detail.isInactive === true;
    }

    return false;
  }
}

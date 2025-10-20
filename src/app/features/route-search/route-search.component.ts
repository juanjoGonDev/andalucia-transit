import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  QueryList,
  ViewChildren,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { APP_CONFIG } from '../../core/config';
import { RouteSearchExecutionService } from '../../domain/route-search/route-search-execution.service';
import {
  RouteSearchDepartureView,
  RouteSearchResultsService,
  RouteSearchResultsViewModel
} from '../../domain/route-search/route-search-results.service';
import { RouteSearchSelectionResolverService } from '../../domain/route-search/route-search-selection-resolver.service';
import { RouteSearchSelection, RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import {
  buildDateSlug,
  buildStopSlug,
  parseStopSlug
} from '../../domain/route-search/route-search-url.util';
import { StopDirectoryFacade, StopDirectoryOption } from '../../domain/stops/stop-directory.facade';
import { AccessibleButtonDirective } from '../../shared/a11y/accessible-button.directive';
import { AppLayoutContentDirective } from '../../shared/layout/app-layout-content.directive';
import { buildNavigationCommands } from '../../shared/navigation/navigation.util';
import { SectionComponent } from '../../shared/ui/section/section.component';
import { RouteSearchFormComponent } from './route-search-form/route-search-form.component';

@Component({
  selector: 'app-route-search',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    SectionComponent,
    RouteSearchFormComponent,
    AccessibleButtonDirective,
    AppLayoutContentDirective
  ],
  templateUrl: './route-search.component.html',
  styleUrls: [
    './route-search.component.scss',
    './route-search.component-summary.scss',
    './route-search.component-timeline.scss',
    './route-search.component-states.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteSearchComponent implements AfterViewInit {
  @ViewChildren('itemElement', { read: ElementRef })
  private readonly itemElements!: QueryList<ElementRef<HTMLElement>>;
  private pendingScroll = false;
  private lastScrollTargetId: string | null = null;

  private readonly state = inject(RouteSearchStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly resultsService = inject(RouteSearchResultsService);
  private readonly selectionResolver = inject(RouteSearchSelectionResolverService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly stopDirectory = inject(StopDirectoryFacade);
  private readonly timezone = APP_CONFIG.data.timezone;
  private readonly scheduleAccuracyThresholdDays =
    APP_CONFIG.routeSearchData.scheduleAccuracy.warningThresholdDays;
  private readonly originQueryParamKey = APP_CONFIG.routeSearchData.queryParams.originStopId;

  protected readonly translationKeys = APP_CONFIG.translationKeys.routeSearch;
  protected readonly badgeTranslationKeys = APP_CONFIG.translationKeys.stopDetail.badges;
  private readonly routeSegments = APP_CONFIG.routeSegments.routeSearch;
  protected readonly formTitleKey = this.translationKeys.action;
  protected readonly scheduleAccuracyWarningKey = this.translationKeys.scheduleAccuracyWarning;
  protected readonly layoutNavigationKey = APP_CONFIG.routes.routeSearch;

  protected readonly selection = signal<RouteSearchSelection | null>(this.state.getSelection());
  protected readonly results = signal<RouteSearchResultsViewModel>({
    departures: [],
    hasUpcoming: false,
    nextDepartureId: null
  });
  protected readonly originDraft = signal<StopDirectoryOption | null>(null);
  protected readonly hasSelection = computed(() => this.selection() !== null);
  protected readonly departures = computed(() => this.results().departures);
  protected readonly hasResults = computed(() => this.departures().length > 0);
  protected readonly showNoUpcoming = computed(() =>
    this.hasResults() && !this.results().hasUpcoming
  );
  protected readonly showPastSearchNotice = computed(() => {
    const current = this.selection();

    if (!current) {
      return false;
    }

    const today = DateTime.now().setZone(this.timezone).startOf('day');
    const queryDay = DateTime.fromJSDate(current.queryDate, { zone: this.timezone }).startOf('day');

    return queryDay < today;
  });
  protected readonly showScheduleAccuracyWarning = computed(() => {
    const current = this.selection();

    if (!current) {
      return false;
    }

    const today = DateTime.now().setZone(this.timezone).startOf('day');
    const queryDay = DateTime.fromJSDate(current.queryDate, { zone: this.timezone }).startOf('day');

    if (queryDay < today) {
      return true;
    }

    const futureThreshold = today.plus({ days: this.scheduleAccuracyThresholdDays });
    return queryDay > futureThreshold;
  });

  constructor() {
    const initialSelection = this.state.getSelection();
    const selectionStream$ = this.state.selection$.pipe(startWith(initialSelection));
    const params$ = this.route.paramMap.pipe(
      startWith(this.route.snapshot.paramMap),
      map((paramMap) => this.extractParams(paramMap)),
      distinctUntilChanged((first, second) => this.paramsEqual(first, second))
    );
    const queryParams$ = this.route.queryParamMap.pipe(
      startWith(this.route.snapshot.queryParamMap),
      map((paramMap) => paramMap.get(this.originQueryParamKey)),
      distinctUntilChanged()
    );

    queryParams$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((value) => {
          if (!value) {
            return of<StopDirectoryOption | null>(null);
          }

          const parsed = parseStopSlug(value);

          if (parsed) {
            if (parsed.consortiumId !== null) {
              return this.stopDirectory.getOptionByStopSignature(
                parsed.consortiumId,
                parsed.stopId
              );
            }

            return this.stopDirectory.getOptionByStopId(parsed.stopId);
          }

          return this.stopDirectory.getOptionByStopId(value);
        })
      )
      .subscribe((option) => {
        this.originDraft.set(option);
      });

    params$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const current = this.state.getSelection();

          if (current && this.selectionMatchesParams(current, params)) {
            return of<RouteSearchSelection | null>(null);
          }

          return this.selectionResolver.resolveFromSlugs(
            params.originSlug,
            params.destinationSlug,
            params.dateSlug
          );
        })
      )
      .subscribe((resolved) => {
        if (!resolved) {
          return;
        }

        this.state.setSelection(resolved);
      });

    selectionStream$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selection.set(value);

        if (!value) {
          return;
        }

        this.lastScrollTargetId = null;
        this.pendingScroll = false;
      });

    selectionStream$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((value) => {
          if (!value) {
            return of<RouteSearchResultsViewModel>({
              departures: [],
              hasUpcoming: false,
              nextDepartureId: null
            });
          }

          return this.resultsService.loadResults(value);
        })
      )
      .subscribe((result) => {
        const previousNextId = this.results().nextDepartureId;

        this.results.set(result);

        if (!result.nextDepartureId) {
          this.lastScrollTargetId = null;
          this.pendingScroll = false;
          return;
        }

        const isInitialTarget = this.lastScrollTargetId === null;

        if (!isInitialTarget && result.nextDepartureId === this.lastScrollTargetId) {
          return;
        }

        this.lastScrollTargetId = result.nextDepartureId;

        if (isInitialTarget || result.nextDepartureId !== previousNextId) {
          this.queueScrollToNext();
        }
      });
  }

  ngAfterViewInit(): void {
    this.itemElements.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.pendingScroll) {
          this.scrollToNext();
        }
      });
  }

  protected trackDeparture(_: number, item: RouteSearchDepartureView): string {
    return item.id;
  }

  protected navigateBack(): void {
    void this.router.navigate(buildNavigationCommands(APP_CONFIG.routes.home));
  }

  protected async onSelectionConfirmed(selection: RouteSearchSelection): Promise<void> {
    const commands = this.execution.prepare(selection);
    await this.router.navigate(commands);
  }

  protected searchToday(): void {
    const current = this.selection();

    if (!current) {
      return;
    }

    const today = DateTime.now().setZone(this.timezone).startOf('day').toJSDate();

    void this.onSelectionConfirmed({
      ...current,
      queryDate: today
    });
  }

  private queueScrollToNext(): void {
    this.pendingScroll = true;
    setTimeout(() => this.scrollToNext(), 0);
  }

  private scrollToNext(): void {
    if (!this.pendingScroll || !this.itemElements) {
      return;
    }

    const target = this.itemElements
      .toArray()
      .find((element) => element.nativeElement.dataset['next'] === 'true');

    if (!target) {
      return;
    }

    this.pendingScroll = false;
    target.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private extractParams(paramMap: ParamMap): RouteSearchRouteParams {
    return {
      originSlug: paramMap.get(APP_CONFIG.routeParams.routeSearch.origin),
      destinationSlug: paramMap.get(APP_CONFIG.routeParams.routeSearch.destination),
      dateSlug: paramMap.get(APP_CONFIG.routeParams.routeSearch.date)
    } satisfies RouteSearchRouteParams;
  }

  private paramsEqual(
    first: RouteSearchRouteParams,
    second: RouteSearchRouteParams
  ): boolean {
    return (
      first.originSlug === second.originSlug &&
      first.destinationSlug === second.destinationSlug &&
      first.dateSlug === second.dateSlug
    );
  }

  private selectionMatchesParams(
    selection: RouteSearchSelection,
    params: RouteSearchRouteParams
  ): boolean {
    if (!params.originSlug || !params.destinationSlug || !params.dateSlug) {
      return false;
    }

    const originSlug = buildStopSlug(selection.origin);
    const destinationSlug = buildStopSlug(selection.destination);
    const dateSlug = buildDateSlug(selection.queryDate);

    return (
      originSlug === params.originSlug &&
      destinationSlug === params.destinationSlug &&
      dateSlug === params.dateSlug
    );
  }
}

interface RouteSearchRouteParams {
  readonly originSlug: string | null;
  readonly destinationSlug: string | null;
  readonly dateSlug: string | null;
}

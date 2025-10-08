import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  QueryList,
  computed,
  inject,
  signal,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, startWith, switchMap } from 'rxjs';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { APP_CONFIG } from '../../core/config';
import { RouteSearchSelection, RouteSearchStateService } from '../../domain/route-search/route-search-state.service';
import {
  RouteSearchResultsService,
  RouteSearchResultsViewModel,
  RouteSearchLineView,
  RouteSearchLineItem
} from '../../domain/route-search/route-search-results.service';
import {
  BottomNavigationComponent,
  BottomNavigationItem
} from '../../shared/ui/bottom-navigation/bottom-navigation.component';
import { RouteSearchSelectionResolverService } from '../../domain/route-search/route-search-selection-resolver.service';
import { buildDateSlug, buildStopSlug } from '../../domain/route-search/route-search-url.util';

@Component({
  selector: 'app-route-search',
  standalone: true,
  imports: [CommonModule, TranslateModule, BottomNavigationComponent],
  templateUrl: './route-search.component.html',
  styleUrl: './route-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteSearchComponent implements AfterViewInit {
  private static readonly ROOT_COMMAND = '/' as const;

  @ViewChildren('itemElement', { read: ElementRef })
  private readonly itemElements!: QueryList<ElementRef<HTMLElement>>;

  private readonly state = inject(RouteSearchStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly resultsService = inject(RouteSearchResultsService);
  private readonly selectionResolver = inject(RouteSearchSelectionResolverService);

  protected readonly translationKeys = APP_CONFIG.translationKeys.routeSearch;
  protected readonly badgeTranslationKeys = APP_CONFIG.translationKeys.stopDetail.badges;
  private readonly navigationKeys = APP_CONFIG.translationKeys.navigation;

  protected readonly bottomNavigationItems: readonly BottomNavigationItem[] = [
    {
      labelKey: this.navigationKeys.home,
      icon: 'home',
      commands: this.buildCommands(APP_CONFIG.routes.home)
    },
    {
      labelKey: this.navigationKeys.map,
      icon: 'map',
      commands: this.buildCommands(APP_CONFIG.routes.map)
    },
    {
      labelKey: this.navigationKeys.lines,
      icon: 'route',
      commands: this.buildCommands(APP_CONFIG.routes.routeSearch)
    }
  ];

  protected readonly selection = signal<RouteSearchSelection | null>(this.state.getSelection());
  protected readonly results = signal<RouteSearchResultsViewModel>({ lines: [] });
  protected readonly hasSelection = computed(() => this.selection() !== null);
  protected readonly lines = computed(() => this.results().lines);
  protected readonly hasResults = computed(() => this.lines().length > 0);
  protected readonly showNoUpcoming = computed(() =>
    this.hasResults() && !this.lines().some((line) => line.hasUpcoming)
  );

  constructor() {
    const initialSelection = this.state.getSelection();
    const selectionStream$ = this.state.selection$.pipe(startWith(initialSelection));
    const params$ = this.route.paramMap.pipe(
      map((paramMap) => this.extractParams(paramMap))
    );

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
      .subscribe((value) => this.selection.set(value));

    selectionStream$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((value) => {
          if (!value) {
            return of<RouteSearchResultsViewModel>({ lines: [] });
          }

          return this.resultsService.loadResults(value);
        })
      )
      .subscribe((result) => {
        this.results.set(result);
        this.queueScrollToNext();
      });
  }

  ngAfterViewInit(): void {
    this.itemElements.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.scrollToNext());
  }

  protected trackLine(_: number, line: RouteSearchLineView): string {
    return `${line.lineId}-${line.direction}`;
  }

  protected trackLineItem(_: number, item: RouteSearchLineItem): string {
    return item.id;
  }

  protected navigateBack(): void {
    void this.router.navigate(this.buildCommands(APP_CONFIG.routes.home));
  }

  protected changeDate(): void {
    void this.router.navigate(this.buildCommands(APP_CONFIG.routes.home));
  }

  private queueScrollToNext(): void {
    setTimeout(() => this.scrollToNext(), 0);
  }

  private scrollToNext(): void {
    if (!this.itemElements) {
      return;
    }

    const target = this.itemElements
      .toArray()
      .find((element) => element.nativeElement.dataset['next'] === 'true');

    if (!target) {
      return;
    }

    target.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private buildCommands(path: string): readonly string[] {
    if (!path) {
      return [RouteSearchComponent.ROOT_COMMAND];
    }

    return [RouteSearchComponent.ROOT_COMMAND, path];
  }

  private extractParams(paramMap: ParamMap): RouteSearchRouteParams {
    return {
      originSlug: paramMap.get(APP_CONFIG.routeParams.routeSearch.origin),
      destinationSlug: paramMap.get(APP_CONFIG.routeParams.routeSearch.destination),
      dateSlug: paramMap.get(APP_CONFIG.routeParams.routeSearch.date)
    } satisfies RouteSearchRouteParams;
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

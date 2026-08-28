import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import { LanguageService } from '@core/services/language.service';
import {
  CatalogMunicipalityEntry,
  CatalogNucleusEntry,
  ConsortiumCatalogEntry,
  ConsortiumCatalogService
} from '@data/catalog/consortium-catalog.service';
import {
  LineDirectoryEntry,
  LineDirectoryService,
  buildLineKey
} from '@domain/lines/line-directory.service';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import {
  LINE_DETAIL_BASE_SEGMENT,
  NavigationCommands,
  buildLineDetailNavigation
} from '@shared/navigation/navigation.util';
import { LinesUiCopy, getLinesUiCopy } from '@features/lines/lines-ui.copy';

interface LineDirectoryFilters {
  readonly query: string;
  readonly areaId: number | null;
  readonly municipalityId: string | null;
  readonly nucleusId: string | null;
  readonly page: number;
}

type LinesState =
  | { readonly status: 'loading'; readonly lines: readonly LineDirectoryEntry[] }
  | { readonly status: 'error'; readonly lines: readonly LineDirectoryEntry[] }
  | { readonly status: 'ready'; readonly lines: readonly LineDirectoryEntry[] };

type GeographyState =
  | { readonly status: 'idle'; readonly keys: null }
  | { readonly status: 'loading'; readonly keys: null }
  | { readonly status: 'error'; readonly keys: null }
  | { readonly status: 'ready'; readonly keys: ReadonlySet<string> | null };

interface LineDirectoryView {
  readonly status: 'loading' | 'error' | 'ready';
  readonly filters: LineDirectoryFilters;
  readonly lines: readonly LineDirectoryEntry[];
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
  readonly geographyStatus: GeographyState['status'];
}

const PAGE_SIZE = 12;
const FIRST_PAGE = 1;
const QUERY_PARAM_QUERY = 'q';
const QUERY_PARAM_AREA = 'area';
const QUERY_PARAM_MUNICIPALITY = 'municipality';
const QUERY_PARAM_NUCLEUS = 'nucleus';
const QUERY_PARAM_PAGE = 'page';
const EMPTY_LINES: readonly LineDirectoryEntry[] = Object.freeze([]);
const EMPTY_MUNICIPALITIES: readonly CatalogMunicipalityEntry[] = Object.freeze([]);
const EMPTY_NUCLEI: readonly CatalogNucleusEntry[] = Object.freeze([]);

@Component({
  selector: 'app-lines',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppLayoutContentDirective],
  templateUrl: './lines.component.html',
  styleUrl: './lines.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalog = inject(ConsortiumCatalogService);
  private readonly directory = inject(LineDirectoryService);
  private readonly geolocation = inject(GeolocationService);
  private readonly language = inject(LanguageService);

  private readonly queryChanges = new Subject<string>();
  private readonly nearbyKeys = new BehaviorSubject<ReadonlySet<string> | null>(null);

  protected readonly layoutNavigationKey = LINE_DETAIL_BASE_SEGMENT;
  protected readonly copy = computed<LinesUiCopy>(() => getLinesUiCopy(this.language.currentLanguage()));
  protected readonly queryText = signal('');
  protected readonly nearMeActive = signal(false);
  protected readonly locationLoading = signal(false);
  protected readonly locationError = signal(false);

  protected readonly areas$: Observable<readonly ConsortiumCatalogEntry[]> = this.catalog
    .loadConsortiums()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly filters$: Observable<LineDirectoryFilters> = this.route.queryParamMap.pipe(
    map(readFilters),
    tap((filters) => this.queryText.set(filters.query)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly municipalities$: Observable<readonly CatalogMunicipalityEntry[]> =
    this.filters$.pipe(
      switchMap((filters) =>
        filters.areaId ? this.catalog.loadMunicipalities(filters.areaId) : of(EMPTY_MUNICIPALITIES)
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  protected readonly nuclei$: Observable<readonly CatalogNucleusEntry[]> = this.filters$.pipe(
    switchMap((filters) => {
      if (!filters.areaId) {
        return of(EMPTY_NUCLEI);
      }

      return this.catalog.loadNuclei(filters.areaId).pipe(
        map((entries) =>
          filters.municipalityId
            ? entries.filter((entry) => entry.municipalityId === filters.municipalityId)
            : entries
        )
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly linesState$: Observable<LinesState> = this.directory.loadAllLines().pipe(
    map((lines) => ({ status: 'ready', lines }) as const),
    startWith<LinesState>({ status: 'loading', lines: EMPTY_LINES }),
    catchError(() => of<LinesState>({ status: 'error', lines: EMPTY_LINES })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly geographyState$: Observable<GeographyState> = this.filters$.pipe(
    switchMap((filters) => {
      if (!filters.areaId || (!filters.municipalityId && !filters.nucleusId)) {
        return of<GeographyState>({ status: 'idle', keys: null });
      }

      return this.directory
        .loadLineKeysForGeography(filters.areaId, filters.municipalityId, filters.nucleusId)
        .pipe(
          map((keys) => ({ status: 'ready', keys }) as const),
          startWith<GeographyState>({ status: 'loading', keys: null }),
          catchError(() => of<GeographyState>({ status: 'error', keys: null }))
        );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected readonly view$: Observable<LineDirectoryView> = combineLatest([
    this.linesState$,
    this.filters$,
    this.geographyState$,
    this.nearbyKeys
  ]).pipe(
    map(([state, filters, geography, nearby]) =>
      buildView(state, filters, geography, nearby, this.nearMeActive())
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.queryChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => this.updateQueryParams({ [QUERY_PARAM_QUERY]: normalizeQuery(query), page: null }));
  }

  protected onQueryInput(value: string): void {
    this.queryText.set(value);
    this.queryChanges.next(value);
  }

  protected selectArea(value: number | null): void {
    this.nearMeActive.set(false);
    this.nearbyKeys.next(null);
    this.updateQueryParams({
      [QUERY_PARAM_AREA]: value,
      [QUERY_PARAM_MUNICIPALITY]: null,
      [QUERY_PARAM_NUCLEUS]: null,
      [QUERY_PARAM_PAGE]: null
    });
  }

  protected selectMunicipality(value: string | null): void {
    this.updateQueryParams({
      [QUERY_PARAM_MUNICIPALITY]: normalizeNullable(value),
      [QUERY_PARAM_NUCLEUS]: null,
      [QUERY_PARAM_PAGE]: null
    });
  }

  protected selectNucleus(value: string | null): void {
    this.updateQueryParams({
      [QUERY_PARAM_NUCLEUS]: normalizeNullable(value),
      [QUERY_PARAM_PAGE]: null
    });
  }

  protected clearFilters(): void {
    this.queryText.set('');
    this.nearMeActive.set(false);
    this.locationError.set(false);
    this.nearbyKeys.next(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  protected async useNearMe(): Promise<void> {
    if (this.locationLoading()) {
      return;
    }

    this.locationLoading.set(true);
    this.locationError.set(false);

    try {
      const position = await this.geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      });
      const keys = await firstValueFrom(
        this.directory.loadNearbyLineKeys({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      );
      this.nearbyKeys.next(keys);
      this.nearMeActive.set(true);
      this.updateQueryParams({ [QUERY_PARAM_PAGE]: null });
    } catch {
      this.nearbyKeys.next(null);
      this.nearMeActive.set(false);
      this.locationError.set(true);
    } finally {
      this.locationLoading.set(false);
    }
  }

  protected previousPage(view: LineDirectoryView): void {
    if (view.page <= FIRST_PAGE) {
      return;
    }
    this.updateQueryParams({ [QUERY_PARAM_PAGE]: view.page - 1 });
  }

  protected nextPage(view: LineDirectoryView): void {
    if (view.page >= view.pageCount) {
      return;
    }
    this.updateQueryParams({ [QUERY_PARAM_PAGE]: view.page + 1 });
  }

  protected lineCommands(line: LineDirectoryEntry): NavigationCommands {
    return buildLineDetailNavigation(line.consortiumId, line.lineId).commands;
  }

  protected trackLine(_: number, line: LineDirectoryEntry): string {
    return buildLineKey(line.consortiumId, line.lineId);
  }

  protected trackArea(_: number, area: ConsortiumCatalogEntry): number {
    return area.id;
  }

  protected trackMunicipality(_: number, municipality: CatalogMunicipalityEntry): string {
    return municipality.id;
  }

  protected trackNucleus(_: number, nucleus: CatalogNucleusEntry): string {
    return nucleus.id;
  }

  private updateQueryParams(queryParams: Readonly<Record<string, string | number | null>>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}

function readFilters(params: ParamMap): LineDirectoryFilters {
  const areaValue = Number(params.get(QUERY_PARAM_AREA));
  const pageValue = Number(params.get(QUERY_PARAM_PAGE));

  return {
    query: normalizeQuery(params.get(QUERY_PARAM_QUERY) ?? ''),
    areaId: Number.isSafeInteger(areaValue) && areaValue > 0 ? areaValue : null,
    municipalityId: normalizeNullable(params.get(QUERY_PARAM_MUNICIPALITY)),
    nucleusId: normalizeNullable(params.get(QUERY_PARAM_NUCLEUS)),
    page: Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : FIRST_PAGE
  };
}

function buildView(
  state: LinesState,
  filters: LineDirectoryFilters,
  geography: GeographyState,
  nearby: ReadonlySet<string> | null,
  nearMeActive: boolean
): LineDirectoryView {
  if (state.status !== 'ready') {
    return {
      status: state.status,
      filters,
      lines: EMPTY_LINES,
      total: 0,
      page: FIRST_PAGE,
      pageCount: FIRST_PAGE,
      geographyStatus: geography.status
    };
  }

  const query = filters.query.toLocaleLowerCase('es-ES');
  const filtered = state.lines.filter((line) => {
    if (filters.areaId && line.consortiumId !== filters.areaId) {
      return false;
    }

    if (query && !`${line.code} ${line.name}`.toLocaleLowerCase('es-ES').includes(query)) {
      return false;
    }

    if (geography.status === 'ready' && geography.keys && !geography.keys.has(buildLineKey(line.consortiumId, line.lineId))) {
      return false;
    }

    if (nearMeActive && nearby && !nearby.has(buildLineKey(line.consortiumId, line.lineId))) {
      return false;
    }

    return true;
  });

  const pageCount = Math.max(FIRST_PAGE, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const start = (page - FIRST_PAGE) * PAGE_SIZE;

  return {
    status: 'ready',
    filters,
    lines: Object.freeze(filtered.slice(start, start + PAGE_SIZE)),
    total: filtered.length,
    page,
    pageCount,
    geographyStatus: geography.status
  };
}

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeNullable(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

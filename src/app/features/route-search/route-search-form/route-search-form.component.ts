import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  firstValueFrom,
  of,
  timer
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../../core/config';
import {
  StopDirectoryOption,
  StopDirectoryService,
  StopDirectoryStopSignature,
  StopSearchRequest
} from '../../../data/stops/stop-directory.service';
import {
  StopConnectionsService,
  StopConnection,
  STOP_CONNECTION_DIRECTION,
  buildStopConnectionKey
} from '../../../data/route-search/stop-connections.service';
import { RouteSearchSelection } from '../../../domain/route-search/route-search-state.service';
import {
  collectRouteLineMatches,
  createRouteSearchSelection
} from '../../../domain/route-search/route-search-selection.util';
import { MaterialSymbolName } from '../../../shared/ui/types/material-symbol-name';

interface StopAutocompleteGroup {
  readonly id: string;
  readonly label: string;
  readonly municipality: string;
  readonly options: readonly StopDirectoryOption[];
}

const EMPTY_GROUPS: readonly StopAutocompleteGroup[] = Object.freeze([]);
const STOP_REQUIRED_ERROR = 'stopRequired' as const;
const MIN_DATE_ERROR = 'minDate' as const;
const EMPTY_STOP_SIGNATURES: readonly StopDirectoryStopSignature[] = Object.freeze(
  [] as StopDirectoryStopSignature[]
);

@Component({
  selector: 'app-route-search-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatNativeDateModule,
    MatDatepickerModule
  ],
  templateUrl: './route-search-form.component.html',
  styleUrl: './route-search-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteSearchFormComponent implements OnChanges {
  private static readonly START_OF_DAY = {
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0
  } as const;
  private static readonly SORT_LOCALE = 'es-ES' as const;

  private readonly formBuilder = inject(FormBuilder);
  private readonly stopDirectory = inject(StopDirectoryService);
  private readonly stopConnections = inject(StopConnectionsService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() initialSelection: RouteSearchSelection | null = null;
  @Output() readonly selectionConfirmed = new EventEmitter<RouteSearchSelection>();

  private readonly translation = APP_CONFIG.translationKeys.home.sections.search;
  private readonly searchIds = APP_CONFIG.homeData.search;
  private readonly maxAutocompleteOptions = APP_CONFIG.homeData.search.maxAutocompleteOptions;
  private readonly searchDebounceMs = APP_CONFIG.homeData.search.debounceMs;

  private readonly minimumDate = this.buildDefaultDate();
  private readonly minimumDateValidator = this.createMinimumDateValidator(this.minimumDate);
  private readonly stopValidator = this.createStopValidator();

  readonly originFieldId = this.searchIds.originFieldId;
  readonly destinationFieldId = this.searchIds.destinationFieldId;
  readonly dateFieldId = this.searchIds.dateFieldId;
  readonly minSearchDate = this.minimumDate;

  readonly submitLabelKey = this.translation.submit;
  readonly originLabelKey = this.translation.originLabel;
  readonly destinationLabelKey = this.translation.destinationLabel;
  readonly dateLabelKey = this.translation.dateLabel;
  readonly originPlaceholderKey = this.translation.originPlaceholder;
  readonly destinationPlaceholderKey = this.translation.destinationPlaceholder;
  readonly swapLabelKey = this.translation.swapLabel;
  readonly noRoutesMessageKey = this.translation.noRoutes;

  readonly originIcon: MaterialSymbolName = 'my_location';
  readonly destinationIcon: MaterialSymbolName = 'flag';
  readonly dateIcon: MaterialSymbolName = 'calendar_today';
  readonly swapIcon: MaterialSymbolName = 'swap_vert';

  readonly searchForm: FormGroup<RouteSearchFormGroup> = this.formBuilder.group({
    origin: this.formBuilder.control<StopAutocompleteValue>(null, {
      validators: [this.stopValidator]
    }),
    destination: this.formBuilder.control<StopAutocompleteValue>(null, {
      validators: [this.stopValidator]
    }),
    date: this.formBuilder.nonNullable.control<Date>(this.minimumDate, {
      validators: [Validators.required, this.minimumDateValidator]
    })
  });

  private readonly originControl = this.searchForm.controls.origin as FormControl<StopAutocompleteValue>;
  private readonly destinationControl = this.searchForm.controls.destination as FormControl<StopAutocompleteValue>;
  private readonly dateControl = this.searchForm.controls.date;

  private readonly originValue$ = this.originControl.valueChanges.pipe(
    startWith(this.originControl.value)
  );
  private readonly destinationValue$ = this.destinationControl.valueChanges.pipe(
    startWith(this.destinationControl.value)
  );

  private readonly selectedOrigin$ = this.originValue$.pipe(
    map((value) => this.toStopOption(value)),
    distinctUntilChanged((previous, current) => this.areSameStop(previous, current)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly selectedDestination$ = this.destinationValue$.pipe(
    map((value) => this.toStopOption(value)),
    distinctUntilChanged((previous, current) => this.areSameStop(previous, current)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly originQuery$ = this.originValue$.pipe(
    switchMap((value) => this.buildQueryStream(value)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly destinationQuery$ = this.destinationValue$.pipe(
    switchMap((value) => this.buildQueryStream(value)),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly originSignatures$ = this.selectedOrigin$.pipe(
    map((option) => this.toStopSignatures(option)),
    distinctUntilChanged((first, second) => this.areSameStopSignatureList(first, second))
  );

  private readonly destinationSignatures$ = this.selectedDestination$.pipe(
    map((option) => this.toStopSignatures(option)),
    distinctUntilChanged((first, second) => this.areSameStopSignatureList(first, second))
  );

  private readonly originConnections$ = this.originSignatures$.pipe(
    switchMap((signatures) =>
      this.stopConnections.getConnections(signatures, STOP_CONNECTION_DIRECTION.Forward)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly destinationConnections$ = this.destinationSignatures$.pipe(
    switchMap((signatures) =>
      this.stopConnections.getConnections(signatures, STOP_CONNECTION_DIRECTION.Backward)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly originOptions$: Observable<readonly StopDirectoryOption[]> = combineLatest([
    this.originQuery$,
    this.selectedDestination$,
    this.destinationConnections$
  ]).pipe(
    switchMap(([query, destination, connections]) =>
    this.stopDirectory
        .searchStops(this.buildOriginSearchRequest(query, destination, connections))
        .pipe(map((options) => this.filterOptionsByConnections(options, connections)))
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly destinationOptions$: Observable<readonly StopDirectoryOption[]> = combineLatest([
    this.destinationQuery$,
    this.selectedOrigin$,
    this.originConnections$
  ]).pipe(
    switchMap(([query, origin, connections]) =>
    this.stopDirectory
        .searchStops(this.buildDestinationSearchRequest(query, origin, connections))
        .pipe(map((options) => this.filterOptionsByConnections(options, connections)))
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly originGroups$: Observable<readonly StopAutocompleteGroup[]> = this.originOptions$.pipe(
    map((options) => this.groupByNucleus(options))
  );
  readonly destinationGroups$: Observable<readonly StopAutocompleteGroup[]> = this.destinationOptions$.pipe(
    map((options) => this.groupByNucleus(options))
  );

  readonly displayStop = (value: StopAutocompleteValue): string => {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.name;
  };

  readonly trackGroup = (_: number, group: StopAutocompleteGroup): string => group.id;
  readonly trackOption = (_: number, option: StopDirectoryOption): string => option.id;

  readonly noRoutes$ = new BehaviorSubject<boolean>(false);

  private lastPatchedSelectionId: string | null = null;

  constructor() {
    this.observeSelections();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('initialSelection' in changes) {
      this.patchSelection(changes['initialSelection'].currentValue as RouteSearchSelection | null);
    }
  }

  focusDatePicker(datepicker: MatDatepicker<Date>): void {
    datepicker.open();
  }

  async submit(): Promise<void> {
    const origin = this.toStopOption(this.originControl.value);
    const destination = this.toStopOption(this.destinationControl.value);

    if (!origin || !destination) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const selection = await this.buildSelection(origin, destination);

    if (!selection) {
      this.showNoRoutes();
      return;
    }

    this.hideNoRoutes();
    this.selectionConfirmed.emit(selection);
  }

  swap(): void {
    const origin = this.toStopOption(this.originControl.value);
    const destination = this.toStopOption(this.destinationControl.value);

    if (!origin && !destination) {
      return;
    }

    this.originControl.setValue(destination ?? null);
    this.destinationControl.setValue(origin ?? null);
  }

  private async buildSelection(
    origin: StopDirectoryOption,
    destination: StopDirectoryOption
  ): Promise<RouteSearchSelection | null> {
    this.hideNoRoutes();
    const connections = await firstValueFrom(
      this.stopConnections.getConnections(
        this.toStopSignatures(origin),
        STOP_CONNECTION_DIRECTION.Forward
      )
    );
    const matches = collectRouteLineMatches(origin, destination, connections);

    if (!matches.length) {
      return null;
    }

    this.searchForm.updateValueAndValidity();

    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return null;
    }

    const queryDate = this.dateControl.value ?? new Date();
    return createRouteSearchSelection(origin, destination, matches, queryDate);
  }

  private buildOriginSearchRequest(
    query: string,
    destination: StopDirectoryOption | null,
    connections: ReadonlyMap<string, StopConnection>
  ): StopSearchRequest {
    return {
      query,
      excludeStopSignature: this.getPrimaryStopSignature(destination) ?? undefined,
      includeStopSignatures: this.buildIncludeSignatures(connections),
      limit: this.maxAutocompleteOptions
    } satisfies StopSearchRequest;
  }

  private buildDestinationSearchRequest(
    query: string,
    origin: StopDirectoryOption | null,
    connections: ReadonlyMap<string, StopConnection>
  ): StopSearchRequest {
    return {
      query,
      excludeStopSignature: this.getPrimaryStopSignature(origin) ?? undefined,
      includeStopSignatures: this.buildIncludeSignatures(connections),
      limit: this.maxAutocompleteOptions
    } satisfies StopSearchRequest;
  }

  private buildIncludeSignatures(
    connections: ReadonlyMap<string, StopConnection>
  ): readonly StopDirectoryStopSignature[] | undefined {
    if (!connections.size) {
      return undefined;
    }

    const signatures = Array.from(connections.values(), (connection) => ({
      consortiumId: connection.consortiumId,
      stopId: connection.stopId
    } satisfies StopDirectoryStopSignature));

    const unique = new Map<string, StopDirectoryStopSignature>();

    for (const signature of signatures) {
      const key = buildStopConnectionKey(signature.consortiumId, signature.stopId);

      if (!unique.has(key)) {
        unique.set(key, signature);
      }
    }

    return Array.from(unique.values()).slice(0, this.maxAutocompleteOptions);
  }

  private groupByNucleus(options: readonly StopDirectoryOption[]): readonly StopAutocompleteGroup[] {
    if (!options.length) {
      return EMPTY_GROUPS;
    }

    const groups = new Map<string, StopDirectoryOption[]>();

    for (const option of options) {
      const bucket = groups.get(option.nucleusId);

      if (bucket) {
        bucket.push(option);
      } else {
        groups.set(option.nucleusId, [option]);
      }
    }

    const mapped = Array.from(groups.entries(), ([id, members]) => ({
      id,
      label: members[0]?.nucleus ?? '',
      municipality: members[0]?.municipality ?? '',
      options: members
    }));

    mapped.sort((first, second) =>
      first.label.localeCompare(second.label, RouteSearchFormComponent.SORT_LOCALE)
    );

    return Object.freeze(
      mapped.map((group) => ({
        id: group.id,
        label: group.label,
        municipality: group.municipality,
        options: Object.freeze([...group.options])
      }))
    );
  }

  private filterOptionsByConnections(
    options: readonly StopDirectoryOption[],
    connections: ReadonlyMap<string, StopConnection>
  ): readonly StopDirectoryOption[] {
    if (!connections.size) {
      return options;
    }

    return options.filter((option) =>
      option.stopIds.some((id) => connections.has(buildStopConnectionKey(option.consortiumId, id)))
    );
  }

  private buildQueryStream(value: StopAutocompleteValue): Observable<string> {
    const query = this.toQuery(value);

    if (!query) {
      return of(query);
    }

    return timer(this.searchDebounceMs).pipe(map(() => query));
  }

  private observeSelections(): void {
    combineLatest([this.selectedOrigin$, this.selectedDestination$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([origin, destination]) => {
        this.ensureDistinctStops(origin, destination);
        this.hideNoRoutes();
      });
  }

  private ensureDistinctStops(
    origin: StopDirectoryOption | null,
    destination: StopDirectoryOption | null
  ): void {
    if (!origin || !destination) {
      return;
    }

    if (!this.hasIntersection(origin.stopIds, destination.stopIds)) {
      return;
    }

    this.destinationControl.setValue(null);
  }

  private hasIntersection(first: readonly string[], second: readonly string[]): boolean {
    return first.some((value) => second.includes(value));
  }

  private areSameStopSignature(
    first: StopDirectoryStopSignature,
    second: StopDirectoryStopSignature
  ): boolean {
    return first.consortiumId === second.consortiumId && first.stopId === second.stopId;
  }

  private areSameStopSignatureList(
    first: readonly StopDirectoryStopSignature[],
    second: readonly StopDirectoryStopSignature[]
  ): boolean {
    if (first === second) {
      return true;
    }

    if (first.length !== second.length) {
      return false;
    }

    return first.every((signature, index) => this.areSameStopSignature(signature, second[index]));
  }

  private areSameStop(
    first: StopDirectoryOption | null,
    second: StopDirectoryOption | null
  ): boolean {
    if (!first && !second) {
      return true;
    }

    if (!first || !second) {
      return false;
    }

    return first.id === second.id;
  }

  private toStopOption(value: StopAutocompleteValue): StopDirectoryOption | null {
    if (!value || typeof value === 'string') {
      return null;
    }

    return value;
  }

  private toQuery(value: StopAutocompleteValue): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    return value;
  }

  private getPrimaryStopSignature(option: StopDirectoryOption | null): StopDirectoryStopSignature | null {
    if (!option?.stopIds.length) {
      return null;
    }

    return {
      consortiumId: option.consortiumId,
      stopId: option.stopIds[0]
    } satisfies StopDirectoryStopSignature;
  }

  private toStopSignatures(
    option: StopDirectoryOption | null
  ): readonly StopDirectoryStopSignature[] {
    if (!option?.stopIds.length) {
      return EMPTY_STOP_SIGNATURES;
    }

    return option.stopIds.map((stopId) => ({
      consortiumId: option.consortiumId,
      stopId
    } satisfies StopDirectoryStopSignature));
  }

  private createMinimumDateValidator(minimum: Date): ValidatorFn {
    const normalized = this.toStartOfDay(minimum);
    const minimumKey = this.toUtcKey(normalized);

    return (control: AbstractControl<Date | null>): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      const valueKey = this.toUtcKey(value);
      return valueKey < minimumKey ? { [MIN_DATE_ERROR]: { min: normalized } } : null;
    };
  }

  private createStopValidator(): ValidatorFn {
    return (control: AbstractControl<StopAutocompleteValue>): ValidationErrors | null => {
      return this.toStopOption(control.value) ? null : { [STOP_REQUIRED_ERROR]: true };
    };
  }

  private buildDefaultDate(): Date {
    return this.toStartOfDay(new Date());
  }

  private toStartOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(
      RouteSearchFormComponent.START_OF_DAY.hour,
      RouteSearchFormComponent.START_OF_DAY.minute,
      RouteSearchFormComponent.START_OF_DAY.second,
      RouteSearchFormComponent.START_OF_DAY.millisecond
    );
    return copy;
  }

  private toUtcKey(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  private patchSelection(selection: RouteSearchSelection | null): void {
    if (!selection) {
      return;
    }

    const identifier = this.buildSelectionIdentifier(selection);

    if (this.lastPatchedSelectionId === identifier) {
      return;
    }

    this.lastPatchedSelectionId = identifier;

    this.searchForm.patchValue(
      {
        origin: selection.origin,
        destination: selection.destination,
        date: new Date(selection.queryDate.getTime())
      },
      { emitEvent: false }
    );
  }

  private buildSelectionIdentifier(selection: RouteSearchSelection): string {
    return [selection.origin.id, selection.destination.id, selection.queryDate.toISOString()].join('|');
  }

  private showNoRoutes(): void {
    if (!this.noRoutes$.getValue()) {
      this.noRoutes$.next(true);
    }
  }

  private hideNoRoutes(): void {
    if (this.noRoutes$.getValue()) {
      this.noRoutes$.next(false);
    }
  }
}

type StopAutocompleteValue = StopDirectoryOption | string | null;

interface RouteSearchFormGroup {
  readonly origin: FormControl<StopAutocompleteValue>;
  readonly destination: FormControl<StopAutocompleteValue>;
  readonly date: FormControl<Date>;
}

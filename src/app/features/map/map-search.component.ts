import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { APP_CONFIG } from '@core/config';
import {
  MapAreaKind,
  MapSearchTarget,
  searchMapTargets
} from '@features/map/map-search.util';
import {
  AppAutocompleteComponent,
  AppAutocompleteOption,
  AppAutocompleteSelection
} from '@shared/ui/forms/app-autocomplete.component';
import { AppTextFieldPrefixDirective } from '@shared/ui/forms/app-text-field-slots.directive';

const EMPTY_TARGETS: readonly MapSearchTarget[] = Object.freeze([]);
const EMPTY_OPTIONS: readonly AppAutocompleteOption<MapSearchTarget>[] = Object.freeze([]);
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 12;
const SEARCH_FIELD_ID = 'map-network-search' as const;
const ESCAPE_KEY = 'Escape' as const;
const FOCUS_DELAY_MS = 0;

@Component({
  selector: 'app-map-search',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AppAutocompleteComponent,
    AppTextFieldPrefixDirective
  ],
  templateUrl: './map-search.component.html',
  styleUrl: './map-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown)': 'handleSearchKeydown($event)'
  }
})
export class MapSearchComponent {
  @ViewChild('searchToggle')
  private searchToggle?: ElementRef<HTMLButtonElement>;

  @ViewChild('searchField')
  private searchField?: ElementRef<HTMLElement>;

  private readonly translate = inject(TranslateService);
  private readonly targetState = signal<readonly MapSearchTarget[]>(EMPTY_TARGETS);
  private readonly query = signal('');
  private readonly languageRevision = signal(0);
  private readonly searchTranslations = APP_CONFIG.translationKeys.favorites;
  private readonly areaTranslations: Readonly<Record<MapAreaKind, string>> = {
    municipality: APP_CONFIG.translationKeys.stopInfo.labels.municipality,
    nucleus: APP_CONFIG.translationKeys.stopInfo.labels.nucleus,
    zone: APP_CONFIG.translationKeys.stopInfo.labels.zone
  };

  @Input()
  set targets(value: readonly MapSearchTarget[] | null | undefined) {
    this.targetState.set(value ?? EMPTY_TARGETS);
  }

  @Output() readonly targetSelected = new EventEmitter<MapSearchTarget>();

  protected readonly labelKey = this.searchTranslations.searchLabel;
  protected readonly placeholderKey = this.searchTranslations.searchPlaceholder;
  protected readonly closeLabelKey = APP_CONFIG.translationKeys.home.dialogs.nearbyStops.close;
  protected readonly searchFieldId = SEARCH_FIELD_ID;
  protected readonly isExpanded = signal(false);
  protected readonly options = computed<readonly AppAutocompleteOption<MapSearchTarget>[]>(() => {
    this.languageRevision();
    const query = this.query().trim();

    if (query.length < MIN_QUERY_LENGTH) {
      return EMPTY_OPTIONS;
    }

    return searchMapTargets(this.targetState(), query, MAX_RESULTS).map((target) => ({
      value: target,
      label: this.buildLabel(target)
    }));
  });

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(() => {
      this.languageRevision.update((revision) => revision + 1);
    });
  }

  protected openSearch(): void {
    if (this.isExpanded()) {
      return;
    }

    this.isExpanded.set(true);
    this.scheduleFocus(() => this.searchField?.nativeElement.querySelector('input')?.focus());
  }

  protected closeSearch(restoreFocus = true): void {
    if (!this.isExpanded()) {
      return;
    }

    this.query.set('');
    this.isExpanded.set(false);

    if (restoreFocus) {
      this.scheduleFocus(() => this.searchToggle?.nativeElement.focus());
    }
  }

  protected handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== ESCAPE_KEY || !this.isExpanded()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.closeSearch();
  }

  protected handleValueChange(value: string): void {
    this.query.set(value);
  }

  protected handleSelection(selection: AppAutocompleteSelection<MapSearchTarget>): void {
    this.targetSelected.emit(selection.option.value);
    this.closeSearch();
  }

  private buildLabel(target: MapSearchTarget): string {
    if (target.kind === 'stop') {
      return `${target.name} · ${target.code} · ${target.municipality}`;
    }

    const kindLabel = this.translate.instant(this.areaTranslations[target.areaKind]);
    const context = target.context ? ` · ${target.context}` : '';
    return `${kindLabel} · ${target.name}${context}`;
  }

  private scheduleFocus(callback: () => void): void {
    window.setTimeout(callback, FOCUS_DELAY_MS);
  }
}

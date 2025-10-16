import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { DateTime } from 'luxon';
import {
  Subscription,
  catchError,
  firstValueFrom,
  map,
  of,
  startWith,
  switchMap
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  RouteSearchHistoryEntry,
  RouteSearchHistoryService
} from '../../../domain/route-search/route-search-history.service';
import {
  RouteSearchPreviewService,
  RouteSearchPreview,
  RouteSearchPreviewDeparture
} from '../../../domain/route-search/route-search-preview.service';
import { RouteSearchExecutionService } from '../../../domain/route-search/route-search-execution.service';
import { RouteSearchSelection } from '../../../domain/route-search/route-search-state.service';
import { createRouteSearchSelection } from '../../../domain/route-search/route-search-selection.util';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { APP_CONFIG_TOKEN } from '../../../core/tokens/app-config.token';
import { AppConfig } from '../../../core/config';
import { RouteSearchPreferencesService } from '../../../domain/route-search/route-search-preferences.service';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

import {
  PreviewEntryKind,
  PreviewRelativeLabel,
  RecentSearchItem,
  RecentSearchPreviewEntry,
  RecentSearchPreviewState
} from './recent-searches.models';
import { RecentSearchCardComponent } from './ui/recent-search-card/recent-search-card.component';

@Component({
  selector: 'app-home-recent-searches',
  standalone: true,
  imports: [CommonModule, TranslateModule, RecentSearchCardComponent],
  templateUrl: './home-recent-searches.component.html',
  styleUrl: './home-recent-searches.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeRecentSearchesComponent {
  private readonly history = inject(RouteSearchHistoryService);
  private readonly preview = inject(RouteSearchPreviewService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly router = inject(Router);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly preferences = inject(RouteSearchPreferencesService);
  private readonly timezone = this.config.data.timezone;
  private readonly translations = this.config.translationKeys.home.sections.recentStops;
  private readonly dialogTranslations = this.config.translationKeys.home.dialogs.recentStops;
  private readonly previewSubscriptions = new Map<string, Subscription>();

  readonly items = signal<readonly RecentSearchItem[]>([]);
  readonly hasItems = computed(() => this.items().length > 0);
  protected readonly emptyKey = this.translations.empty;
  protected readonly searchDateKey = this.translations.searchDate;
  protected readonly searchDateTodayKey = this.translations.searchDateToday;
  protected readonly loadingKey = this.translations.previewLoading;
  protected readonly errorKey = this.translations.previewError;
  protected readonly noPreviewKey = this.translations.noPreview;
  protected readonly previewDisabledKey = this.translations.previewDisabled;
  protected readonly removeActionKey = this.translations.actions.remove;
  protected readonly upcomingTranslation = this.config.translationKeys.routeSearch.upcomingLabel;
  protected readonly pastTranslation = this.config.translationKeys.routeSearch.pastLabel;

  @Output() readonly itemsStateChange = new EventEmitter<boolean>();

  constructor() {
    this.history.entries$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entries) => this.syncEntries(entries));

    this.destroyRef.onDestroy(() => this.teardownPreviewSubscriptions());
  }

  protected trackById(_: number, item: RecentSearchItem): string {
    return item.id;
  }

  protected async open(item: RecentSearchItem): Promise<void> {
    const commands = this.execution.prepare(item.effectiveSelection);
    await this.router.navigate(commands);
  }

  protected async remove(item: RecentSearchItem): Promise<void> {
    const confirmed = await this.confirm({
      titleKey: this.dialogTranslations.remove.title,
      messageKey: this.dialogTranslations.remove.message,
      confirmKey: this.dialogTranslations.remove.confirm,
      cancelKey: this.dialogTranslations.remove.cancel,
      details: [
        {
          labelKey: this.dialogTranslations.remove.details.origin,
          value: item.originName
        },
        {
          labelKey: this.dialogTranslations.remove.details.destination,
          value: item.destinationName
        }
      ]
    });

    if (!confirmed) {
      return;
    }

    this.history.remove(item.id);
  }

  async clearAll(): Promise<void> {
    const confirmed = await this.confirm({
      titleKey: this.dialogTranslations.clearAll.title,
      messageKey: this.dialogTranslations.clearAll.message,
      confirmKey: this.dialogTranslations.clearAll.confirm,
      cancelKey: this.dialogTranslations.clearAll.cancel,
      details: [
        {
          labelKey: this.dialogTranslations.clearAll.details.count,
          value: this.items().length.toString()
        }
      ]
    });

    if (!confirmed) {
      return;
    }

    this.history.clear();
  }

  private syncEntries(entries: readonly RouteSearchHistoryEntry[]): void {
    const previousItems = this.items();
    const previousMap = new Map(previousItems.map((item) => [item.id, item]));
    const mapped = entries.map((entry) => {
      const mappedItem = this.mapEntry(entry);
      const previous = previousMap.get(mappedItem.id);

      if (previous && this.sameSelection(previous.effectiveSelection, mappedItem.effectiveSelection)) {
        return { ...mappedItem, preview: previous.preview } satisfies RecentSearchItem;
      }

      return mappedItem;
    });

    this.items.set(mapped);
    this.itemsStateChange.emit(mapped.length > 0);

    const ids = new Set(mapped.map((item) => item.id));
    for (const [id, subscription] of this.previewSubscriptions.entries()) {
      if (!ids.has(id)) {
        subscription.unsubscribe();
        this.previewSubscriptions.delete(id);
      }
    }

    mapped.forEach((item) => {
      const previous = previousMap.get(item.id);
      const previousState: RecentSearchPreviewState = previous?.preview ?? { status: 'loading' };
      const needsReload =
        !previous ||
        !this.sameSelection(previous.effectiveSelection, item.effectiveSelection) ||
        this.shouldReload(previousState);

      if (needsReload) {
        this.loadPreview(item);
      }
    });
  }

  private mapEntry(entry: RouteSearchHistoryEntry): RecentSearchItem {
    const resolved = this.resolveQueryDate(entry.selection.queryDate);
    const effectiveSelection = createRouteSearchSelection(
      entry.selection.origin,
      entry.selection.destination,
      entry.selection.lineMatches,
      resolved.date
    );

    return {
      id: entry.id,
      originName: entry.selection.origin.name,
      destinationName: entry.selection.destination.name,
      effectiveSelection,
      effectiveQueryDate: resolved.date,
      showTodayNotice: resolved.adjusted,
      preview: this.preferences.previewEnabled()
        ? { status: 'loading' }
        : { status: 'disabled' }
    } satisfies RecentSearchItem;
  }

  private resolveQueryDate(original: Date): { readonly date: Date; readonly adjusted: boolean } {
    const today = DateTime.now().setZone(this.timezone).startOf('day');
    const query = DateTime.fromJSDate(original).setZone(this.timezone).startOf('day');

    if (query < today) {
      return { date: today.toJSDate(), adjusted: true };
    }

    return { date: new Date(original.getTime()), adjusted: false };
  }

  private loadPreview(item: RecentSearchItem): void {
    this.previewSubscriptions.get(item.id)?.unsubscribe();

    const subscription = this.preferences.previewEnabled$
      .pipe(
        switchMap((enabled) => {
          if (!enabled) {
            return of<RecentSearchPreviewState>({ status: 'disabled' });
          }

          return this.preview.loadPreview(item.effectiveSelection).pipe(
            map<RouteSearchPreview, RecentSearchPreviewState>((value) => this.mapPreview(value)),
            startWith<RecentSearchPreviewState>({ status: 'loading' }),
            catchError(() => of<RecentSearchPreviewState>({ status: 'error' }))
          );
        })
      )
      .subscribe((state) => this.setPreviewState(item.id, state));

    this.previewSubscriptions.set(item.id, subscription);
  }

  private setPreviewState(id: string, state: RecentSearchPreviewState): void {
    this.items.update((current) =>
      current.map((item) => (item.id === id ? { ...item, preview: state } : item))
    );
  }

  private shouldReload(state: RecentSearchPreviewState): boolean {
    return state.status !== 'ready' && state.status !== 'disabled';
  }

  private sameSelection(first: RouteSearchSelection, second: RouteSearchSelection): boolean {
    return (
      first.origin.id === second.origin.id &&
      first.destination.id === second.destination.id &&
      first.queryDate.getTime() === second.queryDate.getTime()
    );
  }

  private teardownPreviewSubscriptions(): void {
    for (const subscription of this.previewSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.previewSubscriptions.clear();
  }

  private mapPreview(preview: RouteSearchPreview): RecentSearchPreviewState {
    const entries: RecentSearchPreviewEntry[] = [];

    if (preview.previous) {
      entries.push(this.mapDeparture(preview.previous, 'previous'));
    }

    if (preview.next) {
      entries.push(this.mapDeparture(preview.next, 'next'));
    }

    return { status: 'ready', entries };
  }

  private mapDeparture(
    departure: RouteSearchPreviewDeparture,
    kind: PreviewEntryKind
  ): RecentSearchPreviewEntry {
    return {
      id: departure.id,
      kind,
      lineCode: departure.lineCode,
      departureTime: departure.arrivalTime,
      relativeLabel: departure.relativeLabel
        ? this.mapRelativeLabel(kind, departure.relativeLabel)
        : null
    } satisfies RecentSearchPreviewEntry;
  }

  private mapRelativeLabel(kind: PreviewEntryKind, value: string): PreviewRelativeLabel {
    const key = kind === 'next' ? this.upcomingTranslation : this.pastTranslation;
    return { key, params: { time: value } } satisfies PreviewRelativeLabel;
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, boolean, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        data,
        size: 'sm'
      }
    );

    const result = await firstValueFrom(dialogRef.afterClosed());
    return result === true;
  }
}

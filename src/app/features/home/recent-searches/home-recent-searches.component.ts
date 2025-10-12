import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  RouteSearchHistoryEntry,
  RouteSearchHistoryService
} from '../../../domain/route-search/route-search-history.service';
import { RouteSearchPreviewService, RouteSearchPreview } from '../../../domain/route-search/route-search-preview.service';
import { RouteSearchExecutionService } from '../../../domain/route-search/route-search-execution.service';
import { RouteSearchSelection } from '../../../domain/route-search/route-search-state.service';
import { createRouteSearchSelection } from '../../../domain/route-search/route-search-selection.util';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { APP_CONFIG_TOKEN } from '../../../core/tokens/app-config.token';
import { AppConfig } from '../../../core/config';

interface PreviewStateLoading {
  readonly status: 'loading';
}

interface PreviewStateError {
  readonly status: 'error';
}

interface PreviewStateReady {
  readonly status: 'ready';
  readonly preview: RouteSearchPreview;
}

type PreviewState = PreviewStateLoading | PreviewStateError | PreviewStateReady;

interface RecentSearchItem {
  readonly id: string;
  readonly originName: string;
  readonly destinationName: string;
  readonly effectiveSelection: RouteSearchSelection;
  readonly effectiveQueryDate: Date;
  readonly showTodayNotice: boolean;
  readonly preview: PreviewState;
}

@Component({
  selector: 'app-home-recent-searches',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatDialogModule],
  templateUrl: './home-recent-searches.component.html',
  styleUrl: './home-recent-searches.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeRecentSearchesComponent {
  private readonly history = inject(RouteSearchHistoryService);
  private readonly preview = inject(RouteSearchPreviewService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly timezone = this.config.data.timezone;
  private readonly translations = this.config.translationKeys.home.sections.recentStops;
  private readonly dialogTranslations = this.config.translationKeys.home.dialogs.recentStops;
  private readonly icon = this.config.homeData.recentStops.icon;

  protected readonly items = signal<readonly RecentSearchItem[]>([]);
  protected readonly hasItems = computed(() => this.items().length > 0);
  protected readonly titleKey = this.translations.title;
  protected readonly emptyKey = this.translations.empty;
  protected readonly searchDateKey = this.translations.searchDate;
  protected readonly searchDateTodayKey = this.translations.searchDateToday;
  protected readonly nextLabelKey = this.translations.next;
  protected readonly previousLabelKey = this.translations.previous;
  protected readonly loadingKey = this.translations.previewLoading;
  protected readonly errorKey = this.translations.previewError;
  protected readonly noPreviewKey = this.translations.noPreview;
  protected readonly removeActionKey = this.translations.actions.remove;
  protected readonly clearAllActionKey = this.translations.actions.clearAll;
  protected readonly upcomingTranslation = this.config.translationKeys.routeSearch.upcomingLabel;
  protected readonly pastTranslation = this.config.translationKeys.routeSearch.pastLabel;
  protected readonly iconName = this.icon;

  constructor() {
    this.history.entries$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entries) => this.syncEntries(entries));
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
      cancelKey: this.dialogTranslations.remove.cancel
    });

    if (!confirmed) {
      return;
    }

    this.history.remove(item.id);
  }

  protected async clearAll(): Promise<void> {
    const confirmed = await this.confirm({
      titleKey: this.dialogTranslations.clearAll.title,
      messageKey: this.dialogTranslations.clearAll.message,
      confirmKey: this.dialogTranslations.clearAll.confirm,
      cancelKey: this.dialogTranslations.clearAll.cancel
    });

    if (!confirmed) {
      return;
    }

    this.history.clear();
  }

  protected isLoading(state: PreviewState): state is PreviewStateLoading {
    return state.status === 'loading';
  }

  protected isError(state: PreviewState): state is PreviewStateError {
    return state.status === 'error';
  }

  protected isReady(state: PreviewState): state is PreviewStateReady {
    return state.status === 'ready';
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

    mapped.forEach((item) => {
      const previous = previousMap.get(item.id);
      const needsReload =
        !previous ||
        !this.sameSelection(previous.effectiveSelection, item.effectiveSelection) ||
        !this.isReady(item.preview);

      if (needsReload) {
        this.setPreviewState(item.id, { status: 'loading' });
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
      preview: { status: 'loading' }
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
    this.preview
      .loadPreview(item.effectiveSelection)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.setPreviewState(item.id, { status: 'ready', preview: value }),
        error: () => this.setPreviewState(item.id, { status: 'error' })
      });
  }

  private setPreviewState(id: string, state: PreviewState): void {
    this.items.update((current) =>
      current.map((item) => (item.id === id ? { ...item, preview: state } : item))
    );
  }

  private sameSelection(first: RouteSearchSelection, second: RouteSearchSelection): boolean {
    return (
      first.origin.id === second.origin.id &&
      first.destination.id === second.destination.id &&
      first.queryDate.getTime() === second.queryDate.getTime()
    );
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data,
        autoFocus: false
      }
    );

    const result = await firstValueFrom(dialogRef.afterClosed());
    return result === true;
  }
}

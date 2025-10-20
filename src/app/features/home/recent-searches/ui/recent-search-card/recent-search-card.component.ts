import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  RecentSearchPreviewEntry,
  RecentSearchPreviewState
} from '@features/home/recent-searches/recent-searches.models';
import { RecentSearchPreviewEntryComponent } from '@features/home/recent-searches/ui/recent-search-preview-entry/recent-search-preview-entry.component';
import {
  RECENT_CARD_BODY_CLASSES,
  RECENT_CARD_HOST_CLASSES,
  RECENT_CARD_REMOVE_CLASSES
} from '@features/home/shared/recent-card-classes';
import { InteractiveCardComponent } from '@shared/ui/cards/interactive-card/interactive-card.component';

@Component({
  selector: 'app-recent-search-card',
  standalone: true,
  imports: [CommonModule, TranslateModule, RecentSearchPreviewEntryComponent, InteractiveCardComponent],
  templateUrl: './recent-search-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentSearchCardComponent {
  @Input({ required: true }) originName!: string;
  @Input({ required: true }) destinationName!: string;
  @Input({ required: true }) searchDate!: Date;
  @Input({ required: true }) showTodayNotice!: boolean;
  @Input({ required: true }) searchDateKey!: string;
  @Input({ required: true }) searchDateTodayKey!: string;
  @Input({ required: true }) loadingKey!: string;
  @Input({ required: true }) errorKey!: string;
  @Input({ required: true }) noPreviewKey!: string;
  @Input({ required: true }) previewDisabledKey!: string;
  @Input({ required: true }) removeActionKey!: string;
  @Input({ required: true }) preview!: RecentSearchPreviewState;

  @Output() readonly open = new EventEmitter<void>();
  @Output() readonly remove = new EventEmitter<void>();
  protected readonly recentCardHostClasses = RECENT_CARD_HOST_CLASSES;
  protected readonly recentCardBodyClasses = RECENT_CARD_BODY_CLASSES;
  protected readonly recentCardRemoveClasses = RECENT_CARD_REMOVE_CLASSES;

  protected trackByEntry(_: number, entry: RecentSearchPreviewEntry): string {
    return entry.id;
  }

  protected onOpen(): void {
    this.open.emit();
  }

  protected onRemove(): void {
    this.remove.emit();
  }

  protected hasEntries(state: RecentSearchPreviewState): boolean {
    return state.status === 'ready' && state.entries.length > 0;
  }

  protected entries(state: RecentSearchPreviewState): readonly RecentSearchPreviewEntry[] {
    return state.status === 'ready' ? state.entries : [];
  }
}

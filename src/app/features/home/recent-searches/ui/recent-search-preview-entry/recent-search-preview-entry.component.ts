import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RecentSearchPreviewEntry } from '@features/home/recent-searches/recent-searches.models';

@Component({
  selector: 'app-recent-search-preview-entry',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './recent-search-preview-entry.component.html',
  styleUrl: './recent-search-preview-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentSearchPreviewEntryComponent {
  @Input({ required: true }) entry!: RecentSearchPreviewEntry;

  protected isPrevious(entry: RecentSearchPreviewEntry): boolean {
    return entry.kind === 'previous';
  }

  protected isNext(entry: RecentSearchPreviewEntry): boolean {
    return entry.kind === 'next';
  }
}

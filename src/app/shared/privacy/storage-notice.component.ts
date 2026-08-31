import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import {
  LEGAL_ROUTE_SEGMENTS,
  getLegalUiCopy
} from '@features/legal/legal-shell-content';
import { StorageNoticeStateService } from './storage-notice-state.service';

@Component({
  selector: 'app-storage-notice',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './storage-notice.component.html',
  styleUrl: './storage-notice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StorageNoticeComponent {
  private readonly languageService = inject(LanguageService);
  private readonly state = inject(StorageNoticeStateService);

  protected readonly visible = signal(!this.state.isDismissed());
  protected readonly copy = computed(() =>
    getLegalUiCopy(this.languageService.currentLanguage())
  );
  protected readonly privacyRoute = [
    '/',
    LEGAL_ROUTE_SEGMENTS.base,
    LEGAL_ROUTE_SEGMENTS.privacy
  ] as const;
  protected readonly storageRoute = [
    '/',
    LEGAL_ROUTE_SEGMENTS.base,
    LEGAL_ROUTE_SEGMENTS.storage
  ] as const;

  protected dismiss(): void {
    this.state.dismiss();
    this.visible.set(false);
  }
}

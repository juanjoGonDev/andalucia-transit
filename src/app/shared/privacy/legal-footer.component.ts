import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import { LEGAL_ROUTE_SEGMENTS, getLegalUiCopy } from '@features/legal/legal-content';

@Component({
  selector: 'app-legal-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-footer.component.html',
  styleUrl: './legal-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalFooterComponent {
  private readonly languageService = inject(LanguageService);

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
  protected readonly termsRoute = [
    '/',
    LEGAL_ROUTE_SEGMENTS.base,
    LEGAL_ROUTE_SEGMENTS.terms
  ] as const;
  protected readonly noticeRoute = [
    '/',
    LEGAL_ROUTE_SEGMENTS.base,
    LEGAL_ROUTE_SEGMENTS.notice
  ] as const;
}

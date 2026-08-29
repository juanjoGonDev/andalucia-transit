import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import { LEGAL_ROUTE_SEGMENTS, getLegalUiCopy } from '@features/legal/legal-shell-content';
import { APP_LAYOUT_CONTEXT, AppLayoutSurface } from '@shared/layout/app-layout-context.token';

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
  private readonly layoutContext = inject(APP_LAYOUT_CONTEXT);

  protected readonly copy = computed(() =>
    getLegalUiCopy(this.languageService.currentLanguage())
  );
  protected readonly activeSurface = computed<AppLayoutSurface>(
    () => this.layoutContext.snapshot().activeSurface ?? 'plain'
  );
  protected readonly visible = computed(
    () => this.layoutContext.snapshot().activeFooterVisibility !== 'hidden'
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

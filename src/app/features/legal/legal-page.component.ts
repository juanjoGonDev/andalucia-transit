import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, TrackByFunction, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import {
  LegalSection,
  getLegalDocument,
  resolveLegalDocumentId
} from './legal-content';

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [CommonModule, AppLayoutContentDirective],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly languageService = inject(LanguageService);
  private readonly documentId = resolveLegalDocumentId(
    this.route.snapshot.data['legalDocumentId']
  );

  protected readonly content = computed(() =>
    getLegalDocument(this.documentId, this.languageService.currentLanguage())
  );

  protected readonly trackSection: TrackByFunction<LegalSection> = (
    _: number,
    section: LegalSection
  ) => section.title;

  protected readonly trackText: TrackByFunction<string> = (_: number, text: string) => text;
}

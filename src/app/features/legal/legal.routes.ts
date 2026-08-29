import { Routes } from '@angular/router';
import { LEGAL_ROUTE_SEGMENTS, LegalDocumentId } from './legal-content';
import { LegalPageComponent } from './legal-page.component';

const legalDocumentRoute = (documentId: LegalDocumentId, path: string) => ({
  path,
  component: LegalPageComponent,
  data: { legalDocumentId }
});

export const LEGAL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: LEGAL_ROUTE_SEGMENTS.privacy,
    pathMatch: 'full'
  },
  legalDocumentRoute('privacy', LEGAL_ROUTE_SEGMENTS.privacy),
  legalDocumentRoute('storage', LEGAL_ROUTE_SEGMENTS.storage),
  legalDocumentRoute('terms', LEGAL_ROUTE_SEGMENTS.terms),
  legalDocumentRoute('notice', LEGAL_ROUTE_SEGMENTS.notice)
];

import {
  LEGAL_DOCUMENT_IDS,
  getLegalDocument,
  resolveLegalDocumentId
} from './legal-content';
import { LEGAL_ROUTE_SEGMENTS, getLegalUiCopy } from './legal-shell-content';

describe('legal content', () => {
  for (const language of ['es', 'en'] as const) {
    it(`provides complete ${language} documents`, () => {
      for (const documentId of LEGAL_DOCUMENT_IDS) {
        const document = getLegalDocument(documentId, language);

        expect(document.id).toBe(documentId);
        expect(document.title.length).toBeGreaterThan(0);
        expect(document.summary.length).toBeGreaterThan(0);
        expect(document.sections.length).toBeGreaterThan(1);
        expect(document.sections.every((section) => section.title.length > 0)).toBeTrue();
        expect(document.sections.every((section) => section.paragraphs.length > 0)).toBeTrue();
      }
    });

    it(`provides complete ${language} navigation and notice copy`, () => {
      const copy = getLegalUiCopy(language);

      expect(copy.footerLabel.length).toBeGreaterThan(0);
      expect(copy.notice.title.length).toBeGreaterThan(0);
      expect(copy.notice.message.length).toBeGreaterThan(0);
      expect(copy.notice.dismiss.length).toBeGreaterThan(0);
      expect(copy.links.privacy.length).toBeGreaterThan(0);
      expect(copy.links.storage.length).toBeGreaterThan(0);
      expect(copy.links.terms.length).toBeGreaterThan(0);
      expect(copy.links.notice.length).toBeGreaterThan(0);
    });
  }

  it('documents every known browser-local functional key', () => {
    const storageText = JSON.stringify(getLegalDocument('storage', 'es'));

    expect(storageText).toContain('andalucia-transit.language');
    expect(storageText).toContain('andalucia-transit.homeTab');
    expect(storageText).toContain('andalucia-transit.routeSearchHistory');
    expect(storageText).toContain('andalucia-transit.routeSearchPreferences');
    expect(storageText).toContain('andalucia-transit.stopFavorites');
    expect(storageText).toContain('andalucia-transit.privacyNotice.v1');
  });

  it('does not describe the current storage notice as analytics consent', () => {
    const storageText = JSON.stringify(getLegalDocument('storage', 'es')).toLowerCase();

    expect(storageText).toContain('no configura cookies de analítica');
    expect(storageText).toContain('publicidad');
  });

  it('records the provider-identification limitation instead of inventing identity data', () => {
    const noticeText = JSON.stringify(getLegalDocument('notice', 'es'));

    expect(noticeText).toContain('artículo 10');
    expect(noticeText).toContain('no publica datos personales');
  });

  it('resolves only the closed legal-document set', () => {
    expect(resolveLegalDocumentId('terms')).toBe('terms');
    expect(resolveLegalDocumentId('unknown')).toBe('privacy');
    expect(resolveLegalDocumentId(null)).toBe('privacy');
  });

  it('owns stable route segments for all legal documents', () => {
    expect(LEGAL_ROUTE_SEGMENTS.base).toBe('legal');
    expect(LEGAL_ROUTE_SEGMENTS.privacy).toBe('privacy');
    expect(LEGAL_ROUTE_SEGMENTS.storage).toBe('storage');
    expect(LEGAL_ROUTE_SEGMENTS.terms).toBe('terms');
    expect(LEGAL_ROUTE_SEGMENTS.notice).toBe('notice');
  });
});

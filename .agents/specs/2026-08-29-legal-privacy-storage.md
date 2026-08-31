# Legal, privacy and storage surfaces

## Request

Complete PR #36 with the legal and privacy surfaces reasonably required for a Spain/EU-facing public transport web application: privacy information, storage/cookie information, terms of use and an accessible first-visit notice. Do not publish, infer or fabricate the repository owner's personal identity, postal address, tax identifier, email address or other personal contact details.

Follow-up 2026-08-29: the global legal footer must not create a white visual break or blank band between the active application surface and fixed bottom navigation. The fix must apply at the shared layout boundary so every current and future view inherits consistent footer treatment rather than patching individual feature pages.

## Evidence

### Repository behavior

- The client persists user-facing functional state in browser storage: language, home tab, route-search history/preferences and stop favourites are canonical keys in `APP_CONFIG`.
- No analytics, advertising or behavioural-tracking dependency is present in `package.json`.
- `src/index.html` loads Public Sans and Material Symbols from Google Fonts.
- Leaflet loads map tiles directly from `https://{s}.tile.openstreetmap.org/...`.
- The application consumes the CTAN API at `https://api.ctan.es` and the Nager.Date holiday API at `https://date.nager.at/api/v3`.
- Geolocation is requested through the browser only when the user invokes location-dependent functionality.

### Footer continuity regression

- User-provided desktop evidence at `localhost:4200/?tab=search` shows the Home hero surface ending in the dark secondary tone while the newly added global legal footer forces a white `var(--color-surface)` band before the fixed bottom navigation.
- `AppLayoutContentDirective` already owns the closed surface choice `hero | plain` for every routed view.
- `AppLayoutContextStore` currently propagates active navigation state but does not expose the routed surface choice to shell siblings.
- `LegalFooterComponent` is rendered by `AppLayoutComponent` outside the routed surface and therefore cannot currently match the active surface; its stylesheet always sets `background: var(--color-surface)`.
- The canonical fix is to propagate the active surface through the existing layout context and derive footer appearance from it. Feature-specific footer overrides would duplicate surface knowledge and leave future routes vulnerable to the same defect.

### Official legal guidance reviewed 2026-08-29

- LSSI article 22.2 regulates storage/retrieval on terminal equipment and requires informed consent unless an exemption applies.
- AEPD's current cookie guide treats storage strictly necessary for a service expressly requested by the user, including user-selected interface preferences, as exempt from consent; it still recommends transparency about exempt technical storage.
- If non-exempt storage is introduced, AEPD requires accepting and rejecting to be presented at the same level and with equivalent visibility before installation.
- GDPR article 13 requires controller identity/contact and other prescribed transparency information when personal data is collected from the data subject.
- LSSI article 10 requires provider identity/contact information when its information-duty regime applies.

Official sources: AEPD `Guía sobre el uso de las cookies`; BOE Ley 34/2002 arts. 10 and 22.2; EUR-Lex Reglamento (UE) 2016/679 art. 13 and Directiva 2002/58/CE art. 5(3).

## Decision

1. Do not implement a misleading consent CMP because current repository evidence shows no analytics, advertising or other clearly non-exempt client-side storage. Use a compact first-visit **storage/privacy notice**, not an “accept all” consent gate.
2. The notice may be dismissed and the dismissal may be remembered locally as functional UI state. It must clearly link to the storage/cookie and privacy pages.
3. Create one legal feature and one localized legal-content owner for Privacy, Storage/Cookies, Terms of Use and Legal Notice. Reuse one page component for all documents rather than duplicating page shells.
4. Describe local storage precisely as browser-local functional state, not as server-side account storage. Do not claim that connection metadata can never be processed: CTAN, Nager.Date, Google Fonts, OpenStreetMap and hosting/network infrastructure receive ordinary request metadata when contacted.
5. State that location is optional, browser-permission controlled and requested only for location-dependent functionality. Do not state that coordinates are never transmitted beyond the browser unless code evidence proves that invariant for every flow.
6. Clearly label Andalucia Transit as an unofficial informational application and make transport information non-contractual; direct users to official transport sources for critical decisions.
7. Do not fabricate owner identity/contact data. The Legal Notice must explicitly avoid representing itself as a complete substitute for LSSI article 10 provider identification when that duty applies. This is a deliberate legal limitation imposed by the request, not hidden compliance debt.
8. Keep a permanent legal navigation surface in the application layout so the information remains easy to access after dismissing the first-visit notice.
9. Treat routed surface appearance as one layout-owned concept. `AppLayoutContentDirective` registers `hero | plain`; the layout context exposes the active surface; the legal footer consumes that state and must not infer route names or duplicate feature styling rules.
10. Hero footers continue the terminal secondary hero tone with inverse legal-link colors. Plain footers use the same muted surface family as plain routed content. Footer spacing must reserve fixed-navigation clearance without inserting a contrasting blank band.
11. Do not change `.github/visual-baseline.json` without the already-required explicit visual approval.

## Scope

- Legal content model and routes.
- Reusable legal page component.
- First-visit storage/privacy notice with accessible semantics and local dismissal.
- Permanent legal links in the global layout.
- Active layout-surface propagation for shell-level footer styling.
- Focused Angular tests for legal routing/content, notice persistence/visibility and layout surface state.
- Browser evidence covering legal access plus representative hero/plain footer continuity on mobile and desktop, including overflow and fixed-navigation clearance.

Out of scope: introducing analytics/advertising, a full consent-management platform for technologies that do not exist, collecting contact details, adding forms, changing hosting/provider contracts, or advancing visual baselines.

## Risks

- A complete LSSI article 10 notice cannot be truthfully produced without provider identifying/contact information when article 10 applies. The UI must not imply otherwise.
- Third-party fonts/map tiles expose ordinary network metadata to their providers. The privacy page must disclose this instead of claiming a zero-third-party architecture.
- Future analytics, embeds, advertising or non-exempt storage would invalidate the informational-only notice and require a consent gate before those technologies execute.
- New fixed/overlay UI can obscure mobile controls; browser coverage must explicitly check hit testing/viewport visibility.
- Surface state is shared shell state. It must unregister cleanly during navigation so a plain route cannot inherit a stale hero footer or vice versa.

## Acceptance

- [ ] `/legal/privacy`, `/legal/storage`, `/legal/terms` and `/legal/notice` resolve within the existing application layout.
- [ ] Privacy content explains categories, purposes, legal/functional context, recipients/categories, retention principles, rights context, geolocation and browser-local state without personal owner details.
- [ ] Storage/Cookie content lists the application's known local storage purposes and states that no analytics/advertising cookies are currently configured.
- [ ] Terms cover unofficial/non-contractual transport information, third-party data, availability, acceptable use and applicable Spanish-law framing without overreaching waivers.
- [ ] Legal Notice does not fabricate provider identity/contact and explicitly records the LSSI-identification limitation.
- [ ] First-visit notice is accessible, dismissible, persisted locally and does not masquerade as consent.
- [ ] Permanent legal links remain available after dismissal.
- [ ] Hero routes render the legal footer as a continuous dark terminal surface with no white band.
- [ ] Plain routes render the legal footer on the same muted surface family as routed content.
- [ ] Footer links and fixed bottom navigation remain visible, keyboard-accessible and unobscured at 390×844 and 1440×900.
- [ ] Unit tests cover localized legal content, notice persistence and active layout-surface ownership.
- [ ] Browser tests cover footer continuity for representative hero and plain routes.
- [ ] CI, lint, Angular tests and browser evidence are green except for the pre-authorized visual-baseline enforcement blocker.
- [ ] `.github/visual-baseline.json` remains unchanged without explicit approval.

## Checks

Repository CI, Angular unit suite, lint, build/deploy checks, dedicated legal-browser QA, PR visual evidence and exact reviewed-baseline comparison. Record exact run IDs after the final product head is pushed.

## Rollback

Revert the legal feature/layout commits. No server schema, API contract, user data or remote migration is introduced. The only new client state is a versioned dismissal key and can be ignored safely by older code.

## Delivery

Continue on PR #36 and `codex/refactorizar-vista-segun-diseno-proporcionado`. Use Conventional atomic commits. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

Legal surfaces are implemented. Core CI and deploy checks recovered after keeping long legal copy lazy-loaded. Dedicated browser QA exposed and isolated a test-harness reload bug; commit `20fe2147ba3a934a283d2dfa6bd9de3a1877be66` corrects that harness. Follow-up footer surface-continuity regression documented from user-provided visual evidence; implementation and regression coverage pending.

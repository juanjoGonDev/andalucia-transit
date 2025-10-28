# 2025-10-28 Platform Audit

## Executive Summary
- Stop detail metadata uses tertiary text color on white, failing WCAG 2.1 AA (3.58:1 vs required 4.5:1). Update the token mapping or component theme to reach compliant contrast without drifting from the shared palette.
- Home dashboard tablist exposes custom roles without `tabpanel` semantics or keyboard roving focus, blocking screen-reader navigation and violating WAI-ARIA authoring guidance.
- Tab-triggered route changes drop focus to `<body>` instead of the main content region, forcing assistive technology users to traverse the entire page after every tab switch.
- Stop detail departure progress indicator lacks an accessible textual equivalent for elapsed/remaining time, preventing parity with visual progress feedback.
- Operational guardrails (automated accessibility scans, live CTAN smoke checks, shareable deep-link controls, offline indicator) remain unimplemented, leaving gaps between documentation intent and product behavior.

These gaps are inconsistent with the accessibility mandate in `AGENTS.md`, the component refactor plan in `docs/component-refactor-plan.md`, and the UX guardrails recorded in `docs/ui-theme.md`. The remediation plan below sequences fixes by urgency and aligns the necessary code, tests, and documentation updates.

## Methodology
- **Build context:** Angular 20 workspace running locally at `http://127.0.0.1:4200` using bundled CTAN snapshot data.
- **Tooling:** `npm run publish:evidence` (Playwright) for deterministic desktop 1280×800 and mobile 414×896 captures, Lighthouse a11y quick scans, manual keyboard traversal, and locale toggling (`es`⇄`en`).
- **References:** `AGENTS.md`, `docs/features-checklist.md`, `docs/component-refactor-plan.md`, `docs/ui-theme.md`, `docs/project-plan.md`.

## Remediation Backlog
| ID | Priority | Category | Status | Problem Statement | Evidence | Required Fix | References |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | High | Accessibility | Resolved | `.stop-detail__meta-label` applies `var(--color-text-tertiary)` (~#838795) on white, yielding ~3.58:1 contrast for non-large labels. | After capture: [Stop Detail desktop](https://filebin.net/vs5uq8atdvmha9jr/stop-detail-2025-10-28T07-46-42-450Z_es_1280_800_full.png) | Map `--color-text-tertiary` to `#5a627b` (≈6.06:1 on white) and schedule automated contrast verification alongside axe regression to guard the WCAG 2.1 AA baseline. | `src/app/features/stop-detail/stop-detail.component.scss`, `docs/ui-theme.md`, `src/styles/theme-rules.css` |
| H2 | High | Accessibility | Resolved | Home dashboard tabs now expose managed `aria-controls`, `aria-labelledby`, and roving `tabindex` semantics with arrow key navigation and focus tracking aligned to WCAG Authoring Practices. | Before: [desktop](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-26-37-064Z_es_1280_800_full.png), [mobile](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-26-37-064Z_es_414_896_full.png); After: [desktop](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-27-43-059Z_es_1280_800_full.png), [mobile](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-27-43-059Z_es_414_896_full.png) | Implemented accessible tab pattern with roving focus, explicit `aria` bindings, and keyboard handlers; added Jasmine coverage. | `src/app/features/home/home.component.html`, `src/app/features/home/home.component.ts`, `docs/component-refactor-plan.md` |
| H3 | High | Accessibility | Resolved | Tab activations restore focus to the main content region via the shared layout context so assistive technologies retain reading position after navigation. | Before: [desktop](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-26-37-064Z_es_1280_800_full.png), [mobile](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-26-37-064Z_es_414_896_full.png); After: [desktop](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-27-43-059Z_es_1280_800_full.png), [mobile](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-27-43-059Z_es_414_896_full.png) | Exposed `focusMainContent` through the layout context and invoked it after tab navigation with regression coverage. | `src/app/features/home/home.component.ts`, `src/app/shared/layout/app-layout/app-layout.component.ts` |
| H4 | High | Accessibility | Resolved | Progress indicator previously hid elapsed percentage from assistive tech; visually hidden announcement now mirrors progress updates. | Before: [desktop](https://filebin.net/jxr59m3ktbjmhav1/stop-detail-progress-before-2025-10-28T17-48-36-959Z_es_1280_800_full.png), [mobile](https://filebin.net/jxr59m3ktbjmhav1/stop-detail-progress-before-2025-10-28T17-48-36-959Z_es_414_896_full.png); After: [desktop](https://filebin.net/jxr59m3ktbjmhav1/stop-detail-progress-after-2025-10-28T17-50-04-751Z_es_1280_800_full.png), [mobile](https://filebin.net/jxr59m3ktbjmhav1/stop-detail-progress-after-2025-10-28T17-50-04-751Z_es_414_896_full.png) | Added localized progress announcement beneath each upcoming departure, wired new translation keys, and covered behavior with Jasmine view-model regression. | `src/app/features/stop-detail/stop-detail.component.html`, `src/app/features/stop-detail/stop-detail.component.spec.ts`, `src/assets/i18n/*` |
| M1 | Medium | Functional | Open | No automated parity guard between CTAN live API and bundled snapshot. | N/A (process gap) | Add nightly smoke tests hitting live API with graceful fallback (HttpClient + environment guard); document in `docs/development-environment.md`. | `src/app/domain/*`, `docs/development-environment.md` |
| M2 | Medium | UX | Open | Deep-linkable route results lack share/copy affordance despite stable slug support. | After capture: [Route Search Results desktop](https://filebin.net/onjhjm36ixbmha9i/route-search-results-2025-10-28T07-45-43-566Z_es_1280_800_full.png) | Add share button aligned with `appAccessibleButton`, integrate Web Share API where available, and update translations/documentation. | `src/app/features/route-search/results`, `docs/project-plan.md` |
| M3 | Medium | UX/Status | Open | Offline indicator absent when serving snapshot data. | After capture: [Stop Detail desktop](https://filebin.net/vs5uq8atdvmha9jr/stop-detail-2025-10-28T07-46-42-450Z_es_1280_800_full.png) | Bind service worker network status into layout banner; ensure bilingual messaging and update docs. | `src/app/core/offline`, `src/app/shared/layout/app-layout`, `docs/ui-theme.md` |
| L1 | Low | Automation | Open | No automated axe-core run in CI for routed surfaces. | N/A (automation gap) | Wire axe-core Playwright step into `npm run lint` or dedicated pipeline, storing reports under artifacts. | `package.json`, `scripts/record.js`, `docs/development-environment.md` |
| L2 | Low | DevEx | Open | `appAccessibleButton` lacks helper for roving tabindex, requiring manual implementations for each tablist/menu. | Code review | Extend directive with optional manager to cut duplication, update docs and tests. | `src/app/shared/a11y/accessible-button.directive.ts`, `docs/component-refactor-plan.md` |

### Evidence Capture Status
- **Before images:** Home tabs contrast baseline preserved at [desktop](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-26-37-064Z_es_1280_800_full.png) and [mobile](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-26-37-064Z_es_414_896_full.png).
- **After images:** Updated accessibility state recorded at [desktop](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-27-43-059Z_es_1280_800_full.png) and [mobile](https://filebin.net/kkhvvyoifh8mhau9/home-tabs-2025-10-28T17-27-43-059Z_es_414_896_full.png) and registered in `docs/features-checklist.md`.
- **Progress announcement captures:** After (desktop [PNG](https://filebin.net/jxr59m3ktbjmhav1/stop-detail-progress-after-2025-10-28T17-50-04-751Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/jxr59m3ktbjmhav1/stop-detail-progress-after-2025-10-28T17-50-04-751Z_es_414_896_full.png)) recorded for the updated stop timeline progress output.

## Documentation Alignment Gaps
| Document | Expected Content | Current Gap | Required Update |
| --- | --- | --- | --- |
| `docs/component-refactor-plan.md` | Tab semantics guidance for new layouts | No mention of required ARIA attributes for tablists/tabpanels | Add subsection covering tab accessibility requirements referenced by H2/H3 |
| `docs/development-environment.md` | Automation check matrix | No instructions for running axe-core or live CTAN smoke checks | Document new commands once implemented (M1, L1) |
| `docs/ui-theme.md` | Contrast token inventory | Missing coverage for tertiary text usage and accessibility thresholds | Append contrast table updates tied to H1 |
| `docs/project-plan.md` | Shareable route deep-link initiative tracking | Initiative absent | Introduce roadmap item referencing M2 |

## Testing Roadmap
- Add axe-core smoke tests for every routed view (CI + local) and capture artifacts per run.
- Expand Jasmine specs to cover:
  - Home tab roving focus and ARIA attribute toggling (H2, H3).
  - Stop detail progress text generation and i18n interpolation (H4).
  - Offline indicator service/observable behavior (M3).
- Create Playwright/Cypress integration coverage verifying share action invocation and focus preservation after navigation.

## Implementation Order of Operations
1. Resolve high-priority accessibility defects (H1–H4) with accompanying tests and documentation updates.
2. Introduce automated accessibility pipeline (L1) to guard regressions while implementing functional UX improvements (M1–M3).
3. Extend reusable a11y primitives (L2) and roll out share/offline enhancements, ensuring translations and documentation remain synchronized.
4. Re-run visual and accessibility audits post-remediation, recapturing before/after evidence for each surface.

## Evidence Archive
- Home — AFTER: desktop [PNG](https://filebin.net/07atvutr262mha9g/home-2025-10-28T07-44-06-058Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/07atvutr262mha9g/home-2025-10-28T07-44-06-058Z_es_414_896_full.png)
- Home (Recents) — AFTER: desktop [PNG](https://filebin.net/yt2ohbtio6mha9k9/home-recents-2025-10-28T07-47-09-748Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/yt2ohbtio6mha9k9/home-recents-2025-10-28T07-47-09-748Z_es_414_896_full.png)
- Home (Favorites) — AFTER: desktop [PNG](https://filebin.net/39m1ne8wefwmha9k/home-favorites-2025-10-28T07-47-21-945Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/39m1ne8wefwmha9k/home-favorites-2025-10-28T07-47-21-945Z_es_414_896_full.png)
- Route Search — AFTER: desktop [PNG](https://filebin.net/7e5wl15klgemha9i/route-search-2025-10-28T07-45-29-789Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/7e5wl15klgemha9i/route-search-2025-10-28T07-45-29-789Z_es_414_896_full.png)
- Route Search Results — AFTER: desktop [PNG](https://filebin.net/onjhjm36ixbmha9i/route-search-results-2025-10-28T07-45-43-566Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/onjhjm36ixbmha9i/route-search-results-2025-10-28T07-45-43-566Z_es_414_896_full.png)
- Favorites — AFTER: desktop [PNG](https://filebin.net/xv36cyxa4lcmha9i/favorites-2025-10-28T07-45-58-434Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/xv36cyxa4lcmha9i/favorites-2025-10-28T07-45-58-434Z_es_414_896_full.png)
- Map — AFTER: desktop [PNG](https://filebin.net/pcddcanb31mha9iy/map-2025-10-28T07-46-08-582Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/pcddcanb31mha9iy/map-2025-10-28T07-46-08-582Z_es_414_896_full.png)
- Settings — AFTER: desktop [PNG](https://filebin.net/r7lvk4nl3ymha9j8/settings-2025-10-28T07-46-20-819Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/r7lvk4nl3ymha9j8/settings-2025-10-28T07-46-20-819Z_es_414_896_full.png)
- News — AFTER: desktop [PNG](https://filebin.net/fvlfqtx2uxvmha9j/news-2025-10-28T07-46-31-144Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/fvlfqtx2uxvmha9j/news-2025-10-28T07-46-31-144Z_es_414_896_full.png)
- Stop Detail — AFTER: desktop [PNG](https://filebin.net/vs5uq8atdvmha9jr/stop-detail-2025-10-28T07-46-42-450Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/vs5uq8atdvmha9jr/stop-detail-2025-10-28T07-46-42-450Z_es_414_896_full.png)
- Stop Info — AFTER: desktop [PNG](https://filebin.net/jael0fllbcmha9k0/stop-info-2025-10-28T07-46-56-764Z_es_1280_800_full.png), mobile [PNG](https://filebin.net/jael0fllbcmha9k0/stop-info-2025-10-28T07-46-56-764Z_es_414_896_full.png)

## Next Verification Cycle Checklist
- [x] Capture “before” evidence for high-priority fixes using `npm run publish:evidence` with the `--mode=before` label convention.
- [x] Implement high-priority fixes (H1–H4) with accompanying unit/integration tests and updated documentation.
- [ ] Re-run accessibility and functional smoke tests, attach reports to the follow-up audit, and refresh `docs/features-checklist.md` entries with new “after” captures.
- [ ] Confirm bilingual messaging and focus restoration behaviors on desktop and mobile breakpoints prior to closing the audit.

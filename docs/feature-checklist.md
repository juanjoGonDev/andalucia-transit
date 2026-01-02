# Feature Checklist (Actionable Backlog)

## Context (short)
This backlog records only outstanding work discovered during the latest in-app review performed under the rules defined in `AGENTS.md`; previously completed items live in the knowledge map and audit logs.

## Conventions
- **Priority**: P0 (critical), P1 (important), P2 (nice-to-have)
- **Tags**: [accessibility], [visual], [functional], [docs], [testing], [i18n], [tooling]
- **Evidence Policy**: Record textual evidence for desktop, tablet, and mobile viewports (viewport, reproduction steps, selectors, observed vs expected, measurements). Keep any local captures in gitignored folders and do not upload media.

## Backlog (Pending Items Only)

### Accessibility
- [x] **Reinstate structured keyboard roving for Home dashboard tabs** [P0] [accessibility] [functional]
  - **Rationale:** Current implementation falls back to basic buttons, violating the composite control guidance in `AGENTS.md` and breaking Arrow/Home/End navigation for keyboard and assistive tech users.
  - **Repro (text only):** Desktop 1440×900, focus the Home tablist with `Tab`, press ArrowRight repeatedly; observe focus leaves the tablist instead of moving between tabs.
  - **Observed vs Expected:** Observed: focus jumps to page content, active indicator does not move. Expected: roving tabindex keeps focus inside the tablist, updating the active tab without DOM focus leakage.
  - **Root-Cause Hypothesis:** `home-dashboard-tabs.component.ts` no longer wires the shared keyboard matcher utilities or manages tabindex attributes on tab buttons.
  - **Proposed Fix (reasoned):** Restore roving tabindex handling within the component controller using the shared accessible-button directive, reinstate directional key handling utilities, and ensure focus is returned to the activated tab after content navigation, all scoped to the component per style co-location policy.
  - **Acceptance Criteria (measurable):**
    1) ArrowLeft/ArrowRight navigate between visible tabs without escaping the tablist; Home/End jump to first/last tab.
    2) Focus indicator remains visible (≥3:1 contrast) on the active tab after keyboard interaction and after returning from routed sub-views.
  - **Tests:** Extend `home.component.spec.ts` with directional key unit tests; add Playwright flow in `tests/playwright/home-tabs.keyboard.spec.ts` asserting focus order.
  - **Affected Areas (guess):** `src/app/features/home/home.component.*`, `src/app/shared/a11y/*`.
  - **Docs to Update:** `docs/audit/home-dashboard.md`, `docs/accessibility/keyboard-patterns.md`, `AGENTS.md` decision log.
  - _Done on 2025-10-28 – reinstated roving tabindex via accessible-button overrides, added keyboard matchers, focus restoration, unit coverage, and Playwright navigation checks._

- [x] **Deliver concise live-region updates for stop timeline progress** [P1] [accessibility]
  - **Rationale:** Screen reader users receive no progress cues for upcoming departures, conflicting with the narration expectations captured in previous audits.
  - **Repro (text only):** Mobile 414×896 with VoiceOver, open Stop Detail, toggle between departures while timeline updates; no announcements occur.
  - **Observed vs Expected:** Observed: silent updates. Expected: polite live region announces percentage/status once per change without duplicating static labels.
  - **Root-Cause Hypothesis:** The visually hidden narration span and translation hooks were removed when the stop timeline was simplified.
  - **Proposed Fix (reasoned):** Introduce an aria-live="polite" element scoped inside the timeline component that emits localized summaries when progress value or status changes, throttled to avoid duplicate speech; keep strings in translation dictionaries per i18n policy.
  - **Acceptance Criteria (measurable):**
    1) Live region announces progress deltas in ES and EN only when underlying data changes.
    2) VoiceOver/NVDA testing confirms no double reading of static labels or percentages.
  - **Tests:** Add unit coverage for the timeline service/controller verifying emission conditions; include axe-core assertion in Playwright `tests/playwright/stop-detail.accessibility.spec.ts` checking for exactly one live region with correct politeness.
  - **Affected Areas (guess):** `src/app/features/stop-detail/components/stop-timeline/*`, `src/assets/i18n/es.json`, `src/assets/i18n/en.json`.
  - **Docs to Update:** `docs/accessibility/stop-detail.md`, `docs/feature-checklist.md` audit notes, `AGENTS.md` accessibility section.
  - _Done on 2025-10-30 – Added localized polite live region with bounded progress messaging, refreshed ES/EN strings, unit + Playwright coverage, and documented workflow in accessibility/audit shards with Filebin evidence._

### Visual Consistency
- [x] **Restore tertiary metadata contrast compliance** [P0] [visual] [testing]
  - **Rationale:** Tertiary text tokens reverted to low-contrast values; multiple views (stop metadata, favorites cards) now drop below WCAG 2.1 AA at 4.5:1.
  - **Repro (text only):** Desktop 1440×900, open Stop Detail; inspect `.stop-timeline__meta` text (#7a859b on #f6f7fb) with contrast tool → ~3.3:1.
  - **Observed vs Expected:** Observed ratios <4.5:1. Expected tokens meeting ≥4.5:1 for normal text per accessibility policy.
  - **Root-Cause Hypothesis:** Theme token `--color-text-tertiary` reset to legacy palette without contrast validation, propagating to multiple components.
  - **Proposed Fix (reasoned):** Update theme token values to meet 4.5:1 on light backgrounds and verify dark theme equivalents; refactor components to rely solely on tokens (no ad-hoc overrides) and document measurement sources.
  - **Acceptance Criteria (measurable):**
    1) All tertiary text surfaces reach ≥4.5:1 against background in audited breakpoints.
    2) No component overrides required; tokens pass unit snapshot tests.
  - **Tests:** Add unit tests for token exports in `src/theme/tokens.spec.ts`; augment Playwright visual check `tests/e2e/theme/contrast.spec.ts` to validate computed ratios via `window.getComputedStyle`.
  - **Affected Areas (guess):** `src/theme/tokens.ts`, styles under `src/app/features/stop-detail`, `src/app/features/favorites`, `src/app/features/routes`.
  - **Docs to Update:** `docs/ui-theme.md`, `docs/audit/contrast-report.md`, knowledge map palette references.
  - _Done on 2025-10-31 – Raised `--color-text-tertiary` to `#5a627b`, documented measurements in the contrast log, and added unit plus Playwright enforcement for ≥4.5:1 ratios across surfaces._
- [x] **Align stop timeline spacing on tablet breakpoints** [P2] [visual]
  - **Rationale:** At 768–1024px widths the timeline cards collapse with inconsistent gutter spacing compared to design guidelines in `AGENTS.md`.
  - **Repro (text only):** Tablet 1024×768 landscape, open Stop Detail; observe `.timeline-card` gaps: inner spacing 8px vs expected 16px.
  - **Observed vs Expected:** Observed cramped metadata causing text wrapping; expected consistent 16px padding and 24px inter-card spacing across breakpoints.
  - **Root-Cause Hypothesis:** Responsive SCSS mixins omit medium breakpoint overrides after regression cleanup.
  - **Proposed Fix (reasoned):** Reintroduce medium breakpoint styles in the component-scoped stylesheet, leveraging shared spacing variables to maintain consistency without global overrides.
  - **Acceptance Criteria (measurable):**
    1) Tablet layout shows 16px internal padding and 24px vertical spacing as measured via dev tools.
    2) No text truncation or overflow occurs at 90% zoom.
  - **Tests:** Update responsive visual regression in Playwright `tests/e2e/stop-detail.layout.spec.ts` to assert computed spacing.
  - **Affected Areas (guess):** `src/app/features/stop-detail/components/stop-timeline/stop-timeline.component.scss`.
  - **Docs to Update:** `docs/audit/stop-detail.md`, spacing guidelines in `docs/design-system/layout.md`.
  - _Done on 2025-10-30 – normalized stop timeline spacing tokens, added tablet breakpoint overrides, documented measurements, and captured updated evidence._
  - **Evidence:** Text-only notes recorded in `docs/audit/stop-detail.md` (viewports 1280×800, 1024×768, 414×896; verified padding 16px and gap 24px; no wrapping at 90% zoom).

### Functional Behaviour
- [x] **Persist Home tab selection across navigation cycles** [P1] [functional]
  - **Rationale:** Returning from subroutes resets the active tab to default, conflicting with user expectations and recorded behaviour in earlier releases.
  - **Repro (text only):** Desktop 1366×768, activate "Favorites" tab, enter a favorite stop detail, use browser back; active tab reverts to "Overview".
  - **Observed vs Expected:** Observed: default tab reselected, focus lost. Expected: previously active tab remains selected with focus restored per AGENTS navigation rules.
  - **Root-Cause Hypothesis:** Tab state stored only in component-local signal without route or storage synchronization after focus utilities were removed.
  - **Proposed Fix (reasoned):** Persist active tab in query param or shared store, restore on init, and reinstate focus restoration hook after navigation.
  - **Acceptance Criteria (measurable):**
    1) Navigating away and back preserves selection and focus ring.
    2) Directly loading `/?tab=favorites` selects the matching tab without console warnings.
  - **Tests:** Extend component unit tests for navigation restore; add Cypress regression `cypress/e2e/home-tabs-persistence.cy.ts` covering history/back scenarios.
  - **Affected Areas (guess):** `src/app/features/home/components/home-dashboard-tabs/*`, routing setup in `src/app/app.routes.ts`, optional storage service.
  - **Docs to Update:** `docs/audit/home-dashboard.md`, `docs/feature-checklist.md` notes.
  - _Done on 2025-10-30 – persisted tab selection with router query params and storage, restored focus on return, and added unit plus Cypress regression coverage._
  - **Evidence:** Text-only notes recorded in `docs/audit/home-dashboard.md` (viewports 1280×800 and 414×896; tab selection restored after navigation; focus ring preserved).

- [x] **Surface actionable messaging for empty route search results** [P2] [functional] [i18n]
  - **Rationale:** Invalid stop pair search returns silent card with blank state, leaving users without guidance; contradicts UX copy standards.
  - **Repro (text only):** Mobile 414×896, switch to EN, search for nonexistent stop pair "AAA" → "BBB"; result area stays blank.
  - **Observed vs Expected:** Observed: empty container without message. Expected: localized guidance explaining no direct routes found and suggesting filters per docs.
  - **Root-Cause Hypothesis:** Template lacks fallback slot or translation string for empty state scenario.
  - **Proposed Fix (reasoned):** Add localized empty-state component with CTA to adjust filters, ensure semantics (role="status") for accessibility.
  - **Acceptance Criteria (measurable):**
    1) Empty searches show localized message and actionable link/button.
    2) Screen readers announce the status once when results update.
  - **Tests:** Add unit test for `route-search.component.spec.ts` verifying empty-state render; Playwright scenario ensuring localized copy present in ES/EN.
  - **Affected Areas (guess):** `src/app/features/route-search/components/route-search/*`, translation files, potential shared empty-state component.
  - **Docs to Update:** `docs/audit/route-search.md`, i18n glossary.
  - _Done on 2025-10-31 – Added localized empty-state guidance with focus shortcut for the search form, verified on desktop 1366×768 and mobile 414×896, documented textual evidence in `docs/audit/route-search.md`, and covered behaviour with `route-search.component.spec.ts` plus Playwright `tests/playwright/route-search.empty-state.spec.ts`._

### Documentation & Tooling
- [x] **Record textual evidence workflow in accessibility audits** [P1] [docs] [tooling]
  - **Rationale:** With the no-upload policy, contributors need explicit instructions for documenting observations without screenshots.
  - **Repro (text only):** Review existing audit docs; they still instruct using upload-based evidence.
  - **Observed vs Expected:** Observed: outdated instructions referencing Filebin. Expected: text-based evidence workflow per current mandate.
  - **Root-Cause Hypothesis:** Documentation not updated after policy change.
  - **Proposed Fix (reasoned):** Update audit templates to emphasize textual capture (viewport, selectors, contrast ratios) and remove upload steps, while keeping local capture guidance.
  - **Acceptance Criteria (measurable):**
    1) All audit templates instruct textual evidence capture only.
    2) `AGENTS.md` references the updated workflow.
  - **Tests:** NA (documentation review suffices).
  - **Affected Areas (guess):** `docs/audit/_template.md`, `docs/accessibility/index.md`, `AGENTS.md` evidence policy section.
  - **Docs to Update:** Same as affected areas plus knowledge map references.
  - _Done on 2025-11-01 – updated evidence guidance to text-only in audits, recording guide, layout docs, and AGENTS, and removed upload references._

- [x] **Define regression checklist for contrast token changes** [P2] [docs] [testing]
  - **Rationale:** Past regressions stemmed from token tweaks without a repeatable checklist; formalize steps to prevent recurrence.
  - **Repro (text only):** Review `docs/ui-theme.md`; lacks explicit regression checklist.
  - **Observed vs Expected:** Observed: generic guidance only. Expected: actionable list covering measurement, testing, and textual evidence logging.
  - **Root-Cause Hypothesis:** Documentation drift after multiple contrast adjustments.
  - **Proposed Fix (reasoned):** Add a checklist enumerating measurement tools, breakpoints to verify, and automated tests to run; reference in AGENTS decision log.
  - **Acceptance Criteria (measurable):**
    1) Document includes numbered checklist covering measurement, automated test suite, and textual logging requirements.
    2) Knowledge map links to the checklist for quick discovery.
  - **Tests:** NA (documentation change); ensure linting passes.
  - **Affected Areas (guess):** `docs/ui-theme.md`, `docs/knowledge-map/cross-reference.md`, `AGENTS.md` tokens section.
  - **Docs to Update:** As listed above.
  - _Done on 2025-11-01 – added the contrast token regression checklist to `docs/ui-theme.md`, linked it in the cross-reference, and logged the update in AGENTS._

This checklist is regenerated after each in-app audit.
Tasks are considered done only when acceptance criteria are met, tests pass, and the behavior matches AGENTS.md and documented patterns.

_All checklist items have been executed and verified as of 2025-11-01.  
Platform confirmed consistent with AGENTS.md and design standards._

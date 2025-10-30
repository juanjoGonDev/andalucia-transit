# Feature Checklist (Actionable Backlog)

## Context (short)
This backlog lists only pending work that must comply with the delivery rules defined in `AGENTS.md`; consult the knowledge map for reference material about completed features.

## Conventions
- **Priority**: P0 (critical), P1 (important), P2 (nice-to-have)
- **Tags**: [accessibility], [visual], [functional], [docs], [testing], [tooling]
- **Evidence**: Any UI change requires BEFORE/AFTER screenshots (desktop + mobile) uploaded via `snap-and-publish` and linked in the PR.

## Backlog (Action Items Only)

### Accessibility
- [ ] **Reinstate roving focus for home dashboard tabs** [P0] [accessibility] [functional]
  - **Rationale:** Keyboard users lost arrow/Home/End navigation after the regression reintroducing basic button tabs; AGENTS.md mandates composite controls to expose directional semantics.
  - **Acceptance Criteria:**
    1) Arrow keys move focus between visible tabs without skipping disabled states and wrap appropriately.
    2) Home and End keys move focus to the first and last tabs respectively while keeping activation on Enter/Space.
    3) Programmatic tab changes restore focus to the active tab when returning from routed content areas.
  - **Tests:** Extend `home-dashboard-tabs.component.spec.ts` with keyboard navigation cases and add Playwright coverage in `tests/e2e/home-tabs.focus.spec.ts`.
  - **Evidence:** BEFORE/AFTER `publish:evidence` captures of the home dashboard tabs (desktop and mobile) demonstrating focus rings and active states.
  - **Affected Areas (guess):** `src/app/features/home/components/home-dashboard-tabs/*`, `src/app/shared/directives/accessible-button/*`, `src/app/shared/utils/keyboard/*`.
  - **Docs to Update:** `docs/audit/home-dashboard.md`, `AGENTS.md` decision log entry, `docs/feature-checklist.md` with new evidence links.

- [ ] **Deliver concise stop timeline live-region narration** [P1] [accessibility]
  - **Rationale:** Previous narration attempt was reverted; we need a scoped announcement that surfaces progress without duplicate readings or translation gaps.
  - **Acceptance Criteria:**
    1) A polite live region announces upcoming departure progress changes with localized strings in Spanish and English.
    2) Narration fires only when progress percentage or status transitions, avoiding duplicate reads during refresh.
    3) Users can disable announcements through configuration if future requirements demand it (documented toggle placeholder acceptable).
  - **Tests:** Add unit tests for the stop timeline service in `stop-timeline.service.spec.ts` covering narration triggers; add axe check in Playwright scenario `tests/e2e/stop-detail.accessibility.spec.ts`.
  - **Evidence:** BEFORE/AFTER captures of stop detail timeline plus screen reader transcript notes attached to the PR.
  - **Affected Areas (guess):** `src/app/features/stop-detail/components/stop-timeline/*`, translation dictionaries under `src/assets/i18n/`.
  - **Docs to Update:** `docs/accessibility/stop-detail.md`, `AGENTS.md` accessibility section, `docs/feature-checklist.md` evidence block.

### Visual Consistency
- [ ] **Audit subdued typography contrast** [P0] [visual] [testing]
  - **Rationale:** Palette overrides were rolled back; verify all tertiary tokens meet WCAG 2.1 AA across stop detail, favorites, and route cards.
  - **Acceptance Criteria:**
    1) Measured contrast for subdued metadata text is ≥4.5:1 on light and dark states documented in an audit note.
    2) Token updates propagate through theme definitions without per-component overrides.
    3) No regression to existing color usages (confirmed via screenshot comparison).
  - **Tests:** Introduce visual regression assertions in `tests/e2e/theme-contrast.spec.ts` and unit coverage for token exports in `theme.tokens.spec.ts`.
  - **Evidence:** BEFORE/AFTER `publish:evidence` captures for stop detail, favorites list, and route cards on desktop/mobile.
  - **Affected Areas (guess):** `src/theme/tokens.ts`, component styles under `src/app/features/(stop-detail|favorites|routes)/**/`.
  - **Docs to Update:** `docs/ui-theme.md`, `docs/audit/contrast-report.md`, `docs/feature-checklist.md` evidence references.

### Functional Behaviour
- [ ] **Harden tab state restoration after navigation** [P1] [functional]
  - **Rationale:** When returning from nested routes the selected tab sometimes desynchronizes because focus hooks were removed; ensure state persistence across route changes.
  - **Acceptance Criteria:**
    1) Navigating into a detail view and back preserves the previously active tab and its focus outline.
    2) Refreshing the page with a tab query parameter restores the matching tab selection and content.
    3) No duplicate change detection or console warnings introduced.
  - **Tests:** Expand router integration tests in `home-dashboard-tabs.component.spec.ts` and add Cypress regression in `cypress/e2e/home-dashboard-tabs.cy.ts`.
  - **Evidence:** BEFORE/AFTER captures showing state persistence during navigation sequences (desktop/mobile) plus video optional per AGENTS guidelines.
  - **Affected Areas (guess):** `src/app/features/home/components/home-dashboard-tabs/*`, routing config in `src/app/app.routes.ts`.
  - **Docs to Update:** `docs/audit/home-dashboard.md`, `docs/feature-checklist.md`.

### Documentation & Tooling
- [ ] **Refresh evidence bins for core surfaces** [P1] [docs] [tooling]
  - **Rationale:** Current Filebin links for favorites, route search, and settings predate the latest rollbacks; AGENTS.md requires documentation to reference live evidence.
  - **Acceptance Criteria:**
    1) Capture new desktop/mobile screenshots via `npm run publish:evidence` for favorites, route search, and settings surfaces.
    2) Replace outdated links in all docs referencing those surfaces.
    3) Document the capture date and bin identifier in the evidence table.
  - **Tests:** Not applicable (manual verification acceptable; note NA in PR checklist).
  - **Evidence:** New Filebin URLs embedded in updated docs.
  - **Affected Areas (guess):** `docs/audit/favorites.md`, `docs/audit/route-search.md`, `docs/audit/settings.md`.
  - **Docs to Update:** Same as affected areas plus this checklist.

- [ ] **Document color token evolution workflow** [P2] [docs]
  - **Rationale:** Contributors need explicit instructions when adjusting theme tokens to avoid future regressions.
  - **Acceptance Criteria:**
    1) Add a section to `docs/ui-theme.md` describing approval, testing, and evidence requirements for token changes.
    2) Cross-link from `AGENTS.md` and the knowledge map so the workflow is discoverable.
    3) Include a checklist for recording contrast measurements alongside screenshot evidence.
  - **Tests:** Not applicable (documentation change).
  - **Evidence:** Link updates showing new documentation references; no UI screenshots required.
  - **Affected Areas (guess):** `docs/ui-theme.md`, `AGENTS.md`, `docs/knowledge-map/cross-reference.md`.
  - **Docs to Update:** As listed above.

This checklist is regenerated after each audit. Tasks are completed only when acceptance criteria are met, tests pass, and UI evidence (BEFORE/AFTER via snap-and-publish) is attached.

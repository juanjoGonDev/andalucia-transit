# Home search mobile navigation clearance

## Request

Fix the mobile Home search layout so the fixed bottom navigation never covers the primary `Search schedules` submit action rendered by the shared route-search form. The action must remain fully visible, comfortably separated from the navigation, and directly hit-testable on narrow viewports without introducing nested scrolling or weakening the fixed-navigation contract.

## Evidence

- User-provided evidence on 2026-08-30 at `/?tab=search` in a 375x667 mobile emulation shows the Home search submit action partially hidden behind the fixed bottom navigation while the legal footer is visible at document end.
- `HomeComponent` renders `app-route-search-form` inside `.home__panel--search`; this is the surface shown in the evidence. The dedicated `/routes` feature is not the reported reproduction.
- `AppShellTopActionsComponent` is the canonical owner of the fixed bottom navigation and the shell already exposes `--app-shell-navigation-clearance` plus the measured `--app-shell-footer-visible-height`.
- `AppLayoutComponent` raises the fixed navigation by the measured legal-footer height when the flow footer enters the viewport. That creates a taller temporary bottom stack at document end than the base navigation clearance alone.
- `HomeComponent` overrides the shared `.app-layout__body` bottom padding with `padding-block-end: 0`, removing the shell's canonical navigation clearance from Home entirely.
- The screenshot is therefore consistent with a Home-specific override defeating the shared shell spacing contract just as the navigation is raised above the visible flow footer.
- Raising z-index, allowing pointer events through the navigation, hiding the footer, or adding a copied fixed pixel margin would preserve the underlying ownership bug.

## Decision

1. Keep navigation fixed and keep the legal footer below it; do not revert the global footer/navigation ordering.
2. Keep `RouteSearchFormComponent` shared between Home and the dedicated route-search page; do not fork its markup or duplicate navigation geometry in the form.
3. Restore Home to the shared shell spacing contract instead of replacing `.app-layout__body` bottom padding with zero.
4. If Home needs a visual adjustment beyond the canonical shell clearance, derive it from existing shell custom properties and spacing tokens; do not copy navigation/footer heights into the feature.
5. Keep the correction outside Map and preserve the immersive no-scroll contract.
6. Require browser coverage at both 375x667 (the reported failure) and the canonical 390x844 mobile evidence viewport using `/?tab=search`.
7. Browser coverage must verify geometry and hit-testing: the submit action bottom must remain above the navigation top with a deliberate gap, and `document.elementFromPoint` at the submit center must resolve to the submit action rather than the navigation.
8. Preserve legal-footer hit-testing, no horizontal overflow, and desktop Home behavior.
9. Do not advance `.github/visual-baseline.json` without explicit approval.

## Acceptance

- [ ] At 375x667 on `/?tab=search`, after scrolling to document end so the legal footer is visible, the submit action is fully visible and separated from the fixed navigation.
- [ ] At 390x844 the same invariant holds.
- [ ] The submit action is hit-testable at its center and not intercepted by the navigation.
- [ ] Home no longer cancels the canonical `.app-layout__body` bottom navigation clearance.
- [ ] The shared route-search form does not gain navigation-specific fixed pixel geometry or a nested scroll container.
- [ ] Existing footer/navigation ordering remains valid on flow routes.
- [ ] Map remains a non-scrolling immersive workspace.
- [ ] No horizontal overflow is introduced.
- [ ] Focused browser regression passes on the exact head.
- [ ] Core CI and PR visual evidence pass on the exact head.
- [ ] Reviewed visual baseline remains unchanged until explicit approval.

## Checks

Focused Playwright Home-search/footer regression; existing `tests/playwright/footer-layout.spec.ts`; repository CI; Publish PR visual evidence; exact visual-regression comparison.

## Risks

- A feature-only fixed pixel margin could drift from the responsive navigation/footer stack.
- Restoring the shared Home bottom padding changes full-page screenshot height and must be reviewed at mobile and desktop evidence viewports.
- A flow-only spacing assertion can pass while the actual action remains occluded; hit-testing is therefore required.

## Rollback

Revert the Home navigation-clearance commits. No API, persistence, database, dependency or remote migration is involved.

## Delivery

Continue PR #36 on `codex/refactorizar-vista-segun-diseno-proporcionado` with atomic Conventional commits. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

The reproduction has been scoped to Home `/?tab=search`. Root cause is the Home override `padding-block-end: 0`, which cancels the shared shell bottom clearance. Regression test, implementation, exact-head CI and final visual review are pending.

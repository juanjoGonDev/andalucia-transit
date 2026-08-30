# Home search mobile navigation clearance

## Request

Fix the mobile Home search layout so the fixed bottom navigation never covers the primary `Search schedules` submit action rendered by the shared route-search form. The action must remain fully visible and comfortably separated from the navigation on narrow viewports without introducing nested scrolling or weakening the fixed-navigation contract.

## Evidence

- User-provided evidence on 2026-08-30 at `/?tab=search` in a 375x667 mobile emulation shows the Home search submit action partially hidden behind the fixed bottom navigation while the legal footer is visible at document end.
- `HomeComponent` renders `app-route-search-form` inside `.home__panel--search`; this is the surface shown in the evidence. The dedicated `/routes` feature is not the reported reproduction.
- `AppShellTopActionsComponent` is the canonical owner of the fixed bottom navigation and the shell already exposes `--app-shell-navigation-clearance` plus the measured `--app-shell-footer-visible-height`.
- `AppLayoutComponent` raises the fixed navigation by the measured legal-footer height when the flow footer enters the viewport. That creates a taller temporary bottom stack at document end than the base navigation clearance alone.
- `HomeComponent` overrode the shared `.app-layout__body` bottom padding with `padding-block-end: 0`, removing the shell's canonical navigation clearance from Home entirely.
- The screenshot is therefore consistent with a Home-specific override defeating the shared shell spacing contract just as the navigation is raised above the visible flow footer.
- TDD red was reproduced on exact head `8a20ff9b86f4c3e84235cda1591fcc5842455477`: Legal browser QA run `33318580450` executed eight legal/footer browser tests; seven passed and the new Home regression failed deterministically on all attempts with insufficient submit/navigation gap.
- Removing only the Home bottom-padding override produced exact head `d0815d94c141a5cff3576e275681c51e6890d495`. Legal browser QA run `33318731642` then reported `gapSufficient: true`, proving the geometry correction. Its remaining assertion failure was test-semantic rather than product geometry: the empty Home form intentionally renders the submit action with `aria-disabled="true"`.
- The canonical `.app-button[aria-disabled='true']` rule sets `pointer-events: none`, so `document.elementFromPoint` is not expected to resolve to the disabled submit itself. The regression was corrected to require that neither the submit center nor its lower edge is intercepted by `.shell-actions__shell`, while retaining the >=12px geometric gap assertion.
- Exact head `f1c8896c3dfef97b4819338fdc8545eafa802c39` passed Legal browser QA run `33319008538`, including all eight legal/footer tests and the 375x667 plus 390x844 Home regression.
- Raising z-index, allowing pointer events through the navigation, hiding the footer, or adding a copied fixed pixel margin would preserve the underlying ownership bug and was not used.

## Decision

1. Keep navigation fixed and keep the legal footer below it; do not revert the global footer/navigation ordering.
2. Keep `RouteSearchFormComponent` shared between Home and the dedicated route-search page; do not fork its markup or duplicate navigation geometry in the form.
3. Restore Home to the shared shell spacing contract instead of replacing `.app-layout__body` bottom padding with zero.
4. If Home needs a visual adjustment beyond the canonical shell clearance, derive it from existing shell custom properties and spacing tokens; do not copy navigation/footer heights into the feature.
5. Keep the correction outside Map and preserve the immersive no-scroll contract.
6. Require browser coverage at both 375x667 (the reported failure) and the canonical 390x844 mobile evidence viewport using `/?tab=search`.
7. Browser coverage must verify geometry and interception: the submit action bottom must remain at least 12px above the navigation top. Because the empty form's disabled submit deliberately has `pointer-events: none`, hit-testing at its center and lower inset must prove the navigation is not the receiving target rather than requiring the disabled control itself to be the target.
8. Preserve legal-footer hit-testing, no horizontal overflow, and desktop Home behavior.
9. Do not advance `.github/visual-baseline.json` without explicit approval.

## Acceptance

- [x] At 375x667 on `/?tab=search`, after scrolling to document end so the legal footer is visible, the submit action is fully separated from the fixed navigation by at least 12px.
- [x] At 390x844 the same invariant holds.
- [x] Hit-testing at the disabled submit center and lower inset confirms the fixed navigation does not intercept those points.
- [x] Home no longer cancels the canonical `.app-layout__body` bottom navigation clearance.
- [x] The shared route-search form does not gain navigation-specific fixed pixel geometry or a nested scroll container.
- [x] Existing footer/navigation ordering remains valid in the focused legal/footer browser suite.
- [x] Existing focused Map/footer checks remain green in the same browser suite.
- [x] No horizontal overflow is introduced in the focused regression.
- [x] Focused browser regression passes on product/test head `f1c8896c3dfef97b4819338fdc8545eafa802c39`.
- [ ] Core CI and PR visual evidence pass on the final exact head.
- [ ] Final visual review confirms Home mobile search spacing and no visual regression.
- [ ] Reviewed visual baseline remains unchanged until explicit approval.

## Checks

Focused Playwright Home-search/footer regression; existing `tests/playwright/footer-layout.spec.ts`; repository CI; Publish PR visual evidence; exact visual-regression comparison.

## Risks

- A feature-only fixed pixel margin could drift from the responsive navigation/footer stack; the implementation instead restores the shared shell owner.
- Restoring the shared Home bottom padding changes full-page screenshot height and therefore requires mobile and desktop visual review.
- Disabled controls intentionally use `pointer-events: none`; browser interception assertions must distinguish semantic disabled behavior from navigation overlap.

## Rollback

Revert the Home navigation-clearance commits. No API, persistence, database, dependency or remote migration is involved.

## Delivery

Continue PR #36 on `codex/refactorizar-vista-segun-diseno-proporcionado` with atomic Conventional commits. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

The reported collision is fixed at the product boundary by removing Home's `padding-block-end: 0` override and restoring the canonical shell clearance. TDD red and focused green evidence are recorded above. Final exact-head CI, PR visual evidence, visual-regression result and screenshot review remain pending.

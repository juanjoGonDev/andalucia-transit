# Route Search mobile navigation clearance

## Request

Fix the mobile Route Search layout so the fixed bottom navigation never covers the primary `Search schedules` submit action. The action must remain fully visible, comfortably separated from the navigation, and directly hit-testable on narrow viewports without introducing nested scrolling or weakening the fixed-navigation contract.

## Evidence

- User-provided evidence on 2026-08-30 at a 375x667 mobile emulation shows the Route Search submit action partially hidden behind the fixed bottom navigation while the legal footer is visible at document end.
- `AppShellTopActionsComponent` is the canonical owner of the fixed bottom navigation and already exposes shell geometry through `--app-shell-navigation-clearance` plus the measured `--app-shell-footer-visible-height`.
- `RouteSearchComponent` renders the form inside `.route-search__form`, which is sticky on narrow viewports.
- `AppLayoutComponent` raises the fixed navigation by the measured legal-footer height when the flow footer enters the viewport. That creates a taller temporary bottom stack at document end than the base navigation clearance alone.
- The shared `.app-layout__body` reserves only the base navigation clearance. A sticky Route Search form can therefore remain visually underneath the navigation after the navigation is raised above a visible flow footer.
- Raising z-index, allowing pointer events through the navigation, or hiding the footer would preserve the visual collision and violate the shell contract.

## Decision

1. Keep navigation fixed and keep the legal footer below it; do not revert the global footer/navigation ordering.
2. Keep the Route Search form sticky; do not introduce an internal scroll container for the form.
3. Treat the visible bottom stack as shared shell geometry. Expose a canonical effective bottom clearance that combines the base navigation clearance with the currently visible legal-footer height.
4. Let Route Search consume that effective clearance on narrow viewports so its sticky form has enough bottom breathing room when the footer raises the navigation.
5. Keep the correction token-driven and dynamic; do not duplicate navigation or footer pixel heights inside Route Search.
6. Require browser coverage at both 375x667 (the reported failure) and the canonical 390x844 mobile evidence viewport.
7. Browser coverage must verify geometry and hit-testing: the submit action bottom must remain above the navigation top by at least the shared spacing token-equivalent threshold, and `document.elementFromPoint` at the submit center must resolve to the submit action rather than the navigation.
8. Preserve desktop behavior, footer hit-testing, no horizontal overflow, and existing immersive Map behavior.
9. Do not advance `.github/visual-baseline.json` without explicit approval.

## Acceptance

- [ ] At 375x667 with Route Search at document end and the legal footer visible, the submit action is fully visible and separated from the fixed navigation.
- [ ] At 390x844 the same invariant holds.
- [ ] The submit action is hit-testable at its center and not intercepted by the navigation.
- [ ] Route Search does not gain a nested scroll container.
- [ ] The fix derives from shared shell geometry and does not hard-code navigation/footer heights in the feature.
- [ ] Existing footer/navigation ordering remains valid on flow routes.
- [ ] Map remains a non-scrolling immersive workspace.
- [ ] No horizontal overflow is introduced.
- [ ] Focused browser regression passes on the exact head.
- [ ] Core CI and PR visual evidence pass on the exact head.
- [ ] Reviewed visual baseline remains unchanged until explicit approval.

## Checks

Focused Playwright Route Search/footer regression; existing `tests/playwright/footer-layout.spec.ts`; repository CI; Publish PR visual evidence; exact visual-regression comparison.

## Risks

- A feature-only fixed pixel margin could drift from the responsive navigation/footer stack.
- A global clearance change applied indiscriminately could add excessive whitespace to every route or disturb Map.
- Sticky positioning can make a flow-only spacing assertion pass while the actual visible action remains occluded; hit-testing is therefore required.

## Rollback

Revert the Route Search navigation-clearance commits. No API, persistence, database, dependency or remote migration is involved.

## Delivery

Continue PR #36 on `codex/refactorizar-vista-segun-diseno-proporcionado` with atomic Conventional commits. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

Specified from the user-provided 375x667 reproduction. Regression test, implementation, exact-head CI and final visual review are pending.

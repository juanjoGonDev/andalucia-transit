# Footer and fixed navigation layout

## Request

Refine the legal footer introduced in PR #36 so it never steals usable viewport height or creates a contrasting blank band. The shared floating navigation must remain continuously visible. On every scrolling route, when the user reaches the document end, the floating navigation must sit above the legal footer; legal links must be below the navigation, visible and clickable. The Map route must remain a non-scrolling `100dvh` workspace with the same spatial order permanently: map content, floating navigation, then the compact legal footer at the viewport bottom.

## Evidence

- User-provided Home evidence showed the first footer implementation as a large contrasting strip between the routed hero and fixed navigation.
- User-provided Map evidence showed the footer reducing the visible map workspace and creating a separate grey band.
- User clarification on 2026-08-30 showed the current implementation still renders `Política de privacidad / Aviso legal / Accesibilidad / Cookies` above the floating navigation. The intended order is the inverse: the floating navigation is above the legal row at document end, globally, and immediately above it on Map.
- `AppShellTopActionsComponent` owns the floating navigation with `position: fixed`.
- `LegalFooterComponent` is global and `AppLayoutComponent` owns both shell siblings, so footer/navigation collision geometry belongs to the shared layout rather than individual feature pages.
- The current flow footer reserves navigation clearance below its links and the immersive footer uses `bottom: var(--app-shell-navigation-clearance)`. Those two rules explicitly encode the now-rejected footer-above-navigation ordering.
- `MapComponent` owns an immersive `100dvh` workspace and existing Playwright coverage requires its lower edge to match the viewport edge.
- The shared layout context already owns routed surface and footer placement state. No route-name selectors or per-feature footer offsets are required.

## Decision

1. Keep the floating navigation fixed and continuously visible; do not convert it to document-flow navigation.
2. Keep the closed footer placement contract `flow | overlay`.
3. `flow` remains the default for ordinary routes. The footer follows the routed document without reserving clearance below its links. While the footer intersects the viewport, the shared layout raises the fixed navigation by the footer's visible block height so the navigation remains spatially above it. Away from document end, the navigation keeps its normal bottom position.
4. `overlay` remains reserved for immersive routes. Map keeps the legal footer fixed at the viewport bottom; the shared layout raises the navigation by the footer height, so navigation and footer form a non-overlapping bottom stack without reducing map height or adding page scroll.
5. `AppLayoutComponent` owns the viewport-overlap measurement and exposes one inherited CSS custom property for the current footer clearance. `AppShellTopActionsComponent` consumes that property; feature components do not measure or duplicate footer geometry.
6. Footer surface colors continue to derive from the active `hero | plain` layout surface.
7. The activated route keeps a non-shrinking `100dvh` shell boundary so the flow footer cannot reduce the first viewport of Home or another ordinary route.
8. Account for footer size changes caused by viewport width, localization and safe-area insets; never hard-code a legal-footer pixel height.
9. Do not advance `.github/visual-baseline.json` without explicit approval.

## Acceptance

- [ ] Map workspace remains exactly one viewport high at 390x844 and 1440x900 and the document does not gain vertical scroll.
- [ ] On Map, the legal footer is fixed at the viewport bottom and the floating navigation is immediately above it without overlap.
- [ ] On ordinary routes, the legal footer remains in document flow and is not permanently visible while the user is away from document end.
- [ ] At maximum scroll on ordinary routes, the floating navigation is above the legal footer; the legal links are below it, fully visible and clickable.
- [ ] The ordering is implemented at the shared shell boundary and therefore applies to all current/future routes using `AppLayoutComponent`, not only Home or legal pages.
- [ ] Hero routes have no white/contrasting band between routed content and legal footer.
- [ ] Plain routes use the same muted surface family as routed content.
- [ ] Footer placement state unregisters cleanly during navigation.
- [ ] Footer height changes do not create overlap after responsive wrapping or locale changes.
- [ ] No horizontal overflow at mobile or desktop evidence viewports.
- [ ] Focused Angular tests cover shell-owned footer clearance lifecycle; browser tests cover the spatial ordering on representative scrolling routes plus Map.
- [ ] Lint, Angular tests, deploy/build checks, legal browser QA and PR visual evidence pass on the exact product head.
- [ ] Reviewed visual baseline remains unchanged until explicit approval.

## Checks

Focused Angular layout tests; `tests/playwright/footer-layout.spec.ts`; `tests/playwright/legal-privacy.spec.ts`; existing `tests/playwright/map-exploration.spec.ts`; repository CI; legal browser QA; PR visual evidence; exact visual-regression comparison.

## Rollback

Revert the footer/navigation shell commits. No API, persistence, database or remote migration is involved.

## Delivery

Continue PR #36 on `codex/refactorizar-vista-segun-diseno-proporcionado` with atomic Conventional commits. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

Clarified from user-provided visual evidence on 2026-08-30. The previous footer-above-navigation contract is rejected. Regression tests and shared-shell implementation pending.

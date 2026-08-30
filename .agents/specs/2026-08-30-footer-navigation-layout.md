# Footer and fixed navigation layout

## Request

Refine the legal footer introduced in PR #36 so it never steals usable viewport height or creates a contrasting blank band. The shared floating navigation must remain continuously visible. On every scrolling route, when the user reaches the document end, the floating navigation must sit above the legal footer; legal links must be below the navigation, visible and clickable. The Map route must remain a non-scrolling viewport workspace with the same spatial order permanently: map content, floating navigation, then the compact legal footer at the viewport bottom.

## Evidence

- User-provided Home evidence showed the first footer implementation as a large contrasting strip between the routed hero and fixed navigation.
- User-provided Map evidence showed the footer reducing the visible map workspace and creating a separate grey band.
- User clarification on 2026-08-30 showed the current implementation still renders `Política de privacidad / Aviso legal / Accesibilidad / Cookies` above the floating navigation. The intended order is the inverse: the floating navigation is above the legal row at document end, globally, and immediately above it on Map.
- `AppShellTopActionsComponent` owns the floating navigation with `position: fixed`.
- `LegalFooterComponent` is global and `AppLayoutComponent` owns both shell siblings, so footer/navigation collision geometry belongs to the shared layout rather than individual feature pages.
- The previous flow footer reserved navigation clearance below its links and the immersive footer used `bottom: var(--app-shell-navigation-clearance)`. Those two rules explicitly encoded the rejected footer-above-navigation ordering.
- `MapComponent` owns an immersive viewport workspace and existing Playwright coverage requires its lower edge to match the viewport edge.
- The shared layout context already owns routed surface and footer placement state. No route-name selectors or per-feature footer offsets are required.
- Exact visual-regression run `33305555767`, job `99241395507`, reproduced a second shell regression on head `b429655369679a876f45f2fbd81028c110b1dd2c`: 7 Map/browser tests fail because the first-visit `app-storage-notice` sits above the routed section with a higher stacking layer and intercepts pointer events intended for Map search and inspector controls.
- The same first-visit notice also precedes a route with a `100dvh` minimum and a Map workspace with `100dvh` height. Leaving both dimensions unconditional can create document scroll even though Map is specified as immersive and non-scrolling.
- `app-storage-notice` itself remains mounted after dismissal while its inner notice is removed, so its host is a stable element whose rendered block size can be observed without route-specific wiring or duplicated legal state.

## Decision

1. Keep the floating navigation fixed and continuously visible; do not convert it to document-flow navigation.
2. Keep the closed footer placement contract `flow | overlay`.
3. `flow` remains the default for ordinary routes. The footer follows the routed document without reserving clearance below its links. While the footer intersects the viewport, the shared layout raises the fixed navigation by the footer's visible block height so the navigation remains spatially above it. Away from document end, the navigation keeps its normal bottom position.
4. `overlay` remains reserved for immersive routes. Map keeps the legal footer fixed at the viewport bottom; the shared layout raises the navigation by the footer height, so navigation and footer form a non-overlapping bottom stack.
5. `AppLayoutComponent` owns viewport shell measurements and exposes inherited CSS custom properties for shell clearances. Feature components consume those properties but do not measure or duplicate legal geometry.
6. Footer surface colors continue to derive from the active `hero | plain` layout surface.
7. The activated route keeps a viewport-filling shell boundary. When the first-visit storage notice is visible, its measured height is subtracted from the route's viewport minimum so the notice and route together fill, rather than exceed, the initial viewport.
8. Map uses the same measured storage-notice height to consume exactly the remaining viewport below the notice. Dismissing the notice returns the measurement to zero and Map expands back to the full viewport without reload or document scroll.
9. Account for footer and storage-notice size changes caused by viewport width, localization, dismissal and safe-area insets; never hard-code either legal surface's pixel height. Observe the stable storage-notice host so dismissal is reflected by a zero rendered height.
10. Do not make legal copy non-interactive, click-through, or test-only-hidden to work around overlap. The notice remains fully usable while Map controls occupy only the remaining unobscured workspace.
11. Do not advance `.github/visual-baseline.json` without explicit approval.

## Acceptance

- [ ] With the storage notice dismissed, Map workspace remains exactly one viewport high at 390x844 and 1440x900 and the document does not gain vertical scroll.
- [ ] On a first visit with the storage notice visible, the notice remains readable/clickable, Map starts below it, the Map workspace ends at the viewport bottom, and the document does not gain vertical scroll.
- [ ] First-visit Map search and inspector controls are hit-testable and usable without dismissing or clicking through the storage notice.
- [ ] Dismissing the storage notice expands Map to the full viewport in-place without reload, overlap or scroll.
- [ ] On Map, the legal footer is fixed at the viewport bottom and the floating navigation is immediately above it without overlap.
- [ ] On ordinary routes, the legal footer remains in document flow and is not permanently visible while the user is away from document end.
- [ ] At maximum scroll on ordinary routes, the floating navigation is above the legal footer; the legal links are below it, fully visible and clickable.
- [ ] The ordering and shell clearance are implemented at the shared shell boundary and therefore apply to all current/future routes using `AppLayoutComponent`, not only Home or legal pages.
- [ ] Hero routes have no white/contrasting band between routed content and legal footer.
- [ ] Plain routes use the same muted surface family as routed content.
- [ ] Footer placement state unregisters cleanly during navigation.
- [ ] Footer and storage-notice height changes do not create overlap after responsive wrapping, dismissal or locale changes.
- [ ] No horizontal overflow at mobile or desktop evidence viewports.
- [ ] Focused Angular tests cover shell-owned footer/storage clearance lifecycle; browser tests cover the spatial ordering on representative scrolling routes plus first-visit and dismissed-notice Map states.
- [ ] Existing Map exploration, focused-lines and rendered-contrast browser suites pass unchanged so the notice fix cannot merely bypass product interactions.
- [ ] Lint, Angular tests, deploy/build checks, legal browser QA and PR visual evidence pass on the exact product head.
- [ ] Reviewed visual baseline remains unchanged until explicit approval.

## Checks

Focused Angular layout tests; `tests/playwright/footer-layout.spec.ts`; `tests/playwright/legal-privacy.spec.ts`; existing `tests/playwright/map-exploration.spec.ts`; existing `tests/playwright/map-focused-lines.spec.ts`; `tests/playwright/theme.contrast.spec.ts`; repository CI; legal browser QA; PR visual evidence; exact visual-regression comparison.

## Rollback

Revert the footer/navigation/storage-clearance shell commits. No API, persistence, database or remote migration is involved.

## Delivery

Continue PR #36 on `codex/refactorizar-vista-segun-diseno-proporcionado` with atomic Conventional commits. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

Footer-below-navigation behavior is implemented and browser-covered on `b429655369679a876f45f2fbd81028c110b1dd2c`. Exact visual-regression evidence then exposed the first-visit storage notice overlapping Map controls; shared dynamic storage-notice clearance and regression coverage are pending.

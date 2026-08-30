# Footer and fixed navigation layout

## Request

Refine the legal footer introduced in PR #36 so it never steals usable viewport height or creates a contrasting blank band. The shared floating navigation must remain continuously visible. On every scrolling route, when the user reaches the document end, the floating navigation must sit above the legal footer; legal links must be below the navigation, visible and clickable. The Map route must remain a non-scrolling viewport workspace with the same spatial order permanently: map content, floating navigation, then the compact legal footer at the viewport bottom.

## Evidence

- User-provided Home evidence showed the first footer implementation as a large contrasting strip between the routed hero and fixed navigation.
- User-provided Map evidence showed the footer reducing the visible map workspace and creating a separate grey band.
- User clarification on 2026-08-30 showed the implementation still rendering `Política de privacidad / Aviso legal / Accesibilidad / Cookies` above the floating navigation. The intended order is the inverse: the floating navigation is above the legal row at document end, globally, and immediately above it on Map.
- `AppShellTopActionsComponent` owns the floating navigation with `position: fixed`.
- `LegalFooterComponent` is global and `AppLayoutComponent` owns both shell siblings, so footer/navigation collision geometry belongs to the shared layout rather than individual feature pages.
- The previous flow footer reserved navigation clearance below its links and the immersive footer used `bottom: var(--app-shell-navigation-clearance)`. Those two rules explicitly encoded the rejected footer-above-navigation ordering.
- `MapComponent` owns an immersive viewport workspace and browser coverage requires its lower edge to match the viewport edge.
- The shared layout context already owns routed surface and footer placement state. No route-name selectors or per-feature footer offsets are required.
- Exact visual-regression evidence reproduced a second shell regression: first-visit `app-storage-notice` sat above the routed section with a higher stacking layer and intercepted pointer events intended for Map search and inspector controls.
- The same first-visit notice also preceded a route with a `100dvh` minimum and a Map workspace with `100dvh` height. Leaving both dimensions unconditional could create document scroll even though Map is specified as immersive and non-scrolling.
- `app-storage-notice` itself remains mounted after dismissal while its inner notice is removed, so its host is a stable element whose rendered block size can be observed without route-specific wiring or duplicated legal state.
- Shared storage-notice clearance, Map viewport sizing and narrow inspector height are implemented through the shared shell and Map workspace boundaries.
- `tests/playwright/footer-layout.spec.ts` verifies ordinary flow routes and Map at 390x844 and 1440x900, including maximum-scroll ordering, footer-bottom placement, legal-link hit testing, overlay placement and absence of horizontal/Map vertical overflow.
- Focused `AppLayoutComponent` tests verify footer visibility/resize lifecycle through `IntersectionObserver` and `ResizeObserver` without a hard-coded legal footer height.
- A dedicated viewport diagnostic captures Home search at the actual mobile document end with `fullPage: false`, because the canonical full-page screenshot harness intentionally resets scroll position before capture. Manual review of `actual/home-search-end_es_390_844_viewport.png` shows the Search action clear above the floating navigation, the navigation above the legal footer, and the legal links at the physical viewport bottom.
- Manual review also covered mobile and desktop Map captures plus representative mobile/desktop document-bottom captures. The Map footer/navigation stack is in the required order without clipping; scrolling-route footer rows terminate the document without an overlapping band.
- Product-validation head `307cf04fc711e6b85ab625523f1a1091c5930ae1` completed CI run `33320473071`, Legal browser QA run `33320473027`, and Publish PR visual evidence run `33320473039` successfully.
- Publish PR visual evidence retained artifact `pr-36-visual-evidence-307cf04fc711e6b85ab625523f1a1091c5930ae1` (artifact `9734839301`, digest `sha256:659a0e01f891b22835dd18193b65eed758b780d2797fdcf6af6fe0007c537269`).
- Reviewed-baseline run `33320473026` completed baseline render, head render, exact comparison and evidence retention, then failed enforcement as expected because the approved baseline predates the global legal/footer shell changes. The exact summary compares 36 files and reports all 36 changed, with 33,291,773 differing pixels. Most flow screenshots also have larger document dimensions because the legal surfaces are now part of the intended document layout; Map remains exactly 390x844 and 1440x900 and differs only in pixels.
- The product-head visual-regression artifact is `pr-36-visual-regression-307cf04fc711e6b85ab625523f1a1091c5930ae1` (artifact `9734802449`, digest `sha256:198bcb2991587a9c44d13b2a042ce1b8d87990ab899751a11a7431f8599df61c`).
- The validation-ledger commit `35fe923dbff680d6915cc68b98fcae1c50ea2038` changed only this specification. Its exact-head CI run `33321733817`, Legal browser QA run `33321733823`, and Publish PR visual evidence run `33321733794` all completed successfully.
- Exact-head normal visual evidence is retained as `pr-36-visual-evidence-35fe923dbff680d6915cc68b98fcae1c50ea2038` (artifact `9735113647`, digest `sha256:779b2eb0851d1bddddc99b79d6e014493d4bbf652c5768994e49bb03a6780b5f`).
- Exact-head reviewed-baseline run `33321733796` again completed rendering/comparison and failed only baseline enforcement. Artifact `pr-36-visual-regression-35fe923dbff680d6915cc68b98fcae1c50ea2038` is `9735140931` with digest `sha256:eb76fcc5d7d7431952f13b80da1ffead9696dd08fed47993f9b4b4db575c2bc6`.
- The exact-head `diff/summary.json` is byte-identical to the product-validation summary: 36/36 changed and 33,291,773 differing pixels. SHA-256 checks of the document-end diagnostic, mobile/desktop Map, mobile Home and desktop Lines actual screenshots are also identical between the product-validation and documentation heads, proving the documentation-only commit did not alter the rendered UI.

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
11. On narrow Map viewports, keep inspector panels in the lower half of the map and above the raised navigation by deriving their maximum scrollable height from the containing workspace and the same shell clearance. Do not solve the collision by moving the whole panel upward into the map's upper interaction region.
12. Do not advance `.github/visual-baseline.json` without explicit approval.

## Acceptance

- [x] With the storage notice dismissed, Map workspace remains exactly one viewport high at 390x844 and 1440x900 and the document does not gain vertical scroll.
- [x] On a first visit with the storage notice visible, the notice remains readable/clickable, Map starts below it, the Map workspace ends at the viewport bottom, and the document does not gain vertical scroll.
- [x] First-visit Map search and inspector controls are hit-testable and usable without dismissing or clicking through the storage notice.
- [x] Dismissing the storage notice expands Map to the full viewport in-place without reload, overlap or scroll.
- [x] On Map, the legal footer is fixed at the viewport bottom and the floating navigation is immediately above it without overlap.
- [x] On mobile Map, an open inspector remains wholly above the floating navigation, starts in the lower half of the map, and scrolls internally when its content exceeds the remaining lower-half space.
- [x] On ordinary routes, the legal footer remains in document flow and is not permanently visible while the user is away from document end.
- [x] At maximum scroll on ordinary routes, the floating navigation is above the legal footer; the legal links are below it, fully visible and clickable.
- [x] The ordering and shell clearance are implemented at the shared shell boundary and therefore apply to all current/future routes using `AppLayoutComponent`, not only Home or legal pages.
- [x] Hero routes have no white/contrasting band between routed content and legal footer.
- [x] Plain routes use the same muted surface family as routed content.
- [x] Footer placement state unregisters cleanly during navigation.
- [x] Footer and storage-notice height changes do not create overlap after responsive wrapping, dismissal or locale changes.
- [x] No horizontal overflow at mobile or desktop evidence viewports.
- [x] Focused Angular tests cover shell-owned footer/storage clearance lifecycle; browser tests cover the spatial ordering on representative scrolling routes plus first-visit and dismissed-notice Map states.
- [x] Existing Map exploration, focused-lines and rendered-contrast browser suites pass unchanged so the notice fix cannot merely bypass product interactions.
- [x] Lint, Angular tests, deploy/build checks, legal browser QA and PR visual evidence pass on the exact validated heads.
- [x] Reviewed visual baseline remains unchanged until explicit approval.

## Checks

Focused Angular layout tests; `tests/playwright/footer-layout.spec.ts`; `tests/playwright/legal-privacy.spec.ts`; existing `tests/playwright/map-exploration.spec.ts`; existing `tests/playwright/map-focused-lines.spec.ts`; `tests/playwright/theme.contrast.spec.ts`; repository CI; legal browser QA; PR visual evidence; exact visual-regression comparison; manual review of the exact 390x844 document-end viewport capture and representative Map/mobile/desktop artifact screenshots; deterministic screenshot hash comparison across the documentation-only head.

## Rollback

Revert the footer/navigation/storage-clearance shell commits. No API, persistence, database or remote migration is involved.

## Delivery

Continue PR #36 on `codex/refactorizar-vista-segun-diseno-proporcionado` with atomic Conventional commits. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

Footer-below-navigation, legal/footer shell integration, storage-notice clearance, Map viewport sizing and the narrow inspector regression are implemented and fully validated. Product head `307cf04fc711e6b85ab625523f1a1091c5930ae1` is green for CI, Legal browser QA and normal PR visual evidence. Documentation head `35fe923dbff680d6915cc68b98fcae1c50ea2038` is also green for those gates and rendered byte-identical reviewed-baseline summaries plus identical representative screenshot hashes. The reviewed baseline remains intentionally unchanged, so Visual regression baseline is the only red gate. The only remaining delivery action is explicit approval to update `.github/visual-baseline.json`; no merge, release or deployment is authorized.
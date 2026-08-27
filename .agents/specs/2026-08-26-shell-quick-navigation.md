# Shell quick navigation

## Request

Add fast, persistent ways to reach primary destinations such as Home and Map while preserving the current floating shell design and accessibility behavior. The overflow action must open secondary destinations in a lateral off-canvas drawer instead of a small absolute-positioned menu.

## Evidence

- `AppShellTopActionsComponent` is the shared owner for shell-level navigation across routed pages.
- The component already owns Home, Route Search, Map and Favorites as persistent quick actions and Recent, News and Settings as secondary destinations.
- The current overflow surface is an absolutely positioned `role="menu"` panel. These links are normal application navigation, not application-menu commands, so menu semantics add unnecessary keyboard expectations.
- The current component uses a document-wide click listener only to dismiss that floating panel. A modal native `dialog` can own dismissal, focus containment and Escape behavior without a global listener or a new dependency.
- The shell styles already define a compact floating navigation surface, focus treatment and responsive positioning; adding another navigation owner would duplicate responsibility.
- Browser acceptance confirmed that Home canonicalizes its default route to `/?tab=search`; quick-navigation tests therefore validate that canonical URL rather than incorrectly requiring a query-less `/`.

## Decision

1. Keep `AppShellTopActionsComponent` as the single owner of global quick navigation.
2. Keep Home, Route Search, Map and Favorites as persistent quick actions before More.
3. Move Recent, News and Settings into a right-side modal navigation drawer opened by More.
4. Use native `<dialog>.showModal()` instead of adding a focus-trap dependency or maintaining custom document-level dismissal logic.
5. Give the drawer an accessible title, explicit close action, backdrop dismissal, Escape dismissal, initial focus and focus restoration to the More trigger.
6. Preserve `aria-expanded` on More and use `aria-haspopup="dialog"`; keep `aria-current="page"` on the active destination.
7. Apply safe-area padding and lateral opening animation, with animation disabled under `prefers-reduced-motion: reduce`.
8. Use native internal links so browser navigation semantics remain available.
9. Do not add a dependency, new navigation store, or duplicate route mapping.

## Acceptance

- Home, Route Search, Map and Favorites are reachable in one interaction from every page rendered inside `AppLayoutComponent`.
- More opens a right-side off-canvas drawer containing only Recent, News and Settings.
- The drawer is hidden by default and modal while open; page content behind it is not an alternate keyboard navigation surface.
- The drawer closes from its close button, Escape, backdrop interaction and navigation selection.
- Opening the drawer moves focus into it; closing restores focus to More.
- More reports `aria-haspopup="dialog"` and its current open state through `aria-expanded`.
- The drawer has an accessible name and does not use `role="menu"` or `role="menuitem"` for ordinary navigation links.
- Safe-area insets are respected on mobile and drawer motion is removed for reduced-motion users.
- Mobile 390x844 does not overflow or cover the quick-navigation controls.
- Desktop 1440x900 preserves the compact floating-shell hierarchy while the drawer uses only the required side width.
- Existing navigation and active-state behavior continues to work.
- CI and final visual-evidence workflow are green for the exact delivered head.

## Checks

- Focused `AppShellTopActionsComponent` tests cover quick links, drawer semantics, open/close behavior, active-state semantics and focus restoration.
- Playwright covers the real shell navigation and drawer at 390x844, including keyboard/Escape behavior and minimum target sizing.
- Existing Angular tests, lint, scripts and deploy validation pass.
- The pre-drawer map implementation head `876a5883f72d60d35ed95820d0336e6071d14c6a` passed CI run `33034261560`, including deploy budget, lint, Angular tests, scripts and aggregate gate.
- Final deterministic mobile 390x844 and desktop 1440x900 evidence must be generated from the delivered drawer head and manually reviewed for overflow, overlap and hierarchy regressions.

## Rollback

Revert the focused shell drawer implementation and acceptance-test commits. No route, persistence, API or data contract changes are involved.

## Delivery

The original quick-navigation implementation remains delivered. This extension replaces only the secondary overflow presentation and dismissal behavior; the exact final drawer commit and validation runs will be recorded after implementation passes all gates.

## Status

In progress: quick navigation is validated; secondary overflow drawer implementation and final browser/visual validation remain pending.

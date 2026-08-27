# Shell quick navigation

## Request

Add fast, persistent ways to reach primary destinations such as Home and Map while preserving the current floating shell design and accessibility behavior. The overflow action must open secondary destinations in a lateral off-canvas drawer instead of a small absolute-positioned menu.

## Evidence

- `AppShellTopActionsComponent` is the shared owner for shell-level navigation across routed pages.
- The component owns Home, Route Search, Map and Favorites as persistent quick actions and Recent, News and Settings as secondary destinations.
- The previous overflow surface was an absolutely positioned `role="menu"` panel. These links are ordinary application navigation, not application-menu commands, so menu semantics added unnecessary keyboard expectations.
- A native modal `dialog` owns focus containment and Escape behavior without a global document listener or a new dependency.
- The delivered drawer is right-aligned, `min(22rem, 90vw)`, full viewport height, safe-area aware and backed by a modal scrim.
- The shell styles already define the shared floating navigation surface, focus treatment and responsive positioning; adding another navigation owner would duplicate responsibility.
- Browser acceptance confirmed that Home canonicalizes its default route to `/?tab=search`; quick-navigation tests therefore validate that canonical URL rather than incorrectly requiring a query-less `/`.
- The final component stylesheet already exceeds the configured 4 kB `anyComponentStyle` warning threshold while remaining below the 8 kB error threshold. Nonessential drawer enter/exit animation was therefore not retained; the existing persistent-control hover micro-motion remains the only shell movement.

## Decision

1. Keep `AppShellTopActionsComponent` as the single owner of global quick navigation.
2. Keep Home, Route Search, Map and Favorites as persistent quick actions before More.
3. Move Recent, News and Settings into a right-side modal navigation drawer opened by More.
4. Use native `<dialog>.showModal()` instead of adding a focus-trap dependency or maintaining custom document-level dismissal logic.
5. Give the drawer an accessible title, explicit close action, backdrop dismissal, Escape dismissal, initial focus and focus restoration to the More trigger.
6. Preserve `aria-expanded` on More and use `aria-haspopup="dialog"`; keep `aria-current="page"` on the active destination.
7. Apply safe-area padding and keep drawer open/close state immediate. Preserve only the existing hover transform on fine pointers, and remove that movement under `prefers-reduced-motion: reduce`.
8. Use native internal links so browser navigation semantics remain available.
9. Do not add a dependency, new navigation store, duplicate route mapping or a second shell-navigation owner.

## Acceptance

- Home, Route Search, Map and Favorites are reachable in one interaction from every page rendered inside `AppLayoutComponent`.
- More opens a right-side off-canvas drawer containing only Recent, News and Settings.
- The drawer is hidden by default and modal while open; page content behind it is not an alternate keyboard navigation surface.
- The drawer closes from its close button, Escape, backdrop interaction and navigation selection.
- Opening the drawer moves focus into it; closing restores focus to More.
- More reports `aria-haspopup="dialog"` and its current open state through `aria-expanded`.
- The drawer has an accessible name and does not use `role="menu"` or `role="menuitem"` for ordinary navigation links.
- Safe-area insets are respected on mobile; shell hover motion is removed for reduced-motion users.
- Mobile 390x844 has no horizontal overflow or shell/title collision, and all shell/drawer controls meet the 44 px minimum target used by acceptance tests.
- Desktop 1440x900 preserves the compact floating-shell hierarchy while the drawer remains constrained to its side width.
- Existing navigation and active-state behavior continues to work.
- CI and final visual-evidence workflow must be green for the current delivered PR head.

## Checks

- Focused `AppShellTopActionsComponent` tests cover quick links, dialog semantics, open/close behavior, active-state semantics and focus restoration.
- Playwright covers the real shell at 390x844 and 1440x900, including drawer geometry, initial focus, Escape, backdrop dismissal, navigation selection, active state and minimum target sizing.
- Playwright also checks shell/title clearance across Home, Route Search, Map, Recent, Favorites, Settings and News, and verifies reduced-motion behavior for persistent shell controls.
- CI run `33053949387` (#906) passed install, deploy validation, lint, scripts, Angular tests and `Check all ok` on implementation evidence head `ebf2b17f08b90a1acbc073fefac281fa50b360b8`.
- Visual-evidence run `33053949023` (#329) passed quality gates, 20 populated Playwright tests, deterministic `data -> empty` server switching, 2 empty-state tests, 24 required PNG validation, immutable-head verification, artifact publication and PR comment publication on the same implementation evidence head.
- Artifact `pr-36-visual-evidence-ebf2b17f08b90a1acbc073fefac281fa50b360b8` contains the 24 required PNGs and has Actions digest `sha256:1e025bfc43ced8db12d3b76ff400c6efe226792e8f9f91096cb28216ad813c89`.
- The generated mobile and desktop evidence was manually reviewed, including the drawer and populated/empty Home, Recent and Favorites states. No drawer clipping, horizontal overflow or shell/title collision was observed; mobile content retains the layout-owned bottom clearance for the fixed shell.

## Rollback

Revert the focused shell drawer implementation and acceptance-test commits. No route, persistence, API or data contract changes are involved. The visual-evidence lifecycle/manifest fixes can be reverted independently if the workflow is replaced by another deterministic evidence owner.

## Delivery

The existing quick-navigation owner remains in place. The delivered extension replaces only the secondary overflow presentation with a native modal side drawer and adds deterministic browser/evidence coverage. Workflow regressions discovered during acceptance were fixed at their owners: server process lifecycle is explicitly controlled across deterministic mock modes, and evidence validation now checks the 24 required asset names instead of a stale aggregate count.

Implementation behavior and visual evidence are proven on `ebf2b17f08b90a1acbc073fefac281fa50b360b8`. Any subsequent documentation-only head must still pass the repository's normal PR checks before delivery.

## Status

Complete for implementation and visual acceptance. The current PR head's CI checks are the final delivery gate; no merge, release or deploy is part of this task.

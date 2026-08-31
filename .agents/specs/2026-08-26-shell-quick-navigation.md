# Shell quick navigation

## Request

Keep global navigation persistently reachable without occupying the page header. Real-browser review supersedes the previously accepted side-drawer overflow: the entire shell must float centered at the bottom on both mobile and desktop, and `More` must reveal secondary destinations above the dock without covering critical content.

## Evidence

- `AppShellTopActionsComponent` is the single shared owner of global navigation.
- The current mobile layout already fixes the shell at the bottom, but the desktop media query moves it to a sticky top-right position.
- The current `More` action opens a full-height right-side modal drawer. Product review now reserves right-side drawer behavior for the map inspector and rejects global navigation as a competing modal surface.
- The project UI checklist requires fixed/sticky controls to respect safe areas and requires menus/popovers to flip, shift, resize or reposition rather than overflow available space.
- Home, Route Search, Map and Favorites remain the primary quick destinations; Recent, News and Settings remain secondary.

## Decision

1. Keep `AppShellTopActionsComponent` as the only global navigation owner.
2. Keep the shell fixed/floating at the bottom center at all supported viewport widths, including desktop.
3. Keep `Home · Route Search · Map · Favorites · More` as the persistent dock.
4. Replace the right-side modal drawer used by `More` with a compact anchored navigation popover that opens upward from the bottom dock.
5. Prefer native semantic links and a button trigger. Do not apply `role="menu"`/`menuitem` semantics to ordinary navigation links.
6. The popover is hidden initially, closes after navigation, Escape and outside interaction, and restores focus to `More` when dismissal was initiated from keyboard/context.
7. Position the popover with CSS/layout logic relative to the bottom dock so it remains within viewport bounds; it may shift horizontally or reduce width on narrow screens.
8. Reserve sufficient layout clearance for the fixed dock so route pages, stop pages and map controls are never hidden behind it.
9. Respect safe-area insets and reduced-motion preferences. Do not add a navigation dependency.

## Acceptance

- The global dock is bottom-centered at 390x844 and 1440x900.
- Primary actions remain usable one-handed on mobile and compact on desktop.
- `More` starts closed and exposes only Recent, News and Settings above the dock.
- The overflow surface never opens downward below the dock and never leaves the viewport.
- The overflow surface does not obscure the currently focused control or critical page content; layout-owned bottom clearance remains effective.
- Keyboard users can open, traverse and dismiss the secondary links; visible focus and `aria-expanded` remain synchronized.
- Active destinations continue to expose `aria-current="page"`.
- No horizontal page overflow is introduced.

## Tests

- Update `AppShellTopActionsComponent` tests for bottom dock and upward popover semantics/state.
- Playwright verifies dock geometry, bottom clearance, upward placement, outside/Escape dismissal and secondary navigation at 390x844 and 1440x900.
- Existing page-title clearance checks are retained or strengthened to account for bottom placement.
- Exact-head visual evidence must show the dock and opened overflow surface on both canonical viewports.

## Rollback

Revert the focused shell positioning/popover commits. No route or persisted-state migration is involved.

## Delivery

Continue in PR #36. Do not merge, release or deploy.

## Status

In progress: reopened because the prior side-drawer/global top-right desktop solution was rejected in real-browser review.

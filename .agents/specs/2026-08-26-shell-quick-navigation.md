# Shell quick navigation

## Request

Add fast, persistent ways to reach primary destinations such as Home and Map while preserving the current floating shell design and accessibility behavior.

## Evidence

- `AppShellTopActionsComponent` is the shared owner for shell-level navigation across routed pages.
- The component already owned Home, Map, Settings and News navigation commands, but the previous template rendered only the menu trigger.
- The shell styles already define a compact floating pill with 48px-class icon buttons, focus treatment and responsive positioning; adding a second navigation surface elsewhere would duplicate ownership.
- Recent searches and favorites are Home subviews and Settings/News remain available in the secondary menu, so exposing every destination as a persistent icon would add unnecessary visual density.
- Browser acceptance confirmed that Home canonicalizes its default route to `/?tab=search`; quick-navigation tests therefore validate that canonical URL rather than incorrectly requiring a query-less `/`.

## Decision

1. Keep `AppShellTopActionsComponent` as the single owner of global quick navigation.
2. Add persistent Home and Map actions before the menu trigger.
3. Keep Recent, Favorites, Settings and News in the existing menu to preserve primary/secondary hierarchy.
4. Reuse existing route commands, Material Symbols, navigation translation keys, spacing, surface and focus tokens.
5. Mark the current primary destination with `aria-current="page"` and the existing active visual treatment.
6. Treat Home recent/favorites routes as part of the Home hub for the Home quick-action active state.
7. Use native internal links so browser navigation semantics remain available.
8. Do not add a dependency, new navigation store, or duplicate route mapping.

## Acceptance

- Home and Map are reachable in one interaction from every page rendered inside `AppLayoutComponent`.
- The controls remain keyboard accessible, have accessible names and meet the existing touch-target sizing.
- Home is visually/current-state active for the Home search, recent and favorites hub routes; Map is active only on Map.
- The menu remains available and its icon does not rotate when Home or Map is active.
- Mobile 390x844 does not overflow or cover primary page actions.
- Desktop 1440x900 preserves the existing compact floating-shell hierarchy.
- Existing menu navigation continues to work.
- CI and final visual-evidence workflow are green for the exact delivered head.

## Checks

- Focused `AppShellTopActionsComponent` tests cover rendered quick links, targets and active-state semantics.
- Playwright covers the real Home → Map → Home flow at 390x844, including 44px minimum targets and `aria-current` transitions.
- Existing Angular tests, lint, scripts and deploy validation pass.
- Implementation validation head `b2803113d9af68d7d87d3530be9fe6db21004e9f` passed CI run `32907128653` and visual/browser run `32907128629`.
- Deterministic mobile 390x844 and desktop 1440x900 evidence was generated from the validated implementation and manually reviewed for overflow, overlap and hierarchy regressions.

## Rollback

Revert the focused shell navigation and acceptance-test commits. No route, persistence or API contract changes are involved.

## Delivery

Implemented as focused navigation, browser-acceptance and documentation commits. The final documentation head must pass the same CI and deterministic visual-evidence gates before delivery is reported complete.

## Status

Complete.

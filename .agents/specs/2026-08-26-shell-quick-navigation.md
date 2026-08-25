# Shell quick navigation

## Request

Add fast, persistent ways to reach primary destinations such as Home and Map while preserving the current floating shell design and accessibility behavior.

## Evidence

- `AppShellTopActionsComponent` is the shared owner for shell-level navigation across routed pages.
- The component already owns Home, Map, Settings and News navigation commands, but the current template renders only the menu trigger.
- The shell styles already define a compact floating pill with 48px-class icon buttons, focus treatment and responsive positioning; adding a second navigation surface elsewhere would duplicate ownership.
- Recent searches and favorites are Home subviews and Settings/News remain available in the secondary menu, so exposing every destination as a persistent icon would add unnecessary visual density.

## Decision

1. Keep `AppShellTopActionsComponent` as the single owner of global quick navigation.
2. Add persistent Home and Map actions before the menu trigger.
3. Keep Recent, Favorites, Settings and News in the existing menu to preserve primary/secondary hierarchy.
4. Reuse existing route commands, Material Symbols, navigation translation keys, spacing, surface and focus tokens.
5. Mark the current primary destination with `aria-current="page"` and the existing active visual treatment.
6. Treat Home recent/favorites routes as part of the Home hub for the Home quick-action active state.
7. Use native internal links where practical so browser navigation semantics remain available.
8. Do not add a dependency, new navigation store, or duplicate route mapping.

## Acceptance

- Home and Map are reachable in one interaction from every page rendered inside `AppLayoutComponent`.
- The controls remain keyboard accessible, have accessible names and meet the existing touch-target sizing.
- Home is visually/current-state active for the Home search, recent and favorites hub routes; Map is active only on Map.
- The menu remains available and its icon does not rotate when Home or Map is active.
- Mobile 390x844 does not overflow or cover primary page actions.
- Desktop 1440x900 preserves the existing compact floating-shell hierarchy.
- Existing menu navigation continues to work.
- CI and final visual-evidence workflow are green for the exact final head.

## Checks

- Focused `AppShellTopActionsComponent` tests for rendered quick links, targets and active-state semantics.
- Existing Angular tests and lint.
- Existing deploy validation.
- Existing deterministic PR visual evidence at 390x844 and 1440x900.

## Rollback

Revert the focused shell navigation commit. No route, persistence or API contract changes are involved.

## Delivery

Implement as an atomic shell-navigation change plus focused regression tests, then update this spec status and validate the exact final SHA.

## Status

In progress.

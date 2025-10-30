# Keyboard Interaction Patterns

## Home Dashboard Tablist
- **Viewport:** Desktop 1440×900, Tablet 1024×768, Mobile 414×896
- **Reproduction:** Focus the home tablist with `Tab`, use ArrowLeft/ArrowRight/Home/End.
- **Expected:** Focus never leaves the tablist, roving tabindex keeps only the active tab at `0`, navigation updates the route and restores focus after returning from child screens.
- **Implementation Notes:** Use `appAccessibleButton` with `[appAccessibleButtonTabIndex]`, handle directional keys with `matchesKey` helpers, call `queueMicrotask`-driven focus after updating signals, and persist state through router navigation events.
- **QA:** Verify focus order manually, run unit suite `home.component.spec.ts`, and execute Playwright scenario `tests/playwright/home-tabs.keyboard.spec.ts` with textual logs.

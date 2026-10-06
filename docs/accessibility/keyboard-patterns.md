# Keyboard Interaction Patterns

## Home Dashboard Tablist
- **Viewport:** Desktop 1440×900, Tablet 1024×768, Mobile 414×896
- **Reproduction:** Focus the home tablist with `Tab`, use ArrowLeft/ArrowRight/Home/End.
- **Expected:** Focus never leaves the tablist, roving tabindex keeps only the active tab at `0`, navigation updates the route and restores focus after returning from child screens.
- **Implementation Notes:** Use `appAccessibleButton` with `[appAccessibleButtonTabIndex]`, handle directional keys with `matchesKey` helpers, call `queueMicrotask`-driven focus after updating signals, persist selection via query param canonicalization plus storage, and restore focus after navigation events. Each tab now exposes `aria-controls` and the active panel exposes the matching `aria-labelledby`; the shell overflow sends focus to its first destination on open and returns focus to the trigger on Escape.
- **Native controls:** Prefer native buttons and anchors for Home actions and interactive cards. Do not place additional focusable controls inside an autocomplete `mat-option`; favorite actions for the selected origin and destination are exposed beside their fields instead.
- **QA:** Verify focus order manually, run unit suite `home.component.spec.ts`, and execute Playwright scenario `tests/playwright/home-tabs.keyboard.spec.ts` with textual logs.

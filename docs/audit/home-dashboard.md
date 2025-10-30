# Home Dashboard Audit Notes

## Tablist Keyboard Navigation
- **Viewport:** Desktop 1440×900, Mobile 414×896
- **Reproduction:** Focus the tablist, press ArrowRight repeatedly.
- **Observed (pre-fix):** Focus skipped out of the composite and active selection failed to update, breaking WCAG 2.1.1 Keyboard.
- **Resolved Behaviour:** Roving tabindex keeps focus within the tabs, each key press updates `aria-selected`, and Home/End jump to first/last tabs.
- **Verification:** Manual keyboard traversal, `home.component.spec.ts` directional key cases, Playwright suite `tests/playwright/home-tabs.keyboard.spec.ts`, and textual console logs for router transitions.

# Home Dashboard Audit Notes

## Tablist Keyboard Navigation
- **Viewport:** Desktop 1440×900, Mobile 414×896
- **Reproduction:** Focus the tablist, press ArrowRight repeatedly.
- **Observed (pre-fix):** Focus skipped out of the composite and active selection failed to update, breaking WCAG 2.1.1 Keyboard.
- **Resolved Behaviour:** Roving tabindex keeps focus within the tabs, each key press updates `aria-selected`, and Home/End jump to first/last tabs.
- **Verification:** Manual keyboard traversal, `home.component.spec.ts` directional key cases, Playwright suite `tests/playwright/home-tabs.keyboard.spec.ts`, and textual console logs for router transitions.

## Tab Persistence
- **Viewport:** Desktop 1280×800, Mobile 414×896
- **Reproduction:** Load `/` with `?tab=favorites`, navigate to Map via the top actions menu, then return using browser back and reload `/`.
- **Observed (pre-fix):** Returning to `/` reset the selection to the default tab and removed query params, forcing keyboard users to traverse from the start.
- **Resolved Behaviour:** Active tab persists through router navigation and browser history, canonicalizing URLs to `/favs?tab=favorites` and restoring focus on the selected tab.
- **Verification:** Manual flow through Map → Back → Reload, unit coverage in `home.component.spec.ts`, new Cypress scenario `cypress/e2e/home-tabs-persistence.cy.ts`, and textual console logs confirming query param canonicalization.


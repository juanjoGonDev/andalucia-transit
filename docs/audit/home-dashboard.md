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

## Mobile-first interaction pass
- **Scope:** Home dashboard, route-search form, shared interactive cards, persistent secondary navigation.
- **Implementation:** The Home content now relies on the shell's single main landmark, exposes complete `tab`/`tabpanel` relationships, and removes the non-actionable “start now” line from the search card. The route search primary action, location action, swap action, selected-stop favorite action, and interactive cards use native buttons or anchors where their semantics allow it. Favorite toggling was moved out of `mat-option` descendants so autocomplete options remain a single keyboard-selectable listbox option; the selected stop can still be favorited from the corresponding field suffix.
- **Implementation:** Home mobile spacing and panel action targets use existing tokens, favorite preview empty/header styles are co-located with their component, and opening the shell overflow moves focus to the first secondary destination while Escape restores focus to the trigger.
- **Accessibility:** The active Home tab now references its panel through `aria-controls`, and each panel references its tab through `aria-labelledby`. The document language is synchronized with the active ES/EN translation so assistive technology receives the correct language metadata.
- **Verification:** Unit coverage was extended for tab/panel relationships, native interactive-card semantics, and document language synchronization. Browser-level responsive and visual evidence still needs to be run in an environment with the repository's Playwright Chromium binary available.

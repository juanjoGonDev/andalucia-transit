# Visual state audit and deterministic evidence

## Request

Audit the current PR screenshots in depth, fix visible hierarchy/surface/responsive defects, and make visual evidence deterministic across representative data and no-data states on both mobile and desktop. The evidence must catch low-contrast copy, disconnected surfaces, overlapping shell navigation, and state-specific regressions without depending on the current production snapshot.

## Evidence

- The current visual artifact covers only one canonical state for Home, Route search, Favorites, Settings and News, plus the newly added Map capture. It does not exercise loading, empty, error, populated or dialog states independently.
- Existing desktop captures leave excessive unused width on several screens, reducing information density and making the content feel like a mobile column placed on a desktop canvas.
- Existing mobile Favorites and Settings captures show the persistent `Home · Map · Menu` control overlapping or crowding page headings.
- Route search places the empty-state return action far below the form, creating an unrelated floating CTA rather than a coherent result/empty surface.
- The supplied Preferences screenshot shows a disconnected dark header / light body / dark footer treatment. The shared dialog owner should establish one coherent surface rather than allowing independently colored slabs.
- `tests/playwright/theme.contrast.spec.ts` currently checks only one tertiary-text token against the application background; it does not validate rendered text against its actual painted surface.
- The visual workflow already starts a deterministic mock application, so state-specific browser evidence should extend that owner instead of introducing another screenshot system.
- The current map browser flow still has one deterministic locator failure because it assumes the nearby-card display code is always identical to the autocomplete label code. The product search result already includes the stop name and code, but the acceptance test should identify the selected canonical search target rather than couple two presentation models.

## Decision

1. Treat responsive shell clearance, coherent surfaces, information density and rendered contrast as shared UX contracts, not page-local cosmetics.
2. Reserve horizontal space for persistent shell actions on narrow screens so page headings never render underneath the navigation pill.
3. Keep one coherent light dialog surface with subtle separators; do not use unrelated dark header/footer slabs around a light body.
4. Improve desktop density through reusable layout constraints and page-level grid decisions only where the workflow benefits; do not stretch text/forms to the full viewport.
5. Keep empty/loading/error/populated scenarios deterministic in browser tests. Do not depend on the current live stop/news/schedule snapshot to decide whether evidence can render a state.
6. Extend Playwright visual evidence so representative scenarios are captured at 390×844 and 1440×900. Capture names must encode screen + state + viewport.
7. Validate rendered text contrast on representative light, hero/dark, muted, error and dialog surfaces. Fail the browser gate when normal text falls below WCAG AA 4.5:1 unless the element qualifies as large text.
8. Preserve exact-head evidence publication: no screenshot from a stale SHA may be published.
9. Fix the map acceptance locator using canonical state exposed by the UI/test fixture rather than weakening the product identity model.
10. Do not add a visual-regression dependency. Reuse Playwright, runtime mocks, existing design tokens and the current artifact/release publication path.

## Acceptance

- Persistent shell actions do not cover or truncate page titles at 390×844 on Home, Favorites, Settings, News, Route search or Map.
- Dialog title/body/actions read as one coherent card surface with consistent text color, spacing and separators on mobile and desktop.
- Desktop Home/Favorites/Settings/News/Route search/Map layouts use the available 1440×900 viewport intentionally without turning forms or prose into overly wide lines.
- Route-search empty state is attached to the form/result flow rather than leaving an isolated CTA in the lower viewport.
- Deterministic visual evidence includes representative populated and empty states; loading/error/dialog scenarios are exercised by browser assertions and captured where they materially change layout.
- Visual evidence runs at 390×844 and 1440×900.
- Browser contrast checks evaluate actual rendered foreground/background combinations for representative surfaces.
- Map acceptance covers search -> focus/popover -> details navigation without coupling nearby-card code formatting to the search option label.
- `pnpm run lint`, script tests, Angular tests, build, focused Playwright and final visual workflow are green for the exact final head.

## Risks

- Capturing every Cartesian product of screen × state × viewport would create noisy evidence and slow CI. Keep a curated state matrix that exercises distinct layout risks, with assertions covering remaining states.
- Browser contrast calculation must resolve transparent backgrounds through ancestors; a simplistic token-only comparison would produce false confidence.
- Global shell clearance must not add unnecessary whitespace on desktop or pages that already reserve their own top actions.
- Dialog surface changes are shared and can affect confirmations and nearby-stop dialogs; verify both generic layout tests and at least one rendered dialog.

## Tests

- Playwright: all canonical screens at mobile and desktop, no horizontal overflow and no shell/title overlap.
- Playwright: representative data and empty visual scenarios driven by deterministic mocks.
- Playwright: rendered contrast audit across hero text, cards, muted copy, error copy and dialog surfaces.
- Playwright: representative dialog surface capture/assertions.
- Playwright: map search/popover/details and nearby-list highlight.
- Angular: shared dialog/shell contracts where DOM-level behavior is deterministic.

## Rollback

Revert the focused visual-audit commits. No API, persisted-storage, migration or production-data contract change is required.

## Delivery

Atomic spec, shared layout/surface fixes, deterministic visual-state tests, workflow evidence expansion, exact-head CI/browser validation, reviewed screenshots and spec closeout. Do not merge the PR.

## Status

In progress.

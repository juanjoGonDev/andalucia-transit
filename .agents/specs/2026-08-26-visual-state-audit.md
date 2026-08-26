# Visual state audit and deterministic evidence

## Request

Audit the current PR screenshots in depth, fix visible hierarchy/surface/responsive defects, and make visual evidence deterministic across representative data and no-data states on both mobile and desktop. The evidence must catch low-contrast copy, disconnected surfaces, overlapping shell navigation, state-specific regressions, and missing interaction feedback without depending on the current production snapshot.

Persistent browser navigation controls must also provide a clear hover/focus microinteraction on pointer-capable devices while respecting `prefers-reduced-motion`.

## Evidence

- The original visual artifact covered only one canonical state for Home, Route search, Favorites, Settings and News, plus Map. It did not exercise loading, empty, error, populated or dialog states independently.
- Existing desktop captures left excessive unused width on several screens, reducing information density and making the content feel like a mobile column placed on a desktop canvas.
- Existing mobile Favorites and Settings captures showed the persistent `Home · Map · Menu` control overlapping or crowding page headings.
- Route search placed the empty-state return action far below the form, creating an unrelated floating CTA rather than a coherent result/empty surface.
- The supplied Preferences screenshot showed a disconnected dark header / light body / dark footer treatment. The shared dialog owner must establish one coherent surface rather than allowing independently colored slabs.
- The former `tests/playwright/theme.contrast.spec.ts` checked only one tertiary-text token against the application background; the current audit resolves rendered foreground/background surfaces instead.
- The visual workflow already owns deterministic mock startup and screenshot publication, so state-specific browser evidence extends that owner instead of introducing another screenshot system.
- The map search/popover/details acceptance is now deterministic and no longer derives autocomplete identity from nearby-card display text; this removes the previous 9/10 blocker without weakening the product contract.
- `AppShellTopActionsComponent` now provides perceptible hover movement in addition to color/shadow feedback, with the transform removed under `prefers-reduced-motion`.
- CI run `32987231798` passed for `890503aa7c505007dea36a1d5b5786c8c401c6bb`. Visual run `32987231647` failed before browser execution only because Prettier reformatted `home-tabs.layout.spec.ts` and `theme.contrast.spec.ts`; those exact formatting diffs were subsequently committed.
- The current workflow matrix starts deterministic `mock-data`, then `mock-empty`, and is configured to retain populated/empty evidence plus interaction-state captures. Recent-search previews are disabled in mock modes so screenshots do not leak live network state.
- `visual-interaction-states.spec.ts` exercises a real shared confirmation dialog at 390×844 and 1440×900 and forces route-search timetable loading/error/retry through intercepted HTTP boundaries.

## Decision

1. Treat responsive shell clearance, coherent surfaces, information density and rendered contrast as shared UX contracts, not page-local cosmetics.
2. Reserve horizontal space for persistent shell actions on narrow screens so page headings never render underneath the navigation pill.
3. Keep one coherent light dialog surface with subtle separators; do not use unrelated dark header/footer slabs around a light body.
4. Improve desktop density through reusable layout constraints and page-level grid decisions only where the workflow benefits; do not stretch text/forms to the full viewport.
5. Keep empty/loading/error/populated scenarios deterministic in browser tests. Do not depend on the current live stop/news/schedule snapshot to decide whether evidence can render a state.
6. Extend Playwright visual evidence so representative scenarios are captured at 390×844 and 1440×900. Capture names must encode screen + state + viewport.
7. Validate rendered text contrast on representative light, hero/dark, muted, error and dialog surfaces. Fail the browser gate when normal text falls below WCAG AA 4.5:1 unless the element qualifies as large text.
8. Preserve exact-head evidence publication: no screenshot from a stale SHA may be published.
9. Keep the map acceptance driven by canonical search data and verify popup/details behavior without coupling nearby-card and directory display-name variants.
10. Give persistent shell controls a short elevation/icon hover microinteraction in addition to color/shadow feedback. Keyboard focus remains explicit, active-route semantics remain unchanged, and all movement is disabled under `prefers-reduced-motion`.
11. Do not add a visual-regression dependency. Reuse Playwright, runtime mocks, existing design tokens and the current artifact/release publication path.
12. Keep live-network behavior outside deterministic visual fixtures. Mock modes may intercept external boundaries, but production services remain canonical and unchanged.

## Acceptance

- Persistent shell actions do not cover or truncate page titles at 390×844 on Home, Favorites, Settings, News, Route search or Map.
- Persistent Home/Map/Menu controls have visible hover feedback on pointer-capable desktop browsers without layout shift; reduced-motion mode removes transform transitions/movement while preserving non-motion state feedback.
- Dialog title/body/actions read as one coherent card surface with consistent text color, spacing and separators on mobile and desktop.
- Desktop Home/Favorites/Settings/News/Route search/Map layouts use the available 1440×900 viewport intentionally without turning forms or prose into overly wide lines.
- Route-search empty state is attached to the form/result flow rather than leaving an isolated CTA in the lower viewport.
- Deterministic visual evidence includes representative populated and empty states; loading/error/dialog scenarios are exercised by browser assertions and captured where they materially change layout.
- Visual evidence runs at 390×844 and 1440×900.
- Browser contrast checks evaluate actual rendered foreground/background combinations for representative surfaces.
- Map acceptance covers search -> focus/popover -> details navigation without coupling nearby-card and directory display-name variants.
- `pnpm run lint`, script tests, Angular tests, build, focused Playwright and final visual workflow are green for the exact final head.

## Risks

- Capturing every Cartesian product of screen × state × viewport would create noisy evidence and slow CI. Keep a curated state matrix that exercises distinct layout risks, with assertions covering remaining states.
- Browser contrast calculation must resolve transparent backgrounds through ancestors; a simplistic token-only comparison would produce false confidence.
- Global shell clearance must not add unnecessary whitespace on desktop or pages that already reserve their own top actions.
- Dialog surface changes are shared and can affect confirmations and nearby-stop dialogs; verify both generic layout tests and at least one rendered dialog.
- Transform-based hover feedback can cause motion sensitivity or perceived jitter if overdone; keep movement small, avoid geometry reflow and disable movement for reduced-motion preferences.
- Intercepted browser failures must target only the external boundary needed by the scenario; broad interception could make the test pass while skipping application behavior.

## Tests

- Playwright: all canonical screens at mobile and desktop, no horizontal overflow and no shell/title overlap.
- Playwright: persistent shell hover changes visual transform/elevation without changing control dimensions; reduced-motion removes movement.
- Playwright: representative data and empty visual scenarios driven by deterministic mocks.
- Playwright: rendered contrast audit across representative card, muted, empty and news surfaces.
- Playwright: real confirmation dialog surface at mobile and desktop.
- Playwright: route-search loading -> error -> retry without false empty-state rendering.
- Playwright: map search/popover/details using canonical searchable stop data and real Canvas marker interaction.
- Angular: shared dialog/shell/autocomplete contracts where DOM-level behavior is deterministic.

## Rollback

Revert the focused visual-audit commits. No API, migration or production-data contract change is required. The mock-only preview preference is scoped to deterministic runtime configuration.

## Delivery

Atomic spec, shared layout/surface fixes, deterministic visual-state tests, workflow evidence expansion, exact-head CI/browser validation, reviewed screenshots and spec closeout. Do not merge the PR.

## Status

In progress. Exact-head CI and visual evidence are still required after the latest interaction-state/workflow changes before this audit can be closed.

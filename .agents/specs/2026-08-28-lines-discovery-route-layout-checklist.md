# Lines discovery and route-layout execution checklist

Companion tracker for `.agents/specs/2026-08-28-lines-discovery-route-layout.md`.

## Tracking rules

- [ ] Do not mark an item complete without observable evidence: test name/output, inspected file/contract, screenshot artifact, measured layout assertion or CI URL/run id.
- [ ] Record `N/A` only with a short reason.
- [ ] Never update screenshot baselines merely to make CI green; inspect the actual diff first.
- [ ] Keep commits atomic and Conventional.
- [ ] Preserve unrelated work and do not force-push.
- [ ] Do not merge, release or deploy without explicit approval.
- [ ] If a finding invalidates the specification, update the specification before implementation continues.

## Phase 0 — Reconfirm repository state

- [ ] Read `AGENTS.md` and `docs/knowledge-map/index.md` from the current branch head.
- [ ] Confirm PR #36 head SHA, base SHA, mergeability and current changed-file state.
- [ ] Confirm package manager/runtime versions and current CI scripts from `package.json`, lockfile and workflows.
- [ ] Confirm current Playwright/visual-evidence configuration and browser projects.
- [ ] Re-read the relevant knowledge-map shards for features, data, shared UI, tests and docs.
- [ ] Confirm no newer spec supersedes this one.

**Evidence:**

- Pending.

## Phase 1 — Reproduce every reported UI problem

### Shell / Lines semantics

- [ ] Reproduce that the visible **Lines** shell action opens route search.
- [ ] Prove the visible label is sourced from `map.routes.title` while the link points to `APP_CONFIG.routes.routeSearch`.
- [ ] Reproduce the hard-coded C2 empty-state sentence before changing it.

### Recents

- [ ] Reproduce mobile recent-search time misalignment at 390×844.
- [ ] Reproduce at 320 px CSS width.
- [ ] Measure line-code/time column positions across at least three preview rows.

### Route search

- [ ] Reproduce the duplicated selection information: form + separate route summary.
- [ ] Reproduce arrival text wrapping/misalignment on narrow mobile.
- [ ] Reproduce with Spanish long copy and English long copy.
- [ ] Measure current vertical space consumed before the first timetable row on 390×844.
- [ ] Verify bottom navigation overlap/clearance with the route results page.

### Line detail

- [ ] Reproduce current line detail with hero + stop list and confirm no route map is present.
- [ ] Confirm stop rows navigate with consortium-aware stop identity.

**Evidence:**

- Pending.

## Phase 2 — CTAN capability audit

- [ ] Inventory every CTAN endpoint already documented for consortiums, municipalities, nuclei, stops, lines, line detail, line stops, line-to-stop relationships, route geometry and relevant line metadata.
- [ ] Identify which endpoint/client is the canonical owner for each capability.
- [ ] Verify catalog snapshot fields against live API contracts; do not infer fields from UI needs.
- [ ] Confirm municipality → nucleus relationships.
- [ ] Confirm line → ordered stop relationships.
- [ ] Confirm stop → municipality/nucleus/zone/coordinates relationships.
- [ ] Confirm official polyline availability and observed payload variants across representative consortia.
- [ ] Document the ordered-stop fallback contract for lines without usable official geometry.
- [ ] Determine whether CTAN or another approved authoritative source exposes province directly or through a stable identifier.
- [ ] If province is not authoritative, mark province filtering blocked and update user-facing scope before implementation; do not invent a mapping.
- [ ] Identify additional line metadata that genuinely improves traveler decisions (mode, operator, accessibility, notes, concession, etc.).
- [ ] Reject API fields that add noise without a concrete UX use.
- [ ] Record localization behavior (`lang`) for every new live endpoint used.
- [ ] Record caching/fallback freshness semantics for every source.

**Evidence:**

- Pending.

## Phase 3 — Canonical data and map architecture

- [ ] Search for all existing route geometry builders/parsers before creating anything new.
- [ ] Search for all existing Leaflet map wrappers/services/components.
- [ ] Search for all stop identity/navigation helpers.
- [ ] Select one canonical route-map view model consumed by all route-map surfaces.
- [ ] Select one canonical geometry owner for official polyline + ordered-stop fallback.
- [ ] Ensure direction selection is implemented once.
- [ ] Ensure stop coordinate normalization is implemented once.
- [ ] Ensure bounds calculation is implemented once.
- [ ] Ensure stop identity uses consortium-aware keys wherever local stop ids can collide.
- [ ] Ensure the shared map presentation component receives data; it must not become another CTAN client.
- [ ] Define selected-stop synchronization contract between map markers and stop list.
- [ ] Define map-unavailable but list-available behavior.
- [ ] Add regression tests proving all consumers receive the same normalized geometry/identity result.
- [ ] Remove duplicate geometry/identity implementations only after all consumers migrate and parity tests pass.

**Evidence:**

- Pending.

## Phase 4 — Lines directory route and navigation

- [ ] Add a dedicated Lines route using existing route/config conventions.
- [ ] Point the persistent **Lines** navigation action to the Lines route.
- [ ] Use `navigation.lines` for visible and accessible naming; do not borrow the Map route-list label.
- [ ] Keep Route Search a separate direct route and task.
- [ ] Update active-navigation state so Lines highlights only on Lines/line-detail contexts as intended.
- [ ] Add deep-link unit tests for the Lines route.
- [ ] Add browser navigation test: shell Lines → directory.
- [ ] Verify Back/Forward behavior.
- [ ] Verify direct loading of Lines in a clean session.

**Evidence:**

- Pending.

## Phase 5 — Lines directory UX

### Core list

- [ ] Render canonical line code and name.
- [ ] Add mode/operator metadata only where useful and available.
- [ ] Make each line a native navigational target to line detail.
- [ ] Add stable list keys using consortium + line identity.
- [ ] Implement loading state.
- [ ] Implement empty-catalog state.
- [ ] Implement no-filter-match state.
- [ ] Implement recoverable error/stale state where live refresh exists.

### Search and filters

- [ ] Add code/name text search.
- [ ] Add consortium/transport-area filter.
- [ ] Add municipality filter.
- [ ] Add nucleus filter.
- [ ] Add explicit **Near me** action.
- [ ] Request geolocation only after that action.
- [ ] Keep all non-location filters usable after permission denial/error.
- [ ] Add province filter only when Phase 2 established an authoritative mapping.
- [ ] Make dependent filters reset/narrow deterministically.
- [ ] Show active filters and one clear/reset path.
- [ ] Avoid horizontal chip scrolling as the primary mobile filter surface.
- [ ] Use URL state for filters/sort/page that users reasonably expect to preserve/share.
- [ ] Sanitize invalid query params to safe defaults.

### Pagination / scale

- [ ] Define one bounded page-size owner.
- [ ] Add first/middle/last-page behavior tests.
- [ ] Reset page when filters change and the current page would be invalid.
- [ ] Verify realistic full-catalog performance.
- [ ] Verify list remains usable with long line names and large result counts.

**Evidence:**

- Pending.

## Phase 6 — Remove the fake/default C2 route

- [ ] Add a regression test that route-search empty state contains no hard-coded line, stop or time example.
- [ ] Replace `routeSearch.sampleResult` with task-oriented empty/onboarding copy or remove the key if no longer needed.
- [ ] Update ES and EN translations together.
- [ ] Verify the route-search page remains useful when opened directly with no selection.
- [ ] Verify no other demo/sample transport data is rendered as if it were live/default data.

**Evidence:**

- Pending.

## Phase 7 — Line detail map + stop list

### Data

- [ ] Load line detail and ordered stops through canonical owners.
- [ ] Obtain route geometry through the shared canonical geometry builder.
- [ ] Support official CTAN geometry.
- [ ] Support ordered-stop fallback.
- [ ] Support insufficient-geometry state without losing the stop list.

### Desktop / tablet

- [ ] Implement expanded route-information region with approximately 2fr map / 1fr stops where content width supports it.
- [ ] Ensure stop-list column never collapses below readable/interactive width.
- [ ] Keep map height bounded and responsive without fixed-height text containers.
- [ ] Keep OSM attribution visible.

### Mobile

- [ ] Use one logical reading column.
- [ ] Do not force the 2-column split below its content breakpoint.
- [ ] Ensure route map fits without horizontal page overflow.
- [ ] Ensure ordered stops remain fully reachable below/alongside the map.
- [ ] If progressive tabs/segmented controls are used, implement keyboard/focus semantics completely.

### Interaction

- [ ] Stop marker selection updates the same selected-stop state as list selection.
- [ ] Stop list selection updates/focuses the same map marker when useful without stealing focus unexpectedly.
- [ ] Stop navigation uses existing `buildStopDetailNavigation` or its canonical successor.
- [ ] Do not duplicate Stop Detail data inside line detail.
- [ ] Ensure a clear More information destination exists without creating nested interactive controls.

**Evidence:**

- Pending.

## Phase 8 — Route-search sticky workspace redesign

### Remove duplication

- [ ] Add a regression test for the current duplicated summary before deleting it.
- [ ] Make the search workspace the only owner of active origin/destination/date context.
- [ ] Remove the redundant intermediate route summary after parity is proven.

### Sticky behavior

- [ ] Make origin, destination, swap, date and submit/edit controls available while results scroll.
- [ ] Define expanded vs compact sticky states by content need, not arbitrary animation.
- [ ] Account for top safe area.
- [ ] Account for persistent bottom navigation.
- [ ] Prevent sticky content from covering focused inputs.
- [ ] Prevent sticky content from covering autocomplete/date-picker overlays.
- [ ] Verify behavior with mobile virtual keyboard.
- [ ] Verify `scroll-margin`/focus reveal for result actions if needed.
- [ ] Verify sticky z-index comes from existing layer/token ownership; do not introduce magic z-index values.

### Route rows

- [ ] Keep departure time as the primary scan anchor.
- [ ] Keep arrival time as a stable secondary clock column.
- [ ] Keep duration subordinate to arrival.
- [ ] Use tabular numerals for clock values.
- [ ] Replace verbose arrival prose with a compact visible pattern only if accessible meaning remains explicit.
- [ ] Ensure icons never become the sole accessible meaning.
- [ ] Allow relative-time copy to wrap locally without moving the opposite clock column.
- [ ] Verify line badges/frequency/accessibility flags do not break clock alignment.

**Evidence:**

- Pending.

## Phase 9 — Recent search alignment

- [ ] Add a failing layout test for current mobile time alignment.
- [ ] Remove/replace the narrow-breakpoint rule that start-aligns the time column if confirmed as the cause.
- [ ] Keep line-code and time columns stable for every row.
- [ ] Use tabular numerals for time.
- [ ] Verify 320, 360, 390, 430 px widths.
- [ ] Verify 200% zoom/reflow.
- [ ] Verify long line codes and long relative labels.

**Evidence:**

- Pending.

## Phase 10 — Accessibility gate

- [ ] Native links for line/stop navigation.
- [ ] Native buttons for filter/reset/geolocation/swap actions where possible.
- [ ] Visible labels for all filters.
- [ ] Full keyboard operation for Lines filters, pagination, sticky search and line-detail stop list.
- [ ] Visible focus ≥ required contrast.
- [ ] No focused control hidden by sticky/fixed surfaces.
- [ ] Touch targets target 44×44 CSS px where practical and meet WCAG minimums.
- [ ] Map has an accessible name.
- [ ] OSM attribution remains available.
- [ ] Required map tasks have equivalent list controls.
- [ ] No drag-only functionality.
- [ ] Reduced-motion preference respected.
- [ ] Zoom remains enabled.
- [ ] Axe checks pass for affected deterministic flows.
- [ ] Manual keyboard pass completed for the critical flow.

**Evidence:**

- Pending.

## Phase 11 — Automated visual regression gate

### Determinism

- [ ] Freeze locale/timezone/current time where they affect rendering.
- [ ] Use deterministic seeded/mock transport data for blocking screenshots.
- [ ] Remove or tightly mask dynamic timestamps/progress.
- [ ] Prevent live OSM tile nondeterminism from dominating blocking pixel comparisons; use the smallest deterministic strategy compatible with real-map smoke coverage.

### Viewports

- [ ] 320×568 — Lines directory.
- [ ] 320×568 — Route search populated.
- [ ] 390×844 — Lines directory.
- [ ] 390×844 — Line detail map/list.
- [ ] 390×844 — Route search populated and scrolled sticky state.
- [ ] 390×844 — Recent searches populated.
- [ ] 768×1024 — Lines directory + line detail.
- [ ] 1440×900 — Lines directory.
- [ ] 1440×900 — Line detail expanded map/list grid.
- [ ] 1440×900 — Route search populated.

### States

- [ ] Populated.
- [ ] Empty/no matches.
- [ ] Error/recovery where layout differs.
- [ ] Long translated content.
- [ ] Official line geometry.
- [ ] Stop-fallback geometry.
- [ ] Map unavailable/list available.

### Pixel/layout assertions

- [ ] Add Playwright screenshot baselines for stable component/page states.
- [ ] Default to zero unexpected pixel differences for deterministic captures.
- [ ] Document any non-zero threshold with evidence of rendering variance.
- [ ] Add DOM assertions for no horizontal page overflow.
- [ ] Add DOM assertions for sticky search vs viewport/content overlap.
- [ ] Add DOM assertions for consistent clock-column x positions.
- [ ] Add DOM assertions for map/list grid bounds.
- [ ] Add DOM assertions that selected stop map/list state refers to the same identity.
- [ ] Upload expected/actual/diff artifacts on failure.
- [ ] Keep CI from auto-updating baselines.
- [ ] Review every accepted baseline change manually before commit.

**Evidence:**

- Pending.

## Phase 12 — Unit/integration/browser tests

- [ ] Failing behavior tests added before each non-trivial behavior fix when practical.
- [ ] Line directory normalization tests.
- [ ] Filter intersection tests.
- [ ] Pagination boundary tests.
- [ ] URL state tests.
- [ ] Province mapping tests if applicable.
- [ ] Geometry SSOT tests.
- [ ] Official polyline tests.
- [ ] Ordered-stop fallback tests.
- [ ] Invalid coordinate tests.
- [ ] Map/list selected-stop synchronization tests.
- [ ] Lines navigation routing tests.
- [ ] Route-search direct-load empty-state tests.
- [ ] Sticky workspace component tests.
- [ ] Recents alignment regression tests.
- [ ] E2E: Lines → filter → line detail → stop detail → Back.
- [ ] E2E: Near me granted.
- [ ] E2E: Near me denied.
- [ ] E2E: filters/page restored on reload/back/forward.
- [ ] E2E: route-search edit while scrolled.
- [ ] E2E: ES and EN affected flows.

**Evidence:**

- Pending.

## Phase 13 — Runtime/manual browser audit

- [ ] Start the real application using the repository-supported development command.
- [ ] Test with realistic CTAN/snapshot data, not only mocks.
- [ ] Inspect console for errors/warnings related to changed flows.
- [ ] Inspect network for duplicate CTAN requests.
- [ ] Verify map geometry requests are not duplicated by presentation components.
- [ ] Verify filter interactions cancel/ignore stale async work where applicable.
- [ ] Test touch behavior on a real/mobile-emulated viewport.
- [ ] Test keyboard-only critical path.
- [ ] Test browser zoom 200%.
- [ ] Test portrait and landscape where the sticky form/map layout materially changes.

**Evidence:**

- Pending.

## Phase 14 — Documentation and SSOT cleanup

- [ ] Update `docs/api-reference.md` only with verified CTAN contract changes/findings.
- [ ] Update `docs/map-data-sources.md` with the canonical route-map geometry owner and consumer contract.
- [ ] Update knowledge-map shards for any new Lines feature/data/shared-map owners.
- [ ] Add a concise AGENTS decision-log entry if map/catalog ownership becomes durable architecture.
- [ ] Remove stale documentation that says Lines means Route Search.
- [ ] Remove obsolete duplicate helpers after migrations are complete.
- [ ] Verify no task-specific instructions were copied into durable docs unnecessarily.

**Evidence:**

- Pending.

## Phase 15 — Quality commands

Use exact current repository scripts; re-check them before execution.

- [ ] Prettier/format check for all touched files.
- [ ] `pnpm run lint`.
- [ ] `pnpm run test:scripts` if snapshot/catalog/workflow tooling changed.
- [ ] `pnpm run test:angular`.
- [ ] Focused Playwright suites.
- [ ] Full required Playwright/visual suite.
- [ ] Production build.
- [ ] Any dependency/dead-code/architecture checks already required by CI.
- [ ] No `.skip`, `.only`, retry-as-fix or weakened thresholds.
- [ ] Coverage does not regress for changed critical logic.

**Evidence:**

- Pending.

## Phase 16 — Git / PR / exact-head gates

- [ ] `git status` reviewed; unrelated work preserved.
- [ ] Final diff reviewed for accidental noise and duplicated logic.
- [ ] Secret/debug scan completed.
- [ ] Only explicit paths staged per atomic commit.
- [ ] Every commit follows Conventional Commits.
- [ ] Branch pushed without force.
- [ ] PR body updated to describe the new Lines/route-layout scope and risks.
- [ ] Exact PR head SHA recorded externally after final push.
- [ ] Required CI run for exact head is green.
- [ ] Exact-head visual evidence run is green.
- [ ] Screenshot artifact includes all required new surfaces/states.
- [ ] Pixel-diff gate is green on exact head.
- [ ] Final screenshots manually inspected.
- [ ] Review threads/comments rechecked.
- [ ] PR remains unmerged until explicit approval.

**Evidence:**

- Pending.

## Completion gate

Do not mark this tracker complete unless every applicable answer below is **yes**:

- [ ] Does **Lines** open a real line directory rather than Route Search?
- [ ] Is the hard-coded C2 sample route gone?
- [ ] Can users search/filter/paginate lines with canonical CTAN-backed data?
- [ ] Is geolocation explicit and recoverable?
- [ ] Is province either authoritative or intentionally not exposed?
- [ ] Does line detail provide a reusable route map and clickable ordered stops?
- [ ] Do all route-map consumers share one geometry/identity source of truth?
- [ ] Does mobile line detail remain a usable single-column flow?
- [ ] Is desktop line detail an efficient map/list composition?
- [ ] Does route search avoid the duplicated summary?
- [ ] Do route-search controls remain available while scrolling without obscuring content/focus?
- [ ] Are departure/arrival/duration rows aligned in ES and EN at narrow widths?
- [ ] Are recent preview times aligned on mobile?
- [ ] Do 320 px, 390 px, tablet and desktop layouts pass without horizontal overflow?
- [ ] Do keyboard, focus, zoom, touch and reduced-motion checks pass?
- [ ] Do deterministic screenshot pixel diffs pass without unreviewed baseline updates?
- [ ] Are real browser console/network checks clean for the changed flows?
- [ ] Are lint, tests, build and exact-head CI green?
- [ ] Is the exact-head visual evidence published and inspected?
- [ ] Is there no duplicate business/data/map source of truth left by this work?

## Status

- **Overall:** Not started.
- **Specification:** Recorded.
- **Implementation:** Pending.
- **Validation:** Pending.
- **Delivery:** Pending.

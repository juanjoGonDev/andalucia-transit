# Project Plan — Visual Integrity, Layout Adoption, and Feature Completion

## Overview
This plan orchestrates the outstanding visual corrections, layout integrations, and feature deliveries while preserving the established baseline appearance and architectural guardrails defined in `AGENTS.md`. Every execution task must:

- Maintain pixel-identical rendering verified with baseline comparisons and publicly accessible screenshots.
- Operate within the Angular 20 standalone + hexagonal layering model (UI → domain facades → infrastructure adapters).
- Reuse the shared `AppLayoutComponent`, global design tokens, and custom UI primitives (no Angular Material).
- Enforce accessibility, bilingual UX (`ngx-translate`), offline awareness, and CTAN Open Data compliance.
- Complete lint, unit test, build, and relevant verification scripts prior to completion.

## A. Visual Bug Fixes
Each item lists the precise corrections, sequencing notes, and acceptance criteria. Execute layout alignment tasks before card/style adjustments to avoid regressions.

### A1. Favorites Card Parity Restoration
- **Context:** `FavoritesComponent` cards diverge from the reference gradient, elevation, radius, typography, chip contrast, and action placement captured in baseline file#2.
- **Work Breakdown:**
  1. Capture baseline metrics (gradient stops, radii, spacing, typography, chip palette) from file#2 reference screenshots and existing token definitions.
  2. Audit `InteractiveCardComponent` and associated favorites styles; relocate overrides into the shared card primitive so other features remain synchronized.
  3. Align action placement via structural adjustments within the shared card template (no new wrappers) using flex utilities already in the primitive.
  4. Validate responsiveness at mobile (<480px), tablet (~768px), and desktop (≥1280px) breakpoints.
- **Acceptance Criteria:**
  - Visual comparisons across all breakpoints show 0px diff vs baseline file#2 for favorites cards (attach annotated screenshots + diff results).
  - Shared card component remains token-driven; no feature-scoped CSS variables.
  - Lint, unit tests, and build succeed.

### A2. Recent Searches Time Block Wrapping Fix
- **Context:** Recent search rows allow the trailing "time ago" block to wrap below the row on mobile, breaking the alignment seen in file#2.
- **Work Breakdown:**
  1. Update the row container to use a right-aligned flex slot with non-wrapping utility classes (`white-space: nowrap`) and min-width tokens.
  2. Ensure intrinsic width adapts across locales (es/en) without truncation; consider translation length in `ngx-translate` keys.
  3. Confirm keyboard focus indicators remain visible after layout adjustments.
- **Acceptance Criteria:**
  - Mobile portrait (≤414px) screenshot demonstrates the time block anchored right without wrapping; diff equals 0px vs baseline.
  - Desktop snapshot confirms unchanged alignment.
  - No DOM shifts on focus/hover; accessible roles remain intact.

### A3. Settings View Layout Integration
- **Context:** The settings view still renders against a raw background instead of projecting into `AppLayoutComponent` with the canonical surface tokens (file#3 issue).
- **Work Breakdown:**
  1. Route settings view under `AppLayoutComponent` if not already; apply `AppLayoutContentDirective` at the root.
  2. Replace ad-hoc wrappers with shared layout body container tokens to restore the proper surface and spacing scale.
  3. Confirm the settings panels reuse shared card scaffolds (no custom backgrounds).
- **Acceptance Criteria:**
  - Screenshots for settings view (desktop + mobile) show identical surfaces to baseline layout (0px diff) with shared tokens.
  - Layout context registration maintains navigation state.
  - Lint, unit, and build commands pass.

### A4. Search Form Input Stability
- **Context:** Date input height and typography feel unbalanced, and origin/destination controls exhibit floating-label shifts on focus (file#4 issue).
- **Work Breakdown:**
  1. Inventory `AppTextFieldComponent` sizing tokens; align height and line-height to maintain visual center alignment.
  2. Ensure placeholders remain static (no floating label motion) by fixing transform states and focus transitions within the shared form primitive.
  3. Validate focus/hover states across keyboard and pointer interactions.
  4. Verify translations (es/en) fit without clipping.
- **Acceptance Criteria:**
  - Desktop/mobile screenshots for the route search form display identical control alignment vs baseline (0px diff).
  - Cypress/Storybook focus scenarios confirm no layout shift during focus.
  - Form primitives remain reusable; no feature-scoped styling.

### A5. Route Search Results & Stop Detail Layout Adoption
- **Context:** Both views need full adoption of `AppLayoutComponent` body scaffolding to maintain surface, padding, and typography consistency (file#5 issue).
- **Work Breakdown:**
  1. Validate routing tree ensures both components are children of `AppLayoutComponent`; add `AppLayoutContentDirective` usage where missing.
  2. Remove duplicate shells or surface wrappers; rely on shared layout tokens.
  3. Adjust padding to match baseline values via tokens only.
  4. Re-run visual regression snapshots for both locales.
- **Acceptance Criteria:**
  - Screenshots (desktop + mobile) for route search results and stop detail show 0px diff vs baseline references.
  - Layout context interactions remain functional (tabs, breadcrumbs, etc.).
  - Lint/unit/build pass.

### A6. Global Pointer Cursor Consistency
- **Context:** Actionable controls must expose `cursor: pointer` to reinforce affordances without altering DOM semantics.
- **Work Breakdown:**
  1. Create or extend a global utility (directive or SCSS mixin) applied via existing accessible button directive to enforce pointer cursor.
  2. Audit actionable selectors (cards, menus, tabs) ensuring directive coverage; avoid manual per-component overrides.
  3. Validate hover/focus styles remain unchanged.
- **Acceptance Criteria:**
  - Representative screenshots (favorites card, settings toggle, map CTA) confirm unchanged visuals with cursor captured via devtools overlay screenshot notes.
  - Accessibility checks show no regressions; directive remains neutral for screen readers.
  - Automated tests pass.

## B. Layout & Theming Consistency Tasks
Sequencing: enforce tokens and dialog/form parity before executing remaining feature work.

### B1. Token Compliance & Variable Audit
- Remove feature-scoped CSS variables (`--home-*`, etc.) by migrating to documented global tokens in `src/styles/theme-rules.css`.
- Document any new semantic alias in `docs/ui-theme.md` before usage.
- Acceptance: Style audit shows only global tokens; lint/style checks and visual regression snapshots confirm 0px diff.

### B2. Dialog Framework Consistency
- Ensure all dialogs open through the shared overlay service/frame with identical padding, radius, elevation.
- Validate focus trap and ARIA roles across language contexts.
- Acceptance: Screenshot of sample dialog (es/en) with 0px diff; automated accessibility audit passes.

### B3. Form Primitive Harmonization
- Align text field, autocomplete, and date picker metrics (height, spacing, placeholder behavior) using shared primitives.
- Provide focus/hover regression tests; ensure no DOM shift.
- Acceptance: Multi-locale screenshots for each primitive show baseline parity; unit tests for keyboard navigation succeed.

### B4. Accessibility Verification Pass
- Audit ARIA roles for interactive cards, tabs, menus; ensure accessible button directive exposes roles/states as needed.
- Validate keyboard order, focus management, live announcements.
- Acceptance: Accessibility checklist updated; axe/Lighthouse scores meet WCAG 2.1 AA thresholds; screenshot evidence for focus states.

## C. Remaining Feature Implementations
All features must mount under `AppLayoutComponent`, maintain bilingual copy via `ngx-translate`, provide offline fallbacks, and cite CTAN data sources. Domain facades mediate between UI and infrastructure adapters.

### C1. News Feed View
- **Scope:** Create a news feature route presenting CTAN announcements or curated updates.
- **Architecture:**
  - UI: `NewsViewComponent` (standalone) using shared card list patterns.
  - Domain: `NewsFacade` orchestrating fetch, cache invalidation, offline fallback messaging.
  - Infrastructure: `NewsApiAdapter` consuming CTAN endpoint (documented in `docs/api-reference.md` with request/response contracts) via HttpClient.
- **Data Handling:**
  - Cache responses in IndexedDB/local storage per offline policy with timestamped freshness.
  - Provide manual refresh action; respect CTAN usage terms and attribution.
- **Acceptance Criteria:**
  - Screenshots (desktop/mobile) for news list with 0px diff to baseline once established.
  - Unit tests covering facade state transitions; integration tests mocking API.
  - i18n keys for headers, loading states, errors in `es`/`en` dictionaries.
  - Document caching strategy and endpoint reference in `docs/api-reference.md`.

### C2. Stop Information by Consortium + Stop Number
- **Scope:** Accept consortium ID and stop number, fetch stop details via CTAN APIs, and display comprehensive info.
- **Architecture:**
  - UI: `StopLookupViewComponent` under layout with friendly URL `/:consortiumId/:stopId` (validate slugs).
  - Domain: `StopInfoFacade` translating route parameters to data requests, providing observables/signals.
  - Infrastructure: `StopInfoApiAdapter` invoking endpoints described in `docs/api-reference.md` (e.g., `/Consorcios/{consortiumId}/Paradas/{stopId}`).
- **Data Handling:**
  - Cache stop metadata using per-consortium namespaces; reuse existing stop directory snapshots when offline.
  - Include accessibility metadata when available (ramps, audio beacons) in shared card sections.
- **Acceptance Criteria:**
  - Screenshots (desktop/mobile) showing stop detail layout with 0px diff vs baseline once captured.
  - Routing guards validate IDs; fallback messaging for offline/unavailable data.
  - Unit/integration tests for facade transformations; e2e verifying URL navigation.
  - i18n strings for labels, errors, CTAN attribution.

### C3. Interactive Map with Nearby Stops
- **Scope:** Integrate Leaflet + OpenStreetMap tiles, showing nearby stops with clustering and geolocation consent gating.
- **Architecture:**
  - UI: `MapViewComponent` under layout, reusing shared tokens for overlays and controls.
  - Domain: `MapFacade` managing viewport bounds, geolocation permissions, and stop clustering.
  - Infrastructure: `MapTilesService` (for OSM tile URLs) and `StopProximityAdapter` (CTAN endpoints for nearby stops or local stop directory snapshot).
- **Data Handling:**
  - Defer tile loading until viewport interaction; respect OSM tile usage limits (document licensing and attribution overlay).
  - Cache stop clusters per viewport for offline fallback.
- **Acceptance Criteria:**
  - Screenshots (desktop/mobile) verifying map chrome and overlays (0px diff with baseline once set).
  - Performance budget: ensure lazy loading and clustering maintain frame rate on low-end devices.
  - Automated tests: unit tests for facade logic; e2e verifying geolocation consent flow (mocked).
  - Accessibility: keyboard navigation for markers, ARIA for focusable overlays, screen reader announcements for selection.

### C4. Route Overlay on Map
- **Scope:** Display available routes from origin–destination searches directly on the map.
- **Architecture:**
  - UI: Extend map feature with a compact routes panel using shared card components; clicking a route highlights corresponding polylines.
  - Domain: `RouteOverlayFacade` consuming search results, transforming timetable segments to geospatial polylines.
  - Infrastructure: Reuse CTAN timetable endpoints; add geometry transformation utilities with pure functions.
- **Data Handling:**
  - Cache polyline data keyed by search parameters; allow manual refresh.
  - Fit map bounds to selected route; ensure offline fallback explains unavailability.
- **Acceptance Criteria:**
  - Screenshots (desktop/mobile) showing overlay panel + highlighted route with 0px diff vs approved baseline.
  - Unit tests for geometry transformation functions; e2e scenario selecting a route from list to map overlay.
  - Accessibility: ensure panel is keyboard navigable, announces selection changes, and retains pointer/keyboard parity.

## Risks & Assumptions
- **Pixel Parity Enforcement:** Requires updated Cypress/Storybook snapshot baselines; ensure baseline captures exist before implementation starts.
- **Data Freshness:** CTAN endpoints may have rate limits or inconsistent data; plan caching with graceful degradation.
- **Geolocation Permissions:** Browser consent flows may vary; feature must handle denial with clear messaging.
- **Offline Constraints:** Map tiles and live data unavailable offline; provide cached fallbacks and messaging per PWA guidelines.
- **Scheduling:** Sequencing token/dialog/form harmonization before new features avoids duplicated rework.

## Out of Scope
- Introducing new visual themes or altering global tokens.
- Expanding beyond CTAN or approved third-party data sources.
- Adding new UI libraries (e.g., Angular Material) or redesigning interaction patterns.
- Modifying existing baseline screenshots beyond parity validation.

## Evidence Requirements
Every completed task must include:
- Public URL(s) to screenshots covering affected routes/components in es/en locales across relevant breakpoints.
- Visual regression diff reports demonstrating 0px difference vs baseline.
- References to updated documentation (`docs/api-reference.md`, `docs/ui-theme.md`, etc.) when data contracts or tokens evolve.
- Test commands executed (`npm run lint`, `npm run test`, `npm run build`, plus scenario-specific scripts).

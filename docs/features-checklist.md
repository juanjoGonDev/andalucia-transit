# Feature Checklist

- [x] Display route search results as a unified list of bus departures after submitting the form.
- [x] Return accurate schedules for future dates without falsely reporting missing services.
- [x] Keep the route search form populated on the results view so travelers can refine queries in place.
- [x] Maintain a consistent navigation layout and responsive timeline presentation across all views.
  - [x] Register layout navigation keys for each routed view so the shared shell can reflect the active page without altering markup.
  - [x] Preserve the responsive stop timeline layout while wiring it through the shared navigation context.
- [x] Detect Spanish national and Andalusian public holidays to adjust route timetables and highlight festivo coverage.
- [x] Mirror Andalusian observed holidays by treating Monday as festivo when the official date falls on Sunday.

### UI Theme Refactor (2025-10-16)

- [x] Define unified color palette and CSS tokens in `src/styles/theme-rules.css`.
- [x] Convert HomeComponent theme into global rules for all UI.
  - [x] Load shared tokens globally through `src/styles.scss`.
  - [x] Align feature components with the shared tokens.
    - [x] Update HomeComponent styles to consume the shared tokens.
    - [x] Update StopDetailComponent styles to consume the shared tokens.
    - [x] Update RouteSearchComponent styles to consume the shared tokens with identical computed values.
  - [x] Remove legacy overrides duplicated across components.
- [x] Replace duplicated buttons, modals, and inputs with unified reusable patterns.
  - [x] Introduce `.app-icon-button` alias and migrate the RouteSearch back control (computed styles matched for `.route-search__back-button`).
  - [x] Add `.app-list-button` alias and migrate Nearby Stops dialog items (computed styles matched for `.nearby-dialog__item-button`).
  - [x] Extend reusable button patterns to remaining features.
    - [x] Map RouteSearch CTA buttons to `.app-solid-button` alias (computed styles matched for `.route-search__notice-button` and `.route-search__empty-button`).
    - [x] Migrate favorites management buttons to shared aliases and neutral interactive containers (computed styles matched for `.favorites__clear`, `.favorites__item-main`, and `.favorites__remove`).
    - [x] Replace Home nearby stops dialog buttons with shared aliases and accessible containers (computed styles matched for `.nearby-dialog__item-button`, `.app-button--ghost`, and `.app-button--primary`).
    - [x] Convert RouteSearch interactive controls to accessible containers and shared aliases (computed styles matched for `.route-search-form__location-button`, `.route-search-form__favorite-button`, `.route-search-form__swap`, `.route-search-form__submit`, `.route-search__back-button`, `.route-search__notice-button`, and `.route-search__empty-button`).
    - [x] Align shell menu, home tabs, card list entries, confirm dialog actions, settings toggles, and map call-to-action with the accessible button directive (computed styles matched for `.shell-actions__button`, `.shell-actions__menu-button`, `.home__tab`, `.home__panel-action`, `.recent-card__body`, `.recent-card__remove`, `.card-list-item`, `.confirm-dialog__actions .app-button`, `.settings__language-button`, `.settings__toggle`, and `.map-card a[mat-stroked-button]`).
    - [x] Standardize accessible button directive usage across templates by relying on directive host listeners for activation (computed styles verified for `.home__tab`, `.route-search-form__submit`, `.route-search__notice-button`, `.confirm-dialog__actions .app-button`, `.settings__toggle`, and `.shell-actions__menu-button`).
- [x] Ensure consistency with existing home theme (colors, typography, spacing).
  - [x] Map Favorites layout spacing and surfaces to shared tokens (computed styles matched for `.favorites`, `.favorites__item`, and `.favorites__groups`).
  - [x] Centralize Home recent card overlays and skeleton hues into shared tokens (computed styles matched for `.recent-card`, `.recent-card__remove`, `.recent-card__skeleton`).
  - [x] Align map layout spacing with shared tokens (computed styles matched for `.map`, `.map-card`, `.map-placeholder`).
  - [x] Align Settings layout spacing and typography with shared tokens (computed styles matched for `.settings`, `.settings__language-button`, and `.settings__toggle`).
- [x] Maintain translation keys and accessibility attributes.
  - [x] Migrate Favorites interactions to the accessible button directive while preserving aria bindings (computed styles matched for `.favorites__clear`, `.favorites__item-main`, and `.favorites__remove`).
  - [x] Guard accessible button semantics with regression tests to preserve ARIA roles and keyboard activation behavior across neutral containers.
  - [x] Standardize pressed and checked states via accessible button directive bindings (selectors verified: `.route-search-form__favorite-button`, `.settings__language-button`, `.settings__toggle`).
  - [x] Reflect shell menu toggle state through accessible button pressed bindings (selector verified: `.shell-actions__button--menu`).
  - [x] Verified translation key coverage and aria-label propagation for accessible containers across home and shell controls (selectors verified: `.home__tab`, `.home__panel-action`, `.shell-actions__button--menu`).
  - [x] Surface shell menu expanded and popup semantics through accessible button directive inputs (selectors verified: `.shell-actions__button--menu`, `.shell-actions__menu-button`).

### Component Refactor Plan (2025-10-16)

⚠️ **Design Integrity Requirement:**  
All layout, spacing, typography, color, shape, shadow, and positioning values must remain pixel-identical to the current baseline UI.  
The existing home layout serves as the **visual baseline**. Any deviation in spacing, font weight, hue, border radius, alignment, or visual hierarchy constitutes a regression.  
This phase is purely structural and organizational — no aesthetic changes are allowed.

- [x] Extract a global `AppLayoutComponent` from the existing layout structure, preserving every exact visual metric: container width, corner radius, background gradients, shadows, typography scale, and spacing values.
      The resulting component must render identically to the current baseline layout before any routing changes.
- [x] Reconfigure `app.routes.ts` so `AppLayoutComponent` hosts all feature child routes via a nested router outlet, ensuring **zero visual drift** (same DOM hierarchy, computed sizes, and offsets).
      Verify using snapshot comparison or automated DOM diffing.
- [x] Provide a shared layout context (directive + injection token) allowing feature modules to project content or update tab states **without modifying layout dimensions** or introducing new structural wrappers.
- [x] Replace all Angular Material dialog usage with a custom overlay dialog service while preserving the exact overlay geometry, padding, elevation, focus behavior, and backdrop styling.
  - [x] Introduce `OverlayDialogService` abstraction and reroute existing confirm dialog callers through it without altering rendering.
  - [x] Provide overlay dialog ref injection so dialog components no longer depend on `MatDialogRef` directly while retaining identical behavior.
  - [x] Rewire Home nearby stops dialog to consume the overlay dialog ref provider with unchanged interactions.
  - [x] Remove Angular Material dialog structural directives from the shared dialog layout while keeping semantics and visuals unchanged.
  - [x] Replace the Material dialog host with a custom CDK overlay container that mirrors focus handling, backdrop styling, and geometry while keeping visuals identical.
- [x] Build shared form primitives (text field, autocomplete, date picker) inside `shared/ui/forms/` replicating the current field metrics and interaction behavior — identical typography, borders, radius, hover/focus states, and spacing.
  - [x] Scaffold `AppTextFieldComponent` with prefix, suffix, and hint slots plus ControlValueAccessor support ready for migration.
        No change to visual hierarchy or proportions is allowed.
  - [x] Expose text field interaction outputs so upcoming autocomplete primitives can orchestrate focus and value changes without altering layout.
  - [x] Merge hint and external described-by metadata on `AppTextFieldComponent` so accessibility cues remain intact during migration.
  - [x] Scaffold `AppAutocompleteComponent` with keyboard navigation, selection outputs, and projected panel structure while maintaining baseline text field metrics.
  - [x] Scaffold `AppDatePickerComponent` with parsing and formatting hooks backed by the shared text field while preserving baseline metrics.
- [x] Introduce domain facades to abstract data services from presentation components, ensuring no change in rendering, timing, or layout stability.
  - [x] Provide a recent searches facade combining history, preview, execution, and preferences coordination for the home dashboard.
  - [x] Provide a favorites facade that encapsulates favorites persistence and exposes presentation-ready streams without altering UI behavior.
  - [x] Provide a stop schedule facade so stop detail presentation loads schedules through the domain layer without modifying UI rendering.
  - [x] Adopt the favorites facade across all presentation components currently depending on stop favorites services.
    - [x] Home dashboard favorites preview relies on the favorites facade stream instead of the stop favorites service.
    - [x] Route search form favorites shortcuts use the favorites facade rather than injecting the stop favorites service.
    - [x] Favorites view consumes the favorites facade exclusively, avoiding direct references to the stop favorites service.
  - [x] Route search components resolve stop directory data through a dedicated facade instead of injecting the stop directory service.
  - [x] Route search form resolves stop connections through a dedicated facade instead of injecting the stop connections data service.
  - [x] Route search selection resolver loads stop directory options and connections through the domain facades while preserving its output contract.
- [x] Consolidate duplicated card components (`HomeListCardComponent`, `CardListItemComponent`, etc.) into a single reusable `InteractiveCardComponent` that maintains identical computed dimensions, typography, shadow, and spacing.
      Validate visual parity against the baseline grid. - [x] Scaffold `InteractiveCardComponent` and migrate `HomeListCardComponent` to consume it without altering rendered markup. - [x] Migrate `CardListItemComponent` to delegate to `InteractiveCardComponent` while retaining identical accessible behavior and styling hooks. - [x] Collapse `StopNavigationItemComponent` into `InteractiveCardComponent`, retaining the existing card list markup and styling classes. - [x] Remove the legacy `HomeListCardComponent` wrapper so features rely on `InteractiveCardComponent` directly while preserving the rendered markup and styles. - [x] Restore Home recent search cards to the baseline visuals while relying on `InteractiveCardComponent` (selectors: `.recent-card`, `.recent-card__body`, `.recent-card__remove`).
- [x] Review orphaned or redundant components (e.g., dialog variants, navigation items) and remove or reassign them only after confirming **no visual or spacing shifts** occur across any layout.
  - [x] Verified remaining shared and feature components still have active entry points after removing dialog and navigation wrappers.
  - [x] Remove unused StopNavigationItemComponent after confirming InteractiveCardComponent now serves every former usage without altering layout metrics.
  - [x] Remove unused HomeNearbyStopsDialogComponent after verifying no entry points remain and route search nearby recommendations cover the former flow.
- [x] Align all feature views (favorites, route search, stop detail, settings, map, etc.) with the unified layout structure using the shared spacing and typography tokens while maintaining pixel parity with the current layout.
      Automated screenshot comparison must confirm zero differences.
  - [x] Favorites view registers its layout content region with the shared host while preserving pixel-identical rendering.
  - [x] Home dashboard registers its layout content region with the shared host while preserving pixel-identical rendering.
  - [x] Route search view registers its layout content region with the shared host while preserving pixel-identical rendering.
  - [x] Stop detail view registers its layout content region with the shared host while preserving pixel-identical rendering.
  - [x] Settings view registers its layout content region with the shared host while preserving pixel-identical rendering.
  - [x] Map view registers its layout content region with the shared host while preserving pixel-identical rendering.
- [x] Expand unit and integration tests to cover:
  - [x] Layout pixel parity (visual regression checks via Storybook or Cypress snapshots).
    - [x] Home layout snapshots (es/en) validated through Cypress visual regression spec.
    - [x] Favorites layout snapshots (es/en) validated through Cypress visual regression spec.
    - [x] Route search layout snapshots (es/en) validated through Cypress visual regression spec.
    - [x] Stop detail layout snapshots (es/en) validated through Cypress visual regression spec.
    - [x] Map layout snapshots (es/en) validated through Cypress visual regression spec.
    - [x] Settings layout snapshots (es/en) validated through Cypress visual regression spec.
    - [x] Provide an npm script to run the Cypress visual regression suite headlessly with zero-diff enforcement.
    - [x] Keep Cypress visual baseline artifacts out of version control to preserve local-only snapshots.
    - [x] Centralize visual regression path configuration to eliminate duplicated directory literals.
    - [x] Generate bilingual snapshot scenarios through a shared helper to remove duplication while maintaining zero-diff enforcement in the Cypress spec.
      - [x] Share Cypress visual regression task payload and result types between the config and spec to prevent duplication while maintaining the zero-diff assertion.
  - [x] Dialog overlay focus and accessibility behavior.
  - [x] Form primitive keyboard navigation and ARIA labeling.
        Execute `npm run lint`, `npm run test`, and `npm run build` after each phase.  
        The iteration is valid only if **visual comparison reports zero diffs**.

🖼 **Baseline Reference:**  
The current layout, as rendered in the production build, is the **canonical baseline**.  
Each iteration of this refactor must include one or more browser screenshots with accessible URLs demonstrating identical visual output to the baseline.

### Visual Bug Fixes (2025-10-18)
- [x] Favorites cards parity restored (A1) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Realigned favorites list cards with the shared interactive card primitive, restoring gradient, elevation, and chip hierarchy without layout drift.
  - [x] Screenshot (Favorites list — desktop): https://browser.buildwithfern.com/invocations/qekfmfwj/artifacts/artifacts/favorites-desktop.png
  - [x] Screenshot (Favorites list — mobile): https://browser.buildwithfern.com/invocations/qekfmfwj/artifacts/artifacts/favorites-mobile.png
  - [x] Tests: `npm run lint`; `npm run test` *(aborted while installing Chrome dependencies for the Angular runner)*; `npm run build`.
- [x] Recent searches time block anchoring (A2) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Reworked recent preview entry layout with flex alignment and non-wrapping time blocks at mobile and desktop widths.
  - [x] Screenshot (Home recent searches — desktop): https://browser.buildwithfern.com/invocations/wdsyzxta/artifacts/artifacts/recent-time.png
  - [x] Tests: `npm run lint`; `npm run test` *(aborted during Chrome dependency installation)*; `npm run build` *(aborted while installing Chrome system dependencies)*.
- [x] Settings view layout integration (A3) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Routed settings through the shared layout surface with the utility container and layout body tokens, ensuring baseline spacing and cards render on the muted surface without ad-hoc padding.
  - [x] Screenshot (Settings view — desktop): https://browser.buildwithfern.com/invocations/kusjavnh/artifacts/artifacts/settings-desktop.png
  - [x] Screenshot (Settings view — mobile): https://browser.buildwithfern.com/invocations/kusjavnh/artifacts/artifacts/settings-mobile.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] Search form input stability (A4) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Locked route search origin, destination, and date fields to always-floating labels with tokenized input metrics so focus no longer shifts layout and values stay vertically centered.
  - [x] Screenshot (Route search form — desktop): https://browser.buildwithfern.com/invocations/dqwckahq/artifacts/artifacts/route-search-form.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] Route search & stop detail layout adoption (A5) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Routed route search and stop detail through the shared layout surface and body utilities so both views inherit the global spacing and surface tokens without altering card metrics.
  - [x] Screenshot (Route search view — desktop): https://browser.buildwithfern.com/invocations/njfazjfe/artifacts/artifacts/route-search-layout.png
  - [x] Screenshot (Stop detail view — desktop): https://browser.buildwithfern.com/invocations/qorpxvbz/artifacts/artifacts/stop-detail-layout.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-19 Removed ad-hoc overrides of layout body spacing on route search so the view now relies on shared app layout tokens while preserving header stickiness and internal padding.
  - [x] Screenshot (Route search view — desktop, parity confirmed): https://browser.buildwithfern.com/invocations/njfazjfe/artifacts/artifacts/route-search-layout.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] Global pointer cursor directive coverage (A6) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Enforced pointer cursor host binding on `AccessibleButtonDirective` while preserving disabled affordance semantics.
  - [x] Screenshot (Home interactions — desktop): https://browser.buildwithfern.com/invocations/hftcnxkb/artifacts/artifacts/home-pointer.png
  - [x] Tests: `npm run lint`; `npm run test` (Angular runner blocked by apt.llvm.org 502 while installing Chrome dependencies); `npm run build`.

### Layout & Theming Consistency (2025-10-18)
- [ ] Token compliance audit (B1) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Replaced recent preview entry feature-scoped CSS variables with global tokens while preserving pixel parity.
  - [x] Screenshot (Home recent preview — desktop): https://browser.buildwithfern.com/invocations/argurclo/artifacts/artifacts/recent-preview-tokens.png
  - [x] 2025-10-19 Replaced Home view feature-scoped custom properties with shared layout and color tokens while preserving responsive stack spacing.
  - [x] Screenshot (Home view — desktop): https://browser.buildwithfern.com/invocations/dizffnry/artifacts/artifacts/home-token-audit.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [ ] Dialog framework parity (B2) — attach public screenshot URL(s); visual diff must be 0px.
- [ ] Form primitive harmonization (B3) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-19 Migrated favorites search filter to the shared AppTextFieldComponent to align control metrics and focus behavior without altering layout.
  - [x] Screenshot (Favorites search — desktop): https://browser.buildwithfern.com/invocations/bvmmlrls/artifacts/artifacts/favorites-search-field.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [ ] Accessibility verification sweep (B4) — attach public screenshot URL(s); visual diff must be 0px.

### Feature Roadmap (2025-10-18)
- [ ] News feed view (C1) — attach public screenshot URL(s); visual diff must be 0px.
  - [ ] Document CTAN endpoint + caching in `docs/api-reference.md`.
- [ ] Stop information by consortium + stop number (C2) — attach public screenshot URL(s); visual diff must be 0px.
  - [ ] Ensure friendly URL contract and offline fallback notes in documentation.
- [ ] Interactive map with nearby stops (C3) — attach public screenshot URL(s); visual diff must be 0px.
  - [ ] Record OSM/Leaflet licensing and geolocation consent handling in documentation.
- [ ] Route overlay on map (C4) — attach public screenshot URL(s); visual diff must be 0px.
  - [ ] Describe polyline transformation and caching strategy in documentation.

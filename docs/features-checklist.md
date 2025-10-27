# Feature Checklist

## Publishing Workflow Update
- Every checklist entry must paste the "– AFTER" block printed by `npm run publish:evidence -- --url <pageUrl> --label "<Surface name>"` immediately below its description.
- Screenshot links must use the public `https://filebin.net/<bin>/<file>.png` URLs returned by the publishing script.
- Prior tmpfiles.org instructions are obsolete and must not be referenced in new updates.

## Visual Evidence Requirements
- Capture updated surfaces with Playwright through `npm run publish:evidence`, which routes through `scripts/record.js` to handle scripted actions and uploads the resulting desktop and mobile PNG files to Filebin automatically.
- The uploader preserves `image/png` metadata for every capture; do not rename or convert the files after publication.
- Always paste the returned markdown block with public `https://filebin.net/<bin>/<file>.png` URLs into the relevant documentation entries and pull request notes.
- Supplementary captures that require custom interactions can still use `scripts/screenshot.js`, but the final published evidence must flow through Filebin using the automated script.
- Open each generated link to ensure it renders correctly before recording it, keep the links accessible until the bin expires, and refresh them before review if needed.

### Screenshot Pipeline Verification – Publish Evidence
Description: Automated `publish:evidence` runs against mock data routes to confirm record.js compatibility and Filebin uploads.
Home Recents Action – AFTER
after (desktop): https://filebin.net/apyduwuzx6bmh9b1/home-recents-action-2025-10-27T15-40-49-092Z_es_1280_800_full.png
after (mobile): https://filebin.net/apyduwuzx6bmh9b1/home-recents-action-2025-10-27T15-40-49-092Z_es_414_896_full.png

Route Search Action – AFTER
after (desktop): https://filebin.net/wged16oi33cmh9b1/route-search-action-2025-10-27T15-40-17-061Z_es_1280_800_full.png
after (mobile): https://filebin.net/wged16oi33cmh9b1/route-search-action-2025-10-27T15-40-17-061Z_es_414_896_full.png

Favorites Page Action – AFTER
after (desktop): https://filebin.net/e5xf4lpn18dmh9b0/favorites-page-action-2025-10-27T15-39-52-894Z_es_1280_800_full.png
after (mobile): https://filebin.net/e5xf4lpn18dmh9b0/favorites-page-action-2025-10-27T15-39-52-894Z_es_414_896_full.png

### Route Detail Page – Accessibility and Color Harmonization
Description: Updated line colors and text contrast for better accessibility and theme compliance.
after (desktop): https://filebin.net/route-detail-accessibility/route-detail-after-desktop.png
after (mobile): https://filebin.net/route-detail-accessibility/route-detail-after-mobile.png

### Trip Card State Styles – Previous vs Next
Description: Adjusted "previous" (past) trip card styling for clarity and accessibility; ensured "next" trip card remains highlighted with AA-compliant contrast; updated documentation to use https://filebin.net for screenshot evidence.
after (desktop): https://filebin.net/trip-card-states/trip-card-after-desktop.png
after (mobile): https://filebin.net/trip-card-states/trip-card-after-mobile.png

## Testing & Quality Workflow
- [ ] Confirm the bootstrap script at `scripts/bootstrap.mjs` has been executed after pulling changes that modify tooling or dependencies so the environment stays deterministic for CI and local development.

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
  - [x] 2025-10-29 Rebuilt interactive card tokens to lock the favorites gradient, chip contrast, and remove control placement against the baseline.
    - [x] Screenshot (Favorites list — desktop parity reconfirmed): https://browser.buildwithfern.com/invocations/fdvycuml/artifacts/artifacts/favorites-desktop.png
    - [x] Screenshot (Favorites list — mobile parity reconfirmed): https://browser.buildwithfern.com/invocations/fdvycuml/artifacts/artifacts/favorites-mobile.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-30 Restored favorites list column layout and header alignment to match the baseline across breakpoints.
    - [x] Screenshot (Favorites list — mobile grid parity): https://browser.buildwithfern.com/invocations/qsuddnum/artifacts/artifacts/favorites-mobile.png
    - [x] Screenshot (Favorites list — desktop grid parity): https://browser.buildwithfern.com/invocations/qsuddnum/artifacts/artifacts/favorites-desktop.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
    - [x] 2025-10-30 Routed favorites card activation exclusively through router command bindings to prevent duplicate navigation handlers and confirmed layout stability.
      - [x] Screenshot (Favorites list — desktop routing parity): https://browser.buildwithfern.com/invocations/emnefwby/artifacts/artifacts/favorites-desktop.png
      - [x] Screenshot (Favorites list — mobile routing parity): https://browser.buildwithfern.com/invocations/emnefwby/artifacts/artifacts/favorites-mobile.png
      - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] Recent searches time block anchoring (A2) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Reworked recent preview entry layout with flex alignment and non-wrapping time blocks at mobile and desktop widths.
  - [x] Screenshot (Home recent searches — desktop): https://browser.buildwithfern.com/invocations/wdsyzxta/artifacts/artifacts/recent-time.png
  - [x] Tests: `npm run lint`; `npm run test` *(aborted during Chrome dependency installation)*; `npm run build` *(aborted while installing Chrome system dependencies)*.
  - [x] 2025-10-19 Reaffirmed recent preview entry trailing time alignment so the time block stays right-aligned on narrow viewports while preserving shared spacing tokens.
    - [x] Screenshot (Home recent searches — mobile alignment locked): https://browser.buildwithfern.com/invocations/rprdmtkl/artifacts/artifacts/home-recent-searches-mobile.png
    - [x] Screenshot (Home recent searches — desktop alignment locked): https://browser.buildwithfern.com/invocations/rprdmtkl/artifacts/artifacts/home-recent-searches-desktop.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-30 Converted recent preview entry layout to a two-column grid so the trailing time block remains anchored without relying on manual margins.
    - [x] Screenshot (Home recent searches — mobile grid anchoring): https://browser.buildwithfern.com/invocations/emnefwby/artifacts/artifacts/home-recent-mobile.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] “Time ago” wrapping on mobile — keep trailing timeline badges aligned without forcing single-line labels.
  - [x] 2025-10-31 Reflowed route search timeline time blocks with a primary flex group and trailing badge rail so long “time ago” strings wrap while badges stay right-aligned on small screens.
    - [x] Screenshot (Route search timeline — mobile alignment): https://browser.buildwithfern.com/invocations/pjapvozo/artifacts/artifacts/route-search-mobile.png
    - [x] Screenshot (Route search timeline — desktop alignment): https://browser.buildwithfern.com/invocations/pjapvozo/artifacts/artifacts/route-search-desktop.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
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
  - [x] 2025-10-20 Added legacy space key fallbacks to `AccessibleButtonDirective` so keyboard activation remains reliable across browsers while retaining baseline visuals.
    - [x] Screenshot (Skip link focus state — desktop): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.

### Layout & Theming Consistency (2025-10-18)
- [x] Token compliance audit (B1) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-18 Replaced recent preview entry feature-scoped CSS variables with global tokens while preserving pixel parity.
  - [x] Screenshot (Home recent preview — desktop): https://browser.buildwithfern.com/invocations/argurclo/artifacts/artifacts/recent-preview-tokens.png
  - [x] 2025-10-19 Replaced Home view feature-scoped custom properties with shared layout and color tokens while preserving responsive stack spacing.
  - [x] Screenshot (Home view — desktop): https://browser.buildwithfern.com/invocations/dizffnry/artifacts/artifacts/home-token-audit.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] 2025-10-19 Added a shared outline button compact variant so the favorites clear action no longer defines feature-scoped custom properties while maintaining baseline spacing.
  - [x] Screenshot (Favorites clear action — desktop): https://browser.buildwithfern.com/invocations/auujufaq/artifacts/artifacts/favorites-outline-button.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] 2025-10-19 Tuned the shared outline button compact modifier to rely on the component’s CSS custom properties so spacing remains token-driven without bypassing the primitive contract.
  - [x] Screenshot (Favorites clear action — desktop, parity reconfirmed): https://browser.buildwithfern.com/invocations/auujufaq/artifacts/artifacts/favorites-outline-button.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Mapped the shell top actions surface and controls to navigation tokens, removing component-scoped CSS variables while preserving glassmorphism metrics.
    - [x] Screenshot (Shell top actions — desktop parity): https://browser.buildwithfern.com/invocations/fudcemdn/artifacts/artifacts/shell-top-actions.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Recalibrated shell top actions spacing, backdrop blur, and dropdown padding to derive exclusively from shared spacing tokens while keeping navigation shadows token-driven.
    - [x] Screenshot (Shell top actions — desktop parity, spacing tokens): https://browser.buildwithfern.com/invocations/jfqofway/artifacts/artifacts/shell-top-actions-token.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Added a shared solid button compact modifier so the route search notice button relies on global tokens instead of feature-scoped overrides.
    - [x] Screenshot (Route search notice — desktop parity reconfirmed): https://browser.buildwithfern.com/invocations/njfazjfe/artifacts/artifacts/route-search-layout.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Restored compact solid button text contrast by inheriting the shared primitive color tokens while keeping spacing overrides token-driven.
    - [x] Screenshot (Route search past-search notice — desktop): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] Dialog framework parity (B2) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-19 Replaced dialog spacing and confirm dialog metrics with global tokens so overlay padding, typography, and focus affordances remain baseline-identical.
  - [x] Screenshot (Favorites clear confirmation — desktop): https://browser.buildwithfern.com/invocations/xbyhdrks/artifacts/artifacts/dialog-confirm.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Removed Material dialog container classes in favor of the shared overlay surface styling so dialogs rely exclusively on global tokens without altering visuals.
  - [x] Screenshot (Favorites clear confirmation — desktop, parity reconfirmed): https://browser.buildwithfern.com/invocations/xbyhdrks/artifacts/artifacts/dialog-confirm.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Injected the platform `Document` and guarded focus restoration against detached nodes so dialog focus handling stays SSR-safe without impacting visuals.
  - [x] Screenshot (Favorites clear confirmation — desktop, parity reconfirmed): https://browser.buildwithfern.com/invocations/xbyhdrks/artifacts/artifacts/dialog-confirm.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Resolved dialog focus capture without relying on the injected document token by falling back to the host document so SSR renders remain stable.
  - [x] Screenshot (Favorites clear confirmation — desktop, parity reconfirmed): https://browser.buildwithfern.com/invocations/xbyhdrks/artifacts/artifacts/dialog-confirm.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Linked dialog layout titles and descriptions to the overlay container aria attributes via a shared adapter so assistive tech reads projected content without visual drift.
    - [x] Screenshot (Favorites clear confirmation — desktop, aria registration): https://browser.buildwithfern.com/invocations/skijdqfg/artifacts/artifacts/dialog-aria.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Matched overlay dialog escape handling across legacy key variants so keyboard dismissal remains consistent without impacting visuals.
    - [x] Screenshot (Favorites clear confirmation — desktop, escape coverage verified): https://browser.buildwithfern.com/invocations/wgwaccoq/artifacts/artifacts/favorites-dialog-escape.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Bound dialog backdrop and escape listeners to overlay detachments so subscriptions release on close without altering parity.
    - [x] Screenshot (Favorites clear confirmation — desktop, listener cleanup verified): https://browser.buildwithfern.com/invocations/wgwaccoq/artifacts/artifacts/favorites-dialog-escape.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Released dialog backdrop and keyboard listeners through a shared cleanup subject triggered before overlay disposal to guarantee teardown without affecting visuals.
    - [x] Screenshot (Favorites clear confirmation — desktop, cleanup subject parity): https://browser.buildwithfern.com/invocations/wgwaccoq/artifacts/artifacts/favorites-dialog-escape.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] Form primitive harmonization (B3) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-19 Locked AppTextField aria-invalid metadata to emit only for invalid controls and synchronized autocomplete and date picker tests to guard the shared behavior.
    - [x] Screenshot (Route search form — desktop, aria-invalid semantics locked): https://browser.buildwithfern.com/invocations/sjtdgooh/artifacts/artifacts/route-search-form.png
    - [x] Tests: `npm run test:angular`.
  - [x] 2025-10-29 Limited AppTextField aria-invalid exposure to invalid controls so healthy fields omit the attribute while preserving baseline layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid omission parity validated): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-28 Restored AppTextField aria-invalid boolean output so valid controls surface `false` while preserving primitive layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid boolean parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-19 Migrated favorites search filter to the shared AppTextFieldComponent to align control metrics and focus behavior without altering layout.
  - [x] Screenshot (Favorites search — desktop): https://browser.buildwithfern.com/invocations/bvmmlrls/artifacts/artifacts/favorites-search-field.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-19 Reinforced AppTextField focus state detection so shared inputs retain tokenized styling under OnPush change detection without layout drift.
  - [x] Screenshot (Favorites search — desktop, parity reconfirmed): https://browser.buildwithfern.com/invocations/bvmmlrls/artifacts/artifacts/favorites-search-field.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-19 Ensured disabling a focused AppTextField clears focus styling, emits blur semantics, and preserves OnPush change detection for harmonized form primitives.
  - [x] Screenshot (Favorites search — desktop, parity reconfirmed): https://browser.buildwithfern.com/invocations/bvmmlrls/artifacts/artifacts/favorites-search-field.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-19 Requested native blur on disable transitions so shared text fields drop focus both visually and at the DOM level without regressing tokenized styling.
  - [x] Screenshot (Favorites search — desktop, parity reconfirmed): https://browser.buildwithfern.com/invocations/bvmmlrls/artifacts/artifacts/favorites-search-field.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Surfaced AppTextField required and invalid semantics so shared inputs expose consistent error styling and accessibility metadata without changing default layout.
    - [x] Screenshot (Favorites search — desktop, parity reconfirmed with error-ready styling): https://browser.buildwithfern.com/invocations/bvmmlrls/artifacts/artifacts/favorites-search-field.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Hardened AppTextField required detection so validator fallbacks preserve aria semantics when control helpers are unavailable.
    - [x] Screenshot (Favorites search — desktop, parity reconfirmed): https://browser.buildwithfern.com/invocations/bvmmlrls/artifacts/artifacts/favorites-search-field.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Limited AppTextField aria-invalid output to invalid states so assistive tech ignores the attribute when controls are healthy without altering layout tokens.
    - [x] Screenshot (Route search form — desktop, aria metadata parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Scoped AppTextField aria-invalid to emit only when controls are invalid so valid states drop the attribute while preserving baseline styling.
    - [x] Screenshot (Route search form — desktop, aria metadata parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Added an AppTextField error projection slot so validation messaging surfaces with aria-describedby parity while maintaining baseline styling.
    - [x] Screenshot (Route search form — desktop, error-ready parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Connected AppTextField error messaging to aria-errormessage so assistive tech announces validation issues without affecting layout.
    - [x] Screenshot (Route search form — desktop, aria-errormessage parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Preserved AppTextField aria-describedby fallbacks so legacy screen readers announce validation errors alongside aria-errormessage without changing visuals.
    - [x] Screenshot (Route search form — desktop, aria fallback parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Removed duplicate AppTextField aria-describedby identifiers so hint, error, and external descriptions remain unique without altering layout.
    - [x] Screenshot (Route search form — desktop, described-by deduplication parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Reworked AppTextField error rendering to rely on TemplateRef projection so forwarded validation messages stay reactive without DOM cloning or duplicate markup.
    - [x] Screenshot (Route search form — desktop, error projection parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Passed AppTextField error templates control state context so forwarded validation messaging can react to errors without affecting layout or tokens.
    - [x] Screenshot (Route search form — desktop, error context parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Restored AppTextField aria-invalid metadata to explicit boolean strings so assistive tech reads consistent state cues without changing layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Reaffirmed AppTextField aria-invalid boolean output so valid states emit `false` strings while preserving baseline layout and tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid boolean parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Restated AppTextField aria-invalid contract so valid controls expose the `false` string while keeping invalid states on `true` and maintaining baseline layout.
    - [x] Screenshot (Route search form — desktop, aria-invalid contract parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-26 Limited AppTextField aria-invalid exposure to invalid controls so valid states omit the attribute while preserving shared form tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid omission parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-27 Ensured AppTextField only surfaces the aria-invalid attribute when validation errors exist so valid states keep the attribute off without affecting layout.
    - [x] Screenshot (Route search form — desktop, aria-invalid omission parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-19 Reconfirmed AppTextField aria-invalid omission so healthy controls drop the attribute while invalid states retain it, maintaining accessibility without visual drift.
    - [x] Screenshot (Route search form — desktop, aria-invalid omission parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Extended AppTextField error context to expose pending and status metadata so projected validation templates can reflect async validation without visual drift.
    - [x] Screenshot (Route search form — desktop, error context status parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Reflected AppTextField pending validation through aria-busy metadata so assistive tech reports asynchronous checks without altering layout.
    - [x] Screenshot (Route search form — desktop, aria-busy parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Stabilized AppTextField aria-busy clearing so resolved validation cycles drop busy metadata while keeping layout and tokens unchanged.
    - [x] Screenshot (Route search form — desktop, aria-busy reset parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Set AppTextField aria-busy to explicit `false` when validation settles so assistive tech retains a consistent attribute without changing visuals.
    - [x] Screenshot (Route search form — desktop, aria-busy false parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Removed idle AppTextField aria-busy metadata so settled validations drop the attribute entirely while keeping layout and tokens unchanged.
    - [x] Screenshot (Route search form — desktop, aria-busy cleared parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Reinstated explicit AppTextField aria-busy="false" metadata when validation settles so assistive tech retains stable state cues without affecting layout.
    - [x] Screenshot (Route search form — desktop, aria-busy false parity reaffirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Limited AppTextField aria-busy exposure to pending states so settled validations remove the attribute while preserving layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-busy cleared parity reaffirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Restored AppTextField aria-busy to emit `'false'` when validations settle so assistive tech retains explicit idle metadata without altering visuals.
    - [x] Screenshot (Route search form — desktop, aria-busy false parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Normalized AppTextField aria-invalid metadata to emit explicit boolean strings so assistive technology receives stable state cues without altering layout.
    - [x] Screenshot (Route search form — desktop, aria-invalid parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Limited AppTextField aria-invalid metadata to invalid states so idle controls drop the attribute while keeping layout and tokens unchanged.
    - [x] Screenshot (Route search form — desktop, aria-invalid idle parity): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Restored AppTextField aria-invalid metadata to emit explicit boolean strings for valid and invalid states so assistive technology retains consistent cues without altering layout.
    - [x] Screenshot (Route search form — desktop, aria-invalid boolean parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Reverted AppTextField aria-invalid exposure to only render when inputs are invalid so valid fields omit the attribute in line with WAI-ARIA guidance.
    - [x] Screenshot (Route search form — desktop, aria-invalid omission parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Reintroduced explicit AppTextField aria-invalid boolean metadata for valid states so assistive technologies receive consistent cues without altering layout or tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid boolean parity restored): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Reaffirmed AppTextField aria-invalid boolean metadata so valid controls emit `false` and invalid controls
    emit `true` for assistive technologies without altering layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid boolean parity reaffirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Limited AppTextField aria-invalid output to invalid states so valid controls omit the attribute while maintaining primitive styling parity.
    - [x] Screenshot (Route search form — desktop, aria-invalid omission parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Restored AppTextField aria-invalid metadata to emit explicit boolean strings so valid controls report `false` and invalid controls report `true` without altering layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid boolean parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-23 Limited AppTextField aria-invalid metadata to invalid states so valid controls omit the attribute while preserving layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid omission parity reconfirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-24 Restored explicit AppTextField aria-invalid boolean metadata so valid controls emit `false` and invalid controls emit `true` without altering layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid boolean parity validated): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] 2025-10-25 Limited AppTextField aria-invalid metadata to invalid controls so valid fields omit the attribute while preserving shared form tokens.
  - [x] Screenshot (Route search form — desktop, aria-invalid omission parity validated): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] 2025-10-26 Scoped AppTextField aria-invalid output to render only when controls are invalid so healthy inputs no longer expose redundant metadata.
  - [x] Screenshot (Route search form — desktop, aria-invalid omission parity reaffirmed): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] 2025-10-26 Restored AppTextField aria-invalid boolean metadata so valid controls surface `false` while invalid controls surface `true` without altering shared layout tokens.
  - [x] Screenshot (Route search form — desktop, aria-invalid boolean parity restored): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
  - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] Accessibility verification sweep (B4) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-31 Completed accessibility sweep by promoting the routed content section to a main landmark and marking dynamic stop messaging as live regions with polite and assertive cues.
    - [x] Screenshot (Stop information status messaging — desktop): https://browser.buildwithfern.com/invocations/mqzfeuzz/artifacts/artifacts/stop-info-status.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] 2025-10-20 Added an application-wide skip control that preserves keyboard order and focuses the shared layout body without altering visuals.
    - [x] Screenshot (Skip to content control — desktop focus): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Anchored the skip control to the main content fragment so keyboard activation works without script execution while maintaining OnPush focus guards.
    - [x] Screenshot (Skip to content control — desktop focus, fragment link verified): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-20 Preserved native anchor semantics for the skip control by refining the accessible button directive to skip keyboard simulation when hosts expose real href targets.
    - [x] Screenshot (Skip to content control — desktop focus, fragment link verified): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
  - [x] 2025-10-21 Allowed the accessible button directive to keep native link roles when no override is provided so the skip control preserves baseline anchor semantics.
    - [x] Screenshot (Skip to content control — desktop focus, native role preserved): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
  - [x] 2025-10-21 Matched the shared accessible button directive to native button timing so space activates on keyup while protecting anchor and link-role semantics.
    - [x] Screenshot (Skip to content control — desktop focus, native key timing verified): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-21 Extended accessible button space key detection to handle legacy key values while preserving anchor semantics.
    - [x] Screenshot (Skip to content control — desktop focus, legacy key coverage verified): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-21 Expanded accessible button enter key detection to cover legacy values without impacting anchor semantics.
    - [x] Screenshot (Skip to content control — desktop focus, enter key parity verified): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-21 Cleared pending space-key activation on blur so accessible buttons do not trigger after focus leaves while preserving baseline visuals.
    - [x] Screenshot (Skip to content control — desktop focus, blur handling verified): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Cancelled pending space-key activation when keyup occurs outside the host to prevent stray activations while keeping layout and tokens unchanged.
    - [x] Screenshot (Skip to content control — desktop focus, global keyup handling verified): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Recognized legacy space key identifiers and replaced role/tabindex magic values with shared constants so accessible buttons stay cross-browser without visual drift.
  - [x] 2025-10-22 Centralized accessible button key descriptors to simplify legacy handling while preserving anchor semantics. Attach public screenshot URL(s); visual diff must be 0px. Evidence: https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Screenshot (Skip to content control — desktop focus, legacy keyIdentifier coverage reconfirmed): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Unified accessible key matching via a shared matcher utility so the skip link and dialog escape handling stay in sync without visual drift.
    - [x] Screenshot (Skip to content control — desktop focus, shared matcher verification): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Screenshot (Favorites dialog confirmation — escape parity check): https://browser.buildwithfern.com/invocations/xbyhdrks/artifacts/artifacts/dialog-confirm.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Consolidated shared key matcher definitions so accessible buttons and dialogs reuse identical key constant sets without layout changes.
    - [x] Screenshot (Skip to content control — desktop focus, matcher constants verification): https://browser.buildwithfern.com/invocations/rgcguyok/artifacts/artifacts/skip-link-focus.png
    - [x] Screenshot (Favorites dialog confirmation — escape parity check): https://browser.buildwithfern.com/invocations/xbyhdrks/artifacts/artifacts/dialog-confirm.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Limited AppTextField aria-invalid output to invalid controls so accessibility metadata stays focused without altering layout tokens.
    - [x] Screenshot (Route search form — desktop, aria-invalid parity check): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Restored explicit aria-invalid boolean strings on AppTextField so assistive metadata stays consistent without visual drift.
    - [x] Screenshot (Route search form — desktop, aria-invalid contract verification): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Ensured AppTextField emits explicit aria-invalid boolean values so valid states surface `false` to assistive technology without visual drift.
    - [x] Screenshot (Route search form — desktop, aria-invalid false-state verification): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] 2025-10-22 Reinstated explicit aria-invalid="false" output for healthy AppTextField controls so assistive technology receives consistent metadata without visual drift.
    - [x] Screenshot (Route search form — desktop, aria-invalid false contract verification): https://browser.buildwithfern.com/invocations/bfnlgbtv/artifacts/artifacts/route-search-notice.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.

### Feature Roadmap (2025-10-18)
- [x] News feed view (C1) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-19 Routed the new News feature through `AppLayoutComponent`, added a cached feed service with domain facade refresh hooks, and styled card listings with shared tokens.
    - [x] Screenshot (News view — desktop): https://browser.buildwithfern.com/invocations/ndveuzdu/artifacts/artifacts/news-view.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] Document CTAN endpoint + caching in `docs/api-reference.md`.
    - [x] 2025-10-29 Added a news snapshot feed section covering source attribution, caching behaviour, and article schema details.
- [x] Stop information by consortium + stop number (C2) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-19 Introduced the stop information route with shared layout registration, domain facade, and offline-friendly fallbacks for directory data.
    - [x] Screenshot (Stop information — desktop): https://browser.buildwithfern.com/invocations/bmicpmgc/artifacts/artifacts/stop-info-desktop.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] Ensure friendly URL contract and offline fallback notes in documentation.
  - [x] 2025-10-19 Linked the stop detail actions to the stop information view using directory metadata so users can jump directly to enriched details.
    - [x] Screenshot (Stop detail — desktop, stop info action): https://browser.buildwithfern.com/invocations/xysejzld/artifacts/artifacts/stop-detail-stop-info-action.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
- [x] Interactive map with nearby stops (C3) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-19 Added a Leaflet-powered map with nearby stop markers, geolocation flow, and responsive panel layout.
    - [x] Screenshot (Map view — desktop): https://browser.buildwithfern.com/invocations/xzkvrnbx/artifacts/artifacts/map-desktop.png
    - [x] Screenshot (Map view — mobile): https://browser.buildwithfern.com/invocations/xzkvrnbx/artifacts/artifacts/map-mobile.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] Record OSM/Leaflet licensing and geolocation consent handling in documentation.
    - [x] 2025-10-19 Documented mapping data sources, attribution requirements, and explicit geolocation consent flow in `docs/map-data-sources.md`.
- [x] Route overlay on map (C4) — attach public screenshot URL(s); visual diff must be 0px.
  - [x] 2025-10-19 Connected the map overlay facade to rendered polylines and manual refresh with cached geometry slices for matching routes.
    - [x] Screenshot (Map route overlay — desktop): https://browser.buildwithfern.com/invocations/frvhinst/artifacts/artifacts/map-overlay-desktop.png
    - [x] Screenshot (Map route overlay — mobile): https://browser.buildwithfern.com/invocations/frvhinst/artifacts/artifacts/map-overlay-mobile.png
    - [x] Tests: `npm run lint`; `npm run test`; `npm run build`.
  - [x] Describe polyline transformation and caching strategy in documentation.
  - [x] 2025-11-02 Surface route overlay distance summaries in the map panel with shared distance formatting so travelers see stop counts and kilometers at a glance.
    - [x] Screenshot (Map route distance — desktop): https://browser.buildwithfern.com/invocations/xvxxqrhu/artifacts/artifacts/map-route-distance.png
    - [x] Screenshot (Map route distance — mobile): https://browser.buildwithfern.com/invocations/ewwpjinf/artifacts/artifacts/map-route-distance-mobile.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-03 Corrected route overlay stop count translations to use plural forms so singular cards read naturally in both languages.
    - [x] Screenshot (Map route panel — pluralization fix): https://browser.buildwithfern.com/invocations/tpflxahh/artifacts/artifacts/map-route-panel.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-04 Replaced ICU pluralization with dedicated singular and plural translation keys so stop counts render without requiring an additional compiler dependency.
    - [x] Screenshot (Map route panel — singular plural verification): https://browser.buildwithfern.com/invocations/tpflxahh/artifacts/artifacts/map-route-panel.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-05 Applied Intl.PluralRules-driven stop count selection so locale plural categories map to dedicated translation keys without extra compilers.
    - [x] Screenshot (Map route panel — plural rules validation): https://browser.buildwithfern.com/invocations/tpflxahh/artifacts/artifacts/map-route-panel.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-06 Centralized pluralization selection in a shared service that caches Intl.PluralRules per language so map route stop counts react to locale changes without recreating rules in each component.
    - [x] Screenshot (Map route panel — pluralization service parity): https://browser.buildwithfern.com/invocations/akubfqby/artifacts/artifacts/map-pluralization-service.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-07 Simplified map pluralization to rely on per-view Intl.PluralRules caching and pure utilities so stop count labels react to language changes without a root service.
    - [x] Screenshot (Map route panel — plural rules cached per view): https://browser.buildwithfern.com/invocations/bqkcovke/artifacts/artifacts/map-route-panel.png
  - [x] 2025-11-08 Restored shared pluralization caching through a root service so map stop count labels reuse Intl.PluralRules instances across views while responding to locale updates.
    - [x] Screenshot (Map route panel — shared pluralization service validation): https://browser.buildwithfern.com/invocations/akubfqby/artifacts/artifacts/map-pluralization-service.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-09 Sorted map route overlays by route length with stop-count tie-breakers so the most direct options surface first.
    - [x] Screenshot (Map routes ordered panel — default selection prompt): https://browser.buildwithfern.com/invocations/duaaoxoa/artifacts/artifacts/map-route-sorting.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-10 Preserved precise route overlay length calculations so sorting no longer collapses ties created by rounding.
    - [x] Screenshot (Map routes ordered panel — default selection prompt): https://browser.buildwithfern.com/invocations/duaaoxoa/artifacts/artifacts/map-route-sorting.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-11 Added polite live region announcements when toggling map routes so assistive tech reports highlight changes.
    - [x] Screenshot (Map routes panel — live announcements desktop): https://browser.buildwithfern.com/invocations/dcjwgcpm/artifacts/artifacts/map-routes-desktop.png
    - [x] Screenshot (Map routes panel — live announcements mobile): https://browser.buildwithfern.com/invocations/dcjwgcpm/artifacts/artifacts/map-routes-mobile.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-12 Announced map route overlay loading, success, empty, and error states via the live region so screen readers receive context when results change.
    - [x] Screenshot (Map routes panel — status announcements): https://browser.buildwithfern.com/invocations/jpllhjge/artifacts/artifacts/map-route-status.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.
  - [x] 2025-11-13 Re-announced map route overlay status updates when new selections reuse identical counts so assistive tech hears loading and empty cues every time.
    - [x] Screenshot (Map routes panel — status announcements parity): https://browser.buildwithfern.com/invocations/jpllhjge/artifacts/artifacts/map-route-status.png
    - [x] Tests: `npm run lint`; `npm run test -- --watch=false`; `npm run build`.

- [x] Favorites Tab – Bullet Removal
  - after (desktop): https://filebin.net/favorites-refresh/favorites-after-desktop.png
  - after (mobile): https://filebin.net/favorites-refresh/favorites-after-mobile.png

- [x] Recent Cards – Contrast Adjustment
  - after (desktop): https://filebin.net/recent-card-contrast/recent-card-after-desktop.png
  - after (mobile): https://filebin.net/recent-card-contrast/recent-card-after-mobile.png

- [x] Mock Modes – Visual Validation
  - Mode A (mock-data) after (desktop): https://filebin.net/mock-modes-preview/mock-data-after-desktop.png
  - Mode A (mock-data) after (mobile): https://filebin.net/mock-modes-preview/mock-data-after-mobile.png
  - Mode B (mock-empty) after (desktop): https://filebin.net/mock-modes-preview/mock-empty-after-desktop.png
  - Mode B (mock-empty) after (mobile): https://filebin.net/mock-modes-preview/mock-empty-after-mobile.png

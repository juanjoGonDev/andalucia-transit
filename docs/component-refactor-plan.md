# Component Refactor Plan

## 0. Design Integrity Policy

The current UI serves as the **visual baseline** for the entire refactor.  
All modifications must maintain _pixel-identical_ rendering across the following attributes:

- Layout dimensions, padding, margins, and grid spacing.
- Typography scale, weights, and alignment.
- Colors, gradients, elevation, and shadows.
- Border radii, component shapes, and visual hierarchy.
- DOM nesting depth and relative element offsets.

This plan is **structural only** — no visual, typographic, or stylistic changes are permitted.  
Each iteration must produce screenshot evidence showing identical computed output compared to the baseline.

---

## 1. Unified Layout Integration Strategy

### 1.1 Global layout host realignment

- Promote the existing `HomeComponent` structure into a new **global layout host** named `AppLayoutComponent`, preserving all container dimensions, spacing, and surface relationships.
- Expose a projected content outlet within the main body container to serve as the insertion point for all feature routes.
- Extract dashboard logic into a standalone `DashboardComponent` registered as one of the routed children, operating inside the unified layout without altering the shared shell.
- Define a layout-level interaction contract (signals or inputs) for section or tab activation, avoiding duplicated router subscriptions.

  - 2025-10-16: Introduced `AppLayoutComponent` to wrap the shell top actions and project routed content via `<ng-content>`, keeping existing shell metrics unchanged while `AppShellComponent` delegates rendering to it.
  - 2025-10-16: Routed all feature views through `AppLayoutComponent` directly in `app.routes.ts`, preserving the layout host as the router entry while maintaining the prior shell structure and metrics.
  - 2025-10-16: Added `AppLayoutContentDirective` and `APP_LAYOUT_CONTEXT` with a layout context store so routed features can register content and tab configuration without altering the host layout structure.

### 1.2 Route hierarchy updates

- Nest all feature routes (`dashboard`, `favorites`, `route-search`, `stop-detail`, `settings`, `map`, etc.) under `AppLayoutComponent` while keeping **existing slugs identical**.
- Configure the router with a `path: ''` entry pointing to `AppLayoutComponent` as the global layout host.
- Redirect legacy standalone routes to the new structure without altering visible URLs or triggering reinitialization.
- Each feature route must provide its own localized title resolver; `AppLayoutComponent` handles shared chrome only.

  - 2025-10-16: Updated `app.routes.ts` to register `AppLayoutComponent` as the layout host for all feature child routes while preserving the existing route structure and layout metrics.

### 1.3 Content projection contract

- Define `AppLayoutContentDirective` under `src/app/shared/layout/` as the projection anchor for content within the layout body.
- Require all feature roots to use this directive, ensuring consistent spacing, typography, and hierarchy.
- Provide an `AppLayoutContext` injection token enabling feature-level control of layout affordances (tabs, quick actions) without violating hexagonal separation.
- Maintain SSR and hydration safety through declarative signal-based state.

---

## 2. Component Inventory & Usage Map

### 2.1 Feature components

- Audit all components under `src/app/features/`, recording usage, dependencies, and routing contexts.
- Identify any presentation-to-data layer leaks (e.g., direct `StopDirectoryService` usage) and plan replacements using domain facades (`RouteDirectoryFacade`, `StopScheduleFacade`).
- Flag unused dialogs, forms, or temporary widgets for removal or migration to shared UI.

### 2.2 Shared UI components

- Consolidate all reusable primitives under `src/app/shared/ui/`.
- Map existing primitives (`card-list-item`, `section`, `confirm-dialog`, etc.) and document usage frequency.
- Mark redundant or overlapping components for merge into unified, context-neutral counterparts (`InteractiveCardComponent`, `DialogFrameComponent`, `FormFieldComponent`).

### 2.3 Usage detection summary

- Confirm all import paths and references; record orphaned items for removal after validation.
- Verify that all shared UI remains referenced; otherwise, schedule deletion after visual confirmation.

### 2.4 Cross-layer dependency leaks

- Replace all data-service dependencies in presentation components with domain-facing facades.
- Remove Angular Material service usage (e.g., `MatDialog`) and rewire through shared overlay abstractions.

  - 2025-10-16: Added `RecentSearchesFacade` to coordinate route search history, preview, execution, and preference flows for the home recent searches component without altering UI behavior or timing.
  - 2025-10-16: Added `FavoritesFacade` to proxy stop favorites persistence and expose presentation-safe streams while keeping UI timing and rendering unchanged.
  - 2025-10-16: Added `StopScheduleFacade` so stop detail views request schedule data through the domain layer while preserving presentation timing and layout.
  - 2025-10-16: Home dashboard favorites preview now consumes `FavoritesFacade` to remove direct stop favorites service dependencies without altering the preview layout or timing.
  - 2025-10-16: Route search form favorites shortcuts now rely on `FavoritesFacade`, keeping shortcut behavior identical while removing the direct stop favorites service injection.

---

## 3. Consolidation & Renaming Plan

### 3.1 Generic card patterns

- Merge `HomeListCardComponent` and `CardListItemComponent` into `InteractiveCardComponent` under `shared/ui/cards/`.
- Maintain identical computed metrics (width, height, padding, shadow, and radius).
- Apply `AccessibleButtonDirective` consistently for interactive behavior.

  - 2025-10-16: Added attribute-based `InteractiveCardComponent` under `shared/ui/cards/` and rewired `HomeListCardComponent` to delegate markup rendering to it while preserving the existing DOM structure and styling hooks.

### 3.2 Dialog abstractions

- Implement `OverlayDialogService` in `shared/ui/dialog/` to replace Material dialogs.
- Create a `DialogFrameComponent` handling structure, padding, focus trapping, and overlay layering using shared tokens.
- Ensure overlay visuals match the current baseline exactly (same opacity, shadow depth, and radii).

  - 2025-10-16: Added `OverlayDialogService` that currently bridges MatDialog while consolidating confirm dialog entry points under a single abstraction to prepare for the custom overlay implementation.
  - 2025-10-16: Introduced overlay dialog ref provider and injector helpers so dialog components can remove direct `MatDialogRef` dependencies without altering runtime behavior or visuals.
  - 2025-10-16: Updated Home nearby stops dialog to rely on the overlay dialog ref provider, keeping navigation and dismissal behavior unchanged.
  - 2025-10-16: Removed Angular Material dialog structural directives from `DialogLayoutComponent`, preserving the same markup sections and typography while preparing the layout for the custom overlay host.
  - 2025-10-16: Replaced the Material dialog runtime with a CDK overlay container that matches backdrop styling, focus trapping, and geometry so dialogs render identically without Angular Material dependencies.

### 3.3 Form controls

- Introduce new primitives under `shared/ui/forms/`:
  - `AppTextFieldComponent`
  - `AppAutocompleteComponent`
  - `AppDatePickerComponent`
- Components must visually and interactively mirror the current UI (identical borders, radii, hover/focus states).
- Use CDK overlays or native inputs where possible; **no `<button>` elements** permitted inside primitives.

  - 2025-10-16: Scaffolded `AppTextFieldComponent` with slot directives and ControlValueAccessor wiring to replace Material text fields without altering upcoming form visuals.
  - 2025-10-16: Extended `AppTextFieldComponent` with value and focus outputs to coordinate overlay-driven form primitives while maintaining identical input metrics.
  - 2025-10-16: Combined hint and external described-by identifiers within `AppTextFieldComponent` so migrated inputs preserve their accessibility relationships without affecting layout.
  - 2025-10-16: Scaffolded `AppAutocompleteComponent` with projected panel structure, keyboard navigation, and selection events to mirror existing autocomplete interactions while keeping the text field surface unchanged.
  - 2025-10-16: Scaffolded `AppDatePickerComponent` with ISO parsing and formatting hooks layered on the shared text field to prepare date inputs without modifying baseline metrics.

### 3.4 Directory structure & naming

- Maintain consistent neutral naming:
  - Global layout → `AppLayoutComponent`
  - UI primitives → under `shared/ui/`
  - Feature views → under `features/<feature-name>/view/`
- Avoid context-specific prefixes (`home`, `recent`, `favorites`); prefer functional descriptors.
- Update all barrel exports and aliases accordingly.

---

## 4. Token Compliance & Style Normalization

### 4.1 Verification checklist

- Enforce the use of global tokens from `src/styles/theme-rules.css` only (`--color-*`, `--spacing-*`, `--radius-*`, etc.).
- Remove feature-scoped CSS variables (e.g., `--home-blue`).
- Introduce a lint rule or CI check disallowing `--feature-*` variables.
- Maintain identical visual results through refactor (verified by computed style comparison).

### 4.2 Style migration

- Align all SCSS with shared theme tokens.
- Document any new semantic alias in `theme-rules.css` and justify its scope.
- No new color, spacing, or typography definitions allowed.

---

## 5. Accessibility & Interaction

- Replace interactive controls with neutral containers using `AccessibleButtonDirective`.
- Validate tab order, focus rings, pressed/expanded states, and ARIA bindings.
- Ensure all new form controls maintain full keyboard and screen-reader parity with current behavior.
- Run automated a11y audits (axe-core, Lighthouse) after each major migration step.

---

## 6. Dependencies & Cleanup

- Remove **all** Angular Material imports, providers, and CSS dependencies.
- Replace any Material tokens or mixins with shared equivalents.
- Delete orphaned components or obsolete services only after confirming that layout and spacing remain unchanged.
- Update `tsconfig` paths, imports, and barrel exports to match the new directory structure.

---

## 7. Quality Gates & Validation

### 7.1 Build & linting

- Maintain zero lint errors and full type safety (`npm run lint`, `npm run test`, `npm run build`).
- Any style or snapshot diff fails the refactor stage.

### 7.2 Visual regression testing

- Use Storybook or Cypress image snapshots to confirm **pixel parity** with the baseline UI.
- Run snapshot diffs for every route and feature view under both language contexts.
- Screenshots must be attached and reviewed for every iteration.

### 7.3 Test coverage

- Expand test suites for:
  - Layout projection and routing hierarchy.
  - Overlay dialog service and focus behavior.
  - Custom form control behavior and validation.
- Maintain or exceed existing coverage metrics.

---

## 8. Compliance Confirmation

This plan conforms to `AGENTS.md` and the enforced Design Integrity Policy:

- Preserves **hexagonal architecture** (UI → domain → data separation).
- Keeps **friendly URLs** and the PWA shell intact.
- Guarantees **accessibility**, **translation**, and **token-based theming**.
- Prohibits any **visual or behavioral drift** from the baseline.
- Removes Angular Material entirely.
- Establishes a reusable, visually consistent **global layout** (`AppLayoutComponent`) and a unified shared UI library.

---

🖼 **Verification Requirement:**  
Every commit performing changes under this plan must include:

- At least one browser screenshot URL demonstrating identical rendering.
- A recorded comparison result (0 px diff) from the visual regression tool.
- Updated checklist progress in `docs/features-checklist.md`.

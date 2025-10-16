# Component Refactor Plan

## 1. Unified Layout Integration Strategy

### 1.1 Global layout host realignment

- Promote the current `HomeComponent` structure into a new **global layout host** named `AppLayoutComponent`, preserving its shell, header, navigation tabs, and card scaffold.
- Expose a projected content outlet inside the existing main container (previously `.home__card-body`) to serve as the insertion point for all feature routes.
- Extract the previous home dashboard logic into a dedicated `DashboardComponent` (or equivalent) registered as one of the routed children, ensuring it operates within the unified layout without re-instantiating shared shell logic.
- Define a layout-level interaction contract (signals or inputs) for section/tab activation, allowing any feature route to request active state changes without duplicating router listeners or referencing the layout directly.

### 1.2 Route hierarchy updates

- Nest all feature routes (`dashboard`, `favorites`, `route-search`, `stop-detail`, `settings`, `map`, etc.) under the new `AppLayoutComponent` while maintaining current friendly slugs.
- Configure the router with a `path: ''` entry that loads `AppLayoutComponent` as the global layout, ensuring consistent rendering across the application.
- Redirect legacy standalone views to the new child routes to maintain deep-link compatibility and avoid double initialization.
- Each child route must provide its own title resolver; the layout host handles shared chrome and navigation only.

### 1.3 Content projection contract

- Create a neutral directive, `AppLayoutContentDirective`, under `src/app/shared/layout/`, defining the projection slot within the main content container.
- Any feature view must declare its root section using this directive to ensure spacing, typography, and hierarchy consistency.
- Provide an `AppLayoutContext` injection token for features that need to trigger layout-level affordances (e.g., highlight tab, show/hide quick actions) without breaking hexagonal boundaries.
- Preserve SSR and hydration safety by keeping layout interactions declarative through Angular signals.

---

## 2. Component Inventory & Usage Map

### 2.1 Feature components

- Inventory all feature components currently under `src/app/features/`, marking usage, dependencies, and routing context.
- Identify presentation components leaking data or domain dependencies (e.g., services from `data/` layer) and plan their replacement with domain facades (e.g., `RouteDirectoryFacade`, `StopScheduleFacade`).
- Flag any unused dialogs or feature widgets for removal or integration into the shared UI library.

### 2.2 Shared UI components

- Consolidate and normalize all shared UI under `src/app/shared/ui/`.
- Review current UI primitives (`card-list-item`, `section`, `confirm-dialog`, etc.) and document their usage across features.
- Flag redundant or orphaned components for removal or integration into new generic counterparts (e.g., `InteractiveCardComponent`, `DialogFrameComponent`, `FormFieldComponent`).

### 2.3 Usage detection summary

- Confirm where each shared component is imported and whether it remains referenced after layout migration.
- Document orphaned or duplicate components (e.g., `stop-navigation-item`, `home-nearby-stops-dialog`) and schedule cleanup.

### 2.4 Cross-layer dependency leaks

- Replace data-layer dependencies in presentation components with domain-level facades.
- Remove direct use of Angular Material services (`MatDialog`, etc.) and replace them with custom overlay ports exposed through shared infrastructure interfaces.

---

## 3. Consolidation & Renaming Plan

### 3.1 Generic card patterns

- Merge `HomeListCardComponent` and `CardListItemComponent` into a single reusable `InteractiveCardComponent` under `shared/ui/cards/`, with configurable action slots and state bindings.
- Update all features (recent searches, favorites, stop listings) to use this unified component.
- Ensure consistent application of the `AccessibleButtonDirective` for interaction.

### 3.2 Dialog abstractions

- Replace Angular Material dialogs with a custom `OverlayDialogService` under `shared/ui/dialog/`.
- Use a generic `DialogFrameComponent` for structure and focus management, with feature-specific dialogs projected inside.
- Ensure consistent overlay styling through shared tokens; remove `MatDialogRef` and related Material dependencies.

### 3.3 Form controls

- Create custom reusable primitives under `shared/ui/forms/`:
  - `AppTextFieldComponent`
  - `AppAutocompleteComponent`
  - `AppDatePickerComponent`
- These must replicate current functionality using CDK overlays or native controls, styled only with global tokens, and must not use `<button>` elements.

### 3.4 Directory structure & naming

- Standardize naming for clarity:
  - Global layout → `AppLayoutComponent`
  - Shared UI primitives → under `shared/ui/`
  - Feature views → under `features/<feature-name>/view/`
- Avoid contextual names tied to “home”, “recent”, or “favorites”; prefer functional names like `InteractiveCard`, `OverlayDialog`, `AppSection`, etc.
- Update barrel exports in `shared/ui/index.ts` for the new consolidated components.

---

## 4. Token Compliance & Style Normalization

### 4.1 Verification checklist

- Enforce exclusive use of `var(--color-*)`, `var(--spacing-*)`, and other global tokens from `src/styles/theme-rules.css`.
- Remove all feature-scoped aliases (e.g., `--home-blue`, `--home-navy`).
- Add linting rule or script to disallow custom `--feature-*` variables.
- Maintain existing computed styles via class-based refactors only.

### 4.2 Style migration

- Ensure each feature aligns with global layout spacing and typography rules.
- Document and justify any new alias added to global tokens (only if absolutely necessary).

---

## 5. Accessibility & Interaction

- Replace all interactive controls with neutral containers using `AccessibleButtonDirective`.
- Verify proper keyboard navigation, focus handling, and ARIA roles.
- Ensure form primitives expose correct combobox, date, and input semantics with keyboard support and no visual regressions.

---

## 6. Dependencies & Cleanup

- Remove **all** Angular Material dependencies (`@angular/material/*`), related CSS, and providers.
- Clean up orphaned components, redundant services, and outdated route declarations.
- Update `tsconfig` paths and barrel exports to reflect the new structure.

---

## 7. Quality Gates & Validation

- Preserve unit test coverage.
- Add integration tests for layout projection, custom dialogs, and form primitives.
- Run `npm run lint`, `npm run test`, and `npm run build` before commit.
- Perform visual regression testing using Storybook or Cypress to confirm identical rendering.

---

## 8. Compliance Confirmation

This refactor plan adheres fully to `AGENTS.md`:

- Maintains **hexagonal layering** (UI → domain → data).
- Uses **friendly URLs** under the unified global layout.
- Enforces **accessibility**, **translation**, and **token-based styling**.
- Eliminates **Angular Material** and avoids feature-scoped styling.
- Establishes a reusable **global layout** (`AppLayoutComponent`) and shared component library consistent across the entire app.

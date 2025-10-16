# Component Refactor Plan

## 1. Unified Layout Integration Strategy
### 1.1 Layout host realignment
- Promote the current `HomeComponent` markup into a dedicated layout host (`HomeLayoutComponent`) that preserves the hero, tabs, and card scaffold while exposing a projected content outlet inside the existing `.home__card-body` container.
- Extract the present home dashboard tab logic into a focused `HomeDashboardComponent` that binds to the layout host via an explicit child route so that tab selection, favorites preview, and recent history remain functional without re-instantiating the shell.
- Provide the layout host with an interaction contract (signals or inputs) for tab activation so that feature child routes can request highlight state without duplicating stateful router listeners.

### 1.2 Route hierarchy updates
- Nest all feature routes (`home`, `homeRecent`, `homeFavorites`, `favorites`, `routeSearch`, `routeSearchResultPattern`, `stopDetailPattern`, `settings`, `map`) beneath the layout host while keeping friendly slugs identical by using child routes of a new `path: ''` entry pointing to `HomeLayoutComponent` inside `AppShellComponent`.
- Redirect legacy paths that previously rendered standalone views to the new child routes to maintain deep-link compatibility and to avoid double navigation loops.
- Supply each child route with page-specific title resolvers while ensuring the layout host only manages shared chrome to prevent reinitialization of `AppShellTopActionsComponent`.

### 1.3 Content projection contract
- Define a `HomeLayoutContentDirective` (or similar) in `src/app/shared/layout/` that identifies the insertion slot within the card body; all feature views will provide their root section using this directive to ensure spacing and typography remain identical.
- Introduce layout tokens (e.g., `HomeLayoutContext` injection token) for features that need to trigger layout-level affordances (tab selection, summary header actions) without directly accessing router state, preserving hexagonal boundaries.
- Maintain SSR and hydration safety by keeping the layout host declarative, relying on Angular signals already in use for tab state.

## 2. Component Inventory & Usage Map
### 2.1 Feature components
- `features/home/home.component.ts` (to become layout host) – currently used by routes `home`, `homeRecent`, `homeFavorites`; depends on route services and domain route search/favorites services.
- `features/home/home-dashboard.component.ts` (planned) – will own existing tab content for search/recent/favorites; consumes `RouteSearchFormComponent`, `HomeRecentSearchesComponent`, `StopFavoritesService`.
- `features/home/home-nearby-stops-dialog.component.ts` – unused in routing; only referenced inside its file and depends on Angular Material dialog plus geolocation services. Flagged as orphan pending confirmation of future usage; plan to either integrate as part of new layout quick actions or schedule removal.
- `features/home/recent-searches/home-recent-searches.component.ts` – used within home dashboard; relies on `MatDialog` for confirmations, `RouteSearchHistoryService`, `RouteSearchPreviewService`.
- `features/home/recent-searches/ui/recent-search-card/recent-search-card.component.ts` – nested card view; used exclusively by home recent searches.
- `features/home/recent-searches/ui/recent-search-preview-entry/recent-search-preview-entry.component.ts` – nested preview entry; used inside recent search card.
- `features/home/shared/home-list-card/home-list-card.component.ts` – shared card pattern currently confined to home feature but imported in both recent search card and home favorites preview.
- `features/favorites/favorites.component.ts` – standalone route; uses `MatDialog` and `SectionComponent`.
- `features/route-search/route-search.component.ts` – standalone route; uses `SectionComponent`, `RouteSearchFormComponent`, `StopDirectoryService` (data layer leak).
- `features/route-search/route-search-form/route-search-form.component.ts` – used inside home dashboard and route search component; depends heavily on Angular Material form-field, autocomplete, datepicker, and MatDialog for location prompts (indirect through services).
- `features/settings/settings.component.ts` – standalone route; uses `SectionComponent` and accessible directive.
- `features/stop-detail/stop-detail.component.ts` – lazy route; injects `StopScheduleService` from data layer (presentation-to-data leak).
- `features/map/map.component.ts` – standalone route; uses Angular Material `MatCard` and `MatButtonModule`.

### 2.2 Shared UI components
- `shared/layout/app-shell/app-shell.component.ts` – shell host.
- `shared/layout/top-actions/app-shell-top-actions.component.ts` – top action bar reused across layout.
- `shared/ui/card-list-item/card-list-item.component.ts` – general list card consumed exclusively by `stop-navigation-item`; candidate for consolidation with `HomeListCard`.
- `shared/ui/confirm-dialog/confirm-dialog.component.ts` – Angular Material dialog wrapper used by favorites and home recent searches.
- `shared/ui/dialog/dialog-layout.component.ts` – Angular Material dialog layout used by confirm dialog and home nearby dialog.
- `shared/ui/section/section.component.ts` – reused in favorites, route search, settings.
- `shared/ui/stop-navigation-item/stop-navigation-item.component.ts` – currently unused outside its self-contained template; treat as orphan pending confirmation of future navigation flows.

### 2.3 Usage detection summary
- `card-list-item` usage confirmed only via `stop-navigation-item`; consolidation outcome will dictate whether a standalone export is still required.
- `stop-navigation-item` currently orphaned; either remove with the Angular Material cleanup or integrate into the new layout navigation if needed.
- `HomeNearbyStopsDialogComponent` currently orphaned in runtime; requires decision: either integrate into upcoming quick action or remove with MatDialog dependency cleanup.

### 2.4 Cross-layer dependency leaks
- Presentation components depending on data layer: `RouteSearchComponent` → `StopDirectoryService`, `StopDetailComponent` → `StopScheduleService`, `RouteSearchFormComponent` → `NearbyStopsService` (data) while also orchestrating domain logic. Plan to introduce domain-facing facades (`RouteSearchDirectoryFacade`, `StopScheduleFacade`) residing in `src/app/domain` to hide data services from UI.
- Angular Material services (`MatDialog`) leaking into feature components; plan to replace with shared overlay port that the presentation layer consumes via interface.

## 3. Consolidation & Renaming Plan
### 3.1 Card patterns
- Merge `HomeListCardComponent` and `CardListItemComponent` into a single neutral `InteractiveListCardComponent` under `shared/ui/cards/` with configurable slots for leading/trailing actions and removal controls, ensuring existing styles are preserved through tokenized class names.
- Update recent search card and home favorites preview to consume the new shared component, removing duplicate markup and ensuring consistent accessible button usage.
- Evaluate `stop-navigation-item` for consolidation with the same interactive card if styling matches; otherwise document divergence.

### 3.2 Dialog abstractions
- Replace Angular Material dialog stack with a custom `OverlayDialogService` (in `shared/ui/dialog`) exposing open/close ports returning `Observable<boolean>`; convert `ConfirmDialogComponent` and `HomeNearbyStopsDialogComponent` to pure presentation projected inside a shared dialog frame rendered via the new service.
- Relocate dialog layout to `shared/ui/dialog/dialog-frame.component.ts` (no Angular Material) and ensure confirm dialog/future modals share tokens for paddings and focus traps.

### 3.3 Form controls
- Define reusable input, select, and autocomplete primitives under `shared/ui/forms/` to replace Angular Material dependencies. Candidate components:
  - `AppTextFieldComponent` (text input with label, prefix slot, status messaging).
  - `AppAutocompleteComponent` (combobox semantics, grouped options, keyboard support) using CDK overlays or fully custom implementation.
  - `AppDatePickerComponent` (token-compliant calendar using existing typography) or leverage native `<input type="date">` with custom styling while maintaining identical computed dimensions; ensure no `<button>` elements inside.
- Refactor `RouteSearchFormComponent` to use these primitives and expose the same reactive form API, preserving accessible labeling and translation keys.

### 3.4 Layout naming
- After extracting `HomeDashboardComponent`, rename the feature directory structure to `features/home/dashboard` and `features/home/layout` to improve clarity.
- Re-export shared UI barrels (`shared/ui/index.ts`) to surface the consolidated card and form primitives for reuse across features.

## 4. Token Compliance & Style Normalization
### 4.1 Verification checklist
- Audit all SCSS files touched during refactor to ensure only `var(--...)` tokens from `src/styles/theme-rules.css` are referenced; remove any feature-specific CSS variables.
- Introduce an ESLint style rule or custom lint script to disallow `--home-` or other feature-prefixed custom properties, enforcing direct token usage.
- Maintain existing class names to preserve computed styles, supplementing with utility classes (e.g., `.utility-container`) where layout constraints change.

### 4.2 Style migration tasks
- Update favorites, map, route search, stop detail, and settings templates to adopt the home layout spacing classes (`home__stack`, `.home__panel`) while keeping their scoped SCSS aligned with global tokens.
- Document any new semantic alias (only if unavoidable) inside `theme-rules.css` with justification and ensure it applies across features.

## 5. Accessibility & Interaction Plan
### 5.1 Control replacement
- Replace all Angular Material-generated interactive elements with neutral containers decorated by `AccessibleButtonDirective`, ensuring keyboard activation, focus rings, and ARIA attributes mirror current behavior.
- For new form primitives, implement `role="combobox"`, `aria-controls`, `aria-expanded`, and active descendant patterns so screen readers receive equivalent context to current MatAutocomplete outputs.
- Ensure date selection remains keyboard accessible (arrow keys, page navigation) and that focus is restored to the triggering control after closing pickers.

### 5.2 Verification steps
- Re-run manual keyboard traversal across each feature to confirm tab order, focus trapping in dialogs, and menu interactions remain intact.
- Validate translation key propagation for all aria-labels and announcements through `ngx-translate` pipes.
- Execute automated accessibility scans (axe-core, Lighthouse) on primary flows (home tabs, route search, favorites management, stop detail) to catch regressions introduced by custom controls.

## 6. Dependencies & Cleanup
### 6.1 Angular Material removal
- Eliminate imports of `@angular/material/*` modules (dialog, button, card, form-field, autocomplete, datepicker) from all feature components and shared UI.
- Remove Material stylesheets and font dependencies if unused after migration; ensure icon font usage (`material-symbols-outlined`) remains via existing inline spans.
- Replace `MatDialog` usage with the new overlay service and delete Material dialog tokens (`MAT_DIALOG_DATA`, `MatDialogRef`).

### 6.2 Dead code and declarations
- Remove unused components identified as orphans (`HomeNearbyStopsDialogComponent` if confirmed unused, `card-list-item` or `stop-navigation-item` if not referenced) or repurpose them as part of the consolidation plan.
- Update `tsconfig` path aliases and barrel exports to reflect the new shared component locations; ensure no dangling references remain in tests.
- Prune module-level providers that existed solely for Angular Material services.

## 7. Quality Gates & Validation
- Maintain existing unit test coverage; add new tests for layout host navigation mapping, custom dialog service, and form primitives to ensure deterministic behavior.
- Run `npm run lint`, `npm run test`, and `npm run build` before completion; add targeted tests (`npm run test:deploy`) if service worker or deployment scripts change (not expected for this refactor).
- Perform visual regression comparison against current Home layout using Storybook screenshots or Cypress image snapshots to confirm zero visual diffs.
- Document plan execution steps and progress in `docs/features-checklist.md` and update `AGENTS.md` if architectural conventions evolve.

## 8. Compliance Confirmation
This plan adheres to the conventions defined in `AGENTS.md`: it preserves the hexagonal layering by routing presentation dependencies through domain facades, respects friendly URLs by retaining existing slugs, maintains the PWA shell, enforces accessibility and i18n practices, avoids Angular Material, and keeps styling tied to global tokens without introducing feature-scoped aliases.

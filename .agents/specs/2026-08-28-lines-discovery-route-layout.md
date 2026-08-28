# Lines discovery, route layout and reusable map follow-up

## Request

Capture and implement the mobile review feedback reported on 2026-08-28 against PR #36 without preserving the current accidental coupling between **Lines** navigation and route search.

The requested product outcome is:

- the **Lines** section opens a real, browsable line directory instead of route search or a hard-coded sample route;
- travelers can discover lines by proximity and by transport-area metadata such as consortium/area, municipality, nucleus and province when an authoritative province mapping exists;
- line results are clickable, filterable and paginated;
- line detail shows the line route on an interactive map together with ordered, clickable stops;
- route maps and stop markers are reusable components backed by one canonical route-geometry and stop-identity source of truth;
- the route-search result layout is denser, removes duplicated summary content and keeps the search controls available while scrolling;
- recent-search preview times and route-search departure/arrival rows remain visually aligned on narrow mobile viewports;
- deterministic screenshot validation becomes an executable acceptance gate rather than a manual-only visual review.

## Evidence

### Navigation and default C2 content

- `AppShellTopActionsComponent` routes the second persistent navigation action to `APP_CONFIG.routes.routeSearch` while rendering its visible short label from `APP_CONFIG.translationKeys.map.routes.title`.
- Spanish `map.routes.title` is `"Líneas"`, so the navigation item visually promises a line directory but actually opens route search.
- `route-search.component.html` renders `translationKeys.sampleResult` when no route selection exists.
- Spanish `routeSearch.sampleResult` is the hard-coded sentence `"Toma la línea C2 desde Plaza Nueva hasta Parque María Luisa a las 08:15."`, which explains the apparent default C2 route reported in the mobile review.
- `LineDetailComponent` already exists and loads CTAN line detail plus ordered line stops, but its template currently renders only a hero and a stop list; it has no route map.

### Existing CTAN/catalog capabilities

- `scripts/snapshot/catalog-generator.ts` already builds one catalog dataset per consortium containing `municipalities`, `nuclei` and `lines`.
- Each nucleus is linked to `municipalityId` and optional CTAN `zone`.
- Each catalog line already exposes id, code, name, mode, operators and additional CTAN metadata fields when supplied by the source schema.
- `RouteLinesApiService` already owns canonical CTAN requests for:
  - lines serving a bounded stop set through `/Consorcios/{id}/paradas/lineasPorParadas/...`;
  - line stops through `/Consorcios/{id}/lineas/{lineId}/paradas`;
  - line detail through `/Consorcios/{id}/lineas/{lineId}`;
  - nearby-line discovery through nearby stops.
- `RouteLineStop` already carries `nucleusId`, `zoneId`, coordinates, direction and order.
- The current catalog and stop-directory models do **not** expose a province field. Province filtering therefore requires an audited authoritative mapping; it must not be inferred from display names or hard-coded ad hoc inside a component.

### Map ownership

- `docs/map-data-sources.md` documents CTAN line-stop geometry as the route-overlay fallback and the repository already has `route-overlay-geometry` domain code plus `LeafletMapService`.
- PR #36 also added line-detail geometry loading/fallback behavior for focused lines.
- The new line-detail map must not introduce another geometry parser, another stop-coordinate mapper or a private Leaflet implementation that can drift from Map and route overlays.

### Mobile visual regressions from the supplied screenshots

- Recent-search cards show line code and departure time with inconsistent horizontal alignment on mobile; `recent-search-preview-entry.component.scss` explicitly changes `.recent-preview-entry__time` from right alignment to `justify-self: start` below 40rem.
- Route-search result cards use a two-column `item-overview`; the full translated arrival sentence is a large text block, so `Llega a las …` competes with departure time and wraps under constrained width.
- Route search currently renders the form card, then a separate origin/destination/date summary card before the timetable. The same selection is therefore repeated while consuming a large portion of the first mobile viewport.
- The fixed bottom shell further reduces usable vertical space, so keeping frequently changed search controls only at the top creates avoidable scrolling.

### Existing visual evidence infrastructure

- `.github/workflows/pr-visual-evidence.yml` already starts deterministic mock/empty applications, runs Playwright acceptance, captures 390×844 and 1440×900 screenshots, binds the evidence to the immutable PR head and publishes temporary PNG artifacts.
- That workflow currently validates screenshot presence and manual review but does not provide a canonical pixel-diff regression gate for the new surfaces.

## Scope

### In scope

1. Introduce a dedicated Lines directory/index route and make the visible **Lines** navigation item open it.
2. Keep route planning as a separate task reachable from Home/search flows and direct route-search URLs; do not disguise route planning as line browsing.
3. Remove the hard-coded C2 sample route from the route-search empty state and replace it with a genuine task-oriented empty/onboarding state.
4. Provide line discovery with search, filters and pagination.
5. Support the following filter dimensions when backed by canonical data:
   - proximity to the user's explicitly requested geolocation;
   - consortium/transport area;
   - municipality;
   - nucleus;
   - province only after an authoritative source/mapping is identified and tested.
6. Preserve filter/sort/page state in the URL when it materially improves refresh/back/share behavior.
7. Redesign line detail to include reusable interactive route map + ordered clickable stop list.
8. Add a progressive expandable route-information panel:
   - desktop/tablet expanded layout uses a 2-column grid, approximately 2/3 map and 1/3 stop list;
   - mobile uses one logical reading column and may switch between/stack map and stops without shrinking either into an unusable column.
9. Stops on both the map and list are selectable and navigate through the existing consortium-aware stop-detail navigation owner.
10. Each stop-row may expose a concise **More information** action when the row's primary activation is not already sufficient and accessible; avoid duplicate destinations inside one ambiguous click target.
11. Route search keeps origin, destination, swap, date and submit controls available via a sticky search surface while results scroll.
12. Remove the redundant origin/destination/date summary block between the form and timetable once the sticky search surface itself clearly owns the active selection.
13. Simplify route result rows so departure, arrival and duration scan cleanly on mobile; prefer compact icon + accessible text patterns when they reduce wrapping without hiding meaning.
14. Fix recent-search preview alignment so line/time columns remain stable across mobile cards.
15. Add deterministic visual regression coverage for the changed pages and components.
16. Audit the CTAN endpoint reference and current snapshot/client code before adding any new API call; expose additional CTAN line/stop metadata only when it is useful, documented and safe to render.

### Out of scope

- Replacing Leaflet/OpenStreetMap.
- Adding a second map library or routing SDK.
- Inventing province, accessibility, realtime, fare or vehicle-position data not supplied by CTAN or another approved canonical source.
- Rewriting unrelated News, Favorites, Settings or Stop Detail flows.
- Broad redesign of the visual identity.
- Committing screenshot binaries to git.

## Decision

### 1. Separate Lines from Route Search

Create a dedicated Lines index route owned by a lines feature. The shell's visible **Lines** action navigates to that route and uses `navigation.lines` as both visible and accessible naming. Route Search remains a separate route/task.

Do not keep the current semantic mismatch where the visible label comes from `map.routes.title` while the destination is route search.

The route-search empty state must not show a fictional/default C2 journey. Empty state copy should explain that the traveler can choose origin, destination and date, or return to the planner surface that owns those controls.

### 2. Line-directory information architecture

The Lines page is a directory first, not a route planner. Its primary content is a paginated list of lines with compact metadata sufficient for recognition: line code, name, mode/operator where useful, and the active geographic/filter context.

Filtering is progressive:

- keyword search by line code/name;
- **Near me** as an explicit user action that requests geolocation only on demand;
- transport area/consortium;
- municipality;
- nucleus;
- province only after canonical mapping exists.

Filters must be composable where the underlying data supports the intersection. Dependent filters reset or narrow predictably rather than leaving impossible stale selections.

At mobile widths, advanced filters may live in an accessible expandable filter region/drawer, but active filters and clear/reset actions must remain discoverable. Do not use a horizontally scrolling chip rail as the primary filter UI.

### 3. Canonical line catalog owner

Add/extend one domain/data owner that exposes normalized line-directory records from the packaged CTAN catalog and live CTAN data where freshness is required. Components must consume this owner rather than re-parsing `assets/data/catalog/index.json` independently.

The canonical record should link a line to consortium and the relevant municipality/nucleus coverage derived from ordered line stops or catalog relationships. Expensive derivation should be computed once, cached/normalized and tested rather than recalculated in templates.

Province is a blocked field until an authoritative mapping is identified. If the audit finds no canonical province source in CTAN, record that limitation and do not ship a misleading province filter.

### 4. Reusable interactive transit map

Create or evolve a shared transit-route map component that accepts a canonical route-map view model rather than fetching transport data itself.

One canonical geometry builder owns:

- official CTAN polyline parsing;
- ordered-stop fallback when official geometry is absent/invalid;
- direction selection;
- stop coordinate normalization;
- bounds calculation;
- stable consortium-aware stop identity.

Map consumers — global Map, line detail and route-search expansion — must reuse that owner. They may provide different presentation controls but may not duplicate geometry/identity logic.

The reusable map surface must support:

- route polyline;
- ordered clickable stop markers;
- selected/focused stop state;
- keyboard-accessible non-map alternative via the synchronized stop list;
- fit-to-route behavior that does not continuously steal viewport/focus;
- existing OSM attribution;
- reduced-motion behavior.

### 5. Line-detail responsive layout

Line detail remains a deep-linkable page.

On desktop and sufficiently wide tablet, the primary detail region may expand to a 2-column grid with roughly a 2fr/1fr split:

- left: reusable route map;
- right: ordered stop list with arrival/schedule context only when CTAN provides a reliable value for that context.

On mobile, do **not** preserve the 2-column split. Use a single reading column with a bounded map and a stop list below it, or an accessible segmented/tabbed presentation if total content becomes excessive. The same selected stop state must synchronize both surfaces.

Each stop remains directly navigable to Stop Detail. No extra stop-detail data fetch is duplicated inside the map component.

### 6. Route-search sticky workspace

The active route-search selection is owned by a compact sticky search workspace near the top content boundary, not by both the form and a second summary card.

The sticky surface includes origin, destination, swap, date and submit/change action. It must:

- remain usable at 320 CSS px;
- respect the browser top safe area and application shell layering;
- never cover the focused field, autocomplete, datepicker, error message or result heading;
- collapse density after a valid search if needed, while retaining visible values and edit affordance;
- account for mobile virtual keyboard behavior;
- avoid nested sticky regions that fight the bottom navigation.

Remove the separate `route-search__summary` region once equivalent selection context is retained in the sticky owner.

### 7. Compact result-row hierarchy

Result rows prioritize:

1. departure time;
2. arrival time;
3. duration;
4. line code;
5. relative timing/status and badges.

Use tabular numerals for clock values. On narrow widths, avoid long translated prose as a second competing headline. A compact arrival icon/label can be used if its accessible name remains explicit; visible text must still be understandable without relying on icon shape alone.

The row must keep departure and arrival baselines/columns stable across all rows in the same list. Relative labels may wrap below their owning clock but must not push the opposite clock out of alignment.

### 8. Recent-card alignment

Recent preview entries keep a consistent two-column line/time header on mobile. Do not switch the time column to start alignment merely because the viewport is below 40rem. The time uses tabular numerals and a stable alignment edge so multiple entries scan vertically.

### 9. CTAN API audit before feature expansion

Before adding endpoints or UI fields, build an explicit endpoint/data capability matrix from `docs/api-reference.md`, `docs/api.html`, snapshot generators and current API services.

For each useful CTAN field/endpoint record:

- owner/client;
- freshness and fallback behavior;
- localization semantics;
- geographic identity (`consortiumId`, municipality, nucleus, zone, stop, line);
- whether it can support filtering, map geometry, line metadata, stop navigation, fares, accessibility or other traveler-facing information;
- known gaps/inconsistencies.

Prefer extending existing canonical services over parallel clients. Expose data because it improves a user decision, not merely because the API returns it.

### 10. Automated visual regression is a gate

Use deterministic Playwright screenshot assertions for the redesigned surfaces in addition to the existing temporary evidence captures.

Required properties:

- reviewed baselines are versioned only for deterministic test fixtures, not user/live data;
- baselines are never auto-updated in CI;
- screenshot comparison uses a strict, documented pixel-diff budget; default to zero unexpected pixel differences for stable component captures and allow a narrow threshold only when antialiasing/platform variance is demonstrated;
- dynamic timestamps/progress or nondeterministic map tiles are frozen, mocked or tightly masked rather than giving the whole page a large tolerance;
- geometry assertions accompany screenshot diffs for critical alignment and sticky-overlap invariants;
- failing diffs upload expected/actual/diff artifacts for inspection;
- the existing exact-head PR evidence workflow remains the reviewer-facing artifact source.

A model/AI visual review may inspect the published captures, but it is supplemental. Deterministic pixel diff + DOM/layout assertions are the blocking automated gate because they are reproducible and auditable.

## UX states

The Lines directory and line detail must explicitly cover:

- initial/loading;
- populated;
- no lines in catalog;
- no filter matches;
- geolocation requesting/denied/unavailable/timeout;
- stale snapshot/live refresh failure where applicable;
- line detail loading/error;
- line with official geometry;
- line using ordered-stop fallback geometry;
- line with insufficient coordinates for a map but a still-usable stop list;
- empty/invalid route params;
- pagination first/middle/last page;
- long line names, long stop names and translated copy.

## Accessibility

- WCAG 2.2 AA remains the minimum target.
- Lines and stop rows use native links/buttons according to navigation vs action semantics.
- All map interactions have an equivalent list interaction; no required task depends on dragging, hover or precise marker activation.
- Focus state remains synchronized when selecting a stop from map or list without unexpected focus theft.
- Sticky search controls preserve visible focus and are not obscured by fixed navigation.
- Touch targets target at least 44×44 CSS px where practical.
- Filter controls expose labels, selected values, clear/reset behavior and result-count changes to assistive technology where useful.
- Route map has an accessible name and OSM attribution remains visible.
- Do not disable browser zoom.

## Acceptance

### Navigation and Lines directory

- Selecting **Lines** from the persistent shell opens the Lines directory, not `/routes`.
- Route Search remains directly addressable and usable as a separate planning task.
- No route-search initial/empty state renders the C2 sample sentence or any other fabricated default journey.
- The Lines directory renders canonical CTAN-backed line records and no hard-coded demo line.
- Search and applicable filters update one canonical result set.
- Pagination is bounded, keyboard accessible and preserves valid filter state.
- Reload/back/forward restore URL-backed filter/page state where specified.
- Geolocation is requested only after an explicit **Near me** action and denial leaves the non-location filters fully usable.
- Province is visible only if an authoritative mapping exists and is covered by tests/documentation.

### Line detail and maps

- Clicking a line opens a deep-linkable line detail page.
- Line detail includes a route map and ordered stops when sufficient CTAN coordinates exist.
- Desktop/wide-tablet expanded layout uses the intended map/list emphasis without squeezing the stop list below readable width.
- Mobile uses one logical column; no horizontal page scroll is introduced.
- Clicking a map marker selects/navigates the same consortium-aware stop identity as the corresponding list row.
- The global map, line-detail map and any route-search route map consume the same canonical route geometry/stop identity owner.
- Official CTAN geometry and ordered-stop fallback produce equivalent public view-model contracts.
- A line with unusable map geometry still exposes its ordered stop list and a clear map-unavailable state.

### Route search

- Origin, destination, swap, date and submit/edit controls remain available while scrolling results.
- The sticky search region never overlaps focused controls, autocomplete/date-picker overlays, result content or the bottom shell at tested viewports.
- The redundant origin/destination/date summary between form and timetable is removed.
- Departure, arrival and duration remain aligned at 320, 360, 390, 430 and desktop widths with ES and EN copy.
- Arrival information does not wrap into a visually unrelated second row that breaks scan alignment.
- Relative-time text may wrap locally without moving the opposite clock column.

### Recents

- Multiple recent preview rows show vertically aligned departure times on mobile.
- Line badges and times remain within the card bounds for long line codes and 200% browser zoom.

### Visual regression

- Deterministic screenshot tests cover at minimum 320×568, 390×844, 768×1024 and 1440×900 for affected layout primitives; exact PR evidence still captures the repository canonical 390×844 and 1440×900 views.
- Pixel-diff failures are blocking and retain diff artifacts.
- Critical layout assertions verify no horizontal document overflow, sticky-region non-overlap, stable result-row columns and map/list bounds.
- Screenshots cover populated, empty/error and long-content states that can alter layout.
- No baseline update is accepted without reviewing the rendered diff.

## Tests

### Unit/domain

- line catalog normalization/filtering/pagination;
- dependent geographic filter behavior;
- province mapping validation if added;
- canonical route geometry builder using official polyline, directional stop fallback and invalid-coordinate cases;
- shared selected-stop identity contract;
- route/search URL state parsing and safe defaults;
- no hard-coded sample-route fallback.

### Component

- Lines directory loading/empty/error/filtered/paginated states;
- explicit geolocation request and recovery states;
- line-detail map/list synchronization;
- sticky search workspace state/density transitions;
- recent preview line/time alignment classes;
- accessible names and keyboard interaction.

### Browser/E2E

- persistent Lines navigation → directory → filter → line detail → stop detail → back;
- Near me permission accepted and denied;
- reload/back/forward with line filters/page;
- line detail official geometry and fallback geometry;
- mobile map/list interaction;
- route search with sticky editing while scrolled;
- ES/EN long-copy alignment;
- recent card alignment;
- axe checks for affected flows;
- screenshot/pixel regression matrix.

## Checks

Use repository-native scripts only after confirming their current definitions. At minimum the implementation must pass the same quality gates that currently protect PR #36:

- formatting for all touched files;
- `pnpm run lint`;
- `pnpm run test:scripts` when snapshot/catalog tooling changes;
- `pnpm run test:angular`;
- production build;
- focused Playwright/E2E suites;
- deterministic screenshot regression;
- exact-head PR visual evidence and artifact inspection;
- browser console/network inspection for changed flows.

## Planned files/owners

Exact paths must be revalidated immediately before implementation, but the current owners indicate the likely scope:

- `src/app/app.routes.ts`
- `src/app/core/config.ts`
- `src/app/shared/layout/top-actions/app-shell-top-actions.component.*`
- new or existing `src/app/features/lines/` directory/index surface
- `src/app/features/line-detail/line-detail.component.*`
- `src/app/data/catalog/*` and/or one canonical line-directory owner
- `src/app/data/route-search/route-lines-api.service.ts`
- `src/app/domain/map/route-overlay-geometry.*` or its canonical successor
- `src/app/shared/map/*`
- `src/app/features/route-search/route-search.component.*`
- `src/app/features/route-search/route-search-form/route-search-form.component.*`
- `src/app/features/home/recent-searches/ui/recent-search-preview-entry/*`
- `src/assets/i18n/es.json`
- `src/assets/i18n/en.json`
- focused Angular/Playwright specs
- `.github/workflows/pr-visual-evidence.yml` only if workflow wiring must change for the pixel gate
- `docs/api-reference.md`, `docs/map-data-sources.md` and knowledge-map shards if canonical ownership changes

Do not create parallel map, catalog or geometry owners just to fit this tentative list.

## Risks

- **Scope size:** this combines information architecture, data normalization, responsive layout and visual tooling. Implement in atomic vertical slices rather than a single giant UI commit.
- **Province semantics:** current repository data does not prove a province field. Shipping an inferred mapping would create false information.
- **Map nondeterminism:** OSM tiles and asynchronous Leaflet rendering can make full-page pixel snapshots flaky. Prefer deterministic mocked/static tile strategy or component-level map overlays for blocking pixel tests while retaining real-map browser smoke tests.
- **Sticky mobile UI:** a dense sticky form can consume too much vertical space or conflict with the virtual keyboard/bottom shell. The compact state must be measured on real mobile dimensions.
- **CTAN payload variance:** line detail/geometry may vary by consortium; fallback behavior must be data-driven and tested across representative consortia.
- **Performance:** deriving geographic coverage for every line from every stop on the client could be expensive. Precompute during snapshot generation or index lazily behind one cached owner when measurements justify it.

## Rollback

Each implementation slice must be independently reversible:

- navigation/index changes can revert to the previous route without changing line-detail contracts;
- line catalog indexes must be additive/generated and can fall back to the current catalog structure;
- reusable map view-model extraction must preserve existing Map behavior before consumers migrate;
- route-search layout changes must not alter timetable calculation/domain results;
- visual baseline changes can be reverted independently from product behavior.

No migration may remove an existing canonical owner until every in-scope consumer has moved and tests prove parity.

## Delivery

Continue on PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado` unless the implementation is deliberately split into a follow-up PR to control risk. Use atomic Conventional Commits. Do not merge, release or deploy without explicit approval.

The detailed execution gate is tracked in `.agents/specs/2026-08-28-lines-discovery-route-layout-checklist.md`.

## Status

Specification recorded from the 2026-08-28 mobile review. **Implementation not started for this follow-up.** Do not mark this specification complete until every applicable checklist item has evidence and the final exact-head CI/visual gates are green.
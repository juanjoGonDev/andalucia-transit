# Map workspace redesign

## Request

Finish the map workspace after real-browser review rejected the current layout and exposed functional gaps. Keep the map as the dominant surface while making search progressive, the inspector optional, stop popovers polished, and focused-area line discovery reliable. The latest browser evidence also requires focused-line failures to use a toast instead of consuming inspector space and requires readable line-card contrast.

## Evidence

- `MapComponent` owns search placement, focused-area lines, nearby stops, route overlays and the map inspector.
- `LeafletMapService` remains the single Leaflet rendering owner and already exposes settled viewport events plus official route rendering.
- The current search surface is permanently expanded and occupies substantial map area even when the user is not searching.
- The current `.map__panel` inspector is always visible; real-browser review shows it competing with the map and obscuring useful geography.
- The current Leaflet close control uses a 2rem target and visually collides with the custom stop-popover hierarchy.
- Focused-area discovery already models `moveend -> debounce -> switchMap`, but real-browser review shows the live CTAN request ending in the recoverable error state. Existing unit tests mock the adapter and therefore do not prove the live request contract.
- `docs/api-reference.md` documents `GET /Consorcios/:idConsorcio/lineas` with `latitud` and `longitud` for nearby-line discovery and official line geometry remains owned by CTAN `polilinea`.
- `docs/api-reference.md` names the stop-to-lines resource as `GET /Consorcios/:idConsorcio/lineasPorParadas/:idParadas`, while its historical example includes an extra `/paradas/` segment. The current client follows that example-only path, so the map fallback can fail after the geographic lookup fails.
- Real-browser evidence on 2026-08-27 shows the focused-lines inspector rendering `No pudimos cargar las líneas de esta zona` inline and line cards using the dark default `InteractiveCard` surface with dark route text, producing poor readability.
- The repository contains no shared toast/snackbar owner and introducing Angular Material snackbar only for this map-local recovery state would create a second UI pattern and additional dependency surface.
- The repository contains no OSRM, GraphHopper, Valhalla, Mapbox Directions or equivalent pedestrian-routing provider.

## Decision

1. Keep `MapComponent` as workspace/state owner and `LeafletMapService` as rendering owner.
2. Make map search icon-first. The search field is hidden initially, expands on explicit activation, receives focus, supports Escape/close collapse, and does not reserve a large permanent card.
3. Make the map inspector hidden initially. Expose compact icon controls for `focused lines`, `nearby stops` and `routes`; selecting a control opens the right-side inspector on desktop and a bounded bottom/side surface on narrow screens.
4. Keep only one inspector section active at a time to reduce cognitive load. Opening a section must not destroy its data state.
5. Preserve the existing focused-area pipeline (`moveend`, debounce, stale cancellation). Use the documented root-level `lineasPorParadas` route as the canonical nearest-stop fallback and retain the historical example route only as a compatibility fallback when the canonical request fails.
6. Keep CTAN line mapping and caching owned by `RouteLinesApiService`; `MapComponent` only composes geographic lookup -> nearest-stop fallback and does not duplicate endpoint construction.
7. Present a terminal focused-line discovery failure as a map-local toast with `role="alert"` and an explicit retry action. Do not reserve inspector content height for this recoverable notification.
8. Render focused-line and route cards on the same light interactive-card surface used by nearby stops so explicit route text tokens retain WCAG-readable contrast. Active state remains indicated by primary border/soft background rather than a dark card skin.
9. Selecting a focused-area line must load official `polilinea`, render it through the single route layer and fit its bounds.
10. Increase and restyle the Leaflet stop-popover close target using existing tokens; it must not overlap the stop title or action.
11. Keep CTAN `polilinea` as the only exact transit-route geometry source. Do not reintroduce straight-line road approximations.
12. Do not fake pedestrian routing. If no real provider is introduced, map/stop-info may show only an explicitly approximate proximity fallback.

## Acceptance

- Search starts as one accessible icon/button and expands only after activation.
- Opening search focuses the search field; Escape/close collapses it and restores focus without losing a selected map stop.
- The map inspector is hidden on initial render and is opened through section icon controls with accessible names and visible active state.
- Desktop and mobile inspector placement stays within the viewport, respects safe areas and does not cover the global navigation dock or critical map controls.
- Panning/zooming refreshes focused-area lines after debounce; older requests cannot overwrite newer viewport intent.
- If the geographic CTAN lookup fails, the nearest-stop fallback requests `/Consorcios/:idConsorcio/lineasPorParadas/:idParadas` first and can recover without entering the terminal error state.
- The historical `/paradas/lineasPorParadas/` example path is used only after the canonical route fails; it is not the primary endpoint.
- A terminal focused-line discovery failure appears as a toast over the map with retry and does not render as `.map__panel-error` inside the lines inspector.
- Focused-line cards use a light surface with strong primary text and muted metadata; text remains readable in normal and active states.
- Focused-line selection renders official geometry and fits the map.
- The stop-popover close target is visually aligned, keyboard focusable and at least 44x44 CSS pixels where layout permits.
- At 390x844 and 1440x900 there is no unintended horizontal overflow or critical-content collision.

## Tests

- Unit/integration coverage for icon-first search open/focus/collapse.
- Unit coverage for inspector hidden/open/section state.
- `RouteLinesApiService` regression coverage for the canonical stop-to-lines URL plus compatibility fallback ordering.
- `MapComponent` regression coverage for geographic failure -> nearest-stop recovery, terminal error state, retry, and toast placement contract.
- Existing debounce/stale-cancellation tests remain and browser acceptance triggers a deterministic focused-line flow.
- Playwright covers focused-line discovery/preview, inspector controls, search expansion, popup detail navigation, toast placement and viewport bounds.
- Exact-head visual evidence includes the map with inspector closed and representative opened states at 390x844 and 1440x900.

## Risks

- CTAN responses are untrusted external data; validate runtime shape and tolerate documented response wrappers without accepting arbitrary malformed values.
- API documentation contains a path inconsistency; canonical-first plus compatibility fallback prevents binding the application to the example typo while preserving runtime resilience.
- Map overlays can easily cover fixed navigation; collision/clearance checks are mandatory.
- The branch remains close to Angular bundle/style budgets; prefer existing primitives and tokens over new dependencies.

## Rollback

Revert the focused map-search, inspector, live-line-adapter/toast, card-surface and popup-control commits independently. No persisted-data migration is involved.

## Delivery

Continue on PR #36 branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use focused Conventional Commits. Do not merge, release or deploy.

## Status

In progress: root cause isolated to the stop-to-lines fallback path mismatch; toast/contrast regressions are part of the same browser-acceptance fix.

# Map workspace redesign

## Request
Redesign the map surface from the current cramped, card-heavy presentation into a transport workspace that remains readable while exploring stops and routes. The requested outcome is:

- popup content follows the application visual system instead of Leaflet defaults;
- stop markers and stop affordances are visually distinct from route lines using the existing success/green token family;
- route overlays communicate travel direction with arrow cues;
- route lines follow the official road/route geometry instead of drawing straight segments between stops;
- the secondary application menu opens as a hideable lateral drawer rather than a compact popover;
- the map automatically discovers and presents lines for the currently focused area, without requiring a prior route search;
- desktop gives the map the dominant workspace and an independently scrollable inspector;
- mobile preserves the same hierarchy with an immersive map and bounded inspector;
- spacing and grouping are increased so nearby stops, focused-area lines and route results do not visually collapse into one block.

## Evidence
- `src/app/features/map/map.component.html` already owns the map workspace, search, nearby stops and route inspector; it is the correct feature-layout owner.
- `src/app/shared/map/leaflet-map.service.ts` is the single rendering owner for Leaflet layers and already supports route polylines, stop markers, direction indicators and viewport fitting.
- `src/app/domain/map/route-overlay.facade.ts` currently builds route coordinates exclusively from ordered stop coordinates, so Leaflet necessarily connects stops with straight segments.
- `src/app/data/route-search/route-lines-api.service.ts` currently exposes line summaries and line stops but does not consume the CTAN line-detail geometry.
- `docs/api-reference.md` documents CTAN `GET /Consorcios/:idConsorcio/:idLinea` (`DetalleLinea`), whose response includes `polilinea`: the official list of latitude/longitude points composing the line route.
- The same API reference documents `GET /Consorcios/:idConsorcio/lineas` with `latitud` and `longitud`; when supplied, CTAN returns lines near that geographic position.
- The complete stop network is already loaded for map rendering and each stop owns its `consortiumId`, so the focused map location can be mapped to the nearest consortium without introducing another geographic catalog.
- `AppShellTopActionsComponent` already owns global navigation and the secondary `More` menu; changing only that secondary surface to an off-canvas drawer avoids another navigation owner.
- The repository already has Angular, RxJS and Leaflet. No routing/decorator/menu dependency is required.

## Decision
- Keep `MapComponent` as the feature-layout/state owner and `LeafletMapService` as the map-rendering owner.
- Keep `RouteLinesApiService` as the CTAN line-data adapter and extend it with:
  - a line-detail method that maps and validates official `polilinea` geometry;
  - a location method that queries CTAN lines by `latitud`/`longitud` for one consortium.
- Treat the CTAN `polilinea` as the SSOT for route drawing. Do not call OSRM/Google or snap stop-to-stop segments heuristically to roads.
- Segment the official line geometry to the selected origin/destination by locating the nearest official geometry points to the ordered origin/destination stop coordinates, preserving travel direction.
- If official geometry is absent/invalid, do not render a misleading straight-line route as though it were exact road geometry.
- Subscribe to settled Leaflet viewport changes. Debounce focused-area discovery and use `switchMap` so stale location requests cannot overwrite newer map positions.
- Resolve the focused consortium from the nearest already-loaded network stop, then query CTAN lines around the settled map center. Cache API requests at the data adapter boundary.
- Present focused-area lines in the map inspector automatically; clicking one previews its official geometry and fits the map to it.
- Keep route-search overlays and focused-line previews as separate state concepts, but compose them into the single Leaflet route layer through `MapComponent`.
- Convert the secondary `More` popover into a fixed lateral drawer with backdrop, close action, Escape support, focus restoration, safe-area spacing and reduced-motion handling. Primary `Home · Search · Map · Favorites` quick actions remain persistent.
- Continue using existing success tokens for stops and the blue route family for lines.

## Acceptance criteria
- Route overlays and focused-line previews use CTAN official polyline points and visibly follow the published route geometry instead of connecting stop coordinates directly.
- Route direction arrows follow the official geometry order.
- Invalid or absent CTAN polyline data cannot silently fall back to a misleading exact-looking straight route.
- Panning/zooming the map automatically refreshes the focused-area line list after a short debounce; stale requests are cancelled/ignored.
- Focused-area line discovery does not require geolocation or a previously submitted route search.
- Selecting a focused-area line previews its official geometry and fits the map while preserving the nearby-stop inspector and global navigation.
- The secondary menu is a lateral off-canvas drawer, hidden by default, dismissible by close control, backdrop and Escape, and restores focus to the trigger.
- Stop markers remain green and visually distinct from blue line geometry.
- At `1440x900`, the map remains immersive and the inspector scrolls independently without obscuring primary map controls.
- At `390x844`, the map remains substantial, the inspector is bounded, the primary dock remains reachable and the drawer does not overflow horizontally.
- Existing map search, geolocation, popup navigation, highlighting, keyboard semantics and async states continue to work.

## Tests
- Add adapter tests for CTAN focused-line query parameters, line-detail mapping and robust polyline parsing.
- Extend pure geometry coverage for segmenting official road geometry between selected stops and preserving direction.
- Extend `RouteOverlayFacade` tests to prove it consumes official detail geometry rather than stop-to-stop coordinates.
- Extend `LeafletMapService` tests for viewport-settled callbacks if required by the public handle contract.
- Extend `MapComponent` coverage for debounced focused-line discovery, stale request cancellation and focused-line preview selection.
- Extend shell-navigation unit/browser coverage for drawer open/close/Escape/focus behavior and mobile/desktop geometry.
- Extend Playwright map coverage to verify automatic focused lines, line preview, immersive desktop/mobile layout, popup navigation and no horizontal overflow.
- Final CI must pass lint, script tests, Angular tests and build without raising bundle/component budgets.
- Final visual-evidence workflow must pass on the exact head SHA and publish fresh `390x844` and `1440x900` screenshots.

## Risks
- CTAN line polyline serialization is external input; parse as untrusted data, validate finite latitude/longitude pairs and reject malformed geometry.
- A line polyline can represent more geometry than the selected stop segment; nearest-point segmentation must be deterministic and covered for reversed direction.
- Viewport events can generate request storms; debounce, cache and cancel stale requests.
- Multiple consortium boundaries can be visible simultaneously. The first implementation uses the nearest loaded stop to choose the focused consortium, which is deterministic and aligned with the focused map center; this can be generalized later if product evidence requires multi-consortium aggregation.
- Off-canvas navigation can create keyboard/focus regressions; preserve semantic links, explicit focus restoration and Escape dismissal.
- The PR is already close to Angular style/bundle budgets; prefer shared rules and pure TypeScript over another UI/map dependency.

## Rollback
Revert the focused road-geometry, focused-lines and drawer commits. No schema migration or persistent-state migration is involved.

## Checks
- `pnpm run lint`
- `pnpm run test:scripts`
- `pnpm run test:angular`
- `pnpm run build`
- Playwright map/navigation exploration tests
- exact-head PR visual evidence workflow

## Delivery
Continue on PR #36 branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use focused Conventional Commits. Do not merge, release or deploy.

## Status
In progress.

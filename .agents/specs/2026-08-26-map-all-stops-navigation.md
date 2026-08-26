# Explore all stops on the map

## Request

Make the network map useful as an exploratory surface: show every available stop without requiring geolocation, allow users to pan and zoom the map, search for a stop or area and move the camera to it, inspect stop details in a map popover, correlate nearby-list items with their map markers, and navigate to the canonical stop detail route.

## Evidence

- `MapComponent` originally rendered stop markers only after `locate()` resolved nearby stops, so the initial map was visually empty even though the application already has the complete stop-directory snapshot.
- `locate()` originally cleared and replaced the stop-marker layer with only nearby results, coupling the map's global network layer to the optional geolocation flow.
- `NearbyStopsService` already loads all lightweight stop records from the canonical stop-directory snapshot before computing distances; reusing that loaded data avoids another endpoint or duplicate network model.
- The stop-directory snapshot already contains stop name, municipality, nucleus, zone and coordinates, which are sufficient to derive stop and area search targets without adding a backend endpoint.
- `LeafletMapService` uses `preferCanvas: true`, which is suitable for a large circle-marker layer and can retain one marker registry for selection/highlight state.
- The shared autocomplete field already provides listbox semantics and keyboard navigation; map search should reuse that interaction model rather than invent another combobox.
- The canonical stop destination is `stop-detail/:stopId`; existing nearby cards already navigate there.

## Decision

1. Keep the map and geolocation flows separate: all network stops are rendered independently of nearby-stop cards.
2. Expose the already cached lightweight stop records through `NearbyStopsService` for map consumption instead of fetching the snapshot again in `MapComponent`.
3. Keep one Leaflet stop layer and one marker registry. Search focus, nearby-list hover/focus and popup selection must operate on those existing markers rather than rendering parallel marker layers.
4. Stop-marker activation opens an in-map popover with the stop name and a translated `View details` action. Navigation occurs only when that action is activated.
5. Nearby cards continue to navigate to stop detail on activation, while pointer hover and keyboard focus temporarily highlight the corresponding map marker so users can visually correlate list and map.
6. Add a map search control using the existing autocomplete interaction. Results include individual stops plus deduplicated areas derived from municipality, nucleus and explicit zone metadata.
7. Selecting a stop moves the map to that marker and opens its popover. Selecting an area fits the map to all stops belonging to that area.
8. Camera movement uses Leaflet animated movement when motion is allowed and falls back to immediate movement under `prefers-reduced-motion: reduce`.
9. Keep `preferCanvas`; do not introduce clustering or a new dependency unless measured performance requires it.
10. Enable visible Leaflet zoom controls while preserving drag, wheel, touch and keyboard navigation.
11. Fit the initial map to the complete network after stops load. Geolocation may refocus the viewport on the user plus nearby results, but it must not remove global markers.
12. Reuse existing design tokens, async feedback and translation infrastructure; no locale-specific product copy is hardcoded in TypeScript.

## Acceptance

- Opening `/map` without granting location renders every stop returned by the stop-directory snapshot.
- The initial viewport fits the loaded stop network.
- Users can pan, wheel/pinch zoom and use visible zoom controls.
- The map exposes an autocomplete search for stops and areas with keyboard and pointer selection.
- Selecting a stop moves the camera to that stop, visually selects its marker and opens its popover.
- Selecting an area moves/fits the camera to the stops belonging to that municipality, nucleus or zone.
- Search camera transitions are smooth when motion is allowed and immediate when reduced motion is requested.
- Clicking/tapping a stop marker opens a popover with its name and a translated action to `/stop-detail/:stopId`.
- Hovering or keyboard-focusing a nearby-stop card highlights the same stop marker; leaving/blur removes only the transient highlight.
- Using geolocation keeps the full network marker layer visible while the side panel continues to list nearby stops.
- Route overlays continue to render and fit independently.
- Empty or failed all-stop loading does not crash map creation, search or geolocation.
- Focused service/component tests cover all-stop exposure, initial rendering, popup/detail navigation, search focus, area focus, nearby-card marker highlighting and geolocation preserving the global layer.
- Browser acceptance covers marker popup navigation plus search-driven camera movement and list-to-marker highlighting.
- Existing Angular, lint, scripts and deploy validation remain green.
- Final deterministic browser/visual evidence is green for the exact final PR head and includes `/map` at mobile and desktop breakpoints.

## Risks

- Rendering several thousand interactive markers may affect low-end devices. `preferCanvas` bounds DOM growth; if profiling shows unacceptable interaction latency, clustering/viewport virtualization should be a separate measured optimization.
- Large result sets must not be rendered in the autocomplete. Search results are bounded and deduplicated before presentation.
- Automatically fitting all stops or areas must not fight route-overlay fitting; network fit runs only after initial stop load, while later route/user/search actions are explicit refocus operations.
- Hover-only correlation would exclude keyboard and touch users, so the same highlight behavior is wired to focus and marker selection where applicable.

## Tests

- `NearbyStopsService`/loader: exposes cached all-stop records with the metadata required for stop and area search and shares the same load with distance searches.
- `LeafletMapService`: retains marker handles, opens a safe DOM popup, supports transient highlight and animated/non-animated camera focus.
- `MapComponent`: renders all markers on init and fits their coordinates.
- `MapComponent`: marker activation opens the stop popover and the popup action routes to stop detail.
- `MapComponent`: stop search focuses one marker; area search fits all matching stops.
- `MapComponent`: nearby list hover/focus highlights the matching marker without replacing the global layer.
- `MapComponent`: locating a user does not replace the global stop marker layer.
- Existing route-overlay and error-state regression coverage remains intact.
- Playwright verifies search selection, marker popup/detail navigation, visible zoom controls and list-to-map highlighting against the deterministic mock app.

## Rollback

Revert the focused map exploration commits. No API, persisted storage or route contract changes are required.

## Delivery

Atomic spec, tests/data exposure, shared map interaction, component integration, translations/styles, checks, final browser evidence and documentation closeout. Do not merge the PR.

## Status

In progress.

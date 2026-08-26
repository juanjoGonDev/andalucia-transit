# Explore all stops on the map

## Request

Make the network map useful as an exploratory surface: show every available stop without requiring geolocation, allow users to pan and zoom the map, and navigate from a stop marker to the canonical stop detail route.

## Evidence

- `MapComponent` currently renders stop markers only after `locate()` resolves nearby stops, so the initial map is visually empty even though the application already has the complete stop-directory snapshot.
- `locate()` clears and replaces the stop-marker layer with only nearby results, coupling the map's global network layer to the optional geolocation flow.
- `NearbyStopsService` already loads all lightweight stop records from the canonical stop-directory snapshot before computing distances; reusing that loaded data avoids another endpoint or duplicate network model.
- `LeafletMapService` uses `preferCanvas: true`, which is suitable for a large circle-marker layer, but its stop markers currently have no activation callback and the Leaflet zoom control is disabled.
- The canonical stop destination is `stop-detail/:stopId`; existing nearby cards already navigate there.

## Decision

1. Keep the map and geolocation flows separate: all network stops are rendered independently of nearby-stop cards.
2. Expose the already cached lightweight stop records through `NearbyStopsService` for map consumption instead of fetching the snapshot again in `MapComponent`.
3. Extend the map marker contract with a single selection callback owned by `MapComponent`; the shared Leaflet adapter remains responsible only for translating marker interaction into the stop identifier.
4. Navigate selected markers through Angular Router to the existing `stop-detail/:stopId` route.
5. Keep `preferCanvas` and render all stop markers in one Leaflet layer; do not introduce clustering or a new dependency unless measured performance requires it.
6. Enable visible Leaflet zoom controls while preserving drag, wheel and touch navigation.
7. Fit the initial map to the complete network after stops load. Geolocation may temporarily refocus the viewport on the user plus nearby results, but it must not remove global markers.
8. Reuse the existing async map surface and translation vocabulary; do not hardcode locale-specific product copy.

## Acceptance

- Opening `/map` without granting location renders every stop returned by the stop-directory snapshot.
- The initial viewport fits the loaded stop network.
- Users can pan, wheel/pinch zoom and use visible zoom controls.
- Clicking/tapping a stop marker navigates to `/stop-detail/:stopId` using the canonical Angular route.
- Using geolocation keeps the full network marker layer visible while the side panel continues to list nearby stops.
- Route overlays continue to render and fit independently.
- Empty or failed all-stop loading does not crash map creation or geolocation.
- Focused service/component tests cover all-stop exposure, initial rendering, marker navigation and geolocation preserving the global layer.
- Existing Angular, lint, scripts and deploy validation remain green.
- Final deterministic browser/visual evidence is green for the exact final PR head.

## Risks

- Rendering several thousand interactive markers may affect low-end devices. `preferCanvas` bounds DOM growth; if profiling shows unacceptable interaction latency, clustering/viewport virtualization should be a separate measured optimization.
- Automatically fitting all stops must not fight route-overlay fitting; the network fit runs only after the initial stop load, while later route/user actions are allowed to refocus explicitly.

## Tests

- `NearbyStopsService`: exposes cached all-stop records and shares the same load with distance searches.
- `MapComponent`: renders all markers on init and fits their coordinates.
- `MapComponent`: marker activation routes to stop detail.
- `MapComponent`: locating a user does not replace the global stop marker layer.
- Existing route-overlay and error-state regression coverage remains intact.

## Rollback

Revert the focused map exploration commits. No API, persisted storage or route contract changes are required.

## Delivery

Atomic spec, tests/data exposure, shared map interaction, component integration, checks, final browser evidence and documentation closeout. Do not merge the PR.

## Status

In progress.

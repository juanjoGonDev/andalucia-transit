# Stop information customer redesign

## Request

Redesign stop information around customer tasks instead of internal metadata, and define an honest `How to get there` experience without fabricating street routing.

## Evidence

- `StopInfoComponent` currently renders one dense definition-list card containing stop number/code, municipality, nucleus, zone, raw coordinates, observations and correspondences with little task hierarchy.
- `StopInfoFacade` already exposes customer-useful name, municipality/nucleus, correspondences, notes and coordinates from live CTAN data with directory fallback.
- `StopDetailComponent` already owns live departures and links into stop information.
- The repository contains no real pedestrian directions provider (no OSRM, GraphHopper, Valhalla, Mapbox Directions or equivalent integration was found).
- The project UI guide requires mobile-first hierarchy, semantic controls, deliberate async/error states, reusable tokens, keyboard support and no misleading data presentation.

## Decision

1. Keep stop information driven by the resolved composite stop identity and existing `StopInfoFacade`; do not duplicate CTAN access in the component.
2. Replace the technical metadata card with a customer-oriented layout. The stop name and human location are primary; internal identifiers and raw coordinates do not dominate the main surface.
3. Use accessible tabs only where they reduce scanning cost. The target information architecture is `Information`, `Lines`, and `How to get there`; live departures remain owned by the dedicated stop-detail experience unless reusing its canonical data owner can be done without duplication.
4. `Information` shows useful location/context/observations and service status when available.
5. `Lines` presents parsed correspondences with the existing visual language rather than raw comma-separated text.
6. `How to get there` may request geolocation and compute/display explicit approximate proximity (for example straight-line distance) using existing location utilities. It must clearly state that street-by-street pedestrian routing is unavailable until a real directions provider is integrated.
7. Do not draw a straight line on the map and label it as a walking route. Adding a third-party routing provider is a separate architecture/dependency decision and is not silently introduced here.
8. Keep refresh/loading/offline/error behavior from the facade and preserve valid fallback content during refresh.

## Acceptance

- The primary stop-information view no longer leads with stop code/number or raw coordinates.
- Tabs use semantic tablist/tab/tabpanel behavior, keyboard navigation and visible focus if implemented.
- Customer-readable stop name and municipality/nucleus remain visible and tied to the canonical stop identity.
- Lines are presented as scannable items/chips using existing tokens.
- Geolocation permission/loading/error states are explicit and recoverable.
- Without a routing provider, `How to get there` explicitly labels distance/proximity as approximate and does not render a fake street route.
- Layout remains usable at 390x844 and 1440x900 and is not obscured by the global bottom dock.

## Tests

- Stop-info component coverage for tabs, customer hierarchy and fallback/live states.
- Geolocation fallback tests for success, denied/error and missing stop coordinates.
- Regression coverage proving internal identifiers are not the dominant visible information.
- Playwright verifies stop-info identity and the accessible information/lines/how-to-get-there flow on mobile and desktop.

## Blocked capability

Exact shortest pedestrian routing through streets is blocked by the absence of a real routing provider. The fallback delivered by this task must remain explicitly approximate. A future provider integration requires dependency/security/license/availability review and its own failure/offline contract.

## Rollback

Revert the stop-info presentation/geolocation fallback commits. No API or persistence migration is involved.

## Delivery

Continue in PR #36. Do not merge, release or deploy.

## Status

In progress.

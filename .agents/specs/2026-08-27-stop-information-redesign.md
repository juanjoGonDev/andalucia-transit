# Stop information customer redesign

## Request

Redesign stop information around customer tasks instead of internal metadata, and define an honest `How to get there` experience without fabricating street routing.

## Evidence

- `StopInfoComponent` previously rendered one dense definition-list card containing stop number/code, municipality, nucleus, zone, raw coordinates, observations and correspondences with little task hierarchy.
- `StopInfoFacade` already exposes customer-useful name, municipality/nucleus, correspondences, notes and coordinates from live CTAN data with directory fallback.
- `StopDetailComponent` already owns live departures and links into stop information.
- The repository contains no real pedestrian directions provider (no OSRM, GraphHopper, Valhalla, Mapbox Directions or equivalent integration was found).
- Existing geolocation and geographic-distance owners already provide location acquisition, error classification and straight-line distance calculation without adding a dependency.
- The project UI guide requires mobile-first hierarchy, semantic controls, deliberate async/error states, reusable tokens, keyboard support and no misleading data presentation.

## Decision

1. Keep stop information driven by the resolved composite stop identity and existing `StopInfoFacade`; do not duplicate CTAN access in the component.
2. Replace technical metadata with a customer-oriented hierarchy. The stop name and human location are primary; internal identifiers and raw coordinates do not appear in the primary surface.
3. Keep `Information`, `Lines`, and `How to get there` as distinct information areas, but render them as stacked sections instead of adding page-local tabs. The content is short enough that tabs would add navigation cost without reducing cognitive load.
4. `Information` shows useful location/context/observations and service status when available.
5. `Lines` presents parsed correspondences with the existing visual language rather than raw comma-separated text.
6. `How to get there` requests geolocation only after explicit user action and computes an approximate straight-line distance with the existing geolocation and distance utilities.
7. The proximity result explicitly states that it is not a walking route, street path, or navigation instruction. Do not draw a straight line and label it as a walking route.
8. Location requests are single-flight, reset when the routed stop identity changes, and ignore stale asynchronous completion.
9. Keep refresh/loading/offline/error behavior from the facade and preserve valid fallback content during refresh.
10. Adding a third-party pedestrian routing provider remains a separate architecture/dependency decision.

## Acceptance

- The primary stop-information view no longer leads with stop code/number or raw coordinates.
- Customer-readable stop name and municipality/nucleus remain visible and tied to the canonical stop identity.
- Lines are presented as scannable items/chips using existing tokens.
- `How to get there` requests location only on user action and exposes loading, success, unavailable-coordinate and recoverable geolocation-error states.
- The calculated value is a straight-line approximation using existing canonical geo-distance logic.
- The UI explicitly states that the result is not pedestrian routing and does not render a fake street route.
- Repeated activation while a location request is pending cannot create duplicate requests.
- A route identity change invalidates an in-flight distance request so stale results cannot appear for another stop.
- Layout remains usable at 390x844 and 1440x900 and is not obscured by the global bottom dock.
- Spanish and English copy describe the same capability and limitation.

## Tests

- Stop-info component coverage for customer hierarchy and fallback/live states.
- Geolocation coverage for success, denied/error and missing stop coordinates.
- Regression coverage proving internal identifiers and raw coordinates are not shown as primary information.
- Browser/visual evidence at 390x844 and 1440x900 before delivery.

## Blocked capability

Exact shortest pedestrian routing through streets remains blocked by the absence of a real routing provider. The delivered fallback is explicitly approximate. A future provider integration requires dependency/security/license/availability review and its own failure/offline contract.

## Rollback

Revert the stop-info presentation/geolocation commits. No API or persistence migration is involved.

## Delivery

Continue in PR #36. Do not merge, release or deploy.

## Status

Implementation added: customer hierarchy, line chips and explicit approximate-distance `How to get there` flow are covered by component tests. Exact-head CI and browser/visual evidence are pending.

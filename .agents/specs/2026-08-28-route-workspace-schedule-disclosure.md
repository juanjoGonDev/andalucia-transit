# Reusable route workspace and schedule disclosure

## Request

Extend the PR #36 Lines/Route Search follow-up from the 2026-08-28 screenshot review with two additional requirements:

1. on wide Line Detail layouts, the route map and the stops column must always have the same visible height;
2. the map + ordered-stops experience must be a reusable component and must also be available from each Route Search departure as an expandable disclosure that derives the correct line and direction from that departure.

## Evidence

- `LineDetailComponent` currently owns the map/stops workspace markup directly, so the complete experience is not reusable even though `RouteMapComponent` itself is shared.
- `line-detail.component.scss` gives the stops panel `max-height: 34rem` while `RouteMapComponent` owns an independent responsive `min-height`; the two columns therefore do not have a single height owner and can visibly end at different vertical positions.
- Route Search departures already expose `lineId`, `lineCode`, `direction` and destination semantics through `RouteSearchDepartureView`; those are the canonical inputs needed to resolve the route for an individual timetable result.
- `RouteLinesApiService` already owns CTAN line detail and ordered line-stop requests. New UI must consume that owner rather than create a parallel transport client.
- `line-route-geometry.ts` already owns primary-direction selection and stop-coordinate fallback. Direction-specific selection belongs there rather than inside Route Search or a shared UI component.

## Decision

### Shared route workspace component

Extract the reusable map + ordered-stop presentation into a shared transit-route workspace component.

The component is presentation-only. It receives normalized route coordinates, ordered stops, selected-stop identity and copy through inputs and emits stop-selection / stop-detail intents through outputs. It must not fetch CTAN data, choose a direction or parse geometry.

It owns the responsive layout contract:

- wide layout: approximately 2fr/1fr map/stops split;
- the map surface and stops panel share one canonical workspace height, so their top and bottom edges match;
- the stops list scrolls inside its column when its content exceeds that shared height;
- mobile/constrained layout: one logical column; the map has a bounded mobile height and the stops list becomes naturally sized rather than forcing the desktop shared height.

Map-unavailable state remains inside the map column and must occupy the same wide-column height as a normal map so the paired columns still align.

### Canonical direction-specific route composition

Extend the line-route geometry/composition owner so callers can request a specific CTAN direction. Exact matching is preferred; if a requested direction is missing, use the documented primary-direction fallback rather than rendering an empty route silently.

For a direction-specific schedule disclosure, ordered stop coordinates are the preferred geometry because they are direction-specific. Official generic line geometry may be used only as a fallback when the selected direction does not provide enough valid coordinates.

Line Detail without an explicit direction keeps its existing primary-direction behavior and may prefer official CTAN geometry.

### Route Search departure disclosure

Each timetable result exposes a native expandable disclosure. Opening it lazily resolves the route using:

- consortium: current route-search selection origin consortium;
- line: `RouteSearchDepartureView.lineId` / `lineCode`;
- direction: `RouteSearchDepartureView.direction`;
- user-facing direction context: the departure destination.

The disclosure summary must make the relationship explicit, e.g. line code + direction/destination, and remain keyboard/screen-reader operable through native `details`/`summary` semantics.

Opening one disclosure must not eagerly fetch previews for every timetable row. Repeated departures with the same consortium + line + direction may share one loaded route state. Results from a previous route-search selection must never overwrite the new selection state.

Inside the disclosure, reuse the shared route workspace. Stop selection highlights the same map marker/list row and `More information` navigates through the existing consortium-aware Stop Detail navigation owner.

### Schedule timing boundary

This change does not fabricate per-stop passing times. The workspace may show ordered stops without a time value until the existing CTAN line-timetable mapper can prove a reliable stop-index/time association for the exact service. Per-stop times are a separate canonical-data enhancement, not a component-local estimate.

## Acceptance

- At desktop/wide breakpoints, route map height equals the stops-panel height within a 1 CSS px rendering tolerance.
- The equality holds for short and long stop lists; long lists scroll inside the stops panel rather than extending its paired column.
- Mobile retains one-column map-then-stops reading order with no forced desktop equal-height behavior and no horizontal overflow.
- Line Detail renders the shared route workspace rather than duplicating map/stops markup.
- Every Route Search timetable row has an expandable route affordance whose accessible summary identifies line and direction/destination.
- Expanding a row loads only that route preview on demand.
- The expanded route uses the row's canonical line id and direction.
- Different directions of the same line render their own ordered stop set.
- Missing requested direction falls back deterministically to the primary direction and remains usable.
- Closing/reopening an already loaded line+direction does not trigger unnecessary duplicate transport requests while the route-search selection is unchanged.
- Changing the route-search selection invalidates stale expanded-route state.
- Map/list selected-stop state remains synchronized and Stop Detail navigation remains consortium-aware.

## Tests

### Unit/domain

- exact direction selection;
- missing-direction primary fallback;
- direction-specific coordinate derivation;
- official-geometry fallback when selected stops have insufficient coordinates.

### Component

- reusable workspace emits selection/detail intents;
- map-unavailable state keeps stop list usable;
- Line Detail delegates workspace rendering to the shared component;
- Route Search disclosure stays lazy and passes consortium/line/direction correctly.

### Browser/layout

- desktop Line Detail map/stops height equality;
- desktop Route Search expanded preview map/stops height equality;
- mobile Line Detail and Route Search preview use one logical column;
- long stop list remains internally scrollable on wide layout;
- expanding a schedule for direction 0 vs direction 1 renders the matching ordered stops;
- no horizontal document overflow at 320, 390, 768 and 1440 widths where applicable.

## Risks

- CTAN direction values must be consumed as returned by the existing normalized stop/timetable contracts; do not translate numeric direction semantics with guessed labels.
- Generic official line polylines may represent both directions or a complete loop. They must not override valid direction-specific stop geometry in a timetable disclosure.
- Native `details` is preferred over custom accordion state because it preserves keyboard semantics and reduces interaction complexity; application state is needed only for lazy data loading and selected-stop synchronization.
- Leaflet must be invalidated/resized when a previously hidden disclosure becomes visible if required by rendering measurements; cover this with browser evidence instead of timer-based workarounds.

## Rollback

The shared workspace extraction is independently revertible because it does not change CTAN contracts. Route Search disclosure can be removed without affecting timetable calculation. Direction-selection helpers are additive and preserve current primary-direction behavior.

## Delivery

Continue on PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use atomic Conventional Commits. Do not merge, release or deploy without explicit approval.

## Status

Specification recorded. Implementation and exact-head validation pending.

# Transit discovery, stop utility and news follow-up

## Request

Address the browser issues reported against PR #36 on 2026-08-28:

- vertically align relative departure text with the primary departure time;
- make focused-line preview failures transient map feedback instead of inline panel content;
- eliminate duplicate/incorrect CTAN focused-line discovery and resolve lines from the actual nearby stop area;
- make line selection useful even when CTAN does not provide a usable line polyline;
- replace the separate Stop Information dead-end with customer-useful stop content in Stop Detail;
- provide real street-routing handoff to installed map applications instead of presenting straight-line distance as directions;
- make stop lines selectable and expose useful line information;
- replace broken external news links with an internal CTAN-backed news list/detail experience;
- keep Stop Detail progressive: do not render departures, lines and directions as three simultaneous long sections;
- keep controls next to the content they affect, especially the destination selector beside Upcoming Departures;
- redesign News filters so categories are not a horizontally scrolling chip rail; support useful area/category filtering, explicit ordering and pagination.

## Evidence

- `route-search.component-timeline.scss` aligns departure time and relative status on a text baseline, which is visibly offset at the current scale.
- `map.component.html` renders `focusedLinePreviewErrorKey()` as an inline error below the focused-line list, while focused-line discovery failures already use the map toast layer.
- `map.component.ts` first calls `GET /Consorcios/{id}/lineas?latitud&longitud` and falls back to a single nearest stop.
- `route-lines-api.service.ts` first requests `/Consorcios/{id}/lineasPorParadas/...` and only then retries the CTAN example path `/Consorcios/{id}/paradas/lineasPorParadas/...`, producing avoidable duplicate requests when the first path fails.
- `docs/api-reference.md` documents nearby stop metadata including zone, the stop-to-lines endpoint, line stops, line detail/polyline, news list/detail/category and line-specific news endpoints.
- `stop-info.component.ts` currently calculates a straight-line distance. The requested UX is actual street navigation and native map-app handoff.
- `news.component.html` currently opens snapshot-provided external links; CTAN exposes first-party list and detail APIs instead.
- the first CTAN news UI revision renders category choices as a horizontal scrolling rail; this does not scale to the real category set and hides filtering affordances.
- the canonical catalog already maps CTAN consortium ids to traveler-readable operating areas such as Área de Almería and Costa de Huelva. CTAN news payloads carry consortium identity but do not establish a direct news-to-nucleus relation.

## Decision

1. Keep one focused-line discovery owner in Map. Determine the nearest stop, constrain candidate stops to the same consortium and zone when available, take a bounded set of nearest stops, and query CTAN `paradas/lineasPorParadas` once.
2. Keep route-search overlays as route-search state, but remove duplicate manual route-search inspector affordance from Map; focused area lines remain the single manual line-discovery surface.
3. Use CTAN line detail polyline when available. If it is absent/invalid, derive a preview from ordered CTAN line stops rather than reporting a terminal error immediately.
4. Move preview failure feedback to the map toast layer with recovery affordance.
5. Fold stop utility into Stop Detail using a primary tabset for Departures, Lines and Directions. Only the active task surface is rendered. Keep old Stop Information URLs as compatibility navigation to Stop Detail rather than maintaining two customer surfaces.
6. Inside Departures, keep the destination filter in the Upcoming Departures header because it changes that list. Past departures remain a secondary timeline state rather than a separate unrelated page section.
7. Do not add an unreviewed routing SDK/provider. For street routing, hand the stop destination to native/universal map links with walking directions so the installed map provider computes the actual street route. Do not show straight-line distance as directions.
8. Add a first-party line detail surface backed by CTAN line detail + ordered stops, reachable from stop lines.
9. Replace the synthetic news feed link model with CTAN consortium news data and internal detail routing.
10. News filtering uses compact form controls rather than an overflow chip rail: operating area (derived from consortium identity), category and sort order. Almería/Huelva/etc. are presented as traveler-readable areas, not falsely described as CTAN nuclei. A true nucleus filter is deferred unless the API establishes an article-to-nucleus relationship.
11. News sorting is deterministic and user-selectable (newest first / oldest first). Filtering or sorting resets pagination to page 1. Pagination is bounded, keyboard-accessible and does not render the whole feed at once.

## Acceptance

- Relative departure labels are visually centered with their departure clock on mobile and desktop.
- Focused-line discovery performs one canonical stop-based CTAN request per settled area state and does not intentionally issue the old compatibility retry.
- Nearby-line discovery uses multiple nearby stops from the detected stop zone when possible and keeps consortium identity intact.
- Selecting a line renders official polyline geometry or a deterministic ordered-stop fallback; only a true unrecoverable preview failure produces a toast.
- The manual Map UI exposes one line-discovery concept rather than separate, ambiguous line panels.
- Stop Detail exposes a visible, accessible primary tabset for Departures, Lines and Directions; switching tabs hides unrelated sections instead of stacking them all vertically.
- The destination selector lives inside the Upcoming Departures surface and affects only the departure results shown there.
- Walking directions open a real map-routing target rather than displaying Euclidean distance.
- A stop line can be opened to an internal line detail view containing useful CTAN-backed information and ordered stops.
- News cards open an internal detail view. List/detail data come from CTAN endpoints, without broken external URLs.
- News offers compact Area, Category and Order controls without horizontal filter scrolling.
- Area choices use canonical consortium names such as Área de Almería and Costa de Huelva; the UI does not claim unsupported article-to-nucleus semantics.
- News pagination exposes a bounded page size, current-page context, Previous/Next actions and resets correctly when filters/order change.
- Existing deep links, loading/error/retry states, keyboard navigation, reduced motion and 390x844 / 1440x900 layout constraints remain supported.

## Checks

- Focused unit tests for route line API URL ownership, area selection, line geometry fallback, stop/line navigation, Stop Detail tab visibility/filter locality, news mapping/filtering/sorting/pagination and route configuration.
- `pnpm lint`
- `pnpm test -- --watch=false`
- production build / canonical CI scripts
- Playwright browser acceptance at 390x844 and 1440x900 for route timing, Map line discovery/toast, Stop Detail tabs/actions, line detail and news list/detail/filter/pagination.
- Inspect exact-head visual evidence before completion.

## Delivery

Continue on PR #36 and `codex/refactorizar-vista-segun-diseno-proporcionado`. Use atomic Conventional Commits. Do not merge, release or deploy without explicit approval.

## Status

In progress.

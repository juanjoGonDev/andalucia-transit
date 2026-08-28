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
- replace broken external news links with an internal CTAN-backed news list/detail experience and useful category filtering.

## Evidence

- `route-search.component-timeline.scss` aligns departure time and relative status on a text baseline, which is visibly offset at the current scale.
- `map.component.html` renders `focusedLinePreviewErrorKey()` as an inline error below the focused-line list, while focused-line discovery failures already use the map toast layer.
- `map.component.ts` first calls `GET /Consorcios/{id}/lineas?latitud&longitud` and falls back to a single nearest stop.
- `route-lines-api.service.ts` first requests `/Consorcios/{id}/lineasPorParadas/...` and only then retries the CTAN example path `/Consorcios/{id}/paradas/lineasPorParadas/...`, producing avoidable duplicate requests when the first path fails.
- `docs/api-reference.md` documents nearby stop metadata including zone, the stop-to-lines endpoint, line stops, line detail/polyline, news list/detail/category and line-specific news endpoints.
- `stop-info.component.ts` currently calculates a straight-line distance. The requested UX is actual street navigation and native map-app handoff.
- `news.component.html` currently opens snapshot-provided external links; CTAN exposes first-party list and detail APIs instead.

## Decision

1. Keep one focused-line discovery owner in Map. Determine the nearest stop, constrain candidate stops to the same consortium and zone when available, take a bounded set of nearest stops, and query CTAN `paradas/lineasPorParadas` once.
2. Keep route-search overlays as route-search state, but remove duplicate manual route-search inspector affordance from Map; focused area lines remain the single manual line-discovery surface.
3. Use CTAN line detail polyline when available. If it is absent/invalid, derive a preview from ordered CTAN line stops rather than reporting a terminal error immediately.
4. Move preview failure feedback to the map toast layer with recovery affordance.
5. Fold stop utility into Stop Detail with progressive sections/tabs: departures, lines and directions. Show only traveler-relevant stop context. Keep old Stop Information URLs as compatibility navigation to Stop Detail rather than maintaining two customer surfaces.
6. Do not add an unreviewed routing SDK/provider. For street routing, hand the stop destination to native/universal map links with walking directions so the installed map provider computes the actual street route. Do not show straight-line distance as directions.
7. Add a first-party line detail surface backed by CTAN line detail + ordered stops, reachable from stop lines.
8. Replace the synthetic news feed link model with CTAN consortium news data and internal detail routing. Support category filtering from CTAN category metadata. Do not infer nucleus association unless CTAN data explicitly supports it.

## Acceptance

- Relative departure labels are visually centered with their departure clock on mobile and desktop.
- Focused-line discovery performs one canonical stop-based CTAN request per settled area state and does not intentionally issue the old compatibility retry.
- Nearby-line discovery uses multiple nearby stops from the detected stop zone when possible and keeps consortium identity intact.
- Selecting a line renders official polyline geometry or a deterministic ordered-stop fallback; only a true unrecoverable preview failure produces a toast.
- The manual Map UI exposes one line-discovery concept rather than separate, ambiguous line panels.
- Stop Detail exposes useful lines and directions without raw coordinates/internal identifiers dominating the UI.
- Walking directions open a real map-routing target rather than displaying Euclidean distance.
- A stop line can be opened to an internal line detail view containing useful CTAN-backed information and ordered stops.
- News cards open an internal detail view. List/detail data come from CTAN endpoints, and category filtering is usable without broken external URLs.
- Existing deep links, loading/error/retry states, keyboard navigation, reduced motion and 390x844 / 1440x900 layout constraints remain supported.

## Checks

- Focused unit tests for route line API URL ownership, area selection, line geometry fallback, stop/line navigation, news mapping/filtering and route configuration.
- `pnpm lint`
- `pnpm test -- --watch=false`
- production build / canonical CI scripts
- Playwright browser acceptance at 390x844 and 1440x900 for route timing, Map line discovery/toast, Stop Detail tabs/actions, line detail and news list/detail.
- Inspect exact-head visual evidence before completion.

## Delivery

Continue on PR #36 and `codex/refactorizar-vista-segun-diseno-proporcionado`. Use atomic Conventional Commits. Do not merge, release or deploy without explicit approval.

## Status

In progress.

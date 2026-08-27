# Minimal UI cleanup and viewport-driven map

## Request
- Remove redundant information from route-search departure rows so the shared origin/destination context is not repeated per service.
- Give arrival time clearer visual priority and group each departure for rapid scanning.
- Apply the same minimal, non-redundant information hierarchy across routed views.
- Continue the pending map, navigation, stop-detail, stop-info, responsive and visual-evidence work on PR #36.

## Evidence
- Manual screenshot at 960×776 shows the route summary already owns origin, destination and travel date while each service repeats the destination, consuming the space that should prioritize departure/arrival timing.
- `RouteSearchDepartureView.destination` is derived from the selected destination and timetable notes; the page-level route summary already provides the canonical origin/destination context.
- `StopDetailComponent` repeats the stop code in both the leading tag and metadata grid.
- `StopInfoComponent` exposes internal stop number/code and raw coordinates as primary metadata although the traveler-facing name, municipality/nucleus/zone and line correspondences are more useful.
- `MapComponent` currently recalculates the nearby-stop panel only from geolocation; viewport settlement updates focused lines but not the nearby-stop cards.

## Decision
- Keep route context at the route-search summary owner. Departure cards show only service-specific data: departure time, relative status, arrival time, duration, line and exceptional-service/accessibility badges.
- Use one card geometry and token-driven state treatment; `previous` and `next` are semantic states, not separate visual themes.
- Remove duplicated/technical metadata from default stop surfaces while preserving canonical identifiers in routing/domain state.
- Treat the settled map center as the SSOT for exploratory nearby stops and focused lines. Geolocation remains the SSOT only for the user's physical position.
- Prefer omission and progressive disclosure over adding tabs, labels or containers without a clear user task.

## Acceptance
- Route-search rows do not repeat selected origin/destination names and make arrival time visually scannable.
- Route-search retains enough context to understand the selected journey and date without reading individual service rows.
- Stop detail does not repeat the stop code in the visible metadata grid.
- Stop info defaults to traveler-relevant location/service information and hides raw technical identifiers/coordinates from the primary surface.
- Moving the map refreshes nearby-stop cards from the settled viewport; stale async results cannot overwrite a newer viewport result.
- Map popup close target is at least 44×44 CSS px and remains visually separated from popup content.
- Floating shell navigation does not cover page content at supported mobile/desktop viewports.
- Spanish and English strings remain complete; keyboard/focus/ARIA semantics are preserved.

## Checks
- `pnpm exec prettier --check` for touched files.
- `pnpm run lint`.
- `pnpm run test:angular` / affected unit coverage.
- `pnpm run build`.
- Playwright acceptance at 390×844 and 1440×900 for route search, map, stop detail and stop info.
- PR visual evidence from the exact final head SHA.

## Delivery
- Same open PR #36 and existing branch `codex/refactorizar-vista-segun-diseno-proporcionado`.
- Atomic commits; no merge, release, deployment or force-push.

## Status
In progress.

# UI async feedback audit

## Request

Review the rendered UI in depth and apply the repository UI/UX principles to asynchronous product flows. Prioritize route timetable search, then audit other touched surfaces with network, geolocation, refresh, or deferred data. Publish deterministic mobile and desktop screenshots only after the final CI head is green.

## Evidence

- `RouteSearchComponent` subscribes directly to `RouteSearchResultsService.loadResults()` without an explicit loading/error state. While a request is pending, the template can render the empty-result branch, which communicates a false result.
- `RouteSearchFormComponent.submit()` performs asynchronous connection resolution without a pending guard or visible progress and can accept duplicate submissions.
- Route-search geolocation disables the origin-location action while pending but exposes no visible status and silently drops errors.
- `StopDetailComponent` models loading/error/success but loading is a static hourglass state and errors have no in-context retry action.
- `NewsFacade` exposes only article values, so initial load, refresh, stale-data fallback, and terminal error are indistinguishable to the UI.
- `MapComponent` models location and route loading but feedback is mostly text-only; the map panel can become visually blank while geolocation is active.
- Recent-search preview skeletons animate indefinitely without a `prefers-reduced-motion` fallback.
- Shared styles already own common buttons, fields, focus treatment, surfaces, tokens, and accessibility primitives; new feedback styling should extend this system instead of adding a dependency.

## Decision

1. Keep domain/API logic authoritative and add presentation state at feature/facade boundaries.
2. Add one shared visual loading primitive in the existing shared stylesheet rather than introducing a new component library.
3. Use skeletons only where they preserve a meaningful content footprint during non-trivial initial loads; otherwise use compact progress feedback.
4. Preserve already-rendered data during refresh when it remains valid, mark the surface busy, and distinguish stale data after a failed refresh.
5. Cancel superseded asynchronous work with existing `switchMap` flows and guard promise-based actions against duplicate execution.
6. Add retry paths for recoverable failures without discarding the user selection.
7. Respect `prefers-reduced-motion`; non-essential continuous shimmer/rotation must stop or become static when requested.
8. Keep mobile-first layout, 44px-class touch targets where applicable, visible focus, stable control width while busy, and polite live-region announcements for loading/success changes.
9. Do not add a new dependency. Reuse existing tokens, Material Symbols, AccessibleButtonDirective, RxJS, signals, Cypress/Playwright, and the PR visual-evidence workflow.

## Scope

- Route search results and route-search form.
- Stop detail schedule loading/retry.
- News initial load/refresh/stale/error states.
- Map location and route-loading feedback.
- Stop information refresh/loading affordance where directly related.
- Recent-search loading motion accessibility.
- Shared UI motion/loading primitives and translations required by these states.

Out of scope: backend/API contract changes, unrelated page redesigns, dependency upgrades, deployment changes, and broad visual identity changes.

## Risks

- Incorrect state ordering could briefly show empty/error content before loading.
- Refresh state must not discard valid stale content.
- Busy guards must not leave controls disabled after errors.
- Continuous progress indicators can violate reduced-motion expectations if not explicitly gated.
- New translations/config keys must remain synchronized in Spanish and English.

## Acceptance

- Route search never renders a false empty result while timetable data is pending.
- Route search exposes loading, success/empty, recoverable error, and retry states.
- Search submission and geolocation actions prevent duplicate execution and communicate pending state without layout shift.
- Stop-detail schedule errors can be retried in context while preserving the selected stop.
- News distinguishes initial loading, background refresh, stale content after refresh failure, empty, ready, and unrecoverable error.
- Map shows visible, accessible feedback while locating and while loading route overlays; retry actions remain available after recoverable errors.
- Existing recent-search skeleton motion honors reduced-motion preference.
- Busy controls retain stable dimensions and accessible names.
- Loading/status feedback is not conveyed by color alone and has appropriate live-region semantics.
- Mobile 390x844 and desktop 1440x900 deterministic screenshots are published from the exact final green head.
- No secrets, binaries, or generated screenshots are committed.

## Checks

- Focused unit tests for new state transitions, retry, duplicate-submit guards, and geolocation classification.
- Existing Angular/unit suite.
- Lint and build.
- Existing deploy validation included by CI.
- PR visual-evidence workflow after CI is green.

## Rollback

All changes are presentation-state and styling changes on the existing branch. Revert the focused commits if a regression is found; no persistent data or API migration is involved.

## Delivery

Implement as atomic commits: shared motion/state primitives and tests, route-search UX, stop/news/map async feedback, then CI fixes if any. Publish screenshots only from the final green head.

## Status

In progress.

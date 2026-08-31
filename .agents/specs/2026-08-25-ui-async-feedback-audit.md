# UI async feedback audit

## Request

Review the rendered UI in depth and apply the repository UI/UX principles to asynchronous product flows. Prioritize route timetable search, then audit other touched surfaces with network, geolocation, refresh, or deferred data. Publish deterministic mobile and desktop screenshots only after the final CI head is green.

## Evidence

- `RouteSearchComponent` previously subscribed directly to `RouteSearchResultsService.loadResults()` without an explicit loading/error state, so the template could render the empty-result branch while a request was still pending.
- `RouteSearchFormComponent.submit()` previously performed asynchronous connection resolution without a pending guard or visible progress and accepted duplicate activations.
- Route-search geolocation previously disabled the origin-location action while pending but exposed no visible status and silently discarded failures.
- `StopDetailComponent` modeled loading/error/success but used a static loading affordance and lacked an in-context retry path.
- `NewsFacade` previously exposed only article values, so initial load, refresh, stale-data fallback, and terminal error were indistinguishable to the UI.
- `MapComponent` modeled location and route loading but used mostly text-only feedback and duplicated geolocation error classification.
- `StopInfoFacade` already exposed loading fallback data, but the component hid that useful content during refresh and allowed duplicate refresh actions.
- Recent-search preview skeletons animated indefinitely without a `prefers-reduced-motion` fallback.
- Shared styles already owned common buttons, fields, focus treatment, surfaces, tokens, and accessibility primitives, so no additional UI dependency was required.

## Decision

1. Keep domain/API logic authoritative and model presentation state at feature/facade boundaries.
2. Use one shared async visual language in `src/styles/_async-feedback.scss` for spinner, skeleton, status, reveal, and reduced-motion behavior.
3. Use skeletons only where they preserve a meaningful content footprint during initial loads; use compact progress feedback for short actions.
4. Preserve already-rendered valid data during refresh and communicate that the surface is busy instead of blanking it.
5. Keep no-result and operational-error states distinct so network failures never instruct the user to change valid search filters.
6. Cancel superseded observable work through existing `switchMap` flows and guard promise-based actions against duplicate execution.
7. Add local retry paths for recoverable failures without discarding route, stop, or page context.
8. Respect `prefers-reduced-motion`; continuous shimmer/rotation and non-essential reveal motion become static when requested.
9. Keep mobile-first layout, stable busy-control dimensions, visible focus, meaningful live regions, and feedback that is not color-only.
10. Reuse existing tokens, Material Symbols, `AccessibleButtonDirective`, RxJS, signals, and the existing visual-evidence workflow; add no dependency.
11. Keep the branch's existing visual identity and desktop content proportions; do not broaden this fix into an unrelated brand/layout redesign.

## Scope

- Route search results and route-search form.
- Stop detail schedule loading/retry.
- News initial load/refresh/stale/error states.
- Map geolocation and route-overlay feedback.
- Stop information refresh/loading feedback.
- Recent-search loading motion accessibility.
- Shared UI motion/loading primitives and translations required by these states.

Out of scope: backend/API contract changes, unrelated page redesigns, dependency upgrades, deployment changes, and broad visual identity changes.

## Risks

- Incorrect state ordering could briefly show empty/error content before loading.
- Refresh state must not discard valid stale/fallback content.
- Busy guards must always reset after success and failure.
- Continuous progress indicators must honor reduced-motion preferences.
- Translation/config keys must remain synchronized in Spanish and English.
- The branch currently contains a separate Node runtime metadata inconsistency (`volta.node` 22.13.0 while `engines` and workflows remain on Node 20); this is not caused by the UI audit and is intentionally not mixed into this UX change.

## Acceptance

- [x] Route search never renders a false empty result while timetable data is pending.
- [x] Route search exposes loading, success/empty, recoverable error, and retry states.
- [x] Search submission and geolocation actions prevent duplicate execution and communicate pending state without layout shift.
- [x] Stop-detail schedule errors can be retried in context while preserving the selected stop.
- [x] News distinguishes initial loading, background refresh, stale content after refresh failure, empty, ready, and unrecoverable error.
- [x] Map shows visible, accessible feedback while locating and while loading route overlays; recoverable errors expose local retry actions.
- [x] Stop information preserves fallback content during refresh, blocks duplicate refresh, and exposes recovery actions.
- [x] Existing recent-search skeleton motion honors reduced-motion preference.
- [x] Busy controls retain stable dimensions and accessible names.
- [x] Loading/status feedback is not conveyed by color alone and uses appropriate live-region semantics.
- [x] Deterministic mobile 390x844 and desktop 1440x900 screenshots are produced by the existing PR visual-evidence workflow.
- [x] No generated screenshots, secrets, or new dependencies are committed.

## Implementation

- `refactor(geolocation): centralize failure classification` creates one canonical classifier shared by route search and map.
- `feat(ui): add async feedback primitives` adds shared spinner, skeleton, status, reveal, and reduced-motion behavior.
- `fix(route-search): model timetable loading states` separates pending/error/ready results and adds retry without false empty content.
- `fix(route-search): prevent duplicate async actions` guards route resolution and geolocation actions and surfaces connection/location failures.
- `feat(news): preserve content through async refresh` models loading/refreshing/ready/stale/error while retaining valid articles.
- Stop detail uses the shared loading language and an in-context schedule retry.
- `feat(map): surface async location feedback` adds visible canvas/panel progress, route refresh feedback, retry, and canonical geolocation errors.
- `feat(stop-info): improve async refresh feedback` preserves fallback details during refresh and adds busy/retry feedback.
- `fix(a11y): respect reduced motion in previews` makes the legacy recent-search shimmer static under reduced motion.
- `test(route-search): type duplicate submit deferred` fixes the strict test harness without weakening TypeScript settings.

## Checks

Implementation head `86778ac33e6096961b752b6d3a18e133d4b95741` was validated before this documentation closeout:

- CI run `32903435196`: success.
  - Install dependencies: success.
  - Test scripts: success.
  - Lint: success.
  - Test angular: success.
  - Deploy pipeline: success.
  - `Check all ok`: success.
- Visual-evidence run `32903435284`: success.
  - UI quality gates: success.
  - deterministic mock application start: success.
  - Home mobile-tab layout check: success.
  - canonical screenshot capture: success.
  - immutable-head verification: success.
  - artifact publication: success.
  - temporary release and PR visual-evidence comment publication: success.
- Visual artifact: `pr-36-visual-evidence-86778ac33e6096961b752b6d3a18e133d4b95741`, 10 PNG files, Actions digest `sha256:3c56858626a7ca29e681868c75bd59ddc3a6fb20ce676cf6057af65270b37389`.
- Manual evidence inspection: no horizontal overflow, clipped primary actions, overlapping controls, or broken hierarchy was observed in the canonical 390px and 1440px stable-state screenshots.
- The final documentation head must pass the same CI and visual-evidence workflows before delivery is reported complete.

## Rollback

All changes are presentation-state, tests, translations, and styling changes on the existing branch. Revert the focused commits if a regression is found; no persistent data, API contract, or database migration is involved.

## Delivery

Changes were delivered as focused commits on the existing PR branch with fast-forward updates only. No force-push, PR merge, release, deployment, dependency addition, or generated screenshot commit is part of this work. Visual media remains temporary workflow evidence.

## Status

Implementation complete. Delivery is complete only when the CI and visual-evidence workflows for this documentation closeout head are green.

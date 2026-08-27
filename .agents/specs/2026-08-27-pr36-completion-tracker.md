# PR #36 completion tracker

## Purpose

This file is the single completion index for the user-requested work accumulated in PR #36. It prevents requirements from being lost while keeping the detailed decision/evidence owners in their existing task specs. If this tracker and a linked task spec disagree on implementation detail, the linked task spec remains authoritative; this tracker owns only completion state and cross-task delivery gates.

## Source specs

- `.agents/specs/2026-08-25-home-mobile-tabs.md`
- `.agents/specs/2026-08-25-ui-async-feedback-audit.md`
- `.agents/specs/2026-08-25-pr-visual-evidence.md`
- `.agents/specs/2026-08-25-pr-36-main-sync.md`
- `.agents/specs/2026-08-26-immersive-transit-navigation.md`
- `.agents/specs/2026-08-26-map-all-stops-navigation.md`
- `.agents/specs/2026-08-26-map-stop-identity.md`
- `.agents/specs/2026-08-26-map-workspace-redesign.md`
- `.agents/specs/2026-08-26-shell-quick-navigation.md`
- `.agents/specs/2026-08-26-visual-state-audit.md`
- `.agents/specs/2026-08-27-minimal-ui-cleanup.md`
- `.agents/specs/2026-08-27-stop-information-redesign.md`

## Requested product work

### Home and global navigation

- [x] Redesign the Home surface around the shared responsive layout instead of isolated page chrome.
- [x] Keep Search, Recents and Favorites as accessible Home tabs with route/query persistence and focus restoration.
- [x] Keep global navigation owned by the shared shell rather than duplicated inside routed pages.
- [x] Float the primary navigation centered at the bottom on both mobile and desktop.
- [x] Keep Home, Route Search, Map and Favorites as persistent quick actions and expose secondary destinations progressively from More.
- [x] Make the More trigger and secondary entries use pointer/hover/focus affordances and section icons.
- [x] Open the bottom-shell secondary surface upward, constrain its height/width to the viewport and respect safe areas instead of expanding below the screen.
- [x] Provide persistent primary navigation and progressive access to secondary destinations with keyboard/focus support and minimum touch targets.
- [x] Prevent shell navigation and its overflow surface from covering routed content on supported mobile and desktop viewports.
- [ ] Re-run exact-head browser regression for Home/shell after the final PR head is known.

### Async UX and recovery

- [x] Distinguish loading, ready, empty and error states instead of showing false empty states while requests are pending.
- [x] Preserve valid content during refresh where appropriate.
- [x] Prevent duplicate async actions and provide retry/recovery paths.
- [x] Keep geolocation error classification shared rather than reimplemented per feature.
- [x] Keep recoverable focused-line discovery failure as a themed map toast with retry instead of replacing the focused-line inspector content with an inline terminal error.
- [ ] Re-run exact-head regression for async/error/retry surfaces after the final PR head is known.

### Route search / schedules

- [x] Remove repeated origin/destination context from individual departure rows when the route summary already owns it.
- [x] Give departure and arrival times the strongest scan hierarchy, with duration and line metadata secondary.
- [x] Use the same structural card pattern for previous and next departures, with explicit Previous/Next indicators rather than separate layouts.
- [x] Keep previous/next state treatment tied to existing design tokens instead of unrelated saturated palettes or color-only meaning.
- [x] Keep customer-useful route metadata while removing redundant row-level context.
- [ ] Re-run final route-search browser/visual checks at 390x844 and 1440x900.

### Map

- [x] Use an immersive map workspace with progressive search and inspector surfaces.
- [x] Make map search icon-first: initial state is only the search action; activating it reveals the input, moves focus into it and supports closing/restoring the compact state.
- [x] Keep map search usable without breaking the map layout on mobile.
- [x] Start map inspector sections closed/hidden by default and expose them through section-icon controls rather than a permanently competing right panel.
- [x] Load the network stop set and keep marker identity consortium-aware.
- [x] Let stop search focus the matching real map marker and expose a popup action to stop detail.
- [x] Refresh nearby-stop cards from the settled viewport rather than only from the user's geolocation, including the La Gangosa regression that previously retained Sevilla results.
- [x] Drive viewport refresh from `moveend`/settled center with debounce and cancel stale viewport-driven async results.
- [x] Resolve the focused consortium from the nearest canonical network stop and discover CTAN lines around the visible map center.
- [x] Recover focused-area line discovery through the canonical CTAN stop-line endpoint when the geographic endpoint fails.
- [x] Keep focused-line cards on the inspector's light surface with primary/secondary text contrast based on design tokens.
- [x] Selecting a focused line loads official CTAN line detail geometry, renders only real `polilinea` coordinates and fits the map to that geometry.
- [x] Preserve the usable map while focused-line discovery is loading, empty or recoverably failed.
- [x] Make the popup close target at least 44x44 CSS px and fix its alignment/contrast/focus/hover affordance.
- [x] Verify the popup close affordance in-browser for visible glyph, pointer cursor, focus, minimum target and actual dismissal.
- [x] Consolidate Map stop-detail navigation through the shared `buildStopDetailNavigation` owner instead of constructing equivalent commands/query params locally.
- [ ] Re-run final mobile/desktop map exploration, focused-line and responsive acceptance on the exact final head.

### Stop identity and navigation

- [x] Preserve `consortiumId + stopId` as the canonical composite identity where local stop identifiers can collide.
- [x] Carry consortium context from Map into Stop Detail.
- [x] Resolve Stop Detail schedule/metadata by composite signature when consortium context exists, with legacy lookup only where unambiguous/compatible.
- [x] Preserve consortium identity from Favorites/Home Favorites into Stop Detail.
- [x] Route Map stop-detail entry points through the shared navigation builder and retain consortium-aware regression coverage.
- [x] Avoid using display name, district/nucleus or other ambiguous presentation data as stop identity.

### Stop Detail

- [x] Keep live departures owned by Stop Detail/Stop Schedule rather than duplicating schedule logic elsewhere.
- [x] Remove redundant stop metadata from the visible hierarchy and keep technical stop identifiers from dominating the customer-facing design.
- [x] Preserve loading/error/retry and live-region behavior.
- [x] Preserve freshness/provider context when it helps the traveler understand schedule validity rather than removing operationally useful information for minimalism.
- [ ] Re-run final Stop Detail visual/browser checks at 390x844 and 1440x900.

### Stop Information

- [x] Replace technical-first metadata with customer-readable stop name, municipality/nucleus, zone, notes and line correspondences.
- [x] Keep raw coordinates and internal identifiers out of the primary surface.
- [x] Present correspondences as scannable UI rather than raw technical text.
- [x] Keep the short information set stacked instead of adding tabs that would increase interaction cost without reducing cognitive load.
- [x] Preserve live/offline fallback and refresh behavior from `StopInfoFacade`.
- [x] Add an explicit `How to get there` area without inventing street routing.
- [x] Request geolocation only after explicit user action.
- [x] Calculate only an approximate straight-line distance using the existing canonical geo-distance logic.
- [x] State explicitly that the result is not a pedestrian street route or navigation instruction.
- [x] Reset/ignore stale location requests when the selected stop identity changes.
- [x] Centralize Stop Info direction and geolocation error keys under `APP_CONFIG.translationKeys.stopInfo.directions`.
- [x] Cover single-flight location requests and stale async completion after route identity changes.
- [x] Exercise Stop Information approximate-distance acceptance at 390x844 and 1440x900 through the canonical interaction visual suite, including generated evidence captures when the evidence workflow runs.

### Popovers, labels and accessibility semantics

- [x] Remove native `title` tooltip attributes from the affected application UI; repository code search finds no `title=` or `[title]` attributes under `src/app` at this checkpoint.
- [x] Use application-owned progressive surfaces/labels for customizable interaction feedback instead of browser-native tooltip chrome where the affected controls need visible help.
- [x] Preserve semantic image alternative text and ARIA labels; the request to replace native tooltip behavior must not remove accessibility `alt`/label content.
- [x] Do not disable pinch-to-zoom or browser zoom.

### Minimal information cleanup

- [x] Apply the rule “stable context once; repeated items show only what changes; technical data only when it serves a user task” to the touched route, map, Stop Detail and Stop Information surfaces.
- [x] Keep design-token color/spacing hierarchy instead of introducing isolated hard-coded visual systems.
- [x] Retain legal, provider, freshness, status and recovery information when it remains operationally useful.

### Responsive, accessibility and visual evidence

- [x] Keep minimum 44px interactive targets where required.
- [x] Preserve keyboard access, visible focus, ARIA/live-region semantics and reduced-motion behavior.
- [x] Keep progressive disclosure usable instead of restoring stale permanently-expanded test assumptions.
- [x] Keep generated screenshot evidence outside git and tied to an immutable PR head SHA.
- [x] Generate Stop Information approximate-distance screenshots at 390x844 and 1440x900 from the canonical interaction visual suite.
- [ ] Publish and inspect exact-final-head visual evidence for all affected surfaces after the remaining documentation commit settles.

## Delivery gates

- [x] Continue on existing PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado`.
- [x] Use atomic Conventional Commits for remaining changes.
- [x] Incorporate `main@6393d30f18e382d6de2d234bb1205e9b97e33a13` transport snapshots without dropping PR-owned data or implementation work.
- [ ] Run required CI on the exact resulting final head and fix branch-caused failures until green.
- [ ] Run exact-head PR visual evidence and inspect the affected mobile/desktop captures.
- [ ] Update the PR body so its implementation/validation SHA and workflow evidence match the real final head.
- [x] Confirm no unresolved actionable review threads or submitted reviews remain at the latest review audit.
- [x] Leave the PR open and unmerged; do not release or deploy without explicit approval.

## Explicitly deferred / not part of this completion pass

- Exact pedestrian street routing remains deferred until a real routing provider is separately reviewed for architecture, dependency identity, security, licensing, availability and failure/offline behavior.
- The existing Node version mismatch (`volta.node` versus the repository's Node 20 workflow/engine policy) is a separate toolchain task unless it becomes a direct blocker for this PR.

## Current state

The accumulated PR #36 requirements are explicitly represented above so later sessions do not need to reconstruct them from conversation history. Implementation work covers the bottom floating navigation, upward progressive secondary navigation, icon-first map search, hidden map inspectors, viewport-driven nearby stops and focused lines, CTAN recovery and official geometry, toast/error treatment, popup close affordance, canonical stop navigation, route-result information cleanup, Stop Information redesign, approximate-distance guidance, concurrency regressions and mobile/desktop interaction evidence. `main@6393d30f` is incorporated through merge commit `b2a16d677c23045a274cf1e82dbf422770382bd8`, and the branch comparison is `behind_by = 0`. Remaining gates are exact-head CI, exact-head visual/browser evidence after this tracker update, inspection of the resulting evidence, and refresh of the pull request description with the final SHA and run identifiers.

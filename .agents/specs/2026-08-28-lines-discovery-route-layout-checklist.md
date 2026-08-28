# Lines discovery and route-layout execution ledger

Companion execution ledger for `.agents/specs/2026-08-28-lines-discovery-route-layout.md`.

## Tracking rules

- Mark an item complete only with observable repository, test, workflow or screenshot evidence.
- Keep unsupported product claims blocked rather than inferred.
- Do not auto-accept visual baselines.
- Preserve unrelated PR work; no force-push.
- Do not merge, release or deploy without explicit approval.

## Implemented

### Navigation and Lines semantics

- [x] Dedicated Lines route exists separately from Route Search.
- [x] Persistent Lines navigation opens the Lines directory.
- [x] Lines navigation uses Lines-specific visible/accessibility copy.
- [x] Route Search remains directly addressable as a separate planner task.
- [x] Hard-coded C2 sample journey is removed from Route Search empty-state behavior.

### Lines directory

- [x] Canonical line records are consumed through the line-directory owner.
- [x] Line code/name query is implemented.
- [x] Transport-area/consortium filter is implemented.
- [x] Municipality filter is implemented.
- [x] Nucleus filter is implemented.
- [x] Explicit Near me geolocation action is implemented.
- [x] Non-location filters remain independent of geolocation permission.
- [x] Bounded pagination is implemented.
- [x] Applicable filter/page state is URL-backed.
- [x] Line rows are native navigational targets to Line Detail.
- [x] Desktop line-card layout preserves readable line names after manual screenshot review found and reproduced the previous squeeze regression.

### Province semantics

- [x] Catalog/stop contracts were audited for province availability.
- [x] No authoritative province field/mapping was found in the current canonical contracts.
- [x] Province filter is therefore not shipped using guessed display-name mappings.
- [ ] Add province filter only after an authoritative source is identified, documented and tested. **Blocked by source data.**

### Shared route map and Line Detail

- [x] Line Detail uses the shared route-map presentation component.
- [x] Existing canonical geometry/stop-identity ownership is reused rather than duplicated.
- [x] Official route geometry and ordered-stop fallback remain behind the shared geometry contract.
- [x] Ordered clickable stops are rendered alongside the map.
- [x] Stop-list selection and canvas marker highlight share selected-stop state.
- [x] Stop Detail navigation remains consortium-aware.
- [x] Wide layout uses map-first approximately 2:1 workspace.
- [x] Mobile/constrained layout uses one logical column.
- [x] More information remains a separate accessible action.
- [x] Wide stop actions are stacked so the action cannot squeeze stop names into unreadable columns.
- [x] Map-unavailable behavior retains the stop-list path through the existing fallback/error contract.

### Route Search

- [x] Sticky form/workspace owns active search context.
- [x] Redundant origin/destination/date summary between form and timetable is removed.
- [x] Departure and arrival clocks retain stable columns.
- [x] Clock values use tabular numerals.
- [x] Arrival presentation is compact enough to avoid the previous narrow-screen hierarchy failure.

### Recent previews

- [x] Mobile preview time remains end-aligned instead of switching to start alignment.
- [x] Time uses tabular numerals.

## Automated validation

### Layout/browser coverage

- [x] Lines deterministic browser coverage includes 320×568, 390×844 and 1440×900.
- [x] Line Detail deterministic browser coverage includes 390×844, 768×1024 and 1440×900.
- [x] No-horizontal-document-overflow assertions protect affected Lines/Line Detail flows.
- [x] Desktop Lines assertion protects primary line-name allocation.
- [x] Desktop Line Detail assertion protects stop-selection allocation and stacked More information action.
- [x] Mobile Line Detail assertion protects one-column map-before-stops ordering.
- [x] Map/list selection browser test exercises the Leaflet Canvas renderer contract.
- [x] Deterministic OSM tile replacement prevents remote tile variance from dominating acceptance evidence.

### Exact product-head evidence

Validated product head: `9a23a73b7753ab61fb20f814b140f693323bda62`.

- [x] CI #1095 / run `33194039906` succeeded.
- [x] Install dependencies succeeded.
- [x] Lint succeeded.
- [x] Script tests succeeded.
- [x] Angular tests succeeded.
- [x] Deploy-pipeline checks succeeded.
- [x] Final aggregate CI check succeeded.
- [x] Publish PR visual evidence #704 / run `33194039880` succeeded.
- [x] Deterministic populated responsive/accessibility checks succeeded.
- [x] Populated screenshot capture succeeded.
- [x] Deterministic empty-state checks succeeded.
- [x] Empty screenshot capture succeeded.
- [x] Immutable-head verification succeeded.
- [x] Evidence artifact publication succeeded.
- [x] Artifact `pr-36-visual-evidence-9a23a73b7753ab61fb20f814b140f693323bda62`, id `9695064573`, digest `sha256:d891e7806e99c8c97590c1029e7287c6e285d40481ec518ccb8593033e2c0367` was retrieved.
- [x] Final desktop Lines screenshot manually inspected: previous character-column regression absent.
- [x] Final desktop Line Detail screenshot manually inspected: stop names readable and More information separated below the selection row.
- [x] Final mobile Lines screenshot manually inspected.
- [x] Final mobile Line Detail screenshot manually inspected.

## Visual regression architecture

- [x] Exact-head reviewer-facing screenshots are deterministic and published as artifacts.
- [x] Critical geometry/layout invariants are blocking browser assertions.
- [ ] Introduce a trustworthy reviewed-baseline pixel-diff gate that does not self-seed expected images on clean CI checkouts.

Current decision: use an immutable approved commit SHA as the baseline candidate, render `expected` from that commit and `actual` from the PR head, compare them, retain expected/actual/diff artifacts and change the baseline SHA only after reviewed approval.

**Status:** blocked pending explicit approval because this is a material CI architecture change. Do not implement it silently and do not treat a self-seeded `0 diff` result as regression evidence.

## Documentation and delivery

- [x] Main follow-up specification updated from stale “implementation not started” status to observed implementation/validation state.
- [x] This checklist consolidated into an evidence ledger rather than leaving completed work as unchecked pending tasks.
- [ ] Update PR body with the final follow-up scope and validation evidence after this documentation commit obtains exact-head workflow results.
- [ ] Confirm the documentation head CI and PR visual-evidence workflows are green.
- [ ] Merge PR #36. **Requires explicit user approval; not authorized.**
- [ ] Release/deploy. **Requires explicit user approval; not authorized.**

## Remaining blockers

1. **Province filter:** authoritative province mapping is not present in the audited canonical source contracts.
2. **Reviewed-baseline pixel diff:** architecture is defined, but implementation requires explicit approval for the CI design change.
3. **Merge/release/deploy:** intentionally not performed without approval.

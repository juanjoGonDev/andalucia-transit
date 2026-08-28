# Lines discovery and route-layout execution ledger

Companion execution ledger for `.agents/specs/2026-08-28-lines-discovery-route-layout.md` and `.agents/specs/2026-08-28-route-workspace-schedule-disclosure.md`.

## Tracking rules

- Mark an item complete only with observable repository, test, workflow or screenshot evidence.
- Keep unsupported product claims blocked rather than inferred.
- Do not auto-accept visual baselines.
- Preserve unrelated PR work; no force-push.
- Do not merge, release or deploy without explicit approval.
- Keep final documentation-head workflow IDs in the PR body rather than creating an endless documentation-only validation chain.

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
- [x] Desktop line-card layout preserves readable line names after the prior squeeze regression was reproduced and covered.

### Province semantics

- [x] Catalog/stop contracts were audited for province availability.
- [x] No authoritative province field/mapping was found in the current canonical contracts.
- [x] Province filter is therefore not shipped using guessed display-name mappings.
- [ ] Add province filter only after an authoritative source is identified, documented and tested. **Blocked by source data.**

### Shared route map and Line Detail

- [x] Line Detail uses the shared route-map presentation component.
- [x] Map + ordered-stop workspace is extracted as a reusable presentation component.
- [x] Existing canonical geometry/stop-identity ownership is reused rather than duplicated.
- [x] Official route geometry and ordered-stop fallback remain behind the shared geometry contract.
- [x] Direction-specific schedule geometry prefers ordered direction stops and falls back deterministically.
- [x] Ordered clickable stops are rendered alongside the map.
- [x] Stop-list selection and canvas marker highlight share selected-stop state.
- [x] Stop Detail navigation remains consortium-aware.
- [x] Wide layout uses a map-first approximately 2:1 workspace.
- [x] Wide map and stop-list columns share one height owner and are browser-asserted within 1 CSS px.
- [x] Long stop lists scroll inside the wide stop panel.
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
- [x] Every timetable result exposes a native expandable route disclosure.
- [x] Disclosure copy identifies the timetable line and destination/direction context.
- [x] Route preview transport work is lazy: no line-detail request occurs before expansion.
- [x] Expanded preview consumes the timetable row's canonical consortium/line/direction.
- [x] Expanded preview reuses the shared route workspace rather than duplicating map/stops UI.
- [x] Per-stop passing times are not fabricated when CTAN does not prove the exact stop/time association.

### Recent previews

- [x] Mobile preview time remains end-aligned instead of switching to start alignment.
- [x] Time uses tabular numerals.

## Automated validation

### Layout/browser coverage

- [x] Lines deterministic browser coverage includes 320×568, 390×844 and 1440×900.
- [x] Line Detail deterministic browser coverage includes 390×844, 768×1024 and 1440×900.
- [x] Route Search expanded-preview deterministic coverage includes 390×844 and 1440×900.
- [x] No-horizontal-document-overflow assertions protect affected Lines, Line Detail and expanded Route Search preview flows.
- [x] Desktop Lines assertion protects primary line-name allocation.
- [x] Desktop Line Detail assertion protects stop-selection allocation and stacked More information action.
- [x] Mobile Line Detail assertion protects one-column map-before-stops ordering.
- [x] Desktop Route Search preview assertion protects equal map/stops height within 1 CSS px.
- [x] Mobile Route Search preview assertion protects map-before-stops ordering.
- [x] Route Search preview test proves lazy detail loading and the direction-specific three-stop route fixture.
- [x] Map/list selection browser test exercises the Leaflet Canvas renderer contract.
- [x] Deterministic OSM tile replacement prevents remote tile variance from dominating acceptance evidence.

### Exact product-head evidence

Validated product head: `b5b01261c383a4ac29f109065d836618b733bde1`.

- [x] CI #1106 / run `33203063151` succeeded.
- [x] Install dependencies succeeded.
- [x] Lint succeeded.
- [x] Script tests succeeded.
- [x] Angular tests succeeded.
- [x] Deploy-pipeline checks succeeded.
- [x] Final aggregate CI check succeeded.
- [x] Publish PR visual evidence #726 / run `33203063149` succeeded.
- [x] UI quality gates succeeded.
- [x] Deterministic populated responsive/accessibility checks succeeded, including the reusable Route Search route disclosure coverage.
- [x] Populated screenshot capture succeeded.
- [x] Deterministic empty-state checks succeeded.
- [x] Empty screenshot capture succeeded.
- [x] Immutable-head verification succeeded.
- [x] Evidence artifact publication succeeded.
- [x] Artifact `pr-36-visual-evidence-b5b01261c383a4ac29f109065d836618b733bde1`, id `9698624271`, digest `sha256:10ddef983b9b24837634d8eea4a5702dbde4e13fc75d915f315d002947c4201c` was published.

## Visual regression architecture

- [x] Exact-head reviewer-facing screenshots are deterministic and published as artifacts.
- [x] Critical geometry/layout invariants are blocking browser assertions.
- [ ] Introduce a trustworthy reviewed-baseline pixel-diff gate that does not self-seed expected images on clean CI checkouts.

Current decision: use an immutable approved commit SHA as the baseline candidate, render `expected` from that commit and `actual` from the PR head, compare them, retain expected/actual/diff artifacts and change the baseline SHA only after reviewed approval.

**Status:** blocked pending explicit approval because this is a material CI architecture change. Do not implement it silently and do not treat a self-seeded `0 diff` result as regression evidence.

## Documentation and delivery

- [x] Main follow-up specification reflects observed implementation/validation state.
- [x] Reusable route-workspace/schedule-disclosure specification records product-head evidence.
- [x] This checklist is an evidence ledger rather than a stale pending-task list.
- [ ] Merge PR #36. **Requires explicit user approval; not authorized.**
- [ ] Release/deploy. **Requires explicit user approval; not authorized.**

Final documentation-head CI and visual-evidence run IDs are recorded in the PR body after this documentation commit completes. This avoids a self-referential follow-up commit solely to mark its own workflow result.

## Remaining blockers

1. **Province filter:** authoritative province mapping is not present in the audited canonical source contracts.
2. **Reviewed-baseline pixel diff:** architecture is defined, but implementation requires explicit approval for the CI design change.
3. **Merge/release/deploy:** intentionally not performed without approval.

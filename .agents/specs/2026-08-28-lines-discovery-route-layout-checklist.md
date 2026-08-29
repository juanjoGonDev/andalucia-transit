# Lines discovery and route-layout execution ledger

Companion execution ledger for `.agents/specs/2026-08-28-lines-discovery-route-layout.md`, `.agents/specs/2026-08-28-route-workspace-schedule-disclosure.md` and `.agents/specs/2026-08-29-lines-province-filter.md`.

## Tracking rules

- Mark an item complete only with observable repository, test, workflow or screenshot evidence.
- Keep unsupported product claims blocked rather than inferred.
- Do not auto-accept visual baselines.
- Preserve unrelated PR work; no force-push.
- Do not merge, release, deploy or advance a reviewed baseline without explicit approval.
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
- [x] Province filter is implemented from canonical CTAN consortium metadata.
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

- [x] The repository CTAN reference was audited directly instead of relying on the earlier catalog-only audit.
- [x] `GET /Consorcios/:idConsorcio/consorcio` is the authoritative source and exposes required `provincia`, documented as `Provincia sede del Consorcio`.
- [x] Snapshot consortium summaries fetch and validate `provincia`; missing/blank values fail snapshot generation.
- [x] Province is persisted once on the consortium catalog entry rather than duplicated on line records.
- [x] Lines derive province membership through canonical `consortiumId`; display-name and municipality inference remain rejected.
- [x] Unique Province options are derived from canonical consortium metadata.
- [x] Province selection is URL-backed and survives reload/navigation restoration.
- [x] Province and narrower Area state are mutually reconciled so contradictory hierarchy state is not retained.
- [x] Multi-consortium aggregation is browser-covered with Cádiz spanning consortia 2 and 5.
- [x] Product semantics remain bounded to the CTAN consortium province; they do not claim geometric containment of the complete route.

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
- [x] Province-specific browser coverage runs in the blocking PR visual-evidence workflow.
- [x] Province coverage proves one selected province can aggregate multiple CTAN consortia.
- [x] Province coverage proves URL restoration and Province/Area hierarchy reconciliation.
- [x] Province coverage protects mobile no-horizontal-overflow behavior.
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

### Province behavior evidence

Validated behavior head: `cbd6de9b795e208bb3c94c0972855a0371a06514`.

- [x] CI #1151 / run `33221835240` succeeded.
- [x] Install dependencies succeeded.
- [x] Lint succeeded.
- [x] Script tests succeeded, including CTAN province source validation and malformed-source rejection.
- [x] Angular tests succeeded: 455/455.
- [x] Deploy-pipeline checks succeeded.
- [x] Final aggregate `Check all ok` succeeded.
- [x] Publish PR visual evidence #816 / run `33221835257` succeeded.
- [x] UI quality gates succeeded.
- [x] Populated Playwright suite succeeded with 38 scenarios, including the Province-specific tests.
- [x] Deterministic empty-state checks succeeded.
- [x] Populated and empty screenshot capture succeeded.
- [x] Immutable-head verification succeeded.
- [x] Normal evidence artifact `pr-36-visual-evidence-cbd6de9b795e208bb3c94c0972855a0371a06514`, id `9705510096`, digest `sha256:e10af518714b0207a9b629c7855e7c89c553aa018b0f337285a19dc214c5afc8` was published.

## Visual regression architecture

- [x] Exact-head reviewer-facing screenshots are deterministic and published as artifacts.
- [x] Critical geometry/layout invariants are blocking browser assertions.
- [x] A trustworthy reviewed-baseline pixel-diff gate renders an immutable approved commit and the PR head independently.
- [x] The baseline pointer is an immutable ancestor commit and cannot self-seed from the current head.
- [x] The current-head deterministic harness is applied to both applications.
- [x] Exact RGBA comparison uses zero tolerance and retains expected/actual/diff evidence.
- [x] Clock, animation/caret, pointer/scroll state and Leaflet/tile variance are stabilized only for the exact regression path.
- [x] Normal reviewer-facing evidence remains independent from exact-regression determinization.

### Province visual-delta evidence

Visual regression baseline #43 / run `33221835281` on `cbd6de9b795e208bb3c94c0972855a0371a06514`:

- [x] Reviewed baseline `4f8ec97f59dab58a04c07a6aa6995f4fc4e6d9f1` validated as an immutable ancestor.
- [x] Baseline application passed 36/36 harness scenarios without retries.
- [x] Head application passed 36/36 harness scenarios without retries.
- [x] 34/36 required screenshots are byte-for-byte RGBA identical.
- [x] The only changed files are Lines mobile and Lines desktop, matching the surface intentionally changed by the Province selector.
- [x] Mobile Lines changes from 390×2536 to 390×2620 and reports 475,230 differing pixels.
- [x] Desktop Lines remains 1440×1594 and reports 9,761 differing pixels.
- [x] Total exact difference is 484,991 pixels across exactly two files.
- [x] Expected/actual/diff artifact `pr-36-visual-regression-cbd6de9b795e208bb3c94c0972855a0371a06514`, id `9705551827`, digest `sha256:7bf595658bdcd437980c315d8423a0ffa7f613d62f215edb6432e9e19acc850c` was retained.
- [x] Enforcement failed rather than weakening thresholds, masking Lines or moving the baseline automatically.
- [ ] Advance `.github/visual-baseline.json` after explicit visual review of the new Lines Province UI. **Requires user approval; not authorized.**

## Documentation and delivery

- [x] Main follow-up specification reflects current Province source truth and baseline architecture.
- [x] Province-specific specification records CTAN evidence, implementation ownership and validation.
- [x] Reusable route-workspace/schedule-disclosure specification records its product-head evidence.
- [x] This checklist is an evidence ledger rather than a stale pending-task list.
- [ ] Merge PR #36. **Requires explicit user approval; not authorized.**
- [ ] Release/deploy. **Requires explicit user approval; not authorized.**

Final documentation-head CI and visual-evidence run IDs belong in the PR body after the documentation commits complete. This avoids a self-referential follow-up commit solely to mark its own workflow result.

## Remaining blockers

1. **Reviewed Lines visual baseline:** the visible Province selector is an intentional UI change and exact regression enforcement correctly remains red until explicit baseline review/approval.
2. **Merge/release/deploy:** intentionally not performed without approval.

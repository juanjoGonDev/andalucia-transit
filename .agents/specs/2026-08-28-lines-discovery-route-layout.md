# Lines discovery, route layout and reusable map follow-up

## Request

Implement the 2026-08-28 mobile review follow-up on PR #36 while removing the accidental semantic coupling between **Lines** navigation and Route Search.

The requested product outcome is:

- **Lines** opens a real browsable line directory, not Route Search and not a fabricated default journey;
- line discovery supports canonical search, applicable geographic filters, explicit proximity lookup and bounded pagination;
- line detail shows a reusable interactive route map and ordered clickable stops;
- route geometry and stop identity have one canonical owner shared by map consumers;
- Route Search removes duplicated selection presentation, keeps its search workspace available while scrolling and preserves clock alignment on narrow screens;
- recent-search preview times remain aligned on mobile;
- deterministic browser/layout validation protects the changed surfaces.

## Evidence

### Original defects

- The shell rendered the visible Lines label while linking that action to Route Search.
- Route Search rendered a hard-coded C2 sample sentence when no real selection existed.
- Line Detail exposed ordered stops but no route map.
- The recent preview mobile breakpoint changed the time column to start alignment.
- Route Search repeated origin/destination/date context below the form and used verbose arrival presentation that competed with departure time on narrow widths.
- The original PR screenshot workflow published exact-head evidence but did not yet provide a trustworthy reviewed-baseline pixel regression contract.

### Implemented ownership

- `src/app/app.routes.ts` owns separate Lines and Route Search routes.
- `src/app/shared/layout/top-actions/app-shell-top-actions.component.ts` points the persistent Lines action at the Lines route and uses the Lines navigation copy.
- `src/app/features/lines/` owns the Lines directory presentation while canonical filtering/pagination data comes from the existing line-directory domain/data owner rather than template parsing.
- Lines URL state covers text query, province, transport area, municipality, nucleus and page; **Near me** requests geolocation only after explicit user action.
- Province is sourced from CTAN `GET /Consorcios/:idConsorcio/consorcio`. The documented `provincia` field is persisted once on the consortium catalog entry and Lines filters through canonical `consortiumId`; display-name inference and component-local province tables remain rejected.
- The Province semantic is the CTAN province assigned to the owning consortium, described by CTAN as `Provincia sede del Consorcio`; it is not a geometric claim that every point of a route lies inside that province.
- A province may aggregate multiple consortia. Deterministic coverage explicitly exercises Cádiz across consortia 2 and 5.
- Line Detail consumes the shared transit route-map component and canonical route geometry/stop identity pipeline; it does not introduce another Leaflet transport-data client.
- Line Detail uses a wide map-first workspace and a single-column mobile flow. Wide stop actions are stacked so the visible More information affordance cannot crush stop names.
- Route Search uses its sticky form/workspace as the active selection owner; the former duplicated summary region is absent.
- Route result clocks use stable departure/arrival layout and tabular numerals.
- Recent preview times remain end-aligned with tabular numerals at narrow breakpoints.
- Leaflet canvas rendering remains the shared renderer contract and the map/list stop-selection browser test exercises that contract.

### Visual-review regressions fixed during validation

Manual inspection of exact-head screenshot evidence exposed two defects that automated functional checks had not made obvious:

1. desktop Lines cards allowed side metadata to squeeze line names into near single-character columns;
2. desktop Line Detail allowed the visible More information action to squeeze stop names in the 1/3 stops column.

The implementation moves Lines metadata below the primary line identity and stacks the wide Line Detail stop action below the stop-selection row. Playwright geometry assertions protect allocated content width instead of measuring intrinsic text glyph width.

### Current product-head validation

Validated Province behavior head: `cbd6de9b795e208bb3c94c0972855a0371a06514`.

- CI #1151, run `33221835240`: **success**. Install, lint, script tests, 455 Angular tests, deploy-pipeline checks and `Check all ok` passed.
- Publish PR visual evidence #816, run `33221835257`: **success**.
- The blocking populated Playwright suite includes `tests/playwright/lines-province-filter.spec.ts` and passed 38 scenarios, including multi-consortium Province aggregation and hierarchy/URL behavior.
- Normal evidence artifact: `pr-36-visual-evidence-cbd6de9b795e208bb3c94c0972855a0371a06514`, id `9705510096`, digest `sha256:e10af518714b0207a9b629c7855e7c89c553aa018b0f337285a19dc214c5afc8`.
- Visual regression baseline #43, run `33221835281`, rendered the immutable baseline `4f8ec97f59dab58a04c07a6aa6995f4fc4e6d9f1` and the product head successfully with the current deterministic harness. Both sides passed 36/36 harness scenarios without retries.
- Exact RGBA comparison found 34/36 screenshots unchanged. Only `lines-data_es_390_844_full.png` and `lines-data_es_1440_900_full.png` differ, matching the intentional addition of the visible Province filter. Total difference: 484,991 pixels.
- Exact artifact: `pr-36-visual-regression-cbd6de9b795e208bb3c94c0972855a0371a06514`, id `9705551827`, digest `sha256:7bf595658bdcd437980c315d8423a0ffa7f613d62f215edb6432e9e19acc850c`.
- Enforcement remains red intentionally until the new Lines visual contract is explicitly reviewed and the immutable baseline pointer is advanced. No threshold, masking or self-seeding was introduced.

## Decision

### 1. Lines is a directory, Route Search is a planner

Lines and Route Search remain separate routes and tasks. No visible Lines action may navigate to Route Search, and no Route Search empty state may present fabricated transport data as a default result.

### 2. Canonical line-directory state

The Lines surface consumes one canonical normalized line-directory owner. Search/filter/page state that users reasonably expect to survive refresh/back navigation is URL-backed.

Supported discovery dimensions are:

- line code/name query;
- CTAN consortium province;
- transport area/consortium;
- municipality;
- nucleus;
- explicit Near me proximity.

Province is owned by consortium metadata from the CTAN consortium-detail endpoint. Lines derive membership through `consortiumId`; province is not copied onto each line and is never inferred from names.

### 3. Reusable route-map contract

Presentation components receive normalized route-map data and selected-stop identity; they do not fetch CTAN transport data independently. Official geometry, ordered-stop fallback, coordinate normalization, direction choice and consortium-aware stop identity remain canonical domain concerns.

### 4. Responsive Line Detail

Wide screens use a map-first approximately 2:1 workspace. Mobile and constrained tablet widths use one logical column. Stop names retain readable horizontal space, and the More information destination remains a separate accessible action.

### 5. Route Search hierarchy

The sticky search workspace owns active origin/destination/date context. Timetable rows prioritize departure, arrival and duration without allowing translated prose to destabilize clock columns.

### 6. Recent alignment

Recent preview time values keep one stable end-aligned column and tabular numerals across mobile widths.

### 7. Visual validation boundary

The repository now has a reviewed-baseline pixel-diff gate using an immutable commit SHA. The current-head harness renders both the approved baseline application as `expected` and the PR head as `actual`, compares every required RGBA pixel with zero tolerance, retains expected/actual/diff evidence and rejects self-seeded baselines.

A legitimate UI change may therefore leave the gate red until its visual evidence is reviewed. Advancing `.github/visual-baseline.json` is an approval action, not a test workaround.

## Acceptance

### Implemented and validated

- Persistent Lines navigation opens the dedicated Lines directory.
- Route Search remains separately deep-linkable.
- The fake C2 default journey is removed.
- Lines renders canonical records with search, province, area, municipality, nucleus, explicit Near me and pagination behavior.
- Filter/page state is URL-backed where implemented by the directory owner.
- Province comes from authoritative CTAN consortium metadata and aggregates every consortium sharing the selected province.
- Province/area hierarchy state cannot remain contradictory in the URL.
- Line Detail is deep-linkable and renders reusable route map plus ordered stops when geometry is usable.
- Line Detail preserves the stop list when map data is unavailable through the existing error/fallback contract.
- Desktop Line Detail keeps the map dominant without reducing stop names to unreadable columns.
- Mobile Line Detail uses one logical column and has no horizontal document overflow in deterministic acceptance checks.
- Stop-list selection and route-map canvas highlight use the same selected-stop state.
- Route Search has no redundant selection summary between form and timetable.
- Route Search keeps the form/workspace sticky and preserves compact departure/arrival layout.
- Recent preview time alignment no longer flips to start alignment on mobile.
- Core CI and normal exact-head browser evidence are green on the validated Province behavior head.
- The exact reviewed-baseline gate is implemented and deterministically isolates the intentional Province UI change to the two Lines screenshots.

### Deliberately unresolved

- **Reviewed Lines baseline:** the new Province control intentionally changes Lines mobile and desktop screenshots. Baseline advancement requires explicit visual review/approval and has not been performed.
- **Merge/release/deploy:** intentionally not performed without explicit approval.

## Checks

The implementation has been exercised through repository-native gates:

- formatting/Prettier gate;
- `pnpm run lint`;
- `pnpm run test:scripts`, including CTAN province validation and malformed-source rejection;
- 455 Angular tests;
- deploy-pipeline checks and production build path;
- focused Playwright responsive/accessibility/layout tests;
- Province-specific browser behavior for a province spanning multiple consortia;
- deterministic populated and empty browser applications;
- exact-head screenshot capture and artifact publication;
- immutable reviewed-baseline exact RGBA comparison with expected/actual/diff artifact retention.

Known pre-existing non-blocking warnings remain separate technical debt: bundle/style budget warnings and the `@messageformat/core` CommonJS warning.

## Risks and rollback

- CTAN field variance remains data-driven; unsupported fields must not be invented.
- CTAN calls `provincia` the consortium headquarters province. Product copy/semantics must not silently strengthen that into route-geometry containment.
- A province can contain multiple CTAN consortia, so filtering must remain set-based on consortium IDs.
- OSM tile rendering is nondeterministic, so deterministic browser acceptance neutralizes tile imagery while retaining the real Leaflet/geometry interaction contract.
- The fixed shell navigation can overlay content visually while scrolling; page-owned bottom clearance must continue to keep terminal content reachable.
- Each follow-up slice remains independently revertible: Lines filters/layout, Line Detail layout, route-map behavior and Route Search presentation do not require a database migration.

## Delivery

Continue on PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Keep commits Conventional and atomic. Do not force-push. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

The execution ledger is `.agents/specs/2026-08-28-lines-discovery-route-layout-checklist.md`.

## Status

The product/UI follow-up, authoritative Province filtering and browser coverage are implemented. Core CI and normal visual evidence are green on `cbd6de9b795e208bb3c94c0972855a0371a06514`.

The exact baseline gate is operating correctly and blocks only the intentional Lines visual change introduced by Province. The remaining Province-specific action is explicit visual approval before advancing the reviewed baseline.

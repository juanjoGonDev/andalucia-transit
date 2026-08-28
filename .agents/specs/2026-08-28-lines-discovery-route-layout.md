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
- The existing PR screenshot workflow published exact-head evidence but did not provide a trustworthy reviewed-baseline pixel regression contract.

### Implemented ownership

- `src/app/app.routes.ts` owns separate Lines and Route Search routes.
- `src/app/shared/layout/top-actions/app-shell-top-actions.component.ts` points the persistent Lines action at the Lines route and uses the Lines navigation copy.
- `src/app/features/lines/` owns the Lines directory presentation while canonical filtering/pagination data comes from the existing line-directory domain/data owner rather than template parsing.
- Lines URL state covers text query, transport area, municipality, nucleus and page; **Near me** requests geolocation only after explicit user action.
- Province is intentionally absent because the audited catalog/stop contracts do not expose an authoritative province field.
- Line Detail consumes the shared transit route-map component and canonical route geometry/stop identity pipeline; it does not introduce another Leaflet transport-data client.
- Line Detail uses a wide map-first workspace and a single-column mobile flow. Wide stop actions are stacked so the visible More information affordance cannot crush stop names.
- Route Search uses its sticky form/workspace as the active selection owner; the former duplicated summary region is absent.
- Route result clocks use stable departure/arrival layout and tabular numerals.
- Recent preview times remain end-aligned with tabular numerals at narrow breakpoints.
- Leaflet canvas rendering remains the shared renderer contract and the map/list stop-selection browser test exercises that contract.

### Visual-review regressions fixed during validation

Manual inspection of the exact-head screenshot artifact exposed two defects that automated functional checks had not made obvious:

1. desktop Lines cards allowed side metadata to squeeze line names into near single-character columns;
2. desktop Line Detail allowed the visible More information action to squeeze stop names in the 1/3 stops column.

The final implementation moves Lines metadata below the primary line identity and stacks the wide Line Detail stop action below the stop-selection row. Playwright geometry assertions now protect the allocated content width instead of measuring intrinsic text glyph width.

### Exact product-head validation

Validated product head: `9a23a73b7753ab61fb20f814b140f693323bda62`.

- CI #1095, run `33194039906`: **success**.
- Publish PR visual evidence #704, run `33194039880`: **success**.
- Exact-head artifact: `pr-36-visual-evidence-9a23a73b7753ab61fb20f814b140f693323bda62`.
- Artifact id: `9695064573`.
- Artifact digest: `sha256:d891e7806e99c8c97590c1029e7287c6e285d40481ec518ccb8593033e2c0367`.
- The workflow completed formatting/quality gates, deterministic populated browser checks, deterministic empty checks, screenshot capture, immutable-head verification and evidence publication successfully.
- The generated desktop and mobile Lines and Line Detail screenshots were manually inspected after the workflow completed. The previously observed name-squeezing regressions are absent.

## Decision

### 1. Lines is a directory, Route Search is a planner

Lines and Route Search remain separate routes and tasks. No visible Lines action may navigate to Route Search, and no Route Search empty state may present fabricated transport data as a default result.

### 2. Canonical line-directory state

The Lines surface consumes one canonical normalized line-directory owner. Search/filter/page state that users reasonably expect to survive refresh/back navigation is URL-backed.

Supported discovery dimensions are:

- line code/name query;
- transport area/consortium;
- municipality;
- nucleus;
- explicit Near me proximity.

Province remains blocked until a trustworthy source maps the canonical transport identities to province. Display-name inference or component-local lookup tables are rejected.

### 3. Reusable route-map contract

Presentation components receive normalized route-map data and selected-stop identity; they do not fetch CTAN transport data independently. Official geometry, ordered-stop fallback, coordinate normalization, direction choice and consortium-aware stop identity remain canonical domain concerns.

### 4. Responsive Line Detail

Wide screens use a map-first approximately 2:1 workspace. Mobile and constrained tablet widths use one logical column. Stop names retain readable horizontal space, and the More information destination remains a separate accessible action.

### 5. Route Search hierarchy

The sticky search workspace owns active origin/destination/date context. Timetable rows prioritize departure, arrival and duration without allowing translated prose to destabilize clock columns.

### 6. Recent alignment

Recent preview time values keep one stable end-aligned column and tabular numerals across mobile widths.

### 7. Visual validation boundary

The current exact-head workflow is authoritative evidence for deterministic browser states and contains explicit DOM/layout invariants. However, the repository still lacks a trustworthy reviewed-baseline pixel-diff source of truth that survives clean CI checkouts without self-seeding expected images.

The safe proposed architecture is an immutable baseline commit SHA: start/capture the approved baseline commit as `expected`, start/capture the PR head as `actual`, compare them, retain expected/actual/diff artifacts and change the baseline SHA only after reviewed approval. This changes CI architecture and therefore requires explicit approval before implementation.

## Acceptance

### Implemented and validated

- Persistent Lines navigation opens the dedicated Lines directory.
- Route Search remains separately deep-linkable.
- The fake C2 default journey is removed.
- Lines renders canonical records with search, area, municipality, nucleus, explicit Near me and pagination behavior.
- Filter/page state is URL-backed where implemented by the directory owner.
- Province is not shown without authoritative source data.
- Line Detail is deep-linkable and renders reusable route map plus ordered stops when geometry is usable.
- Line Detail preserves the stop list when map data is unavailable through the existing error/fallback contract.
- Desktop Line Detail keeps the map dominant without reducing stop names to unreadable columns.
- Mobile Line Detail uses one logical column and has no horizontal document overflow in deterministic acceptance checks.
- Stop-list selection and route-map canvas highlight use the same selected-stop state.
- Route Search has no redundant selection summary between form and timetable.
- Route Search keeps the form/workspace sticky and preserves compact departure/arrival layout.
- Recent preview time alignment no longer flips to start alignment on mobile.
- Deterministic browser acceptance and exact-head screenshot evidence are green for the validated product head.

### Deliberately unresolved

- **Province filter:** blocked on authoritative source data. Do not infer it.
- **Reviewed-baseline pixel diff:** current evidence/geometry checks are green, but the baseline architecture described above is not implemented because it is a material CI design change requiring approval.

## Checks

The implementation has been exercised through repository-native gates on the exact product head:

- formatting/Prettier gate;
- `pnpm run lint`;
- `pnpm run test:scripts`;
- Angular test suite;
- deploy-pipeline checks and production build path;
- focused Playwright responsive/accessibility/layout tests;
- deterministic populated and empty browser applications;
- exact-head screenshot capture and artifact publication;
- manual inspection of the final Lines and Line Detail mobile/desktop screenshots.

Known pre-existing non-blocking warnings remain separate technical debt: bundle/style budget warnings and the `@messageformat/core` CommonJS warning.

## Risks and rollback

- CTAN field variance remains data-driven; unsupported fields must not be invented.
- OSM tile rendering is nondeterministic, so deterministic browser acceptance mocks tile imagery while retaining the real Leaflet/geometry interaction contract.
- The fixed shell navigation can overlay content visually while scrolling; page-owned bottom clearance must continue to keep terminal content reachable.
- Each follow-up slice remains independently revertible: Lines layout, Line Detail layout, route-map behavior and Route Search presentation do not require a data migration.

## Delivery

Continue on PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Keep commits Conventional and atomic. Do not force-push. Do not merge, release or deploy without explicit approval.

The execution ledger is `.agents/specs/2026-08-28-lines-discovery-route-layout-checklist.md`.

## Status

The supported product/UI follow-up is implemented and exact-head product validation is green at `9a23a73b7753ab61fb20f814b140f693323bda62`.

Two items remain intentionally open rather than being hidden or approximated: authoritative province mapping and the reviewed-baseline pixel-diff CI architecture. Province is source-blocked; the pixel-baseline change requires explicit approval because it materially changes CI architecture.

# Stop and line favorite management

## Request

Implement favorite management across the traveler surfaces and remove CTAN's `NN` sentinel everywhere it can reach user-facing stop or line names.

The task was reopened after direct browser validation showed the first iteration was incomplete:

- `/lines` still rendered catalog names such as `Almería - Huércal - Viator - Campamento NN`.
- The line directory exposed no favorite action.
- Line detail exposed no favorite action.
- Favorites remained stop-only rather than aggregating all favoriteable traveler entities.

Stop favorites remain in scope: Stop Detail keeps its favorite toggle and Favorites keeps canonical stop discovery without forcing a detour through route search.

## Evidence

- User browser evidence on 2026-08-31 showed `/lines` rendering multiple terminal `NN` tokens from catalog line names.
- The CTAN Almería catalog confirms line `id=1`, code `M-101`, raw name `Almería - Huércal - Viator - Campamento NN`.
- `/lines` consumes `ConsortiumCatalogService`; this was a separate line-name path from `lineasPorParadas` and line detail.
- Stop favorites already had a canonical store/facade, but there was no line-favorite owner or aggregate favorite read model.
- Exact-head browser evidence on `9f5915b1ec69265b72efa91686579b7793049e38` shows M-101 as `Almería - Huércal - Viator - Campamento`, with an active favorite control, and Favorites contains one line plus two stops.

## Decision

1. Own line-name normalization in `line-metadata.util.ts` and reuse it for catalog lines, stop-line summaries, and line detail. Remove only an isolated, case-insensitive terminal `NN` token plus terminal whitespace. Preserve internal `NN` text such as `Annarosa - Centro` and `NN Express - Centro`.
2. Keep stop favorite storage unchanged and add a separate line-favorite store keyed by `(consortiumId,lineId)`. Never derive identity from the visible commercial line code.
3. Expose line favorite mutations through a line facade; UI does not write storage directly.
4. Use `FavoriteCollectionFacade` as a read-model aggregator for surfaces that present Favorites as one product concept while retaining separate authoritative stores.
5. Expose keyboard-accessible favorite toggles in `/lines`, Line Detail and Stop Detail. Keep the line-card favorite button independent from the navigation link.
6. Favorites renders line and stop sections, filters both, removes either type, clears both only after shared-dialog confirmation, and retains canonical stop-directory discovery in add mode.
7. Home consumes the aggregate through a deferred panel so aggregate dependencies do not increase the initial production bundle.
8. Keep historical baseline rendering compatible with older application code. New product-only Playwright checks run only against the current head.
9. Do not advance the reviewed visual baseline without explicit approval after inspection of exact-head evidence.

## Acceptance

- No user-facing stop metadata or line name produced from catalog lines, `lineasPorParadas`, or line detail exposes the isolated CTAN `NN` sentinel.
- Legitimate internal `NN` text remains unchanged.
- `/lines` exposes a separate favorite toggle per line without breaking card navigation, keyboard access, pagination, filters or responsive layout.
- Line Detail and Stop Detail expose current favorite state and add/remove mutation.
- Favorite state is consortium-aware and consistent across Lines, Line Detail, Favorites and Home.
- Repeated line toggles do not create duplicate persisted entries.
- Favorites presents saved stops and lines together, filters both, retains stop discovery/add mode and can remove/clear both entity types.
- Home preview includes line favorites.
- Existing stop favorites remain backward compatible.
- Spanish and English copy describe aggregate favorites accurately.
- Production bundle budgets remain unchanged and green.
- Mobile 390×844 and desktop 1440×900 evidence covers Lines, Line Detail and aggregated Favorites without horizontal overflow or inaccessible controls.

## Tests

- Pure stop and line normalization tests cover exact/case/whitespace sentinels and legitimate counterexamples.
- Catalog tests prove `/lines` normalizes the reported `NN` path.
- Route-line summary and line-detail mapper tests use the same line normalization owner.
- Line favorite storage/service tests cover validation, mock modes, stable keys, hydration, persistence, add/remove/toggle/clear and deduplication.
- Aggregate facade tests prove stop and line streams are combined without duplicating ownership.
- Lines, Line Detail, Stop Detail, Favorites and Home preview component tests cover their favorite behavior.
- Playwright product checks verify the deterministic aggregate, M-101 favorite state in `/lines`, Line Detail favorite mutation, sentinel removal and responsive overflow.
- Historical visual regression uses a baseline-compatible harness; product-only assertions are excluded from baseline rendering.

## Validation evidence

Validated executable head before this documentation update: `9f5915b1ec69265b72efa91686579b7793049e38`.

- CI run `33432453940`: pass (install, lint, Angular tests, script tests, deploy pipeline, aggregate gate).
- Legal browser QA run `33432453913`: pass.
- Visual evidence run `33432453929`: pass.
- Visual evidence artifact `9773224517`: `pr-439-visual-evidence-9f5915b1ec69265b72efa91686579b7793049e38`.
- Visual evidence digest: `sha256:b2d7ae67827f22c3c1bb44508a43b09f7aa800fc1eacc0e2dc83b65d85ee6ab1`.
- Visual regression run `33432454026`:
  - reviewed baseline render: pass, 32/32 checks;
  - current-head product render: pass, 42/42 checks;
  - pixel comparison executed successfully;
  - 28/36 screenshots match exactly;
  - 8/36 differ only on intentionally changed surfaces: Lines mobile/desktop, Line Detail mobile/desktop, Favorites populated mobile/desktop and Favorites empty mobile/desktop;
  - enforcement remains red because the prior reviewed baseline has not been advanced.

Manual inspection of exact-head evidence confirms:

- `/lines` no longer shows terminal `NN`; M-101 is normalized and visibly favorite.
- Favorites mobile/desktop contains sections for Lines and Stops, the add/search controls and remove actions, without terminal `NN`.
- Favorites empty state remains coherent and the clear action is disabled.
- Line Detail mobile/desktop exposes the favorite control and keeps the route/stops layout usable.
- The full-page mobile captures show the fixed bottom navigation at its viewport-fixed position; end-of-document content remains reachable and no horizontal overflow was found.
- Unrelated visual surfaces match the reviewed baseline pixel-for-pixel.

## Risks

- A broad substring replacement would corrupt legitimate names; normalization must remain terminal-token-only.
- Stop and line local-storage payloads must remain separate so existing stop favorites require no migration.
- Line identity must remain `(consortiumId,lineId)`; commercial codes are presentation data and are not guaranteed unique/stable identifiers.
- The current UI intentionally differs from the reviewed baseline on favorite controls and aggregate Favorites. Advancing the baseline is an explicit visual-contract decision.

## Rollback

Revert the reopened-scope commits. Existing stop-favorite data remains backward compatible. Line favorites use their own storage key and can be removed independently.

## Delivery status

- Functional implementation: complete.
- Unit/component/script/build validation: green on executable head `9f5915b1...`.
- Legal browser QA: green.
- Product Playwright checks: 42/42 green in visual-regression head render.
- Exact-head visual evidence: generated and manually reviewed.
- Historical baseline compatibility: green.
- Pixel regression gate: intentionally red on 8 affected screenshots pending explicit approval of the new visual baseline.
- Merge/release/deploy: not performed.

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
- Final pre-approval visual-regression run `33433358751` reproduced the reviewed result exactly: 28/36 screenshots unchanged and the same 8 intentional screenshots changed, with `4,241,767` differing pixels and no extra surface regressions.
- After the pending baseline decision was presented explicitly, the user answered `continue`; this is the explicit approval used to advance the reviewed visual contract.

## Decision

1. Own line-name normalization in `line-metadata.util.ts` and reuse it for catalog lines, stop-line summaries, and line detail. Remove only an isolated, case-insensitive terminal `NN` token plus terminal whitespace. Preserve internal `NN` text such as `Annarosa - Centro` and `NN Express - Centro`.
2. Keep stop favorite storage unchanged and add a separate line-favorite store keyed by `(consortiumId,lineId)`. Never derive identity from the visible commercial line code.
3. Expose line favorite mutations through a line facade; UI does not write storage directly.
4. Use `FavoriteCollectionFacade` as a read-model aggregator for surfaces that present Favorites as one product concept while retaining separate authoritative stores.
5. Expose keyboard-accessible favorite toggles in `/lines`, Line Detail and Stop Detail. Keep the line-card favorite button independent from the navigation link.
6. Favorites renders line and stop sections, filters both, removes either type, clears both only after shared-dialog confirmation, and retains canonical stop-directory discovery in add mode.
7. Home consumes the aggregate through a deferred panel so aggregate dependencies do not increase the initial production bundle.
8. Keep historical baseline rendering compatible with older application code. New product-only Playwright checks run only against the current head.
9. Advance the visual baseline only after exact-head evidence is inspected and the user explicitly approves the changed visual contract. That approval was received after run `33433358751`, and baseline commit `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5` is now the reviewed owner.

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
- The approved baseline reproduces every required screenshot pixel-for-pixel from a later approval head.

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

Validated executable head before the initial documentation update: `9f5915b1ec69265b72efa91686579b7793049e38`.

- CI run `33432453940`: pass (install, lint, Angular tests, script tests, deploy pipeline, aggregate gate).
- Legal browser QA run `33432453913`: pass.
- Visual evidence run `33432453929`: pass.
- Visual evidence artifact `9773224517`: `pr-439-visual-evidence-9f5915b1ec69265b72efa91686579b7793049e38`.
- Visual evidence digest: `sha256:b2d7ae67827f22c3c1bb44508a43b09f7aa800fc1eacc0e2dc83b65d85ee6ab1`.

Final reviewed pre-approval head: `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`.

- CI run `33433358683`: pass.
- Legal browser QA run `33433358726`: pass.
- Visual evidence run `33433358656`: pass.
- Visual evidence artifact `9773567292`: `pr-439-visual-evidence-5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`.
- Visual evidence digest: `sha256:4bc66b7550b428e276266eb2f241ffe575a0c34dd14fd8585df133652b586095`.
- Visual regression run `33433358751`:
  - reviewed baseline render: pass, 32/32 checks;
  - current-head product render: pass, 42/42 checks;
  - pixel comparison executed successfully;
  - 28/36 screenshots match exactly;
  - exactly 8/36 differ on the intentionally changed surfaces: Lines mobile/desktop, Line Detail mobile/desktop, Favorites populated mobile/desktop and Favorites empty mobile/desktop;
  - total differing pixels: `4,241,767`;
  - no unrelated surface changed.

The approved baseline now points to `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5` using the exact visual evidence above. Baseline approval commit: `d5dc519655a9c911bb2bac6ebc3d86e0c8a16856` (`test(visual): approve aggregate favorites baseline`).

Validation on the approval head `d5dc519655a9c911bb2bac6ebc3d86e0c8a16856`:

- CI run `33435506632`: pass.
- Legal browser QA run `33435506571`: pass.
- Visual evidence run `33435506576`: pass.
- Visual evidence artifact `9774331555`: `pr-439-visual-evidence-d5dc519655a9c911bb2bac6ebc3d86e0c8a16856`.
- Visual evidence digest: `sha256:7da40f6e83571c30fca56801ee40abbd4c6909caca7e7b48a0429ff3b5c868be`.
- Visual regression run `33435506656`: pass.
  - reviewed baseline resolution: pass;
  - reviewed baseline render: pass;
  - pull-request head render: pass;
  - every required pixel comparison: pass;
  - reviewed-baseline enforcement: pass.

## Final visual review

The exact approval-head evidence was manually re-inspected after the baseline became green.

- `/lines` mobile and desktop show M-101 as `Almería - Huércal - Viator - Campamento`, never the terminal sentinel, with the favorite state and independent star actions intact.
- Line Detail mobile and desktop keep the favorite control, map route, stop list and OpenStreetMap attribution visible and usable.
- Favorites populated mobile and desktop show aggregate `Líneas` and `Paradas`, search, add, clear and per-item remove controls without dangling metadata or terminal `NN`.
- Favorites empty mobile and desktop keep a coherent empty state and disabled clear action.
- Stop Detail, route search, map, home, recents, settings, drawer and news evidence were reviewed in the exact-head contact sheets with no newly introduced clipping, overflow, missing content or layout regression.
- Loading and recoverable route-search states remain readable and actionable on mobile.
- The fixed bottom navigation appears at its viewport-fixed position in full-page screenshots; this can visually cross document content in the capture, but the end-of-document evidence remains reachable and the product overflow assertions pass.
- No horizontal overflow was found on the affected 390×844 or 1440×900 surfaces.

## Risks

- A broad substring replacement would corrupt legitimate names; normalization must remain terminal-token-only.
- Stop and line local-storage payloads must remain separate so existing stop favorites require no migration.
- Line identity must remain `(consortiumId,lineId)`; commercial codes are presentation data and are not guaranteed unique/stable identifiers.
- The approved visual baseline now intentionally includes the aggregate favorite controls and layout. Future deviations are gated by exact-pixel comparison.

## Rollback

Revert the reopened-scope commits and the baseline approval commit. Existing stop-favorite data remains backward compatible. Line favorites use their own storage key and can be removed independently. If only the visual contract must be rolled back, restore `.github/visual-baseline.json` to the previously reviewed immutable baseline.

## Delivery status

- Functional implementation: complete.
- Unit/component/script/build validation: green.
- Legal browser QA: green.
- Product Playwright checks: 42/42 green in the exact visual harness.
- Exact-head visual evidence: generated and manually reviewed.
- Historical baseline compatibility: green.
- Reviewed visual baseline: explicitly approved and advanced to `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`.
- Pixel regression gate: green on approval head `d5dc519655a9c911bb2bac6ebc3d86e0c8a16856`.
- Final review of the approval head: clean.
- Merge/release/deploy: not performed.

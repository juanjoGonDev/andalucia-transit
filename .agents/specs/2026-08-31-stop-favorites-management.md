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
10. Treat Favorites copy as ngx-translate-owned UI content. Do not keep a parallel TypeScript copy dictionary.
11. Treat stop-directory search failures as recoverable errors, distinct from a successful empty result, and preserve a retry path without resetting the query.
12. Normalize line favorite candidates before toggle lookup so persisted identity and mutation identity use the same canonical key.
13. Recover favorite-option lookup errors inside each Stop Detail `switchMap` inner observable so later route-context emissions remain live.
14. Keep visual-evidence workflow writes disabled on fork repositories with the explicit repository-fork guard required by `AGENTS.md`.

## Acceptance

- No user-facing stop metadata or line name produced from catalog lines, `lineasPorParadas`, or line detail exposes the isolated CTAN `NN` sentinel.
- Legitimate internal `NN` text remains unchanged.
- `/lines` exposes a separate favorite toggle per line without breaking card navigation, keyboard access, pagination, filters or responsive layout.
- Line Detail and Stop Detail expose current favorite state and add/remove mutation.
- Favorite state is consortium-aware and consistent across Lines, Line Detail, Favorites and Home.
- Repeated line toggles do not create duplicate persisted entries.
- Whitespace-equivalent line IDs toggle the same canonical favorite.
- Favorites presents saved stops and lines together, filters both, retains stop discovery/add mode and can remove/clear both entity types.
- Stop-directory lookup errors in Favorites are visible and retryable rather than rendered as an empty success state.
- Home preview includes line favorites.
- Existing stop favorites remain backward compatible.
- Spanish and English copy describe aggregate favorites accurately, including the global-clear confirmation.
- Favorites user-facing copy is owned by ngx-translate dictionaries and consumed through translation keys.
- Stop Detail can recover from a failed favorite lookup when the route context changes.
- Production bundle budgets remain unchanged and green.
- Mobile 390×844 and desktop 1440×900 evidence covers Lines, Line Detail and aggregated Favorites without horizontal overflow or inaccessible controls.
- The approved baseline reproduces every required screenshot pixel-for-pixel from a later approval head.
- The visual-evidence workflow cannot run its write-capable publish job for fork repositories.

## Tests

- Pure stop and line normalization tests cover exact/case/whitespace sentinels and legitimate counterexamples.
- Catalog tests prove `/lines` normalizes the reported `NN` path.
- Route-line summary and line-detail mapper tests use the same line normalization owner.
- Line favorite storage/service tests cover validation, mock modes, stable keys, hydration, persistence, add/remove/toggle/clear, deduplication and whitespace-equivalent toggle identity.
- Aggregate facade tests prove stop and line streams are combined without duplicating ownership.
- Lines, Line Detail, Stop Detail, Favorites and Home preview component tests cover their favorite behavior.
- Favorites component coverage distinguishes directory error from empty results and proves retry reissues the current query.
- Stop Detail component coverage proves a failed favorite lookup does not terminate later route-context lookup attempts.
- Playwright product checks verify the deterministic aggregate, M-101 favorite state in `/lines`, Line Detail favorite mutation, sentinel removal and responsive overflow.
- Historical visual regression uses a baseline-compatible harness; product-only assertions are excluded from baseline rendering.
- Workflow validation must include the repository's deploy/workflow checks after the anti-fork guard change.

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

### Review remediation evidence

CodeRabbit's post-baseline review on head `d2cf6d9dde785fb8bd7480df8796a3236bdd3d9e` produced six inline findings plus one repository-policy workflow finding. All seven were reproduced against the then-current code and accepted as valid.

Applied review commits:

- `65bc55074b377f76660ac9a5dec6a8032864184a` — `fix(favorites): normalize line toggle identity`.
- `529eeea12032211eab2726f9f785bfb43ce37264` — `style(e2e): sort favorites fixture import`.
- `c483f9710eb842d91205db3394d8b87c9864cc01` — `fix(stop-detail): recover favorite lookup per route`.
- `09b00ab02e293a6d1cc1b1932220396ffa7a9194` — `refactor(lines): centralize favorite icon config`.
- `7c748e2e2c6499c4f9643f31b38973e7ee49595e` — `fix(favorites): localize copy and expose search retry`.
- `a8c90724fdb0aff870439f670aff8c99ffb9812b` — `fix(ci): block visual evidence on forks`.
- `828671b08252295003907bed6f14199450616bac` — `fix(test): restore home coverage with favorites translations`; this restores the full pre-existing Home test fixture after a too-broad intermediate test-only replacement and leaves only the required translation fixture delta in the final tree.
- `bee8fadf935ae7c9cdee8c0dbccfbcf1df3fc42a` — `style(lines): satisfy feature import order`.
- `2b50e93e8a0b2522b649875846635854a2efd3db` — `fix(favorites): describe aggregate clear action`.

CI run `33443245175` on `a8c90724fdb0aff870439f670aff8c99ffb9812b` supplied two actionable failures and two useful passing checks:

- deploy pipeline: pass, validating the workflow/deploy guard changes;
- script tests: pass;
- lint: failed only because `lines-ui.copy` needed to sort before `lines.config`;
- Angular tests: failed because `HomeComponent`'s fake translation loader still returned an empty dictionary after Home Favorites switched to ngx-translate keys.

Both failures were corrected without weakening checks. Exact-head CI, visual regression, legal browser QA, visual evidence, full CodeRabbit review and final visual inspection are pending on the documentation head created after this section.

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

This section describes the already approved baseline head. A new final visual review is required after the review-remediation head becomes green.

## Risks

- A broad substring replacement would corrupt legitimate names; normalization must remain terminal-token-only.
- Stop and line local-storage payloads must remain separate so existing stop favorites require no migration.
- Line identity must remain `(consortiumId,lineId)`; commercial codes are presentation data and are not guaranteed unique/stable identifiers.
- The approved visual baseline now intentionally includes the aggregate favorite controls and layout. Future deviations are gated by exact-pixel comparison.
- The new Favorites search error state is intentionally recoverable and must not regress into a successful-empty presentation.
- Final delivery remains blocked until the remediation head passes exact-head CI/evidence and the requested full CodeRabbit review is clean or all new valid findings are addressed.

## Rollback

Revert the reopened-scope commits and the baseline approval commit. Existing stop-favorite data remains backward compatible. Line favorites use their own storage key and can be removed independently. If only the visual contract must be rolled back, restore `.github/visual-baseline.json` to the previously reviewed immutable baseline.

## Delivery status

- Functional implementation: review remediation applied; exact-head validation pending.
- Unit/component/script/build validation: pending on the remediation documentation head.
- Legal browser QA: pending on the remediation documentation head.
- Product Playwright checks: pending on the remediation documentation head.
- Exact-head visual evidence: pending on the remediation documentation head.
- Historical baseline compatibility: pending on the remediation documentation head.
- Reviewed visual baseline: remains `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`; this round should reproduce it because permanent visible product copy was preserved except for the more accurate aggregate clear-dialog wording.
- Full CodeRabbit review requested by the user: pending until exact-head checks are green.
- Final review of the remediation head: pending.
- Merge/release/deploy: not performed.

# Stop and line favorite management

## Request

Implement favorite management across traveler surfaces and remove CTAN's `NN` sentinel wherever it can reach user-facing stop or line names.

The task was reopened after direct browser validation showed that the first iteration was incomplete: `/lines` still rendered terminal `NN`, line favorites did not exist as a domain concept, Favorites remained stop-only, and favorite management was not consistently available from detail surfaces.

## Evidence

- Browser evidence on 2026-08-31 showed `/lines` rendering catalog names such as `Almería - Huércal - Viator - Campamento NN`.
- CTAN's Almería catalog identifies that line as consortium `6`, line id `1`, code `M-101`; commercial code is therefore presentation data, not canonical identity.
- `/lines`, `lineasPorParadas`, and line detail use separate data contracts and all require the same line-name normalization rule.
- Stop favorites already had an authoritative store/facade; line favorites did not.
- CodeRabbit review on head `d2cf6d9dde785fb8bd7480df8796a3236bdd3d9e` produced six inline findings plus one workflow-policy finding. All seven were reproduced against code and accepted as valid.
- The requested post-remediation full CodeRabbit review completed on head `99567e85a6a7c1ea52692835ea23a51404916776`. It found an inaccessible deferred loading status, an unisolated translation dependency in the Line Detail spec, and a human-readable line URL gap. It also suggested adding Angular TestBed to a pure normalization spec; that suggestion was not applied because the test has no Angular dependency and peer pure utility specs follow the same framework-free pattern.

## Decision

1. `line-metadata.util.ts` owns line display-name normalization. Remove only an isolated, case-insensitive terminal `NN` token plus trailing whitespace. Preserve legitimate internal text such as `Annarosa - Centro` and `NN Express - Centro`.
2. Keep stop and line favorite persistence as separate authoritative stores. Line identity is `(consortiumId,lineId)` and is never derived from the visible commercial code.
3. Expose line mutations through `LineFavoritesFacade`; UI does not write storage directly.
4. Use `FavoriteCollectionFacade` as the read-model aggregator for surfaces that display stops and lines together.
5. Provide keyboard-accessible favorite toggles in `/lines`, Line Detail, and Stop Detail. Keep the line-card favorite action independent from card navigation.
6. Favorites renders stop and line sections, filters both, removes either type, clears both after confirmation, and retains stop-directory discovery directly in add mode.
7. Treat Favorites copy as ngx-translate-owned UI content. Do not keep a parallel TypeScript copy dictionary.
8. Treat stop-directory search failures as recoverable errors distinct from successful empty results; preserve the current query and expose retry.
9. Normalize line favorite candidates before toggle lookup so mutation identity matches persisted identity, including whitespace-equivalent line ids.
10. Recover Stop Detail favorite-option lookup errors inside each `switchMap` inner observable so later route-context emissions remain live.
11. Keep Lines favorite icon values in the feature configuration module.
12. The write-capable visual-evidence publish job must require `github.event.repository.fork == false` before the existing push/same-repository PR authorization checks.
13. Keep historical baseline rendering compatible with older application code while running product-only Playwright assertions only against the current head.
14. Advance visual baselines only after exact-head evidence is inspected and explicitly approved.
15. Deferred Home Favorites loading must expose translated status text to assistive technology while the decorative loading indicator remains `aria-hidden`.
16. Line Detail component tests isolate ngx-translate with the repository's fake-loader pattern rather than relying on the default loader.
17. Pure utility tests remain framework-free unless the unit under test actually depends on Angular; do not add TestBed solely to satisfy a generalized convention claim.
18. Line-detail links are descriptive without moving identity into presentation text. New navigation uses `/lines/:consortiumId/:lineId/:lineSlug`, while the existing `/lines/:consortiumId/:lineId` route remains supported for bookmarks and deep links. `buildDescriptiveSlug` is the single normalization owner and route-search stop slugs reuse it rather than duplicating the algorithm.

## Acceptance

- No known user-facing stop metadata or line-name path exposes the isolated CTAN `NN` sentinel.
- Legitimate internal `NN` text remains unchanged.
- `/lines`, Line Detail, and Stop Detail expose current favorite state and add/remove mutation.
- Favorite state is consortium-aware and consistent across Lines, Line Detail, Favorites, and Home.
- Repeated adds do not create duplicate line favorites.
- Whitespace-equivalent line ids toggle the same canonical favorite.
- Favorites presents stops and lines together, filters both, retains stop discovery/add mode, and can remove or clear both entity types.
- Stop-directory lookup errors in Favorites are visible and retryable rather than rendered as empty success.
- Home preview includes line favorites without increasing the initial production bundle beyond the existing budget.
- Existing stop favorites remain backward compatible.
- Spanish and English copy describe aggregate favorites accurately and is consumed through ngx-translate keys.
- Stop Detail can recover from a failed favorite lookup when route context changes.
- The visual-evidence publish job cannot run in fork repositories.
- The deferred Home Favorites placeholder announces loading state to assistive technology.
- Line Detail tests do not depend on the real translation loader.
- Line links generated by Lines, Favorites, and Home include a stable descriptive slug while preserving consortium id and line id in the path.
- Existing legacy line-detail URLs remain routable.
- Mobile 390×844 and desktop 1440×900 evidence remains free of horizontal overflow and inaccessible affected controls.

## Tests

- Stop and line normalization tests cover exact/case/whitespace sentinels and legitimate counterexamples.
- Catalog, `lineasPorParadas`, and line-detail mapper tests reuse the same line normalization owner.
- Line favorite storage/service tests cover validation, mock modes, hydration, persistence, add/remove/toggle/clear, deduplication, stable keys, and whitespace-equivalent toggle identity.
- Aggregate facade tests prove stop and line streams are combined without duplicating ownership.
- Lines, Line Detail, Stop Detail, Favorites, and Home preview component tests cover favorite behavior.
- Favorites component tests distinguish directory error from empty results and prove retry reissues the current query.
- Stop Detail component tests prove a failed favorite lookup does not terminate later route-context lookup attempts.
- Navigation tests cover descriptive line URLs, legacy line URLs, slug normalization, and the descriptive route registration.
- Existing route-search URL tests continue to cover the same slug output through the shared normalization owner.
- Playwright product checks verify aggregate favorites, canonical M-101 favorite state in `/lines`, Line Detail mutation, sentinel removal, legacy deep-link compatibility, and responsive overflow.
- Workflow/deploy checks validate the anti-fork visual-evidence condition.
- Historical visual regression remains baseline-compatible and product-only assertions are excluded from baseline rendering.

## Review remediation

First review remediation:

- `65bc55074b377f76660ac9a5dec6a8032864184a` — `fix(favorites): normalize line toggle identity`.
- `529eeea12032211eab2726f9f785bfb43ce37264` — `style(e2e): sort favorites fixture import`.
- `c483f9710eb842d91205db3394d8b87c9864cc01` — `fix(stop-detail): recover favorite lookup per route`.
- `09b00ab02e293a6d1cc1b1932220396ffa7a9194` — `refactor(lines): centralize favorite icon config`.
- `7c748e2e2c6499c4f9643f31b38973e7ee49595e` — `fix(favorites): localize copy and expose search retry`.
- `a8c90724fdb0aff870439f670aff8c99ffb9812b` — `fix(ci): block visual evidence on forks`.
- `828671b08252295003907bed6f14199450616bac` — restore the full Home test fixture after the translation migration.
- `bee8fadf935ae7c9cdee8c0dbccfbcf1df3fc42a` — satisfy Lines feature import ordering.
- `2b50e93e8a0b2522b649875846635854a2efd3db` — correct aggregate clear-dialog wording.
- `99567e85a6a7c1ea52692835ea23a51404916776` — initialize Favorites translations in the Home test fixture.

Second full-review remediation:

- `f2afdf16dafb5cbe58ec6b8b0b524bab466bc2ac` — isolate Line Detail translations in its component spec.
- `eaad04b517ffa6915f6af72c5bda6e64fbbbc0b3` — expose accessible deferred loading status on Home.
- `773873ef9bf3feb5faba8821633d4b563ac6c010` and `43adf07505a126b61e205aea06f758ae0a1bfc4a` — centralize URL slug normalization and make route-search reuse it.
- `3222b77da857e297150aadf15f64c13167ab0682` through `9d27866967d8824360adf5931c9bd82cad9eb11d` — add descriptive line route generation, legacy compatibility, and route-level coverage.
- `c7e5b7f7a659f42512516f4d628495e23866213c` through `76e9b20c1ecc442bcca4bbdaa86553870ae5c883` — adopt descriptive line links and regression coverage in Home, Favorites, and Lines.
- `ac81dfa505f9430c5256c7c952d1f803ee5ad967` — remove a redundant direct helper spec after behavior-level navigation and route-search coverage proved the shared slug owner.

The two second-review inline threads that required code changes are resolved after CodeRabbit confirmed the fixes. The pure TestBed suggestion is intentionally not implemented. The descriptive-URL nitpick is accepted and implemented as a backwards-compatible route extension rather than replacing canonical identity with a slug.

## Validation evidence

Approved product baseline:

- baseline owner `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`;
- evidence run `33433358656`;
- artifact `9773567292`;
- digest `sha256:4bc66b7550b428e276266eb2f241ffe575a0c34dd14fd8585df133652b586095`;
- baseline approval commit `d5dc519655a9c911bb2bac6ebc3d86e0c8a16856`.

First review-remediation executable head: `99567e85a6a7c1ea52692835ea23a51404916776`.

- CI `33444976102`: pass.
- Legal browser QA `33444976125`: pass.
- Visual evidence `33444976127`: pass.
- Visual artifact `9777749693`: `pr-439-visual-evidence-99567e85a6a7c1ea52692835ea23a51404916776`.
- Visual artifact digest: `sha256:63adb3ca475e1e4a77b43ea8ab68e5cf2c3f2060b882b77f90d7db00d08f9c8d`.
- Visual regression `33444976173`: pass.

Second-review code head `76e9b20c1ecc442bcca4bbdaa86553870ae5c883`:

- CI `33448949883`: pass, including lint, Angular tests, script tests, deploy-pipeline validation, and aggregate gate.
- Legal browser QA `33448949867`: pass.
- Visual evidence `33448949823`: pending at the last inspection before this documentation update.
- Visual regression `33448949957`: pending at the last inspection before this documentation update.

A new exact-head validation is required after this documentation update. The requested final CodeRabbit full review must be triggered only after that head is green, then any new valid findings must be resolved before delivery.

## Final visual review

The first remediation artifact contained 39 screenshots and was manually re-inspected. Lines, Line Detail, aggregate Favorites, Stop Detail, Home, map, route search, recents, settings, drawer, news, and dialog states remained coherent in the generated mobile/desktop evidence. No new horizontal overflow or clipping was observed. The fixed bottom navigation remained at its viewport-fixed position in full-page mobile captures; automated overflow assertions passed and end content remained reachable.

The second-review route remediation does not intentionally alter rendered content or layout. A new exact-head visual artifact and baseline comparison are nevertheless required before the final review is considered complete.

## Risks

- Broad `NN` substring replacement would corrupt legitimate names; normalization must stay terminal-token-only.
- Stop and line local-storage payloads must remain separate so existing stop favorites require no migration.
- Line identity must remain `(consortiumId,lineId)`; commercial codes and slugs are presentation data.
- Search errors must remain distinguishable from successful empty directory responses.
- Descriptive line slugs are non-authoritative. A stale or manually edited slug may still resolve because the consortium and line id remain the canonical route parameters; newly generated links restore the current descriptive slug.
- Final delivery remains pending exact-head visual evidence, final CodeRabbit review, and final review of the resulting head.

## Rollback

Revert the reopened-scope commits and, if necessary, restore `.github/visual-baseline.json` to the previous reviewed immutable baseline. Existing stop-favorite data remains backward compatible; line favorites use a separate storage key and can be removed independently. The descriptive route can be rolled back independently because the legacy line-detail route remains registered.

## Delivery status

- Functional implementation: complete.
- First CodeRabbit review findings: fixed and validated.
- Second full CodeRabbit review: completed; valid findings remediated, one inapplicable pure-TestBed suggestion declined with evidence.
- Descriptive line navigation: implemented with legacy compatibility.
- Unit/component/script/deploy validation: green on the second-review code head.
- Legal browser QA: green on the second-review code head.
- Product visual evidence and baseline comparison: pending on the documentation head.
- Final CodeRabbit full review requested by the owner: pending until exact-head checks are green.
- Final review: pending.
- Merge/release/deploy: not performed.

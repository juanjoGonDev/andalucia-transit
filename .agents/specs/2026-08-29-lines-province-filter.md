# Lines province filter from CTAN consortium data

## Request

Finish the Province discovery filter requested for the Lines directory on PR #36 by using the CTAN API already documented in this repository. Do not infer province from display names, municipality names, nuclei or component-local lookup tables.

## Evidence

- `docs/api-reference.md` is generated from the CTAN API documentation and defines `GET /Consorcios/:idConsorcio/consorcio` (`ObtieneDatosConsorcio`).
- The documented success contract contains the required `provincia` string, described by CTAN as `Provincia sede del Consorcio`.
- The saved official `docs/api.html` includes a concrete flat JSON response for consortium 7 containing `"provincia": "Jaén"`.
- CTAN documents that transport data is scoped to an Área Metropolitana managed by a Consorcio and that API calls identify that consortium.
- `LineDirectoryEntry` already owns canonical `consortiumId`; no line-name or municipality inference is required.
- `ConsortiumCatalogService` already owns consortium catalog metadata consumed by Lines.
- The snapshot workflow already loads the canonical CTAN consortium list before building the stop directory and catalog, so consortium detail enrichment belongs there.
- Product head `cbd6de9b795e208bb3c94c0972855a0371a06514` passed CI #1151 (`33221835240`) including lint, script tests, 455 Angular tests, deploy-pipeline checks and the aggregate gate.
- Publish PR visual evidence #816 (`33221835257`) passed with the Province browser scenarios included in the blocking populated suite. The retained artifact is `9705510096`, digest `sha256:e10af518714b0207a9b629c7855e7c89c553aa018b0f337285a19dc214c5afc8`.
- Visual regression baseline #43 (`33221835281`) rendered both the immutable baseline and product head successfully. Thirty-four of 36 screenshots matched exactly; only the expected Lines mobile and desktop screenshots changed after adding the visible Province control. The retained expected/actual/diff artifact is `9705551827`, digest `sha256:7bf595658bdcd437980c315d8423a0ffa7f613d62f215edb6432e9e19acc850c`.
- Exact comparison reported 484,991 differing pixels in total: mobile Lines changed dimensions from 390×2536 to 390×2620 with 475,230 differing pixels, while desktop Lines kept 1440×1594 and contained 9,761 differing pixels. Every non-Lines screenshot remained byte-for-byte RGBA identical.

## Decision

1. Extend the snapshot consortium summary owner to fetch `GET /Consorcios/:idConsorcio/consorcio` for every canonical consortium and persist its `provincia` value as `province`.
2. Treat missing/blank province as invalid snapshot source data. Snapshot generation must fail rather than silently invent, infer or partially publish the province dimension.
3. Persist province once in the catalog consortium entry. Do not copy province into every line record.
4. Extend `ConsortiumCatalogEntry` with canonical `province` metadata and derive unique province options from consortium entries.
5. Lines URL state owns a `province` query parameter. Province filters line records by the set of consortium IDs whose canonical catalog province equals the selected province.
6. Area remains a narrower filter. Selecting province clears area/municipality/nucleus; selecting an area clears province so the UI never presents contradictory geographic hierarchy state.
7. Municipality and nucleus remain enabled only after selecting a concrete area because CTAN exposes those datasets under consortium scope.
8. Preserve explicit Near me behavior independently of province filtering.
9. Keep deterministic browser coverage for a province shared by more than one consortium so aggregation cannot regress to a one-to-one province/area assumption.
10. Do not advance `.github/visual-baseline.json` automatically. The exact gate is doing its job by blocking the intentional Lines visual change until that new contract is explicitly reviewed.

## Acceptance

- [x] Snapshot consortium summaries fetch and validate `provincia` from CTAN consortium detail.
- [x] Catalog index persists `province` at consortium level.
- [x] Catalog reader validates and exposes `province` without a parallel lookup table.
- [x] Lines shows a Province selector populated from canonical catalog data.
- [x] Selecting a province filters across every consortium assigned that province.
- [x] Selecting province and area cannot leave contradictory hierarchy state in the URL.
- [x] Province state survives refresh/back navigation through the URL.
- [x] Municipality/nucleus behavior remains consortium-scoped.
- [x] Existing search, pagination and Near me behavior remains intact through existing CI/browser coverage.
- [x] Angular/script tests cover the new contract and malformed source behavior.
- [x] Playwright covers multi-consortium province filtering, URL state and responsive no-overflow behavior in the blocking PR evidence workflow.
- [x] Normal visual evidence is published for the changed Lines UI.
- [x] Exact visual regression was evaluated with zero tolerance against the reviewed baseline and isolated the intentional change to Lines only.
- [ ] Advance the reviewed visual baseline after explicit review of the new Lines Province UI. **Requires user approval; not authorized.**

## Checks

Repository-native validation on `cbd6de9b795e208bb3c94c0972855a0371a06514`:

- `pnpm run lint`: passed through CI #1151.
- `pnpm run test:scripts`: passed, including canonical consortium province validation and malformed-source rejection.
- Angular suite: 455/455 passed through CI #1151.
- Deploy-pipeline/build checks: passed through CI #1151.
- Focused Lines Province Playwright coverage: passed as part of the 38 populated scenarios in Publish PR visual evidence #816.
- Deterministic empty-state browser checks and screenshot publication: passed in #816.
- Reviewed-baseline exact visual regression: comparison completed in #43 and correctly failed enforcement because the reviewed baseline predates the visible Province selector; 34/36 screenshots are exact matches and both changed files are Lines screenshots.

Known pre-existing non-blocking build warnings remain separate technical debt: bundle/style budget warnings and the `@messageformat/core` CommonJS warning.

## Risks

- CTAN describes the field as the province of the consortium headquarters. The product filter therefore means the canonical province assigned to the consortium that owns the line in CTAN; it must not be presented as proof that every point of a route lies inside that province.
- A province may contain multiple CTAN consortia. The implementation groups by canonical province value rather than assuming one province equals one consortium; Cádiz coverage exercises consortia 2 and 5.
- Snapshot refresh gains one consortium-detail request per consortium. Failure is preferable to publishing an incomplete province dimension.
- The new visible filter intentionally changes the reviewed Lines screenshots. Moving the baseline without review would convert a valid protection into self-approval.

## Rollback

Revert the province filter commits. The existing consortium/municipality/nucleus/proximity directory remains functional because province is additive catalog metadata and does not alter line identity or route APIs.

## Delivery

Continue on PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use Conventional atomic commits. Do not force-push. Do not merge, release, deploy or advance the reviewed visual baseline without explicit approval.

## Status

Implemented and behaviorally validated. The former source-data blocker is resolved by CTAN's documented consortium-detail `provincia` field. Core CI and normal browser evidence are green. The only Province-specific delivery blocker is explicit review and approval of the intentional new Lines visual baseline.

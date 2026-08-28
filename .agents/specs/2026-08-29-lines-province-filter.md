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

## Decision

1. Extend the snapshot consortium summary owner to fetch `GET /Consorcios/:idConsorcio/consorcio` for every canonical consortium and persist its `provincia` value as `province`.
2. Treat missing/blank province as invalid snapshot source data. Snapshot generation must fail rather than silently invent, infer or partially publish the province dimension.
3. Persist province once in the catalog consortium entry. Do not copy province into every line record.
4. Extend `ConsortiumCatalogEntry` with canonical `province` metadata and derive unique province options from consortium entries.
5. Lines URL state owns a `province` query parameter. Province filters line records by the set of consortium IDs whose canonical catalog province equals the selected province.
6. Area remains a narrower filter. Selecting province clears area/municipality/nucleus; selecting an area clears province so the UI never presents contradictory geographic hierarchy state.
7. Municipality and nucleus remain enabled only after selecting a concrete area because CTAN exposes those datasets under consortium scope.
8. Preserve explicit Near me behavior independently of province filtering.
9. Add deterministic unit/browser coverage, including a province shared by more than one consortium, so aggregation does not collapse to a one-to-one province/area assumption.

## Acceptance

- [ ] Snapshot consortium summaries fetch and validate `provincia` from CTAN consortium detail.
- [ ] Catalog index persists `province` at consortium level.
- [ ] Catalog reader validates and exposes `province` without a parallel lookup table.
- [ ] Lines shows a Province selector populated from canonical catalog data.
- [ ] Selecting a province filters across every consortium assigned that province.
- [ ] Selecting province and area cannot leave contradictory hierarchy state in the URL.
- [ ] Province state survives refresh/back navigation through the URL.
- [ ] Municipality/nucleus behavior remains consortium-scoped.
- [ ] Existing search, pagination and Near me behavior remains intact.
- [ ] Angular/script tests cover the new contract and malformed source behavior.
- [ ] Playwright covers province filtering and responsive no-overflow behavior.
- [ ] Normal visual evidence is published for the changed Lines UI.
- [ ] Exact visual regression is evaluated honestly against the reviewed baseline; no threshold or masking change is allowed.

## Checks

Planned repository-native validation:

- `pnpm run test:scripts`
- `pnpm run lint`
- Angular test suite through repository CI
- focused Lines Playwright coverage
- normal PR visual evidence
- reviewed-baseline exact visual regression

## Risks

- CTAN describes the field as the province of the consortium headquarters. The product filter therefore means the canonical province assigned to the consortium that owns the line in CTAN; it must not be presented as proof that every point of a route lies inside that province.
- A province may contain multiple CTAN consortia. The implementation must group by province value rather than assume one province equals one consortium.
- Snapshot refresh gains one consortium-detail request per consortium. Failure is preferable to publishing an incomplete province dimension.
- Adding a visible filter is an intentional UI change and can legitimately differ from the previously reviewed visual baseline. The baseline must not be moved merely to make CI green.

## Rollback

Revert the province filter commits. The existing consortium/municipality/nucleus/proximity directory remains functional because province is additive catalog metadata and does not alter line identity or route APIs.

## Delivery

Continue on PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use Conventional atomic commits. Do not force-push. Do not merge, release or deploy without explicit approval.

## Status

In progress. The prior source-data blocker is resolved by the documented CTAN consortium-detail `provincia` field; implementation and validation remain pending.

# Stop metadata cleanup and favorite management

## Request

Apply the reported stop/favorites UX feedback without mixing it into the PWA branding pull request:

- Do not expose CTAN's `NN` nucleus placeholder as user-facing stop metadata.
- Do not expose CTAN's isolated terminal `NN` sentinel when it is appended to a stop-line summary name.
- Let users add or remove the currently viewed stop from favorites directly from stop detail.
- Let users add favorites from the Favorites page itself, using its search control to discover stops instead of forcing a detour through route search.

## Evidence

- CTAN stop-directory snapshot data contains `NN` as a nucleus value; it is upstream data rather than text introduced by the templates.
- `StopDirectoryService` copied `nucleus` from snapshot index/chunk records verbatim into `StopDirectoryOption` and `StopDirectoryRecord` before this change.
- `StopInfoService` also copied the API `nucleo` field verbatim after whitespace trimming before this change.
- `StopFavoritesService` persisted and restored nucleus text without canonical normalization, so existing local favorites could retain historical `NN` values.
- The reported Stop Detail → Lines surface has a separate upstream representation: `lineasPorParadas` can return a line `nombre` ending in an isolated `NN` token, for example `Adra - Venta Del Viso NN`.
- `StopUtilityComponent` renders the `RouteLineSummary.name` returned by `RouteLinesApiService.getLinesForStops()`, and `mapLineSummaries()` previously copied `entry.nombre` verbatim. This explains why nucleus-field normalization alone did not remove the reported suffix from the Lines tab.
- `RouteSearchFormComponent` proves the canonical favorite mutation path: `FavoritesFacade.toggle(StopDirectoryOption)`.
- `StopDetailComponent` owns the consortium-aware routed stop context and now resolves a canonical favorite option without coupling schedule loading to directory resolution.
- `FavoritesComponent` now reuses its existing search field for local filtering and canonical directory discovery while add mode is active.
- Canonical CI run `33401952365` passed on implementation head `f20d8669a0392e72aa2574ff39ee552080ee7913`: install, lint, Angular tests, script tests, deploy-pipeline checks and aggregate status were green.
- Exact-head visual-evidence run `33401957680` passed on the same implementation head and retained artifact `pr-439-visual-evidence-f20d8669a0392e72aa2574ff39ee552080ee7913` with digest `sha256:107b5862b7be30e88fc0112f16c515ae20faf75a80900d03be970e8a77fac2f0`.
- Final screenshot inspection covered Favorites populated/empty states and Stop Detail departures/lines/directions at 390×844 and 1440×900. No `NN` sentinel, horizontal overflow, broken card layout, dangling metadata separator or viewport-specific visual regression was found. The fixed bottom navigation appearing over the middle of full-page captures is the expected full-page rendering position of a viewport-fixed control rather than evidence of hidden end-of-document content; the empty mobile Favorites capture shows the same navigation clear of the content at document end.

## Decision

1. Treat exact, case-insensitive `NN` nucleus values as missing CTAN metadata at the stop data boundary. Do not mutate real names containing `nn`.
2. Keep one nucleus-normalization owner in the stop data layer and consume it from stop directory, stop info and persisted favorite hydration.
3. Represent a missing nucleus as an empty string in directory/favorite option contracts and `null` in nullable stop-info contracts; templates must not render empty nucleus chips/separators.
4. Normalize the separate stop-line summary defect at the `RouteLinesApiService` API mapping boundary: remove only an isolated, case-insensitive terminal `NN` token plus surrounding terminal whitespace. Preserve internal `NN` text and legitimate names such as `Annarosa - Centro` or `NN Express - Centro`.
5. Do not broaden the stop-line rule to arbitrary substrings or unrelated CTAN line-detail contracts without evidence; the reported surface is the stop-line summary endpoint.
6. Reuse `StopDirectoryFacade` and `FavoritesFacade`; do not introduce a second favorite store or duplicate stop lookup logic.
7. Stop detail resolves the routed stop to a canonical `StopDirectoryOption`, derives favorite state reactively from `favorites$`, and toggles through `FavoritesFacade`.
8. Favorites keeps one visible search field. Its existing query continues to filter saved favorites; when add mode is enabled, the same query also searches the canonical stop directory and shows matching stops with add/remove favorite actions.
9. Directory discovery is debounced, requires the existing minimum useful query length through the directory service, cancels stale requests with `switchMap`, and never blocks the saved-favorites list.
10. Reuse existing translated add/remove favorite strings and existing favorite icons where possible; no browser alert/modal is introduced.

## Acceptance

- A nucleus value `NN`, `nn`, mixed case or surrounded by whitespace is never rendered as stop metadata.
- A stop-line summary name ending in an isolated terminal `NN` token renders without that token; `Adra - Venta Del Viso NN` renders as `Adra - Venta Del Viso`.
- Internal or legitimate `nn`/`NN` text in line names remains unchanged.
- Empty/missing nucleus values do not leave a dangling separator or empty nucleus chip in affected favorite/search surfaces.
- Non-placeholder nucleus names remain unchanged.
- Existing persisted favorites containing `NN` render cleanly without requiring the user to clear storage.
- Stop detail exposes a keyboard-accessible favorite toggle when the routed stop can be resolved, reflects external favorite changes, and uses the existing favorite store.
- Stop detail remains functional if the directory cannot resolve the stop; favorite control simply does not appear.
- Favorites exposes an explicit add-favorite action and uses the existing search field for canonical stop discovery.
- Directory search results show favorite state and can add/remove a stop without navigating away.
- Repeated clicks/toggles do not create duplicate favorites.
- Spanish and English use existing localized favorite action copy.
- Stop Detail → Lines is browser-tested at 390×844 and 1440×900 with the reported terminal sentinel fixture, no horizontal overflow and exact screenshots from the PR head.
- Mobile and desktop layouts remain usable, with touch targets and focus states meeting existing design-system rules.

## Tests

- Data normalization unit coverage: null/empty/whitespace, exact `NN` case variants, and legitimate text containing `nn`.
- Stop directory regression coverage for normalized search options and chunk records, including no placeholder search match.
- Stop info regression coverage for API nucleus normalization.
- Favorite storage/service regression coverage for historical persisted `NN` data.
- Stop detail component coverage for resolved/unresolved stops, active/inactive favorite state, toggle mutation and consortium-aware lookup.
- Favorites component coverage for add-mode directory search, stale-query cancellation behavior through RxJS state, add/remove toggles, existing list filtering, and hidden empty nucleus metadata.
- `RouteLinesApiService` coverage proves terminal `NN` removal while preserving `Annarosa - Centro` and `NN Express - Centro`.
- Playwright interaction coverage injects the reported `Adra - Venta Del Viso NN` response into Stop Detail → Lines, asserts `Adra - Venta Del Viso`, checks overflow at 390×844 and 1440×900, and captures both states.
- The repository visual-evidence workflow publishes Stop Detail → Lines captures as mandatory evidence and passed on implementation head `f20d8669a0392e72aa2574ff39ee552080ee7913`.

## Risks

- `NN` is treated as a provider sentinel in the nucleus field only when it is the entire normalized field; broader substring stripping would corrupt legitimate place names and is forbidden.
- The line-name rule is intentionally narrower: only an isolated terminal token is removed from `lineasPorParadas` summaries. A future upstream contract that uses terminal `NN` as meaningful route text would require evidence and a rule revision.
- Existing stored favorites are normalized on hydration; their stable IDs and stop identifiers are not rewritten.
- A stop-detail schedule may load even when the directory snapshot cannot resolve the same stop. Favorite UI degrades independently rather than failing the schedule page.
- Directory search on Favorites adds network/snapshot work only while add mode is active and a useful query is present.
- The repository's visual-regression baseline currently references commit `379d9f30594c3438d5ee6204b311c69a2ea17c52`, which is no longer an ancestor of this branch after an earlier squash merge. Run `33401952446` therefore fails at baseline ancestry resolution before rendering. That inherited baseline must not be rewritten or advanced without explicit baseline approval.

## Rollback

Revert this pull request. No backend, API, database or destructive storage migration is involved.

## Delivery status

- Reconnaissance: complete.
- Specification: complete and synchronized with the dual `NN` sources and final implementation evidence.
- Tests: complete; canonical unit/script/deploy checks and Playwright interaction coverage passed on the implementation head.
- Implementation: complete for nucleus metadata, favorites management and terminal stop-line summary sentinel normalization.
- Runtime/visual validation: complete on implementation head `f20d8669a0392e72aa2574ff39ee552080ee7913`; the final evidence artifact was inspected across the affected Favorites and Stop Detail mobile/desktop states with no new visual defect found.
- Final documentation sync: this commit changes only this specification. Recheck CI and visual evidence on the resulting documentation-only head without changing runtime code.
- CI/final review: runtime/code final review is clean. The only unresolved gate is the inherited visual-baseline ancestry failure, which requires explicit baseline approval rather than an autonomous baseline mutation.

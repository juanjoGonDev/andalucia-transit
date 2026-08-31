# Stop metadata cleanup and favorite management

## Request

Apply the reported stop/favorites UX feedback without mixing it into the PWA branding pull request:

- Do not expose CTAN's `NN` nucleus placeholder as user-facing stop metadata.
- Do not expose CTAN's isolated terminal `NN` sentinel when it is appended to a stop-line summary name.
- Let users add or remove the currently viewed stop from favorites directly from stop detail.
- Let users add favorites from the Favorites page itself, using its search control to discover stops instead of forcing a detour through route search.

## Evidence

- CTAN stop-directory snapshot data contains `NN` as a nucleus value; it is upstream data rather than text introduced by the templates.
- The reported Stop Detail → Lines surface has a separate upstream representation: `lineasPorParadas` can return a line `nombre` ending in an isolated `NN` token, for example `Adra - Venta Del Viso NN`.
- `StopUtilityComponent` renders the `RouteLineSummary.name` returned by `RouteLinesApiService.getLinesForStops()`, so nucleus-field normalization alone cannot clean the Lines tab.
- `RouteSearchFormComponent` proves the canonical favorite mutation path: `FavoritesFacade.toggle(StopDirectoryOption)`.
- `StopDetailComponent` owns the consortium-aware routed stop context and resolves a canonical favorite option without coupling schedule loading to directory resolution.
- `FavoritesComponent` reuses its existing search field for local filtering and canonical directory discovery while add mode is active.
- Implementation CI run `33401952365` passed on implementation head `f20d8669a0392e72aa2574ff39ee552080ee7913`.
- Exact-head visual-evidence run `33401957680` passed on that implementation head. Final screenshot inspection covered Favorites populated/empty states and Stop Detail departures/lines/directions at 390×844 and 1440×900 with no `NN` sentinel, horizontal overflow, broken card layout or dangling metadata separator.
- Final CI review found a separate workflow defect: when baseline ancestry resolution failed, `Enforce reviewed baseline` emitted a second misleading `BASELINE_SHA: unbound variable` failure. Commit `63266f97431ffa3ae8da10d824cee672e1633613` makes downstream baseline steps conditional on successful resolution and uses the resolved step output directly.
- Run `33404790828` verified that hardening: the known ancestry problem was reported only at `Resolve reviewed baseline`, with dependent steps skipped.
- The reviewed baseline was subsequently approved explicitly. Commit `c10bf37b25269146c673987b513b5911ba38a4b1` updates `.github/visual-baseline.json` to reviewed commit `acc7929d7121c43a2ea8026573fbf744155d9ea6`, visual-evidence run `33405309329`, artifact `9763011536`, digest `sha256:6e534b1f4754a775bbb7e2035cbc8a1eb0f03abd86c5a25c8bbf17e93b1cce36`.
- CI run `33410955019`, visual-evidence run `33410954971`, and visual-regression run `33410955117` all passed on baseline-approval head `c10bf37b25269146c673987b513b5911ba38a4b1`. The visual-regression workflow rendered both the approved baseline and PR head, compared every required pixel, and passed enforcement.

## Decision

1. Treat exact, case-insensitive `NN` nucleus values as missing CTAN metadata at the stop data boundary. Do not mutate real names containing `nn`.
2. Keep one nucleus-normalization owner in the stop data layer and consume it from stop directory, stop info and persisted favorite hydration.
3. Represent a missing nucleus as an empty string in directory/favorite option contracts and `null` in nullable stop-info contracts; templates must not render empty nucleus chips or separators.
4. Normalize the separate stop-line summary defect at the `RouteLinesApiService` API mapping boundary: remove only an isolated, case-insensitive terminal `NN` token plus surrounding terminal whitespace. Preserve internal `NN` text and legitimate names such as `Annarosa - Centro` or `NN Express - Centro`.
5. Do not broaden the stop-line rule to arbitrary substrings or unrelated CTAN line-detail contracts without evidence.
6. Reuse `StopDirectoryFacade` and `FavoritesFacade`; do not introduce a second favorite store or duplicate stop lookup logic.
7. Stop detail resolves the routed stop to a canonical `StopDirectoryOption`, derives favorite state reactively from `favorites$`, and toggles through `FavoritesFacade`.
8. Favorites keeps one visible search field. Its existing query filters saved favorites; when add mode is enabled, the same query also searches the canonical stop directory and shows matching stops with add/remove favorite actions.
9. Directory discovery is debounced, requires the existing minimum useful query length, cancels stale requests with `switchMap`, and never blocks the saved-favorites list.
10. Reuse existing translated add/remove favorite strings and existing favorite icons; no browser alert/modal is introduced.
11. Baseline-resolution failures are authoritative by themselves. Downstream comparison/enforcement steps must not run when baseline resolution failed or mask the root cause with missing environment state.
12. The reviewed visual baseline is `acc7929d7121c43a2ea8026573fbf744155d9ea6` with evidence run `33405309329`, artifact `9763011536`, and digest `sha256:6e534b1f4754a775bbb7e2035cbc8a1eb0f03abd86c5a25c8bbf17e93b1cce36`.

## Acceptance

- A nucleus value `NN`, `nn`, mixed case or surrounded by whitespace is never rendered as stop metadata.
- `Adra - Venta Del Viso NN` renders as `Adra - Venta Del Viso` in Stop Detail → Lines.
- Internal or legitimate `nn`/`NN` text in line names remains unchanged.
- Empty/missing nucleus values do not leave a dangling separator or empty nucleus chip.
- Existing persisted favorites containing `NN` render cleanly without requiring the user to clear storage.
- Stop detail exposes a keyboard-accessible favorite toggle when the routed stop can be resolved, reflects external favorite changes, and uses the existing favorite store.
- Stop detail remains functional if the directory cannot resolve the stop; the favorite control simply does not appear.
- Favorites exposes an explicit add-favorite action and uses the existing search field for canonical stop discovery.
- Directory search results show favorite state and can add/remove a stop without navigation.
- Repeated clicks/toggles do not create duplicate favorites.
- Spanish and English use existing localized favorite action copy.
- Stop Detail → Lines is browser-tested at 390×844 and 1440×900 with the reported terminal sentinel fixture and no horizontal overflow.
- Mobile and desktop layouts remain usable, with existing touch-target, focus and accessibility rules preserved.
- A valid reviewed baseline is an ancestor of the PR head and the visual-regression workflow completes render, exact pixel comparison and enforcement successfully.

## Tests

- Data normalization unit coverage: null/empty/whitespace, exact `NN` case variants and legitimate text containing `nn`.
- Stop directory regression coverage for normalized search options and chunk records, including no placeholder search match.
- Stop info regression coverage for API nucleus normalization.
- Favorite storage/service regression coverage for historical persisted `NN` data.
- Stop detail component coverage for resolved/unresolved stops, active/inactive favorite state, toggle mutation and consortium-aware lookup.
- Favorites component coverage for add-mode directory search, stale-query cancellation, add/remove toggles, existing list filtering and hidden empty nucleus metadata.
- `RouteLinesApiService` coverage proves terminal `NN` removal while preserving `Annarosa - Centro` and `NN Express - Centro`.
- Playwright interaction coverage injects the reported `Adra - Venta Del Viso NN` response into Stop Detail → Lines, asserts the normalized name, checks overflow at 390×844 and 1440×900, and captures both states.
- The visual-evidence workflow publishes Stop Detail → Lines captures as mandatory evidence.
- Workflow run `33404790828` verifies the baseline failure-reporting fix.
- Workflow run `33410955117` verifies the approved baseline end to end: baseline resolution, baseline render, PR-head render, exact pixel comparison and enforcement all passed.

## Risks

- `NN` is treated as a provider sentinel in the nucleus field only when it is the entire normalized field; broader substring stripping would corrupt legitimate place names.
- The line-name rule is intentionally narrow: only an isolated terminal token is removed from `lineasPorParadas` summaries. A future upstream contract that uses terminal `NN` as meaningful route text requires evidence and a rule revision.
- Existing stored favorites are normalized on hydration; stable IDs and stop identifiers are not rewritten.
- A stop-detail schedule may load even when the directory snapshot cannot resolve the same stop. Favorite UI degrades independently rather than failing schedule content.
- Directory discovery adds snapshot/network work only while add mode is active and a useful query is present.
- Updating the reviewed visual baseline changes the accepted visual contract. This update was performed only after explicit approval and is protected by exact pixel comparison against its immutable evidence.

## Rollback

Revert this pull request. No backend, API, database or destructive storage migration is involved. If the baseline approval itself must be reverted, restore the previous `.github/visual-baseline.json` only together with a valid reviewed ancestor/evidence pair; do not reintroduce a known-diverged baseline.

## Delivery status

- Reconnaissance: complete.
- Specification: complete and synchronized with the dual `NN` sources, final implementation evidence, baseline-gate hardening and approved visual baseline.
- Tests: complete; canonical unit/script/deploy checks, Playwright interaction coverage and exact visual-regression comparison have passed.
- Implementation: complete for nucleus metadata, favorites management and terminal stop-line summary sentinel normalization.
- Runtime/visual validation: complete; affected Favorites and Stop Detail mobile/desktop states were inspected with no new visual defect found.
- CI reporting hardening: complete and verified through real Actions execution.
- Reviewed visual baseline: approved and verified; run `33410955117` passed every required pixel comparison.
- Remaining functional or CI blockers: none known.
- This final specification sync changes documentation only. Exact-head checks for this documentation-only commit are recorded in the PR body rather than creating another self-referential specification commit.

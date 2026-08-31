# Stop metadata cleanup and favorite management

## Request

Apply the reported stop/favorites UX feedback without mixing it into the PWA branding pull request:

- Do not expose CTAN's `NN` nucleus placeholder as user-facing stop metadata.
- Let users add or remove the currently viewed stop from favorites directly from stop detail.
- Let users add favorites from the Favorites page itself, using its search control to discover stops instead of forcing a detour through route search.

## Evidence

- CTAN stop-directory snapshot data contains `NN` as a nucleus value; it is upstream data rather than text introduced by the templates.
- `StopDirectoryService` currently copies `nucleus` from snapshot index/chunk records verbatim into every `StopDirectoryOption` and `StopDirectoryRecord`.
- `StopInfoService` also copies the API `nucleo` field verbatim after whitespace trimming.
- `StopFavoritesService` persists and restores nucleus text without canonical normalization, so existing local favorites can retain historical `NN` values.
- `RouteSearchFormComponent` already proves the canonical favorite mutation path: `FavoritesFacade.toggle(StopDirectoryOption)`.
- `StopDetailComponent` already owns the consortium-aware routed stop context but does not resolve a favorite option or expose favorite actions.
- `FavoritesComponent` already has a searchable favorites list, but its search is local-only and the page has no add flow.

## Decision

1. Treat exact, case-insensitive `NN` nucleus values as missing CTAN metadata at the stop data boundary. Do not mutate real names containing `nn`.
2. Keep one normalization owner in the stop data layer and consume it from stop directory, stop info and persisted favorite hydration.
3. Represent a missing nucleus as an empty string in directory/favorite option contracts and `null` in nullable stop-info contracts; templates must not render empty nucleus chips/separators.
4. Reuse `StopDirectoryFacade` and `FavoritesFacade`; do not introduce a second favorite store or duplicate stop lookup logic.
5. Stop detail resolves the routed stop to a canonical `StopDirectoryOption`, derives favorite state reactively from `favorites$`, and toggles through `FavoritesFacade`.
6. Favorites keeps one visible search field. Its existing query continues to filter saved favorites; when add mode is enabled, the same query also searches the canonical stop directory and shows matching stops with add/remove favorite actions.
7. Directory discovery is debounced, requires the existing minimum useful query length through the directory service, cancels stale requests with `switchMap`, and never blocks the saved-favorites list.
8. Reuse existing translated add/remove favorite strings and existing favorite icons where possible; no browser alert/modal is introduced.

## Acceptance

- A nucleus value `NN`, `nn`, mixed case or surrounded by whitespace is never rendered as stop metadata.
- Empty/missing nucleus values do not leave a dangling separator or empty nucleus chip in affected favorite/search surfaces.
- Non-placeholder nucleus names remain unchanged.
- Existing persisted favorites containing `NN` render cleanly without requiring the user to clear storage.
- Stop detail exposes a keyboard-accessible favorite toggle when the routed stop can be resolved, reflects external favorite changes, and uses the existing favorite store.
- Stop detail remains functional if the directory cannot resolve the stop; favorite control simply does not appear.
- Favorites exposes an explicit add-favorite action and uses the existing search field for canonical stop discovery.
- Directory search results show favorite state and can add/remove a stop without navigating away.
- Repeated clicks/toggles do not create duplicate favorites.
- Spanish and English use existing localized favorite action copy.
- Mobile and desktop layouts remain usable, with touch targets and focus states meeting existing design-system rules.

## Tests

- Data normalization unit coverage: null/empty/whitespace, exact `NN` case variants, and legitimate text containing `nn`.
- Stop directory regression coverage for normalized search options and chunk records, including no placeholder search match.
- Stop info regression coverage for API nucleus normalization.
- Favorite storage/service regression coverage for historical persisted `NN` data.
- Stop detail component coverage for resolved/unresolved stops, active/inactive favorite state, toggle mutation and consortium-aware lookup.
- Favorites component coverage for add-mode directory search, stale-query cancellation behavior through RxJS state, add/remove toggles, existing list filtering, and hidden empty nucleus metadata.
- Existing lint, unit, coverage, build/deploy and exact-head visual evidence workflows remain green.

## Risks

- `NN` is treated as a provider sentinel only when it is the entire normalized nucleus field; broader substring stripping would corrupt legitimate place names and is forbidden.
- Existing stored favorites are normalized on hydration; their stable IDs and stop identifiers are not rewritten.
- A stop-detail schedule may load even when the directory snapshot cannot resolve the same stop. Favorite UI must degrade independently rather than failing the schedule page.
- Directory search on Favorites adds network/snapshot work only while add mode is active and a useful query is present.

## Rollback

Revert this pull request. No backend, API, database or destructive storage migration is involved.

## Delivery status

- Reconnaissance: complete.
- Specification: complete.
- Tests: pending.
- Implementation: pending.
- Runtime/visual validation: pending.
- CI/final review: pending.

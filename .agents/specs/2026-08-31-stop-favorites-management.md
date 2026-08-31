# Stop and line favorite management

## Request

Implement the favorite-management workflow across the actual traveler surfaces and remove CTAN's `NN` sentinel everywhere it can reach user-facing line names.

The task was reopened after direct browser validation showed the prior implementation was incomplete:

- `/lines` still rendered catalog names such as `Almería - Huércal - Viator - Campamento NN` and `Almería - Los Molinos - El Mamí - Venta Gaspar - El Alquián NN`.
- The line directory exposed no favorite action.
- Line detail exposed no favorite action.
- The Favorites experience remained stop-only rather than aggregating the favorite entity types reachable from the application.

Stop favorites already added in this pull request remain in scope: Stop Detail must keep its favorite toggle and Favorites must keep canonical stop discovery without forcing a detour through route search.

## Evidence

- User browser evidence on 2026-08-31 shows `/lines` rendering multiple terminal `NN` tokens from catalog line names.
- `LinesComponent` renders `LineDirectoryEntry.name`.
- `LineDirectoryService` maps `CatalogLineEntry.name` without normalization.
- `ConsortiumCatalogService.readLines()` trims line names but does not remove the provider sentinel.
- `RouteLinesApiService` already removes terminal `NN` for `lineasPorParadas`, proving the provider sentinel occurs in line-name contracts, but that normalization is private to one API mapper and therefore does not protect the catalog or line-detail contract.
- `route-line-detail.mapper.ts` also maps `detail.nombre` verbatim.
- Stop favorites have one canonical owner through `StopFavoritesService`/`FavoritesFacade`; the Favorites page and Home preview consume only that stop stream today.
- There is no line-favorite domain/storage owner in the current branch.
- The existing line directory and line detail are first-class navigable traveler surfaces and therefore must expose the same persistent favorite affordance when lines become favoriteable.

## Decision

1. Introduce one line-name normalization owner in the line data boundary and reuse it for catalog lines, stop-line summaries, and line detail. Remove only an isolated, case-insensitive terminal `NN` token plus terminal whitespace. Preserve internal `NN` text and legitimate names such as `Annarosa - Centro` and `NN Express - Centro`.
2. Keep stop favorite storage unchanged and introduce a separate line-favorite store with a stable consortium-aware key. Do not overload stop contracts with line fields.
3. Expose line favorite mutations through a line facade; consumers must not write local storage directly.
4. Add a read-model aggregator that combines stop and line favorites for surfaces that present "Favorites" as one product concept. The underlying stop and line stores remain authoritative for their own entities.
5. Add keyboard-accessible line favorite toggles to the Lines directory cards and Line Detail hero. Do not nest buttons inside links.
6. The Favorites page aggregates both entity types, filters both with its search text, keeps canonical stop discovery in add mode, and lets users remove either entity type.
7. The Home Favorites preview consumes the aggregate rather than silently omitting line favorites.
8. Reuse existing star icons and shared navigation builders. Add localized copy only where the existing stop-specific wording would otherwise become misleading.
9. No browser alert/confirm primitives are allowed; destructive confirmation continues through the shared overlay dialog.
10. Any rendered UI change requires exact-head mobile and desktop visual evidence. Do not advance the reviewed baseline again without explicit approval after the new evidence is inspected.

## Acceptance

- No user-facing line name produced from catalog lines, `lineasPorParadas`, or line detail ends with the isolated CTAN `NN` sentinel.
- Internal `NN` text remains unchanged.
- `/lines` exposes an independent favorite toggle per line without breaking card navigation, keyboard access, pagination, filtering, or responsive layout.
- Line Detail exposes favorite state and add/remove mutation for the current consortium-aware line.
- Favorite state updates reactively between Lines, Line Detail, Favorites, and Home when those surfaces are open after navigation.
- Repeated line toggles do not create duplicate persisted entries.
- Favorites presents saved stops and saved lines in one experience, supports text filtering across both, and preserves stop-directory discovery for adding stop favorites.
- Clearing all favorites clears both stores only after shared-dialog confirmation.
- Home Favorites preview includes line favorites rather than reading only the stop store.
- Existing stop favorite behavior and historical `NN` stop-metadata normalization remain intact.
- Spanish and English labels describe aggregate favorites accurately.
- Mobile 390×844 and desktop 1440×900 evidence covers Lines with favorite actions, Line Detail with favorite action, and the aggregated Favorites page with no horizontal overflow or overlapping interactive controls.

## Tests

- Pure line-name normalization tests cover terminal sentinel case/whitespace variants and legitimate internal text.
- Catalog tests prove the directory data source normalizes terminal `NN`.
- Route-lines API tests continue to prove stop-line summary normalization.
- Line-detail mapper/API coverage proves detail names normalize through the same owner.
- Line favorite storage/service tests cover hydration validation, stable keys, add/remove/toggle, deduplication and persistence.
- Aggregate facade tests prove stop and line streams are combined without duplicating ownership.
- Lines component coverage proves favorite state, toggle mutation and separate link/button semantics.
- Line Detail component coverage proves current-line favorite state and mutation.
- Favorites component coverage proves aggregate rendering/filtering/removal/clear-all while retaining stop discovery.
- Home preview coverage proves both favorite entity types navigate to their canonical detail routes.
- Playwright exact-head coverage verifies the reported `/lines` sentinel fixture and the aggregate favorite workflow at required viewports.

## Risks

- Broad substring replacement would corrupt legitimate names; normalization must remain terminal-token-only.
- Stop and line local-storage payloads must remain separate so existing stop favorites require no migration.
- A line favorite created from Line Detail may have less optional presentation metadata than one created from the directory; the persisted contract must require only fields available on both surfaces.
- Updating the visual baseline before inspecting the new evidence would normalize an unreviewed UI contract and is forbidden.

## Rollback

Revert the commits added after the 2026-08-31 browser-validation reopening. Stop-favorite data already persisted under its existing key remains backward compatible. Line favorites use their own key and can be removed independently.

## Delivery status

- Reopened browser reproduction: complete.
- Root cause for `/lines` sentinel leak: confirmed in the catalog line-name path.
- Missing line-favorite domain/store: confirmed.
- Missing aggregate favorite read model: confirmed.
- Implementation/tests/runtime/visual evidence: in progress.
- Reviewed visual baseline: previous approval remains valid only for the previous UI; a new baseline update requires explicit approval after this reopened scope is validated.

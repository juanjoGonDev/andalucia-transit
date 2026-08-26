# Preserve every consortium stop on the map

## Request

Investigate why some stops are missing from the network map and fix the data path before completing map search, popovers and linked highlighting.

## Evidence

- The stop-directory snapshot is split across nine consortium chunks and contains more than one consortium using the same local `stopId` values.
- Repository search shows `stopId = "119"` in multiple consortium chunk files, so `stopId` is not globally unique.
- `scripts/snapshot/stop-directory.ts` treats a stop identity as `consortiumId + stopId` when collecting canonical snapshot records.
- `nearby-stops.loader.ts` currently deduplicates all chunks with `seen.has(stop.stopId)`. The first consortium owning a local identifier wins and later valid stops with the same local identifier are silently dropped.
- `NearbyStopsService.getAllStops()` has no result limit. The configured nearby-stop limit only bounds the nearby list, and the map-search result limit only bounds autocomplete suggestions; neither should limit the global marker layer.

## Decision

1. Use the composite consortium/stop identity when deduplicating lightweight stop records.
2. Carry consortium identity through nearby results and map marker/search identities so later interaction cannot collapse records again.
3. Resolve stop metadata by composite signature wherever a nearby result already knows its consortium.
4. Keep UI suggestion limits separate from the complete network dataset.
5. Add regression coverage with two different consortium records sharing the same local stop identifier.
6. Do not change the canonical public stop-detail route contract unless needed; when map navigation needs disambiguation, prefer a backward-compatible consortium query parameter.

## Acceptance

- Two records with the same `stopId` in different consortiums are both retained by the lightweight loader.
- The global map renders both records with distinct marker identities.
- Nearby-stop metadata resolves against the originating consortium.
- Search can distinguish both records and still limits only the suggestion list.
- Existing route-search behavior remains compatible.
- Angular, lint, scripts, build/deploy validation and deterministic map browser evidence pass on the final head.

## Risks

- Existing consumers that assumed `stopId` was global may resolve the wrong metadata. Audit each `NearbyStopResult` consumer before making consortium identity required.
- Stop-detail schedule loading historically accepts only a local stop id. Map navigation must not silently show a different consortium's stop when identifiers collide.

## Tests

- Lightweight loader retains same-local-id records from two consortium chunks.
- Nearby result carries consortium identity.
- Map search/marker tests cover composite identities.
- Browser acceptance covers search focus, marker popover/detail action and linked hover/focus highlight.

## Rollback

Revert the focused stop-identity and map-interaction commits. No persisted user data or remote schema changes are involved.

## Status

In progress.

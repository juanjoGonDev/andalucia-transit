# Preserve every consortium stop identity

## Request

Finish consortium-aware stop identity across every navigation entry point. Real-browser review exposed that some links open `/stop-detail/:stopId` without consortium context, allowing duplicated local stop identifiers to resolve to a different stop/municipality.

## Evidence

- The stop directory contains local `stopId` values reused by different consortiums; `stopId` is not globally unique.
- `MapComponent.navigateToStop()` already carries `consortiumId` through the stop-detail query parameter.
- `StopFavorite` already stores `consortiumId`, but `HomeComponent.openFavorite()` and `FavoritesComponent.stopDetailCommands()` currently discard it and navigate using only the first local `stopId`.
- `StopDetailComponent` accepts an optional `consortiumId`; when absent it falls back to lookup by local stop id, which can select an arbitrary matching consortium.
- `StopInfoComponent` itself uses the composite path `/:consortiumId/:stopNumber`, so a wrong stop-detail resolution propagates wrong identity into the information view.
- The existing route contract can remain backward compatible without making local stop ids authoritative.

## Decision

1. Treat `{ consortiumId, stopId }` as the canonical stop identity everywhere in application-generated navigation.
2. Introduce/reuse one shared navigation builder for stop-detail links so callers cannot silently omit consortium context.
3. Update Home favorites, Favorites, Map and every other stop-detail entry point to consume that builder.
4. Keep `/stop-detail/:stopId` as the public route for compatibility, with `consortiumId` carried in query parameters by generated links.
5. Stop-detail data loading must prefer the composite identity whenever consortium context is present.
6. A legacy deep link without consortium may use local-id fallback only when that local id is unambiguous. If multiple consortium records share it, do not silently pick the first record; surface a recoverable ambiguous/not-found state or require disambiguation.
7. Stop-info navigation must be derived from the resolved composite stop record, never from display name, municipality text or stale component state.

## Acceptance

- Home favorite navigation includes the favorite's consortium.
- Favorites-page navigation includes the favorite's consortium.
- Map popup/detail navigation preserves the marker consortium.
- Any route/line stop links use canonical composite identity.
- A duplicated local stop id cannot silently render a stop from a different consortium.
- Stop-info opened from stop detail receives the same consortium/stop identity that produced the visible stop.
- Back/forward/deep-link behavior remains compatible for unambiguous legacy local ids.

## Tests

- Shared navigation-builder unit tests.
- Regression tests with the same local stop id in two consortiums.
- Component tests for Home, Favorites, Map and stop detail entry points.
- Playwright opens stop detail/info from map and another non-map context and asserts the expected stop name/municipality remains stable.

## Rollback

Revert the navigation builder and focused call-site changes. No storage migration is required because favorites already persist `consortiumId`.

## Status

In progress: canonical identity exists in data but is not yet enforced by all navigation callers.

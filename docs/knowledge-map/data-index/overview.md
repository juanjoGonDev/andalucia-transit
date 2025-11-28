---
title: Data and API Index
intent: Capture external APIs, local datasets, and data flow contracts
tags: [data,api]
last_scanned: 2025-10-21
source_of_truth: [docs/api-reference.md, docs/map-data-sources.md, src/app/data, src/assets/data]
---
**When to use:** Identify where data originates, how it is stored, and which modules consume it.

## CTAN and Related APIs
- Primary endpoints documented in `docs/api-reference.md`; implemented by services in [`../repo-index/src-app-data.md`](../repo-index/src-app-data.md).
- Route search uses `/Consorcios/{id}/lineas/{lineId}` and timetable endpoints via `route-lines-api.service.ts` and `route-timetable.api-service.ts`.
- Stop schedules fetched through `stop-schedule.api-service.ts` with repository caching.
- Holiday adjustments rely on Nager.Date API via `holiday-calendar.api-service.ts`.

## Local Snapshots and Assets
- Generated datasets under `src/assets/data/`:
  - `catalog/` consortium metadata for pickers.
  - `stop-directory/` chunked stops index consumed by `stop-directory.service.ts`.
  - `snapshots/stop-services` schedule payloads for offline viewing.
  - `news/feed.json` static feed for `news-feed.service.ts`.
- Snapshot pipeline maintained by [`../repo-index/scripts.md`](../repo-index/scripts.md#directories).

## Environment and Runtime Flags
- Runtime toggles defined in `src/assets/runtime-flags.js` and loaded via `runtime-flags.service.ts`.
- Angular environment configuration handled through `app.config.ts` and DI tokens in `src/app/core/tokens`.

## Data Flows
1. User request triggers feature component (see [`../components-index/overview.md`](../components-index/overview.md)).
2. Component calls domain facade/service under `src/app/domain/**`.
3. Domain layer delegates to data services (`src/app/data/**`) for API or snapshot access.
4. Results mapped to domain models and exposed as observables back to components.
5. Cached data stored via storage services (`route-search-*.storage.ts`, `stop-favorites.storage.ts`).

## Mapping and Geolocation
- Leaflet map overlays built from route search results and CTAN line stop endpoints; geometry handled in `route-overlay-geometry.ts`.
- Geolocation consent enforced by `geolocation.service.ts`; offline awareness documented in `docs/map-data-sources.md`.
- Attribution and caching rules detailed in `docs/map-data-sources.md`.

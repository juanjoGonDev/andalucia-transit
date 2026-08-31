---
title: Domain Layer Index
intent: Catalog facades, models, and utilities orchestrating business logic
tags: [angular,domain]
last_scanned: 2025-10-21
source_of_truth: [src/app/domain]
---
**When to use:** Trace domain services that mediate between data adapters and UI components.

# Directories
- `map/`
  - `route-overlay.facade.ts` (+ spec) → Manages Leaflet overlay state.
  - `route-overlay-geometry.ts` (+ spec) → Geometry helpers for map polylines.
- `news/`
  - `news.facade.ts` (+ spec) → Supplies news feed data to presentation layer.
- `route-search/`
  - `route-search-execution.service.ts` (+ spec) → Runs route queries via data services.
  - `route-search-history.service.ts`, `route-search-preferences.service.ts` → Domain wrappers for storage.
  - `route-search-results.service.ts` (+ spec) → Shapes results for display.
  - `route-search-selection-resolver.service.ts` (+ spec) → Router resolver for detail routes.
  - `route-search-selection.util.ts`, `route-search-preview.service.ts`, `route-search-url.util.ts` (+ specs) → Selection logic and URL encoding.
  - `recent-searches.facade.ts` and `stop-connections.facade.ts` (+ specs) → Observables for UI.
- `stop-schedule/`
  - `stop-schedule.facade.ts` (+ spec) → Aggregates schedule data for stop detail.
  - `stop-schedule.model.ts`, `stop-schedule.transform.ts` (+ spec) → Domain models and mappers.
- `stops/`
  - `favorites.facade.ts`, `stop-directory.facade.ts`, `stop-info.facade.ts` (+ specs) → Manage stop state and favorites.
  - `stop-favorites.service.ts` → Business rules on top of storage.
- `utils/`
  - `distance-display.util.ts`, `geo-distance.util.ts`, `language.util.ts`, `progress.util.ts`, `time.util.ts` → Pure helpers reused across facades.

# Linked Shards
- Feature consumers: [`src-app-features.md`](./src-app-features.md).
- Data sources powering these services: [`src-app-data.md`](./src-app-data.md).

---
title: Data Layer Index
intent: Highlight infrastructure services bridging APIs and storage
tags: [angular,data]
last_scanned: 2025-10-21
source_of_truth: [src/app/data]
---
**When to use:** Find API clients, repositories, and storage services backing domain flows.

# Directories
- `holidays/`
  - `holiday-calendar.api-service.ts` → Calls Nager.Date API; service wraps caching logic with spec coverage.
- `news/`
  - `news-feed.service.ts` → Reads static snapshot feeds; spec ensures parsing.
- `route-search/`
  - `route-lines-api.service.ts` and `route-timetable.api-service.ts` → HTTP access to CTAN endpoints.
  - `route-timetable.mapper.ts` (+ spec) → Transforms API models to domain timetables.
  - `route-timetable.service.ts` (+ spec) → Aggregates mapper and API service.
  - `route-search-history.storage.ts`, `route-search-preferences.storage.ts` → Persisted user history/preferences.
  - `stop-connections.service.ts` (+ spec) → Resolves inter-stop connections for search results.
- `services/`
  - `transit-api.service.ts` → Base HttpClient wrapper.
  - `stop-schedule.api-service.ts` and repository/service pairs manage schedule snapshots with tests.
- `stops/`
  - `stop-directory.service.ts` (+ spec) → Streams stop index assets.
  - `stop-favorites.storage.ts` → Local storage management.
  - `stop-info.service.ts` (+ spec) → Detailed stop metadata retrieval.

# Linked Shards
- Domain consumers: [`src-app-domain.md`](./src-app-domain.md).
- Data assets served to clients: [`../data-index/overview.md`](../data-index/overview.md).

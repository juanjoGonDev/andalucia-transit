---
title: Feature Cross-Reference
intent: Provide quick lookup between concepts, code, docs, tests, and data
tags: [reference]
last_scanned: 2025-10-21
source_of_truth: [src, docs]
---
**When to use:** Jump from a feature name to its implementation, documentation, tests, and data sources.

| Concept/Feature | Key Files | Docs | Tests | Data/APIs |
| --- | --- | --- | --- | --- |
| Home dashboard | [`home.component.ts`](../repo-index/src-app-features.md) | [`docs-index`](./docs-index/overview.md#feature-tracking), [`keyboard patterns`](../accessibility/keyboard-patterns.md), [`home dashboard audit`](../audit/home-dashboard.md) | `home.component.spec.ts`, `recent-searches` specs, Playwright `tests/playwright/home-tabs.keyboard.spec.ts` | Route search storage services in [`src-app-data`](../repo-index/src-app-data.md#directories) |
| Route search | [`route-search` feature](../repo-index/src-app-features.md) | [`component-refactor-plan`](./docs-index/overview.md#component-and-layout-plans) | Feature + domain specs, Cypress and Playwright suites | CTAN route/timetable APIs, local history storage |
| Map overlays | `map.component.ts`, `route-overlay.facade.ts` | [`map-data-sources`](./docs-index/overview.md#map-and-data-governance) | Map component spec | CTAN line stops endpoint via `route-lines-api.service.ts` |
| Stop detail | `stop-detail.component.ts`, `stop-schedule.facade.ts` | [`project-plan`](./docs-index/overview.md#feature-tracking), [`stop-detail accessibility`](../accessibility/stop-detail.md), [`stop-detail audit`](../audit/stop-detail.md) | Stop detail spec, stop-schedule specs, Playwright `tests/playwright/stop-detail.accessibility.spec.ts` | Stop schedule API + snapshots |
| Favorites | `favorites.component.ts`, `favorites.facade.ts` | [`feature-checklist`](./docs-index/overview.md#feature-tracking) | Favorites component spec, favorites facade spec | Stop directory assets, favorites storage |
| Settings & language | `settings.component.ts`, `language.service.ts` | [`component-refactor-plan`](./docs-index/overview.md#component-and-layout-plans) | Settings spec, language service spec | Translation dictionaries `src/assets/i18n/*.json` |
| News feed | `news.component.ts`, `news.facade.ts` | [`docs-index`](./docs-index/overview.md#api-and-data-references) | News component spec, news facade spec | `news-feed.service.ts`, `assets/data/news/feed.json` |
| PWA shell | `app.ts`, `shared/layout/app-shell` | [`docs-index`](./docs-index/overview.md#deployment-and-environment-docs) | App shell specs | Manifest + service worker config |
| Snapshot pipeline | `scripts/snapshot/**` | `development-environment.md` | Snapshot script tests | Generated assets under `src/assets/data` |

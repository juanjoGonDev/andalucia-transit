---
title: Components and Features Index
intent: Highlight major application features, their files, and verification hooks
tags: [angular,features,testing]
last_scanned: 2025-10-21
source_of_truth: [src/app/app.ts, src/app/features, src/app/shared, src/app/core, tests/playwright, cypress/e2e]
---
**When to use:** Understand which files deliver a feature, its supporting services, and associated tests.

## PWA Shell
- Files: `src/app/app.ts`, `app.config.ts`, `app.routes.ts`; shell layout in `src/app/shared/layout/app-shell` and `app-layout`.
- Responsibilities: Wraps all routes under `AppShellComponent` with layout context store.
- Tests: `src/app/app.spec.ts`, `src/app/app.routes.spec.ts`.
- Related docs: [`../repo-index/public.md`](../repo-index/public.md).

## Home Dashboard
- Files: `src/app/features/home/home.component.*`, `home/shared`, `home/recent-searches`.
- Domain: `recent-searches.facade.ts`, `route-search-history.service.ts`.
- Tests: Feature spec plus domain specs in `src/app/domain/route-search`.
- Docs: [`../docs-index/overview.md`](../docs-index/overview.md#feature-tracking).

## Route Search
- Files: `src/app/features/route-search/**`, including nested `route-search-form` and state styles.
- Domain: Execution/results/selection services in `src/app/domain/route-search`.
- Data: API services in `src/app/data/route-search`.
- Tests: Specs across feature, domain, and data layers.
- E2E: Covered by `cypress/e2e/spec.cy.ts` and `tests/playwright/smoke.spec.ts`.

## Map Experience
- Files: `src/app/features/map/map.component.*`.
- Domain: `route-overlay.facade.ts`, `route-overlay-geometry.ts`.
- Shared: `leaflet-map.service.ts`.
- Docs: [`../data-index/overview.md`](../data-index/overview.md#mapping-and-geolocation), [`../docs-index/overview.md`](../docs-index/overview.md#map-and-data-governance).

## Favorites and Stops
- Favorites feature: `src/app/features/favorites` with domain facades in `src/app/domain/stops` and storage services in `src/app/data/stops`.
- Stop detail: `src/app/features/stop-detail`, `stop-info`, domain `stop-schedule` and `stops` modules.
- Data: `stop-schedule.api-service.ts`, `stop-directory.service.ts`.
- Tests: Feature specs plus stop facades/services specs.

## News Feed
- Files: `src/app/features/news`.
- Domain/Data: `news.facade.ts`, `news-feed.service.ts`.
- Assets: `src/assets/data/news/feed.json`.

## Settings
- Files: `src/app/features/settings/settings.component.*`.
- Core: `language.service.ts`, runtime flags service.
- Tests: Feature spec plus `language.service.spec.ts`.

## Localization
- Core files: `src/app/core/i18n/**`, `language.service.ts`, `src/assets/i18n/*.json`.
- Docs: [`../docs-index/overview.md`](../docs-index/overview.md#component-and-layout-plans).

## A11y and Shared UI
- Shared assets: `src/app/shared/a11y`, `shared/ui`, `shared/layout`.
- Tests: Directive specs, dialog specs, form component specs.
- Docs: `docs/features-checklist.md` accessibility tasks.

## Design System
- Tokens: `src/styles/`, `src/styles.scss`, theme declarations.
- Docs: [`../docs-index/overview.md`](../docs-index/overview.md#component-and-layout-plans).

## End-to-End Coverage
- Cypress: [`../repo-index/cypress.md`](../repo-index/cypress.md).
- Playwright: [`../repo-index/tests.md`](../repo-index/tests.md).

## Planned Refactors
- Source: `docs/component-refactor-plan.md`.
- Impacted files: `src/app/shared/layout`, `src/app/features/*`, `src/app/shared/ui`.

## Feature Coverage
- Checklist: `docs/features-checklist.md` for completed scopes.
- QA Evidence: screenshot workflow in `docs/development-environment.md` and `scripts/screenshot.js`.

## Open Initiatives
- Refer to `docs/project-plan.md` for active tasks.
- Update relevant feature shards with change notes when executing plan items.

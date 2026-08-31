---
title: App Directory Overview
intent: Describe top-level architecture under `src/app`
tags: [repository,angular]
last_scanned: 2025-10-21
source_of_truth: [src/app]
---
**When to use:** Locate major Angular layers and navigate to specialized shards.

# Structure
- `app.config.ts`, `app.ts`, `app.html`, `app.scss` → Shell component setup.
- `app.routes.ts`, `app.routes.spec.ts` → Route configuration and tests.
- `core/` → Application-wide services and providers; see [`src-app-core.md`](./src-app-core.md).
- `data/` → Infrastructure adapters and API integrations; see [`src-app-data.md`](./src-app-data.md).
- `domain/` → Domain models and logic utilities; see [`src-app-domain.md`](./src-app-domain.md).
- `features/` → Page-level and feature components; see [`src-app-features.md`](./src-app-features.md).
- `shared/` → Shared UI, layout, and accessibility components; see [`src-app-shared.md`](./src-app-shared.md).

# Testing Hooks
- Route spec ensures navigation wiring; feature-level tests referenced in respective shards.

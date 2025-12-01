---
title: Features Layer Index
intent: Outline standalone feature components and related UI modules
tags: [angular,features]
last_scanned: 2025-10-21
source_of_truth: [src/app/features]
---
**When to use:** Map feature directories to their primary components, templates, and specs.

# Directories
- `favorites/` → `favorites.component.*` renders saved stops; spec covers rendering and interactions.
- `home/`
  - `home.component.*` orchestrates dashboard; uses `home.types.ts` models.
  - `recent-searches/` → Dashboard subcomponents and UI primitives.
  - `shared/` → Home-specific widgets reused across subsections.
- `map/` → Map view component and spec using Leaflet overlays.
- `news/` → News feed component binding to `news.facade`.
- `route-search/`
  - `route-search.component.*` plus styling variants for summary, timeline, and states.
  - `route-search-form/` → Nested form component with own spec.
- `settings/` → Settings component toggling language and runtime flags.
- `stop-detail/` → Stop detail page with list layout SCSS and spec verifying schedule rendering.
- `stop-info/` → Condensed stop info view leveraging stop directory data.

# Linked Shards
- Supporting facades: [`src-app-domain.md`](./src-app-domain.md).
- Shared UI resources: [`src-app-shared.md`](./src-app-shared.md).

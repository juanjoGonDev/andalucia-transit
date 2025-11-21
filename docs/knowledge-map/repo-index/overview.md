---
title: Repository Tree Overview
intent: Summarize top-level folders and link to detailed shards
tags: [repository]
last_scanned: 2025-10-21
source_of_truth: [.] 
---
**When to use:** Quickly assess repository layout before diving into specific shards.

# Top-Level Structure
- `src/` → Angular application source; see [`src.md`](./src.md).
- `docs/` → Documentation set; see [`../docs-index/overview.md`](../docs-index/overview.md).
- `public/` → Static assets served as-is; see [`public.md`](./public.md).
- `scripts/` → Node utilities for bootstrap, snapshots, deploy; see [`scripts.md`](./scripts.md).
- `tools/` → Standalone utilities; see [`tools.md`](./tools.md).
- `tests/` → Playwright smoke suite; see [`tests.md`](./tests.md).
- `cypress/` → Cypress E2E suite; see [`cypress.md`](./cypress.md).
- Root configs (`angular.json`, `package.json`, etc.) → summarized in [`root.md`](./root.md).

# Quick Links
- Components overview: [`../components-index/overview.md`](../components-index/overview.md).
- Data flow summary: [`../data-index/overview.md`](../data-index/overview.md).
- Cross-reference matrix: [`../cross-reference.md`](../cross-reference.md).

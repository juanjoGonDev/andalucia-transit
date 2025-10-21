---
title: Docs Library Overview
intent: Summarize existing documentation assets and their entry points
tags: [documentation]
last_scanned: 2025-10-21
source_of_truth: [docs/api-reference.md, docs/api.html, docs/component-refactor-plan.md, docs/development-environment.md, docs/features-checklist.md, docs/map-data-sources.md, docs/project-plan.md, docs/ui-theme.md]
---
**When to use:** Decide which document covers a question before opening the source file.

# API and Data References
- `api-reference.md` → Live CTAN API usage notes and integration policies; aligns with [`../data-index/overview.md`](../data-index/overview.md#ctan-and-related-apis) and [`../repo-index/src-app-data.md`](../repo-index/src-app-data.md).
- `api.html` → Static snapshot of CTAN API portal; consult when upstream schema details are needed offline.

# Component and Layout Plans
- `component-refactor-plan.md` → Sequenced refactor roadmap enforcing visual parity; see [`../components-index/overview.md`](../components-index/overview.md#planned-refactors) for change notes.
- `ui-theme.md` → Token changes for styling parity; referenced in [`../components-index/overview.md`](../components-index/overview.md#design-system).

# Deployment and Environment Docs
- `development-environment.md` → Bootstrap steps and targeted verification commands; cross-reference [`../repo-index/scripts.md`](../repo-index/scripts.md).

# Feature Tracking
- `features-checklist.md` → Completion log and QA requirements; pairs with [`../components-index/overview.md`](../components-index/overview.md#feature-coverage) and [`../cross-reference.md`](../cross-reference.md).
- `project-plan.md` → Active initiatives with acceptance criteria; map tasks to components via [`../components-index/overview.md`](../components-index/overview.md#open-initiatives).

# Map and Data Governance
- `map-data-sources.md` → Licensing, caching, and consent for mapping; links to [`../data-index/overview.md`](../data-index/overview.md#mapping-and-geolocation).

# Maintenance Notes
- Refresh `api.html` and `api-reference.md` together after upstream changes.
- When executing plan milestones, annotate relevant shards with change notes.

---
title: Scripts Directory Index
intent: Summarize automation scripts for setup, deployment, data snapshots, and visual regression
tags: [tooling,scripts]
last_scanned: 2026-08-28
source_of_truth: [scripts]
---
**When to use:** Identify which script handles bootstrap, testing, deployment, snapshot, screenshot, or exact visual-regression duties.

# Files
- `bootstrap.mjs` → Non-interactive environment setup installing dependencies and tooling.
- `run-tests.cjs` → Aggregates linting, unit, e2e commands per environment flags.
- `screenshot.config.json`, `screenshot.js` → Canonical headless screenshot utility defaults and runner used by review and regression evidence.

# Directories
- `deploy/`
  - `run.ts` → Deployment preparation aligning with `npm run deploy:prepare` flow.
- `dev/`
  - `lint-workflows.ts` → Validates GitHub workflows via actionlint.
  - `prepare.mjs` → Installs Playwright Chromium and Lefthook hooks during package manager prepare.
  - `setup-environment.ts` → Local dev environment helper.
  - `start-with-mock-mode.mjs` → Launches the application in deterministic populated/empty modes used by visual workflows.
  - `start-with-snapshot.mjs` → Launches dev server preloaded with snapshot data.
- `snapshot/`
  - `config.ts` → Shared snapshot configuration.
  - `consortiums.ts` (+ tests) → Consortium metadata transforms.
  - `catalog-generator.ts`, `snapshot-generator.ts`, `stop-directory.ts` (+ tests) → Build static datasets.
  - `run.ts` → Entry point for snapshot pipeline.
- `visual/`
  - `capture-evidence.mjs` → Current-head visual harness that renders a supplied baseline/head application workspace with one shared Playwright and screenshot implementation.
  - `compare-evidence.mjs` → Exact RGBA comparator for every mandatory visual asset; zero tolerance is the regression contract.
  - `determinize-map-tiles.js` → Exact-evidence Leaflet tile stabilization while preserving map geometry, markers and attribution.

# Linked Shards
- Playwright evidence owners: [`tests.md`](./tests.md).
- Snapshot data consumers: [`src-assets.md`](./src-assets.md).
- Deployment checklist: [`../docs-index/overview.md`](../docs-index/overview.md#deployment-and-environment-docs).

---
title: Scripts Directory Index
intent: Summarize automation scripts for setup, deployment, and data snapshots
tags: [tooling,scripts]
last_scanned: 2025-10-21
source_of_truth: [scripts]
---
**When to use:** Identify which script handles bootstrap, testing, deployment, or snapshot duties.

# Files
- `bootstrap.mjs` → Non-interactive environment setup installing dependencies and tooling.
- `run-tests.cjs` → Aggregates linting, unit, e2e commands per environment flags.
- `screenshot.config.json`, `screenshot.js` → Headless screenshot utility defaults and runner.

# Directories
- `deploy/`
  - `run.ts` → Deployment preparation aligning with `npm run deploy:prepare` flow.
- `dev/`
  - `lint-workflows.ts` → Validates GitHub workflows via actionlint.
  - `prepare-playwright.mjs` → Ensures Playwright browsers are ready.
  - `setup-environment.ts` → Local dev environment helper.
  - `start-with-snapshot.mjs` → Launches dev server preloaded with snapshot data.
- `snapshot/`
  - `config.ts` → Shared snapshot configuration.
  - `consortiums.ts` (+ tests) → Consortium metadata transforms.
  - `catalog-generator.ts`, `snapshot-generator.ts`, `stop-directory.ts` (+ tests) → Build static datasets.
  - `run.ts` → Entry point for snapshot pipeline.

# Linked Shards
- Snapshot data consumers: [`src-assets.md`](./src-assets.md).
- Deployment checklist: [`../docs-index/overview.md`](../docs-index/overview.md#deployment-and-environment-docs).

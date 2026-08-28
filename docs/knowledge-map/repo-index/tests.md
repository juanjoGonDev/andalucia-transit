---
title: Playwright Tests Index
intent: Document browser acceptance, responsive, accessibility, and visual-regression coverage under `tests/`
tags: [testing,playwright,visual-regression]
last_scanned: 2026-08-28
source_of_truth: [tests]
---
**When to use:** Understand browser-level acceptance coverage, visual evidence ownership, and deterministic exact-regression behavior.

# Structure
- `playwright/`
  - `smoke.spec.ts` → Core smoke scenarios validating boot, navigation, and key flows.
  - `deterministic-visual-states.spec.ts` → Populated/empty deterministic data-state checks and mandatory Stop Detail evidence.
  - `home-tabs.layout.spec.ts`, `lines-directory.layout.spec.ts` → Responsive shell, directory, route-detail, and map interaction layout evidence.
  - `map-exploration.spec.ts`, `map-focused-lines.spec.ts` → Map search, marker, focused-line, viewport, recovery, and geometry acceptance.
  - `theme.contrast.spec.ts`, `visual-interaction-states.spec.ts` → Theme/contrast and deterministic dialogs, route states, Stop Detail task switching, news, and related visual interactions.
  - `visual-evidence.fixture.ts` → Shared visual evidence owner. Exact-regression mode freezes time, stabilizes animations/fonts/Leaflet and application scroll state, and normalizes only periodically changing CTAN test inputs so baseline/head render through one deterministic harness without relaxing RGBA comparison. Normal PR evidence remains separate and uses current application data.

# Related Files
- Root `playwright.config.ts` configures browser, base URL, and reporters.
- `scripts/dev/prepare.mjs` prepares Playwright Chromium before tests run.
- `scripts/visual/capture-evidence.mjs` runs current Playwright/screenshot tooling symmetrically against baseline and head application workspaces.
- `scripts/visual/compare-evidence.mjs` owns exact zero-tolerance RGBA comparison.
- `.github/workflows/pr-visual-regression.yml` enforces the immutable reviewed baseline contract.

# Linked Shards
- Visual/tooling scripts: [`scripts.md`](./scripts.md).
- Cypress suites: [`cypress.md`](./cypress.md).
- Feature targets: [`../components-index/overview.md`](../components-index/overview.md#end-to-end-coverage).

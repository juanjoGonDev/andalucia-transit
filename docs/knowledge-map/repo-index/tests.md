---
title: Playwright Tests Index
intent: Document non-Angular e2e smoke suites under `tests/`
tags: [testing,playwright]
last_scanned: 2025-10-21
source_of_truth: [tests]
---
**When to use:** Understand the scope of Playwright smoke coverage and related configs.

# Structure
- `playwright/`
  - `smoke.spec.ts` → Core smoke scenarios validating boot, navigation, and key flows.

# Related Files
- Root `playwright.config.ts` configures browser, base URL, and reporters.
- `scripts/dev/prepare.mjs` prepares Playwright Chromium before tests run.

# Linked Shards
- Cypress suites: [`cypress.md`](./cypress.md).
- Feature targets: [`../components-index/overview.md`](../components-index/overview.md#end-to-end-coverage).

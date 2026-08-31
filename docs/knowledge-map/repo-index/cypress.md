---
title: Cypress Suite Index
intent: Summarize Cypress end-to-end test assets
tags: [testing,cypress]
last_scanned: 2025-10-21
source_of_truth: [cypress]
---
**When to use:** Locate Cypress specs, fixtures, and support utilities.

# Directories
- `e2e/`
  - `spec.cy.ts` → Core user journey coverage (home, stop detail, route search, offline).
  - `visual-regression.cy.ts` → Visual diff scenarios using screenshot tooling.
- `fixtures/` → Static fixture data for Cypress tests.
- `support/` → Custom commands and setup modules.

# Files
- `tsconfig.json` → Cypress TypeScript config aligning with Angular tooling.

# Linked Shards
- Screenshot tooling: [`scripts.md`](./scripts.md).
- Feature components exercised: [`../components-index/overview.md`](../components-index/overview.md#end-to-end-coverage).

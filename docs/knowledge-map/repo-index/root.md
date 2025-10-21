---
title: Root Workspace Files
intent: Outline critical root-level configuration and entry files
tags: [repository,config]
last_scanned: 2025-10-21
source_of_truth: [angular.json, package.json, tsconfig.json, README.md, AGENTS.md]
---
**When to use:** Identify high-level configs, scripts, and documentation at the repository root.

# Directories
- `cypress/` → Cypress tests; see [`cypress.md`](./cypress.md).
- `docs/` → Project documentation; see [`../docs-index/overview.md`](../docs-index/overview.md).
- `public/` → Static assets; see [`public.md`](./public.md).
- `scripts/` → Automation scripts; see [`scripts.md`](./scripts.md).
- `src/` → Angular source tree; see [`src.md`](./src.md).
- `tests/` → Playwright specs; see [`tests.md`](./tests.md).
- `tools/` → Supporting utilities; see [`tools.md`](./tools.md).

# Key Files
- `AGENTS.md` → Canonical workflow guidance; update when conventions shift.
- `README.md` → Project overview and setup instructions.
- `angular.json` → Angular CLI workspace configuration.
- `package.json` → Scripts and dependencies; pairs with `pnpm-lock.yaml`.
- `tsconfig*.json` → TypeScript configs for app, tests, spec builds.
- `eslint.config.js`, `karma.conf.js`, `playwright.config.ts`, `cypress.config.ts` → Linting and test runners.
- `lefthook.yml` → Git hook automation.
- `ngsw-config.json` → Service worker setup.
- `pnpm-lock.yaml` → Dependency lockfile.

# Entry Points
- `scripts/bootstrap.mjs` referenced for environment setup; details in [`scripts.md`](./scripts.md).
- `tools/verify-route-timetables.ts` invoked in domain verification; see [`tools.md`](./tools.md).

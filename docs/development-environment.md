# Development Environment Setup

## Automated bootstrap

`scripts/bootstrap.mjs` standardizes environment provisioning across macOS, Linux, and Windows by validating the declared Node.js engine range, activating the pinned pnpm release through Corepack, installing dependencies deterministically, and wiring Lefthook so the pre-commit hook autofixes ESLint issues on staged files. Linux remains the CI baseline, so keep the bootstrap workflow non-interactive and reliable on that platform. The existing `setup:environment` npm script continues to install dependencies, validate formatting, run lint checks, execute script tests, build the Angular workspace, and generate the latest transport snapshot in a single pass while exiting on the first failure to keep feedback focused.

## Targeted checks

Use targeted commands when a full setup pass is unnecessary:

- Run `npm run lint:workflows` after editing `.github/workflows` files or other GitHub Actions resources.
- Run `npm run test:deploy` whenever deployment workflows or files inside `scripts/deploy/` change.
- Run `npm run test:scripts` and `npm run snapshot` when modifying files under `scripts/` or `tools/`.
- Run `npm run test:playwright` when modifying files inside `tests/playwright/` or Playwright helpers.
- Run `npm run test:angular -- --watch=false` together with `npm run build` whenever Angular source files in `src/` change or when tests are added or updated.
- Run `npm run format:check` whenever formatting rules might be affected, such as when editing configuration under the project root.
- Run `npm run lint` to cover TypeScript linting and dependency hygiene across the workspace.

Skip Angular unit tests when changes are limited to tooling, documentation, or workflow files that do not affect the application runtime. Chromium for headless execution now comes from the Playwright-managed bundle, replacing the previous Puppeteer dependency while keeping Cypress workflows intact. Always execute the relevant command set when touching test files or behavior covered by those checks.

## Headless Screenshot Utility

The Playwright-based script at `scripts/screenshot.js` captures deterministic UI states for documentation, QA, and CI workflows. Run it with `npm run screenshot -- --url=https://example.org --waitFor=#app-root` to trigger a basic capture and append additional flags as needed for interactions or map synchronization. The script supports navigation waits, viewport sizing, locale and timezone emulation, CPU and network throttling, offline validation, permission and geolocation injection, cookie and storage priming, DOM interactions (hover, click, double click, focus, type, press, select, scrolling), inline or file-based evaluation, accessibility assertions, Leaflet map controls (center, zoom, idle wait, tile completion, marker activation), scenario files for sequenced steps, capture variants (full page, element, clip, breakpoints), masking, and optional HAR or console logging.

Default options live in `scripts/screenshot.config.json`; use `--config` to reference an alternative profile or override values inline on the CLI. Ensure the runtime has Playwright browsers installed, a headless-friendly environment, and required fonts for accurate rendering. Outputs are written beneath `artifacts/screenshots` (or the configured directory), which stays outside version control; collected PNGs, HAR files, and logs should be uploaded as CI artefacts for reviewers.

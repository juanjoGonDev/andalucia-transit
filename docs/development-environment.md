# Development Environment Setup

## Automated bootstrap

Run `npm run setup:environment` to install dependencies, validate formatting, run lint checks, execute script tests, build the Angular workspace, and generate the latest transport snapshot in a single pass. The script provides progress logs and exits on the first failure to keep feedback focused.

## Targeted checks

Use targeted commands when a full setup pass is unnecessary:

- Run `npm run lint:workflows` after editing `.github/workflows` files or other GitHub Actions resources.
- Run `npm run test:deploy` whenever deployment workflows or files inside `scripts/deploy/` change.
- Run `npm run test:scripts` and `npm run snapshot` when modifying files under `scripts/` or `tools/`.
- Run `npm run test:angular -- --watch=false` together with `npm run build` whenever Angular source files in `src/` change or when tests are added or updated.
- Run `npm run format:check` whenever formatting rules might be affected, such as when editing configuration under the project root.
- Run `npm run lint` to cover TypeScript linting and dependency hygiene across the workspace.

Skip Angular unit tests when changes are limited to tooling, documentation, or workflow files that do not affect the application runtime. Always execute the relevant command set when touching test files or behavior covered by those checks.

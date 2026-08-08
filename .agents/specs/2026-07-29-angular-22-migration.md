# Angular 22 coordinated migration

## Status

In progress.

## Request

Replace the incompatible standalone Dependabot major pull requests with one coordinated, tested migration from Angular 20 to Angular 22.

## Evidence

- Angular 22 requires Node.js `^22.22.3 || ^24.15.0 || ^26.0.0`, TypeScript `>=6.0.0 <6.1.0`, and supports RxJS 7.
- Standalone updates for Angular Build, Compiler CLI, Material, Zone.js, TypeScript and ESLint currently fail deterministic peer-dependency resolution.
- Angular recommends applying update migrations one major version at a time.

## Decision

- Migrate Angular 20 to 21 and then 21 to 22 using official Angular schematics.
- Migrate Angular Material/CDK and angular-eslint in the same coordinated sequence.
- Pin the project and CI runtime to Node.js 22.22.3, the minimum Angular 22-compatible Node 22 release.
- Keep TypeScript within Angular 22's supported 6.0 range.
- Do not use `--force` or `--legacy-peer-deps`.
- Generate migration output in a read-only GitHub Actions job, inspect the artifact, then apply reviewed files to the branch.

## Scope

- Angular framework, CLI, build tooling, Material/CDK and service worker.
- TypeScript, Zone.js and angular-eslint peer-compatible versions.
- Node.js runtime declarations and CI configuration.
- Official source migrations and any required test/config updates.
- AGENTS.md technology and decision-log updates.

## Risks

- Angular 21 and 22 template, build and test migrations may alter application behavior.
- Node.js and TypeScript changes can expose latent typing or tooling defects.
- Material/CDK changes can affect component rendering and accessibility.

## Acceptance criteria

- Clean `npm ci` without peer overrides.
- `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, `npm run test:deploy` and `npm run snapshot` pass on the migration head.
- The application starts without Angular compilation errors.
- Angular, Material/CDK and compiler/build packages are on compatible Angular 22 releases.
- TypeScript and Node.js satisfy Angular's official compatibility matrix.
- No unrelated generated snapshot data is committed.
- The temporary migration workflow is removed before delivery.

## Validation

Pending generated migration, full CI and runtime checks.

## Delivery

Branch: `agent/feat-angular-22-migration`.

## Rollback

Close the pull request and delete the migration branch; no default-branch dependency state is changed until merge.

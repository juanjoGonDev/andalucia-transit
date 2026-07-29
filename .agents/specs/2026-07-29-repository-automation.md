# Repository automation standardization

## Request

Audit the active workflows against `fastypest`, harden cache maintenance, add Dependabot automation, and open one PR without merging or deploying.

## Evidence

- Default branch: `main`.
- Stack: npm, Angular, and GitHub Pages.
- Existing workflows: CI, Pages deployment, daily snapshot refresh, and shell-based daily cache deletion.
- The old cache command was not empty-safe and ran daily. Existing CI/deploy/snapshot files also contain mutable Action tags; that larger pinning migration is intentionally separate.

## Decision

- Replace cache deletion with a weekly, cache-key-independent API workflow and manual dry-run by default.
- Add grouped weekly npm and GitHub Actions updates after a seven-day cooldown.
- Auto-approve patch/minor updates and development-only majors without checkout. Production majors require a current approval from a reviewer with repository write permission.
- Resolve the default branch dynamically, pin introduced Actions by immutable SHA, and use read-only defaults.
- Keep Pages deployment and snapshot automation unchanged; no release workflow is added.

## Acceptance

- [x] Empty and concurrently deleted cache entries are safe.
- [x] No privileged workflow executes pull-request-controlled code.
- [x] External or stale approvals cannot unlock production majors.
- [x] Existing CI, deployment, and snapshot behavior is preserved.
- [x] No release, deployment, or publication is performed.

## Validation

The proposed YAML parsed successfully and the current workflows/package scripts were inspected. Pull-request CI remains the runtime gate.

## Risks and rollback

Auto-merge, branch protection, and an appropriately scoped automation token are required for writes. Existing mutable Action tags remain separate debt. Revert this PR to roll back; no runtime data requires recovery.

## Delivery

- Branch: `agent/chore-repository-automation`
- Base: `main`
- Merge/release/deploy/publish: not authorized

## Status

Implemented on the task branch; pull-request checks and repository settings remain to be verified.

# Repository automation standardization

## Request

Audit the active workflows against `fastypest`, harden cache maintenance, add Dependabot automation, and open one PR without merging or deploying.

## Evidence

- Default branch: `main`.
- Stack: npm, Angular, and GitHub Pages.
- Existing workflows cover CI, Pages deployment, daily snapshot refresh, and shell-based cache deletion.
- Dependabot-triggered `pull_request_target` workflows receive a read-only token and no secrets, so privileged Dependabot automation must not depend on repository secrets.

## Decision

- Replace cache deletion with a weekly, cache-key-independent API workflow and manual dry-run by default.
- Add grouped weekly npm and GitHub Actions updates after a seven-day cooldown.
- Use `pull_request` plus the repository-scoped `GITHUB_TOKEN` for Dependabot approval, labels, and auto-merge; no PR code is checked out.
- Require a current write-permission maintainer approval for production majors, bound to the current head SHA.
- Use the scheduled default-branch workflow and `GITHUB_TOKEN` for required-QA branch updates and auto-merge.
- Keep Pages deployment and snapshot automation unchanged; no release workflow is added.

## Acceptance

- [x] Empty and concurrently deleted cache entries are safe.
- [x] No privileged workflow checks out pull-request-controlled code.
- [x] External or stale approvals cannot unlock production majors.
- [x] No new repository secret or variable is required.
- [x] Existing CI, deployment, and snapshot behavior is preserved.
- [x] No release, deployment, or publication is performed.

## Validation

The proposed YAML parsed successfully and the current workflows/package scripts were inspected. Pull-request CI remains the runtime gate.

## Repository settings

Enable repository auto-merge and `Allow GitHub Actions to create and approve pull requests`. Required status checks must remain enforced on `main`.

## Risks and rollback

The workflows cannot approve or queue pull requests if the repository settings above are disabled. Existing mutable Action tags remain separate debt. Revert this PR to roll back; no runtime data requires recovery.

## Delivery

- Branch: `agent/chore-repository-automation`
- Base: `main`
- Merge/release/deploy/publish: not authorized

## Status

Implemented on the task branch; pull-request checks and repository settings remain to be verified.

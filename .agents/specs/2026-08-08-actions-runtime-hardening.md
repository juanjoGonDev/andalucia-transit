# Actions runtime hardening

## Request

Correct the shared required-QA Dependabot merge automation using the runtime failures observed across the rollout without weakening the repository security model.

## Evidence

- The shared GraphQL auto-merge path fails when GitHub already reports an approved pull request as `clean`.
- Refreshing a behind Dependabot branch that changes `.github/workflows/*` can require the sensitive Workflows permission.
- `daily-snapshot.yml` already establishes `PAT_FINE` in the protected `admin` environment as the owner identity for event-emitting repository writes.
- Immediate merges made with `GITHUB_TOKEN` suppress most downstream workflow runs.

## Decision

- Preserve and revalidate exact-head, non-bot, write-maintainer QA approval.
- Reuse the existing protected `admin` Actions `PAT_FINE`, validate it as the repository owner, and use it for live branch/merge transitions.
- Squash-merge the exact approved head when GitHub reports `clean`; otherwise enable repository auto-merge when available.
- Never grant Workflows permission. Workflow-changing behind PRs require a trusted manual update and then a fresh approval.
- Keep dry-run non-mutating.

## Acceptance

Clean approved majors do not fail; workflow-file refresh does not escalate permission; stale, bot, changed, conflicted or change-requested heads cannot merge; downstream workflows are not intentionally suppressed.

## Checks

Parse workflow YAML, syntax-check shell and `github-script` programs, verify immutable Action SHAs, and use pull-request CI as authority.

## Rollback

Revert the corrective pull request. No merge, deployment or publication is performed by this branch.

## Delivery status

Implemented on `agent/fix-actions-runtime-20260808`; pending pull-request CI and explicit owner merge approval.

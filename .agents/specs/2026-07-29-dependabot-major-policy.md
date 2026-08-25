# Dependabot major update policy

## Status

Ready for review.

## Request

Prevent every semantic-version major Dependabot update from being approved or queued automatically. Patch and minor updates may retain the existing owner-approval and expected-head auto-merge flow.

## Evidence

The previous workflow marked development-only major updates as eligible. Open standalone Angular, TypeScript, ESLint and GitHub Actions majors had incompatible peer requirements or required coordinated migrations.

## Decision

Classify only patch and minor updates as eligible. Classify every major update as requiring manual QA, independent of dependency type. Keep the existing actor separation: the owner PAT approves eligible updates and `github-actions[bot]` queues expected-head squash auto-merge. The Angular 20 to 22 migration is a separate task and pull request.

## Acceptance criteria

- Patch and minor updates remain eligible.
- Every major update receives `requires-manual-qa` and is not auto-approved or queued.
- Unknown update types are ignored safely.
- The classification step exercises patch, minor, major and unknown contract cases before processing the event.
- Workflow permissions remain least-privilege.

## Validation

- CI run `30471282684`: success.
- The Dependabot job is skipped as expected because this corrective PR is owner-authored.
- Incompatible standalone Angular, Zone.js, TypeScript, Material and ESLint pull requests were closed with deterministic peer-conflict evidence.
- Remaining major Action updates are labeled `requires-manual-qa`; stale automated approvals were dismissed.
- Runtime activation for patch/minor updates remains blocked because `PAT_FINE` resolves to an empty value in Dependabot-triggered runs; the secret must exist in the Dependabot repository-secret scope.
- Coordinated Angular migration: pull request `#386`.

## Delivery

Branch: `agent/fix-dependabot-major-policy`.
Pull request: `#385`.

## Rollback

Revert the workflow and this specification.

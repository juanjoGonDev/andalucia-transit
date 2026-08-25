# PR visual evidence

## Request

Make real UI screenshots mandatory for pull requests, following the same review principle used by Basketra: visual evidence must be generated from the exact validated PR head, visible to reviewers, temporary, and never committed as binary media.

## Evidence

- The repository already provides a Playwright-based capture runner through `scripts/screenshot.js` / `scripts/record.js`.
- `scripts/dev/start-with-mock-mode.mjs` provides deterministic mock-data startup for browser review.
- The previous repository policy required textual evidence only and explicitly kept captures local, which no longer satisfies the requested PR review workflow.
- PR #86 targets a non-`main` base branch, while the legacy `ci.yml` only listens to pull requests targeting `main`; the current PR therefore has no legacy CI run for its head.

## Decision

1. Every trusted same-repository pull request must produce a canonical screenshot set automatically.
2. Capture Home, Route search, Favorites, Settings, and News in Spanish at 390×844 and 1440×900.
3. Run the application with deterministic mock data and the repository's existing Playwright tooling; do not add a new browser automation dependency.
4. Publish screenshots as temporary GitHub release assets bound to the exact PR head SHA and render them in one maintained PR comment.
5. Refuse publication when the PR head changes between capture and publication.
6. Delete the temporary release/tag when the PR closes and mark the PR evidence comment as expired.
7. Keep generated PNGs out of Git history.
8. Fork PRs and untrusted associations must not receive write-capable evidence jobs.

## Acceptance

- A PR synchronization triggers visual evidence generation when the workflow is available from the PR base.
- Exactly ten canonical PNG captures are produced: five screens × two viewports.
- Screenshots are generated from the exact `pull_request.head.sha`.
- Reviewers can view the screenshots from the PR conversation without downloading repository binaries.
- Evidence assets are removed when the PR closes.
- Stale head publication is rejected.
- No screenshots are committed to the repository.
- Workflow permissions remain read-all globally and elevate only the evidence job to the minimum writes required for temporary release assets and the PR comment.

## Checks

- Validate workflow syntax with the repository workflow linter / `actionlint` path used by `pnpm run lint:workflows`.
- Exercise screenshot commands against the deterministic mock server.
- Verify the generated file count and maximum file size.
- Verify the PR comment URLs resolve to the temporary release assets.
- Verify cleanup removes the release/tag and updates the comment.

## Delivery status

- `pr-visual-evidence.yml`: added on PR #86.
- `pr-visual-evidence-cleanup.yml`: added on PR #86.
- Runtime validation: pending because GitHub has not started the newly introduced workflow for PR #86 yet; do not mark this requirement complete until a workflow run produces the screenshots.

## Rollback

Delete the two visual-evidence workflows and this specification. No product data, API contract, database, or persisted user state is affected.

# PR visual evidence

## Request

Make real UI screenshots mandatory for pull requests, following the same review principle used by Basketra: visual evidence must be generated from the exact validated PR head, visible to reviewers, temporary, and never committed as binary media.

## Evidence

- The repository already provides a Playwright-based capture runner through `scripts/screenshot.js` / `scripts/record.js`.
- `scripts/dev/start-with-mock-mode.mjs` provides deterministic mock-data startup for browser review.
- The previous repository policy required textual evidence only and explicitly kept captures local, which no longer satisfies the requested PR review workflow.
- PR #86 targets a non-`main` base branch, while the legacy `ci.yml` only listens to pull requests targeting `main`; the current PR therefore has no legacy CI run for its head.
- GitHub Actions run `32850470747` validated deterministic startup, ten screenshots, current-head verification, temporary release publication, and PR-comment publication on 2026-08-25.

## Decision

1. Every trusted same-repository pull request must produce a canonical screenshot set automatically.
2. Capture Home, Route search, Favorites, Settings, and News in Spanish at 390×844 and 1440×900.
3. Run the application with deterministic mock data and the repository's existing Playwright tooling; do not add a new browser automation dependency.
4. Publish screenshots as temporary GitHub release assets bound to the exact PR head SHA and render them in one maintained PR comment.
5. Refuse publication when the PR head changes between capture and publication.
6. Delete the temporary release/tag when the PR closes and mark the PR evidence comment as expired.
7. Keep generated PNGs out of Git history.
8. Fork PRs and untrusted associations must not receive write-capable evidence jobs.
9. Keep textual audit evidence in addition to screenshots; screenshots do not replace keyboard, accessibility, contrast, or behavior checks.

## Acceptance

- A PR synchronization triggers visual evidence generation when the workflow is available from the PR base; branch pushes also resolve an open same-repository PR so stale intermediate-base PRs can validate the workflow before it reaches their base.
- Exactly ten canonical PNG captures are produced: five screens × two viewports.
- Screenshots are generated from the exact current PR head SHA.
- Reviewers can view the screenshots from the PR conversation without downloading repository binaries.
- Evidence assets are removed when the PR closes.
- Stale head publication is rejected.
- No screenshots are committed to the repository.
- Workflow permissions remain read-all globally and elevate only the evidence job to the minimum writes required for temporary release assets and the PR comment.

## Checks

- Workflow syntax is exercised by GitHub Actions; repository `actionlint` / `pnpm run lint:workflows` remains the static validation path.
- Run `32850470747`: deterministic mock server started successfully.
- Run `32850470747`: screenshot step produced the required ten PNGs and passed file-size checks.
- Run `32850470747`: exact-head verification passed.
- Run `32850470747`: temporary release publication passed.
- Run `32850470747`: PR comment publication passed and rendered the ten evidence URLs.
- Cleanup workflow is defined and permission-scoped but cannot be runtime-tested on PR #86 without closing the active PR; validate it on the next real PR closure rather than mutating this PR solely for a test.

## Delivery status

- `.github/workflows/pr-visual-evidence.yml`: implemented and runtime-validated on PR #86.
- `.github/workflows/pr-visual-evidence-cleanup.yml`: implemented; runtime cleanup remains pending until a real PR closes.
- `AGENTS.md`: policy updated so CI-published PR screenshots are mandatory while generated media remains outside Git history.
- `docs/feature-checklist.md`: visual-evidence requirement and validation evidence recorded.
- Current-head rule: the workflow runs on every new head; UI work is not complete until the evidence comment references the final head SHA.

## Rollback

Delete the two visual-evidence workflows and revert the evidence-policy documentation. No product data, API contract, database, or persisted user state is affected.
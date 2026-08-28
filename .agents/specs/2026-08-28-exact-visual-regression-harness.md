# Exact visual regression harness

## Request

Finish the exact visual regression gate added to PR #36 without weakening pixel comparison. The reviewed baseline must remain immutable, baseline and head application code must be rendered independently, and both versions must be measured with one current capture harness so test-tool changes cannot masquerade as product regressions.

## Evidence

- PR: `#36`, branch `codex/refactorizar-vista-segun-diseno-proporcionado`.
- Starting head: `41cbe9ee3f54bdbe8caf113a920e7f79d8a36fd5`.
- Reviewed baseline: `4f8ec97f59dab58a04c07a6aa6995f4fc4e6d9f1`.
- `4f8ec97...41cbe9e` contains only the three visual-gate commits and no product/UI changes.
- Visual regression workflow run `33205281267` rendered all 36 expected screenshots for baseline and head and all Playwright scenarios passed in both workspaces.
- Exact comparison matched 27/36 screenshots and found 3,617,156 differing pixels across nine files.
- Diagnostic artifact `9699548344` shows real harness nondeterminism rather than product changes:
  - Stop Detail changes temporal text from `580 min` to `582 min` and desktop departure content changes between sequential renders.
  - Desktop dialog and filtered-news screenshots contain broad opacity/transition differences.
  - Route preview and line-detail maps show Leaflet render-position differences.
  - Mobile shell drawer differs within the animated menu-control region.
- There are no unresolved review threads or submitted reviews on the current PR.

## Decision

1. Keep the baseline commit immutable and continue rejecting self-seeding or non-ancestor baselines.
2. Treat baseline/head checkouts only as application workspaces. The current PR head owns Playwright test code, screenshot tooling and visual-stability logic for both renders.
3. Freeze browser wall-clock time before application navigation only when exact-regression evidence is being generated. Use a fixed instant aligned with the deterministic August 2026 fixtures; do not modify production time logic.
4. Capture evidence with Playwright animations disabled and the caret hidden so finite CSS transitions are resolved consistently at screenshot time.
5. Before evidence screenshots, wait for fonts and Leaflet rendering to settle. Hide external Leaflet tiles only in the exact-regression evidence path while retaining route geometry, markers and attribution.
6. Preserve exact RGBA comparison with zero tolerance. Do not increase thresholds, mask product content, or accept fuzzy diffs.
7. Keep normal PR review screenshots separate from the exact-regression tile neutralization policy.

## Scope

In scope:

- `.github/workflows/pr-visual-regression.yml`
- `scripts/visual/capture-evidence.mjs`
- Shared Playwright exact-evidence fixture/helper under `tests/playwright/`
- Existing Playwright specs that emit mandatory regression evidence
- This spec and final completion metadata/documentation after the exact gate is green

Out of scope:

- Product UI or domain behavior changes
- Changing the reviewed baseline commit solely to make the gate pass
- Relaxing comparator tolerance
- Province filtering without an authoritative CTAN province relationship
- Merge, release or deploy

## Acceptance

- [ ] Baseline and head applications are both exercised by the same current Playwright specs and screenshot implementation.
- [ ] Browser time is deterministic before application code executes during exact-regression capture.
- [ ] CSS animation/transition state is deterministic at screenshot time.
- [ ] Leaflet tiles and render completion are deterministic for exact-regression evidence.
- [ ] The reviewed baseline remains `4f8ec97f59dab58a04c07a6aa6995f4fc4e6d9f1` unless a real reviewed product visual change later requires a separately justified baseline update.
- [ ] Comparator remains exact RGBA with zero tolerance.
- [ ] 36/36 mandatory screenshots compare with `0` unexpected pixels on one exact head.
- [ ] Repository CI is green on the same exact head.
- [ ] Normal PR visual evidence remains green and reviewable.
- [ ] No unresolved actionable PR review state remains.
- [ ] PR body/spec/checklist describe the actual final head and checks without claiming unperformed validation.
- [ ] PR remains open and unmerged; no release or deploy is performed.

## Checks

- Visual comparator unit tests.
- Workflow lint/actionlint through repository CI.
- Current Playwright visual scenarios against both baseline and head application workspaces.
- Exact screenshot comparison and diagnostic artifact inspection.
- Repository CI and normal PR visual-evidence workflow on the final head.
- PR review-thread/review audit and final diff/commit audit.

## Risks

- A fixed visual clock can become stale if deterministic fixtures intentionally move to another date; keep the constant named and colocated with the visual fixture so fixture changes force an explicit review.
- A current harness may intentionally become incompatible with a very old application baseline after structural test-contract changes. In that case the reviewed baseline must be advanced through an explicit reviewed visual-baseline decision rather than silently running historical tests.
- Leaflet can schedule rendering after Angular content becomes visible; stabilization must observe render completion rather than use arbitrary sleeps.

## Rollback

Revert the visual-harness stabilization commits and return to the previous diagnostic-only gate. Do not change the reviewed baseline or comparator threshold as a rollback mechanism.

## Delivery

Use atomic Conventional Commits on the existing PR branch. Do not force-push. Do not merge, release or deploy.

## Status

`in-progress` — the first exact-regression run correctly exposed nondeterminism and remains red until 36/36 mandatory captures match at zero unexpected pixels.

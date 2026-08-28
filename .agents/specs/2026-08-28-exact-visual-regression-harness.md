# Exact visual regression harness

## Request

Finish the exact visual regression gate added to PR #36 without weakening pixel comparison. The reviewed baseline must remain immutable, baseline and head application code must be rendered independently, and both versions must be measured with one current capture harness so test-tool changes cannot masquerade as product regressions.

## Evidence

- PR: `#36`, branch `codex/refactorizar-vista-segun-diseno-proporcionado`.
- Starting head: `41cbe9ee3f54bdbe8caf113a920e7f79d8a36fd5`.
- Reviewed baseline: `4f8ec97f59dab58a04c07a6aa6995f4fc4e6d9f1`.
- `4f8ec97...41cbe9e` contained only the initial visual-gate commits and no product/UI changes, yet visual regression run `33205281267` matched only 27/36 screenshots and found 3,617,156 differing pixels. Artifact `9699548344` identified clock, transition, Leaflet and scroll nondeterminism.
- The current capture harness now runs the current Playwright specs and screenshot tooling symmetrically against the reviewed baseline application and PR-head application.
- Exact evidence freezes browser time before navigation, disables screenshot animations, hides the caret, waits for fonts and Leaflet rendering, neutralizes external map tiles, and normalizes window plus application-surface scroll state.
- Exact-only data routes keep periodically refreshed CTAN inputs from becoming false UI regressions: the Lines catalog is representative and stable only on `/lines`, while Stop Detail snapshot dates are normalized without changing normal review evidence.
- The exact Map hover assertion now validates the target marker by its canvas RGBA fingerprint instead of assuming that hover must increase total painted pixels.
- `main@38204abb0356d75faea0e77cb6a6e46884d0c260` was incorporated through merge commit `8095fbca2b18f99b412efff1bd3afd085e1262d2`; that refresh added two valid Bahía de Cádiz lines and advanced snapshot timestamps without requiring a visual-baseline change.
- Implementation head `3119761f270abea62055652f13ad36cd970ecbba` is fully validated:
  - CI #1130 / run `33216946711`: success.
  - Publish PR visual evidence #774 / run `33216946737`: success.
  - Visual regression baseline #22 / run `33216946689`: success.
  - Baseline Playwright: 36/36 passed; head Playwright: 36/36 passed.
  - Exact comparator: `0/36 changed files, 0 differing pixels`.
  - Artifact `9703843229`, SHA256 `4f1f6925626c00c8bbc10ed83247e297f19a7268645a73f69df0e80808beb602`.
  - Enforcement confirmed every mandatory screenshot matches baseline `4f8ec97f59dab58a04c07a6aa6995f4fc4e6d9f1` exactly.
- No product UI or domain behavior was changed to make the exact gate pass.

## Decision

1. Keep the baseline commit immutable and continue rejecting self-seeding or non-ancestor baselines.
2. Treat baseline/head checkouts only as application workspaces. The current PR head owns Playwright test code, screenshot tooling and visual-stability logic for both renders.
3. Freeze browser wall-clock time before application navigation only when exact-regression evidence is being generated. Use a fixed instant aligned with the deterministic August 2026 fixtures; do not modify production time logic.
4. Capture evidence with Playwright animations disabled and the caret hidden so finite CSS transitions are resolved consistently at screenshot time.
5. Before evidence screenshots, wait for fonts and Leaflet rendering to settle. Hide external Leaflet tiles only in the exact-regression evidence path while retaining route geometry, markers and attribution.
6. Normalize browser and application-surface scroll state before exact capture because Playwright interactions can programmatically scroll overflow-constrained containers even when window scroll is already zero.
7. Keep periodically refreshed CTAN catalog/snapshot values outside the exact pixel contract by normalizing only the exact evidence inputs. Normal PR evidence continues to exercise the current application data.
8. Preserve exact RGBA comparison with zero tolerance. Do not increase thresholds, mask product content, or accept fuzzy diffs.
9. Keep normal PR review screenshots separate from exact-regression stabilization policy.

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

- [x] Baseline and head applications are both exercised by the same current Playwright specs and screenshot implementation.
- [x] Browser time is deterministic before application code executes during exact-regression capture.
- [x] CSS animation/transition state is deterministic at screenshot time.
- [x] Leaflet tiles and render completion are deterministic for exact-regression evidence.
- [x] Periodic CTAN catalog/snapshot refreshes do not alter the exact UI contract unless rendered product behavior actually changes.
- [x] Nested application scroll state is normalized before exact screenshots.
- [x] The reviewed baseline remains `4f8ec97f59dab58a04c07a6aa6995f4fc4e6d9f1` unless a real reviewed product visual change later requires a separately justified baseline update.
- [x] Comparator remains exact RGBA with zero tolerance.
- [x] 36/36 mandatory screenshots compare with `0` unexpected pixels on one exact head.
- [x] Repository CI is green on the same exact head.
- [x] Normal PR visual evidence remains green and reviewable.
- [x] No unresolved actionable PR review state remains at the latest audit.
- [x] PR body/spec/checklist are synchronized during final closure without claiming unperformed validation.
- [x] PR remains open and unmerged; no release or deploy is performed.

## Checks

- Visual comparator unit tests and repository script tests.
- Workflow lint/actionlint through repository CI.
- Current Playwright visual scenarios against both baseline and head application workspaces.
- Exact screenshot comparison and diagnostic artifact inspection.
- Repository CI and normal PR visual-evidence workflow on the validated implementation head.
- Final documentation head re-runs the same repository CI and visual workflows before delivery is reported complete.
- PR review-thread/review audit and final diff/commit audit.

## Risks

- A fixed visual clock can become stale if deterministic fixtures intentionally move to another date; keep the constant named and colocated with the visual fixture so fixture changes force an explicit review.
- Exact-only representative catalog data must remain a test fixture, not a second source of truth for production CTAN data.
- A current harness may intentionally become incompatible with a very old application baseline after structural test-contract changes. In that case the reviewed baseline must be advanced through an explicit reviewed visual-baseline decision rather than silently running historical tests.
- Leaflet and overflow-constrained application containers can settle after Angular content becomes visible; stabilization observes deterministic render/scroll state rather than using arbitrary sleeps.

## Rollback

Revert the visual-harness stabilization commits and return to the previous diagnostic-only gate. Do not change the reviewed baseline or comparator threshold as a rollback mechanism.

## Delivery

Use atomic Conventional Commits on the existing PR branch. Do not force-push. Do not merge, release or deploy.

## Status

`done` — implementation head `3119761f270abea62055652f13ad36cd970ecbba` passed CI, normal PR visual evidence, both 36-test Playwright renders and exact RGBA comparison with `0/36` changed files and `0` differing pixels. Final closure documentation is validated separately on the documentation-only head before reporting completion.

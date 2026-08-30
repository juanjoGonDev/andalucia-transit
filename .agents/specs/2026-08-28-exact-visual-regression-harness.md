# Exact visual regression harness

## Request

Finish the exact visual regression gate added to PR #36 without weakening pixel comparison. The reviewed baseline must remain immutable between explicit approvals, baseline and head application code must be rendered independently, and both versions must be measured with one current capture harness so test-tool changes cannot masquerade as product regressions.

## Evidence

- PR: `#36`, branch `codex/refactorizar-vista-segun-diseno-proporcionado`.
- Starting head: `41cbe9ee3f54bdbe8caf113a920e7f79d8a36fd5`.
- Original reviewed baseline: `4f8ec97f59dab58a04c07a6aa6995f4fc4e6d9f1`.
- `4f8ec97...41cbe9e` contained only the initial visual-gate commits and no product/UI changes, yet visual regression run `33205281267` matched only 27/36 screenshots and found 3,617,156 differing pixels. Artifact `9699548344` identified clock, transition, Leaflet and scroll nondeterminism.
- The current capture harness runs the current Playwright specs and screenshot tooling symmetrically against the reviewed-baseline application and PR-head application.
- Exact evidence freezes browser time before navigation, disables screenshot animations/transitions, hides the caret, waits for fonts and Leaflet rendering, neutralizes external map tiles, and normalizes window plus application-surface scroll state.
- Exact-only data routes keep periodically refreshed CTAN inputs from becoming false UI regressions: the Lines catalog is representative and stable only on `/lines`, while Stop Detail snapshot dates are normalized without changing normal review evidence.
- The exact Map hover assertion validates the target marker by its canvas RGBA fingerprint instead of assuming that hover must increase total painted pixels.
- `main@38204abb0356d75faea0e77cb6a6e46884d0c260` was incorporated through merge commit `8095fbca2b18f99b412efff1bd3afd085e1262d2`; that refresh added two valid Bahía de Cádiz lines and advanced snapshot timestamps without requiring a visual-baseline change.
- Implementation head `3119761f270abea62055652f13ad36cd970ecbba` was validated by CI run `33216946711`, Publish PR visual evidence run `33216946737`, and Visual regression baseline run `33216946689`; baseline/head Playwright were 36/36 and the exact comparator reported `0/36` changed files and `0` differing pixels.
- After the legal/footer and Map attribution work was reviewed, explicit user approval to advance the visual baseline was received on 2026-08-30.
- Baseline commit `30139a4a250ec40e66151be5572e6932187c8c8c` (`test(visual): advance reviewed baseline`) changed only `.github/visual-baseline.json`, pinning reviewed application commit `379d9f30594c3438d5ee6204b311c69a2ea17c52` to successful normal visual evidence run `33327632881`, artifact `9736809949`, digest `sha256:232aa86a2056aac02477cdece156776414089770fdf0ab7d67e2abad5de2bc9b`.
- The baseline-advance head passed CI `33329370914`, Legal browser QA `33329370894`, normal visual evidence `33329370895`, and exact regression `33329370880`. Its exact artifact `9737239516` reported 36 compared screenshots, 0 changed screenshots and 0 differing pixels.
- Documentation-only head `cff7733f70daed5de276e612f0914ef96143827a` then exposed a real harness nondeterminism: CI `33329713121`, Legal browser QA `33329713016`, and normal visual evidence `33329713015` were green, but exact regression run `33329712966` failed with only `news-data_es_1440_900_full.png` changed by 71,502 pixels. Geometry and content were unchanged and the diff was isolated to the desktop News pagination surface.
- Root cause: the exact Playwright evidence path already disabled animation/transitions and hid the caret, but the separate CLI full-page capture path in `scripts/visual/capture-evidence.mjs` invoked `scripts/record.js` without those exact-only stabilization rules. `record.js` therefore captured immediately after `app-root` became visible while finite CSS transition state could still differ between the two independently rendered applications.
- Fix commit `6fa09d5334052ef17665d9e205b7a6d8d302c54d` (`test(visual): stabilize exact full-page captures`) centralizes CLI screenshot arguments and injects exact-only CSS that disables animations/transitions and hides the caret before every full-page capture. It preserves deterministic Map tile neutralization and does not modify product UI, reviewed baseline, screenshot masks or RGBA tolerance.
- Regression tests in `scripts/visual/capture-evidence.test.ts` require the exact CLI capture arguments to contain animation, transition and caret stabilization, and require the Map capture to retain both the exact stabilizer and deterministic tile script.
- Fix head `6fa09d5334052ef17665d9e205b7a6d8d302c54d` passed:
  - CI run `33333954836`, including script tests, lint, Angular tests and deploy-pipeline checks.
  - Legal browser QA run `33333954801`.
  - Publish PR visual evidence run `33333954806`.
  - Visual regression baseline run `33333954804`, including reviewed-baseline render, PR-head render, exact pixel comparison, evidence retention and enforcement.
- Final exact artifact `pr-36-visual-regression-6fa09d5334052ef17665d9e205b7a6d8d302c54d` is artifact `9738515536`, digest `sha256:08a210c35c228ba0832bef99291e6aee337009fe288809d2e64f44c611924649`.
- PR review audit after the fix found 0 submitted reviews and 0 inline review threads.
- No product UI or domain behavior was changed to make the exact gate pass.

## Decision

1. Keep the reviewed baseline immutable between explicit approvals and continue rejecting self-seeding or non-ancestor baselines.
2. Treat baseline/head checkouts only as application workspaces. The current PR head owns Playwright test code, screenshot tooling and visual-stability logic for both renders.
3. Freeze browser wall-clock time before application navigation only when exact-regression evidence is being generated. Use a fixed instant aligned with the deterministic August 2026 fixtures; do not modify production time logic.
4. Apply the same exact-only animation/transition and caret stabilization to both Playwright evidence screenshots and CLI-generated full-page evidence. Do not rely on `app-root` visibility alone to imply visual quiescence.
5. Before evidence screenshots, wait for fonts and Leaflet rendering to settle. Hide external Leaflet tiles only in the exact-regression evidence path while retaining route geometry, markers and attribution.
6. Normalize browser and application-surface scroll state before exact capture because Playwright interactions can programmatically scroll overflow-constrained containers even when window scroll is already zero.
7. Keep periodically refreshed CTAN catalog/snapshot values outside the exact pixel contract by normalizing only the exact evidence inputs. Normal PR evidence continues to exercise the current application data.
8. Preserve exact RGBA comparison with zero tolerance. Do not increase thresholds, mask product content, or accept fuzzy diffs.
9. Keep normal PR review screenshots separate from exact-regression stabilization policy.
10. Advance `.github/visual-baseline.json` only after explicit approval and only to immutable inspected evidence. The current reviewed application baseline is `379d9f30594c3438d5ee6204b311c69a2ea17c52`.

## Scope

In scope:

- `.github/workflows/pr-visual-regression.yml`
- `.github/visual-baseline.json` only when separately approved
- `scripts/visual/capture-evidence.mjs`
- `scripts/visual/capture-evidence.test.ts`
- Shared Playwright exact-evidence fixture/helper under `tests/playwright/`
- Existing Playwright specs that emit mandatory regression evidence
- This spec and final completion metadata/documentation after the exact gate is green

Out of scope:

- Product UI or domain behavior changes made solely to satisfy the visual gate
- Changing the reviewed baseline solely to make the gate pass
- Relaxing comparator tolerance
- Province filtering without an authoritative CTAN province relationship
- Merge, release or deploy

## Acceptance

- [x] Baseline and head applications are both exercised by the same current Playwright specs and screenshot implementation.
- [x] Browser time is deterministic before application code executes during exact-regression capture.
- [x] CSS animation/transition and caret state are deterministic for both Playwright evidence and CLI full-page evidence.
- [x] Leaflet tiles and render completion are deterministic for exact-regression evidence.
- [x] Periodic CTAN catalog/snapshot refreshes do not alter the exact UI contract unless rendered product behavior actually changes.
- [x] Nested application scroll state is normalized before exact screenshots.
- [x] The reviewed baseline is advanced only under explicit approval and currently points to `379d9f30594c3438d5ee6204b311c69a2ea17c52`.
- [x] Comparator remains exact RGBA with zero tolerance.
- [x] The post-approval baseline advance produced 36/36 exact matches with 0 differing pixels.
- [x] The later News pagination nondeterminism is covered by regression tests and the corrected exact-regression workflow passes enforcement.
- [x] Repository CI is green on implementation head `6fa09d5334052ef17665d9e205b7a6d8d302c54d`.
- [x] Normal PR visual evidence remains green and reviewable on the same implementation head.
- [x] Legal browser QA remains green on the same implementation head.
- [x] No unresolved actionable PR review state remains at the latest audit.
- [x] PR remains open and unmerged; no release or deploy is performed.

## Checks

- Visual comparator unit tests and repository script tests.
- Regression tests for exact CLI stabilization and Map tile determinization coexistence.
- Workflow lint/actionlint through repository CI.
- Current Playwright visual scenarios against both baseline and head application workspaces.
- Exact screenshot comparison and diagnostic artifact retention.
- Repository CI, Legal browser QA and normal PR visual-evidence workflow on the validated implementation head.
- Final documentation head re-runs the same repository CI and visual workflows before delivery is reported complete.
- PR review-thread/review audit and final diff/commit audit.

## Risks

- A fixed visual clock can become stale if deterministic fixtures intentionally move to another date; keep the constant named and colocated with the visual fixture so fixture changes force an explicit review.
- Exact-only representative catalog data must remain a test fixture, not a second source of truth for production CTAN data.
- A current harness may intentionally become incompatible with a very old application baseline after structural test-contract changes. In that case the reviewed baseline must be advanced through an explicit reviewed visual-baseline decision rather than silently running historical tests.
- Leaflet and overflow-constrained application containers can settle after Angular content becomes visible; stabilization observes deterministic render/scroll state rather than using arbitrary sleeps.
- Exact CSS stabilization must remain test-only. Moving it into product styles would hide real interaction/animation behavior and invalidate normal visual review evidence.

## Rollback

Revert `6fa09d5334052ef17665d9e205b7a6d8d302c54d` to remove the CLI full-page stabilizer and its regression tests. Do not change the reviewed baseline or comparator threshold as a rollback mechanism. If the reviewed product baseline itself must be rolled back, revert `30139a4a250ec40e66151be5572e6932187c8c8c` separately under explicit approval.

## Delivery

Use atomic Conventional Commits on the existing PR branch. Do not force-push. Do not merge, release or deploy.

## Status

`done` for implementation — head `6fa09d5334052ef17665d9e205b7a6d8d302c54d` passes CI `33333954836`, Legal browser QA `33333954801`, normal PR visual evidence `33333954806`, and exact Visual regression baseline `33333954804` with enforcement green. Final documentation-only closure is validated separately before reporting completion.

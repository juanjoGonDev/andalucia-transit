# Deterministic Stop Detail visual data

## Request

Keep exact visual regression deterministic after daily CTAN snapshot refreshes. Stop Detail pixel evidence must not depend on which stop happens to be the first populated entry in `stop-services/latest.json`, while normal PR visual evidence must continue using current application data.

## Evidence

- PR #36 head `81a0a5154e27117f1b8f7173824cf72b4387f41a` incorporates `main@bb893151222dcc67bcd5ffe88247ea972c259cf0`, whose product change is a daily transport snapshot refresh.
- CI, Legal browser QA, and normal PR visual evidence were green on that head.
- Exact visual regression run `33336443965` failed only at reviewed-baseline enforcement after both renders and exact comparison completed.
- The exact artifact showed Stop Detail changing from stop `2528` (`ACEITES LA ESPANOLA`, one service) to stop `2565` (`1 SEMAFORO`, two services) after the snapshot refresh.
- `tests/playwright/deterministic-visual-states.spec.ts` selected the first snapshot entry with `services.length > 0`; therefore daily data ordering/service availability could change the exact screenshot input.
- `tests/playwright/visual-evidence.fixture.ts` already froze browser time for evidence, so wall-clock drift was not the root cause. Snapshot identity, ordering and services were still variable.
- First implementation head `84a7b4a9e4aea6c647609e79fe9aa38b8c76dd9f` proved the canonical fixture contract but exposed over-broad routing: exact functional interaction tests were also receiving the canonical snapshot. Run `33338120614` failed during PR-head rendering because the interaction test expected current stop `1 SEMAFORO` while the global exact route returned `ACEITES LA ESPANOLA`.
- Head `483824f93064b22f24587ef624fdde96949ee7e3` scoped the canonical route to the primary Stop Detail screenshot scenario. CI `33338535077`, Legal browser QA `33338535073`, and normal visual evidence `33338535069` passed. Exact artifact `9739863106` then reduced the regression to only the two `stop-detail-directions` captures: 34/36 exact matches, 349,614 differing pixels.
- The remaining interaction scenario also selected its stop from `latest.json`, so it required the same exact-only opt-in rather than a global route.
- Final executable/test head `826f888538545ec0af6dd196bf3dd48ad9934be6` scopes canonical Stop Detail data to both screenshot-producing scenarios only. Functional exact tests and normal PR evidence continue consuming current snapshot data.
- Final implementation workflows are all green:
  - CI `33338922353`
  - Legal browser QA `33338922338`
  - Publish PR visual evidence `33338922352`
  - Visual regression baseline `33338922333`
- Exact artifact `9739978195`, digest `sha256:53f78a27358be3f207140c0fae435cc6dc042bfe6a2a76c38cf88b71315f58fd`, reports `passed: true`, `comparedFiles: 36`, `changedFiles: 0`, and `totalDiffPixels: 0`.
- `stop-detail-data` and `stop-detail-directions` both match exactly at `390x844` and `1440x900` evidence targets.
- Direct artifact review confirms the canonical Stop Detail remains representative: stop `2528`, timetable metadata, upcoming/recent service state, directions state, responsive mobile/desktop layout, current legal notice/footer shell, and walking-map links are all rendered. The mobile floating navigation overlap visible in these screenshots is unchanged from the reviewed baseline and is not introduced by this determinism change.
- `.github/visual-baseline.json` was not modified by this task.

## Decision

1. Keep one fixed browser instant for visual evidence; do not use wall-clock CI time.
2. Exact visual regression owns a canonical Stop Detail fixture with fixed stop identity, metadata, service rows, dates, and ordering.
3. Exact Stop Detail evidence uses that canonical entry directly instead of discovering the first populated stop from `latest.json`.
4. Canonical Stop Detail snapshot interception is opt-in per screenshot-producing scenario; it is not installed globally for all exact Playwright tests.
5. Normal PR visual evidence continues to read current snapshot data so reviewers still see realistic current-data rendering.
6. Preserve exact RGBA zero-tolerance comparison. Do not mask Stop Detail content, loosen thresholds, or advance the reviewed baseline for snapshot-only churn.
7. Keep fixed visual time and canonical Stop Detail fixture in one tooling source of truth and cover it with deterministic tests.

## Acceptance

- [x] Exact Stop Detail uses one canonical stop regardless of the current `latest.json` ordering or service availability.
- [x] Exact browser time remains fixed before application navigation.
- [x] Two materially different source snapshots cannot change the canonical exact Stop Detail payload.
- [x] Normal PR visual evidence still uses current snapshot data.
- [x] Exact functional interaction tests that require current data are not globally overridden by the canonical fixture.
- [x] Exact comparator remains RGBA zero tolerance.
- [x] CI, Legal browser QA, normal visual evidence, and exact visual regression are green on the same implementation head.
- [x] Final exact artifact compares all 36 mandatory screenshots with zero unexpected pixels.
- [x] Reviewed baseline is unchanged by this determinism fix.
- [x] PR remains open and unmerged; no release or deploy is performed.

## Checks

- Focused tooling unit tests for canonical exact visual data: passed through CI.
- Repository script tests, TypeScript, lint, application tests and build: passed in CI `33338922353`.
- Legal/privacy browser flow: passed in `33338922338`.
- Normal PR visual evidence: passed in `33338922352` using current data.
- Exact baseline/head Playwright renders and RGBA comparator: passed in `33338922333`, 36/36 exact, 0 differing pixels.
- Exact artifact manually inspected for Stop Detail mobile/desktop departures and directions states.
- Final documentation-head validation remains required after this ledger update.

## Risks

- A canonical fixture that drifts away from the product contract could hide legitimate Stop Detail rendering changes. Keep its schema representative and let application/runtime tests cover live-data parsing separately.
- The fixed instant and fixture timestamps must remain internally coherent so relative-time labels exercise the intended upcoming/recent states.
- Exact-only routing must never leak into normal PR evidence or production runtime.
- The existing mobile floating-navigation overlap is visible in the reviewed baseline and remains outside this determinism change; future shell/Stop Detail UX work should address it intentionally rather than hiding it in a baseline-only update.

## Rollback

Revert the exact Stop Detail fixture commits. Do not update the reviewed baseline or relax pixel tolerance as rollback mechanisms.

## Delivery

Atomic Conventional Commits on the existing PR branch. No force-push. No merge, release, or deploy.

Implementation commits:

- `84a7b4a9e4aea6c647609e79fe9aa38b8c76dd9f` — `test(visual): pin stop detail exact data`
- `483824f93064b22f24587ef624fdde96949ee7e3` — `test(visual): scope stop detail exact fixture`
- `826f888538545ec0af6dd196bf3dd48ad9934be6` — `test(visual): pin stop directions exact data`

## Status

`validation` — implementation head is fully green with 36/36 exact pixel matches and an unchanged reviewed baseline. This documentation commit must now pass the same repository workflows before final delivery.

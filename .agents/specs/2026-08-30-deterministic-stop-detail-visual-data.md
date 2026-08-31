# Deterministic exact visual data

## Request

Keep exact visual regression deterministic after daily CTAN data refreshes. Zero-tolerance pixel evidence must not depend on which Stop Detail entry or News payload happens to be current, while normal PR visual evidence must continue using current application data.

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
- Stop Detail implementation head `826f888538545ec0af6dd196bf3dd48ad9934be6` scoped canonical Stop Detail data to both screenshot-producing scenarios only. Functional exact tests and normal PR evidence continue consuming current snapshot data.
- That head was fully green: CI `33338922353`, Legal browser QA `33338922338`, Publish PR visual evidence `33338922352`, and Visual regression baseline `33338922333`.
- Exact artifact `9739978195`, digest `sha256:53f78a27358be3f207140c0fae435cc6dc042bfe6a2a76c38cf88b71315f58fd`, reported `passed: true`, `comparedFiles: 36`, `changedFiles: 0`, and `totalDiffPixels: 0`.
- The subsequent documentation-only head `3aca2008a71fe2b20f1976d1bed3ac07fc5e557b` exposed a second independent data nondeterminism after the date rolled to 2026-08-31. CI `33364938758`, Legal browser QA `33364938673`, and normal visual evidence `33364938651` were green, while exact regression `33364938685` failed only enforcement.
- Artifact `9748054015` from that documentation head showed 34/36 exact matches. The only differences were direct `/news` captures:
  - `news-data_es_390_844_full.png`: dimension mismatch, expected `390x4246`, actual `390x4198`, 580,279 differing pixels.
  - `news-data_es_1440_900_full.png`: dimension mismatch, expected `1440x2418`, actual `1440x2394`, 1,447,251 differing pixels.
  - total: 2,027,530 differing pixels.
- Root cause: exact regression rendered `/news` through the generic CLI capture after navigation, so CTAN News network data remained live. The existing filtered-news Playwright scenario was deterministic because it intercepted the CTAN News API before navigation.
- Exact News was moved to a dedicated Playwright capture that installs the canonical CTAN feed before navigation. The generic exact CLI capture no longer owns `/news`.
- Canonical News data is owned by `scripts/visual/exact-visual-data.ts` and covered by script tests. It is used only by the exact-regression harness.
- Normal PR visual evidence is deliberately unchanged: `.github/workflows/pr-visual-evidence.yml` still performs its direct `/news` screenshot after the Playwright checks, so reviewers continue seeing current CTAN News data.
- Final executable/test head for the complete determinism fix is `f96b1ba4f41c619405027f5920f5f7aa3082953c`.
- All workflows on `f96b1ba4...` are green:
  - CI `33365726002`
  - Legal browser QA `33365725965`
  - Publish PR visual evidence `33365725972`
  - Visual regression baseline `33365725991`
- Exact artifact `9748327575`, digest `sha256:eab75f4fc004437954cb6920d182a3033fa71ada6b9f4a6a6c923d099064d50c`, reports `passed: true`, `comparedFiles: 36`, `changedFiles: 0`, `totalDiffPixels: 0`.
- Canonical exact News now renders at stable dimensions `390x3268` and `1440x1890` for both baseline and head.
- `stop-detail-data` and `stop-detail-directions` also remain exact matches at mobile and desktop targets.
- Direct artifact review confirms the canonical Stop Detail remains representative: stop `2528`, timetable metadata, upcoming/recent service state, directions state, responsive mobile/desktop layout, current legal notice/footer shell, and walking-map links are all rendered.
- The existing mobile floating-navigation overlap visible in Stop Detail is unchanged from the reviewed baseline and is not introduced by this determinism work.
- `.github/visual-baseline.json` was not modified by this task.

## Decision

1. Keep one fixed browser instant for exact visual evidence; do not use wall-clock CI time.
2. Exact visual regression owns canonical dynamic-data fixtures for Stop Detail and unfiltered News.
3. Exact Stop Detail evidence uses one canonical entry directly instead of discovering the first populated stop from `latest.json`.
4. Canonical Stop Detail snapshot interception is opt-in per screenshot-producing scenario; it is not installed globally for all exact Playwright tests.
5. Exact unfiltered News is captured through Playwright with request interception installed before navigation; it is not captured through the generic post-navigation CLI path.
6. Normal PR visual evidence continues to read current Stop Detail and News data so reviewers still see realistic current-data rendering.
7. Preserve exact RGBA zero-tolerance comparison. Do not mask dynamic content, loosen thresholds, or advance the reviewed baseline for data-only churn.
8. Keep fixed visual time and canonical dynamic fixtures in the visual-tooling source of truth and cover them with deterministic tests.

## Acceptance

- [x] Exact Stop Detail uses one canonical stop regardless of the current `latest.json` ordering or service availability.
- [x] Exact browser time remains fixed before application navigation.
- [x] Two materially different source Stop Detail snapshots cannot change the canonical exact payload.
- [x] Exact unfiltered News does not depend on live CTAN News responses.
- [x] Canonical News data is installed before navigation.
- [x] Normal PR visual evidence still uses current Stop Detail and News data.
- [x] Exact functional interaction tests that require current data are not globally overridden by the Stop Detail fixture.
- [x] Exact comparator remains RGBA zero tolerance.
- [x] CI, Legal browser QA, normal visual evidence, and exact visual regression are green on the same executable/test head.
- [x] Final executable/test artifact compares all 36 mandatory screenshots with zero unexpected pixels.
- [x] Reviewed baseline is unchanged by this determinism fix.
- [x] PR remains open and unmerged; no release or deploy is performed.

## Checks

- Focused tooling unit tests for canonical Stop Detail and News data: passed through CI `33365726002`.
- Repository script tests, TypeScript, lint, application tests and build: passed in CI `33365726002`.
- Legal/privacy browser flow: passed in `33365725965`.
- Normal PR visual evidence: passed in `33365725972` with the normal workflow's current-data `/news` capture unchanged.
- Exact baseline/head Playwright renders and RGBA comparator: passed in `33365725991`, 36/36 exact, 0 differing pixels.
- Exact artifact manually inspected for Stop Detail mobile/desktop departures and directions states; exact News dimensions and pixel identity verified from `diff/summary.json`.
- Final documentation-head validation remains required after this ledger update.

## Risks

- Canonical fixtures that drift away from product contracts could hide legitimate rendering changes. Keep schemas representative and let application/runtime tests cover live-data parsing separately.
- The fixed instant and Stop Detail fixture timestamps must remain internally coherent so relative-time labels exercise intended upcoming/recent states.
- Exact-only routing must never leak into normal PR evidence or production runtime.
- The exact News fixture intentionally tests stable rendering rather than freshness; the separate normal PR evidence remains the freshness/reality check.
- The existing mobile floating-navigation overlap is visible in the reviewed baseline and remains outside this determinism change; future shell/Stop Detail UX work should address it intentionally rather than hiding it in a baseline-only update.

## Rollback

Revert the exact dynamic-data fixture commits. Do not update the reviewed baseline or relax pixel tolerance as rollback mechanisms.

## Delivery

Atomic Conventional Commits on the existing PR branch. No force-push. No merge, release, or deploy.

Implementation commits include:

- `84a7b4a9e4aea6c647609e79fe9aa38b8c76dd9f` — `test(visual): pin stop detail exact data`
- `483824f93064b22f24587ef624fdde96949ee7e3` — `test(visual): scope stop detail exact fixture`
- `826f888538545ec0af6dd196bf3dd48ad9934be6` — `test(visual): pin stop directions exact data`
- `d9e695774af9d68287115c59678b787d9a792f6d` — `test(visual): add exact news capture fixture`
- `769c755bffc821226f95d1facf7a650f87795f09` — `test(visual): own exact news data`
- `f7a2dcad3fb207c3938a4b6151d21418d90ebcee` — `test(visual): route exact news through playwright`
- `f99ce0c047118c3de2f2466e8245f3e0f2871ec6` — `test(visual): cover exact news data stability`
- `f96b1ba4f41c619405027f5920f5f7aa3082953c` — `test(visual): guard exact news capture ownership`

## Status

`validation` — the complete executable/test head is green with 36/36 exact matches, zero differing pixels, normal current-data visual evidence green, and no baseline modification. This final ledger commit must pass the same repository workflows before delivery.

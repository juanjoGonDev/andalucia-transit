# Deterministic Stop Detail visual data

## Request

Keep exact visual regression deterministic after daily CTAN snapshot refreshes. Stop Detail pixel evidence must not depend on which stop happens to be the first populated entry in `stop-services/latest.json`, while normal PR visual evidence must continue using current application data.

## Evidence

- PR #36 head `81a0a5154e27117f1b8f7173824cf72b4387f41a` incorporates `main@bb893151222dcc67bcd5ffe88247ea972c259cf0`, whose product change is a daily transport snapshot refresh.
- CI, Legal browser QA, and normal PR visual evidence are green on that head.
- Exact visual regression run `33336443965` fails only at reviewed-baseline enforcement after both renders and exact comparison complete.
- The exact artifact shows Stop Detail changing from stop `2528` (`ACEITES LA ESPANOLA`, one service) to stop `2565` (`1 SEMAFORO`, two services) after the snapshot refresh.
- `tests/playwright/deterministic-visual-states.spec.ts` currently selects the first snapshot entry with `services.length > 0`; therefore daily data ordering/service availability can change the exact screenshot input.
- `tests/playwright/visual-evidence.fixture.ts` already freezes browser time for evidence and normalizes exact snapshot dates, but it still preserves the refreshed stop set, ordering, identity, and services.

## Decision

1. Keep one fixed browser instant for visual evidence; do not use wall-clock CI time.
2. Exact visual regression owns a canonical Stop Detail fixture with fixed stop identity, metadata, service rows, dates, and ordering.
3. Exact Stop Detail evidence must use that canonical entry directly instead of discovering the first populated stop from `latest.json`.
4. In exact mode, intercept the Stop Detail snapshot request and return the canonical fixture rather than partially normalizing changing production snapshot contents.
5. Normal PR visual evidence continues to read current snapshot data so reviewers still see realistic current-data rendering.
6. Preserve exact RGBA zero-tolerance comparison. Do not mask Stop Detail content, loosen thresholds, or advance the reviewed baseline for snapshot-only churn.
7. Keep fixed visual time and canonical Stop Detail fixture in one tooling source of truth and cover it with deterministic tests.

## Acceptance

- [ ] Exact Stop Detail uses one canonical stop regardless of the current `latest.json` ordering or service availability.
- [ ] Exact browser time remains fixed before application navigation.
- [ ] Two materially different source snapshots cannot change the canonical exact Stop Detail payload.
- [ ] Normal PR visual evidence still uses current snapshot data.
- [ ] Exact comparator remains RGBA zero tolerance.
- [ ] CI, Legal browser QA, normal visual evidence, and exact visual regression are green on the same implementation head.
- [ ] Final exact artifact compares all mandatory screenshots with zero unexpected pixels.
- [ ] PR remains open and unmerged; no release or deploy is performed.

## Checks

- Focused tooling unit tests for canonical exact visual data.
- Repository script tests and TypeScript/lint checks through CI.
- Exact baseline/head Playwright renders and pixel comparator.
- Normal PR visual evidence workflow.
- Final artifact and PR review-state audit.

## Risks

- A canonical fixture that drifts away from the product contract could hide legitimate Stop Detail rendering changes. Keep its schema representative and let application/runtime tests cover live-data parsing separately.
- The fixed instant and fixture timestamps must remain internally coherent so relative-time labels exercise the intended upcoming/recent states.
- Exact-only routing must never leak into normal PR evidence or production runtime.

## Rollback

Revert the exact Stop Detail fixture commits. Do not update the reviewed baseline or relax pixel tolerance as rollback mechanisms.

## Delivery

Use atomic Conventional Commits on the existing PR branch. Do not force-push. Do not merge, release, or deploy.

## Status

`in_progress` — exact snapshot churn is reproduced; implementation and final validation are pending.

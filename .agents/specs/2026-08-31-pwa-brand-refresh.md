# PWA brand refresh and deterministic update adoption

## Status

Ready for human review. Technical validation is green; merge, release, and deploy remain explicitly out of scope without user authorization.

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme, adopts new deployments without requiring reinstall, and uses the user-supplied bus-stop SVG consistently for browser and installed PWA surfaces.

On 2026-09-02 the user explicitly clarified that the supplied original SVG must be used "si o si" and optimized. Later the user explicitly required the remaining failing visual-regression test to be corrected and made green. Those instructions supersede the earlier assumption that an unrecoverable generated raster remained the active visual authority and authorize repairing the demonstrated squash-baseline defect rather than weakening the regression gate.

## Scope

- PWA favicon/install identity and manifest metadata.
- Angular `SwUpdate` adoption lifecycle and unrecoverable-state recovery.
- Exact static/browser verification of the canonical SVG identity.
- Source-preserving build-output optimization for the canonical SVG.
- Service-worker integrity after post-build asset transformation.
- Focused PWA coverage and deterministic visual-regression tooling required to enforce the contract.
- CI, visual evidence, reviewed-baseline comparison, and final PR evidence.

Out of scope:

- Custom service-worker forks, `skipWaiting`, manual cache deletion, polling storms, backend/API/database changes, migrations, release, deploy, or merge.
- Broad repository formatting cleanup unrelated to this PWA change.
- Redundant 192/512 SVG copies or standalone binary icon owners.
- Approximate or regenerated replacements for the canonical user-supplied SVG.
- Weakening visual-regression assertions to obtain a green result.

## Evidence

### Canonical SVG identity

- `public/favicon.svg` is the sole repository artwork owner and `public/manifest.webmanifest` references it once with `sizes: "any"`, `type: "image/svg+xml"`, and `purpose: "any maskable"`.
- User commit `7560b1f261aeba68bb2c0bd3ab78726c05b2f796` supplied the colored SVG; `2f6a456609c41b05971acb37f66eac90716fae7c` adopted that exact blob as `public/favicon.svg`.
- Canonical Git blob SHA-1: `69b7f7ddbd0e5cb5e4fccc0a2c6d6b7df2234695`.
- Canonical UTF-8 SHA-256: `b12a92b917b9d194b7f37ca2e6c031a91c5fc81160c62f5c521fb58eac841e92`.
- Canonical source size: 15,186 bytes.
- `.gitattributes` pins `public/favicon.svg text eol=lf`, so source identity does not depend on `core.autocrlf`.
- Canonical Chromium 1254x1254 RGBA SHA-256: `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`.
- Historical digest `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef` belongs to an earlier generated raster whose complete bytes were never retained. It is provenance only, not an active acceptance gate after the explicit SVG-source instruction.

### Source-preserving delivery and service-worker integrity

- `scripts/pwa-icon-output.ts` removes only the exact XML declaration and final newline from the deployed copy.
- Optimized output is 15,146 bytes with SHA-256 `fef8eacd36fc0a37a8f17632ac680130ce256a3d2b46496028f62b26db07f514`.
- Source and optimized output rasterize to the same exact Chromium RGBA digest `7f0680a6...`; optimization changes delivery bytes, not pixels.
- `scripts/deploy/run.ts` enforces `ng build -> optimize favicon.svg -> pnpm exec ngsw-config -> verify final favicon hash -> create 404.html`.
- Final service-worker SHA-1 for the optimized `/favicon.svg` is `e38e3835435b628a767412abb2711badf831f37c`.
- No asset covered by generated `ngsw.json` may be mutated after final manifest generation without regenerating and re-verifying the manifest.

### Update lifecycle

- One root-owned Angular `SwUpdate` lifecycle checks on startup, activates `VERSION_READY`, reloads only after successful activation, deduplicates overlapping reload requests, permits retry after false/rejected activation, tolerates unavailable storage/disabled worker states, and bounds unrecoverable recovery with a session marker.
- `src/app/core/services/pwa-update.config.ts` is the single owner of `PWA_RECOVERY_SESSION_KEY`.
- Regression coverage includes both overlap orderings: unrecoverable-first/activation-later and activation-first/unrecoverable-later.
- Focused PWA branch coverage is fail-closed and exactly non-zero 100% branches.
- The accepted UX remains deterministic immediate adoption after successful activation; a deferred snackbar redesign is not part of this task.

### Visual baseline repair

The original reviewed pointer referenced `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`, with evidence run `33433358656`, artifact `9773567292`, and digest `sha256:4bc66b7550b428e276266eb2f241ffe575a0c34dd14fd8585df133652b586095`.

PR #439 final validated head `f3305fe2cf86be988ab5365534be33c16e42e78c` passed visual regression with 0/36 changed screenshots. Its squash merge on `main`, `b6509aaa214dc932588dc6bb0ed068ef097ce8c5`, has the exact same Git tree SHA `7e7651c07c8d9b65faab439dfbdcee1d3e269cbd`. Therefore the earlier `diverged` failure was squash topology, not a content difference.

- Commit `1cefb4ab7b19f06d880ee82809007d5b8cc5a52d` (`test(visual): repair squash baseline ancestry`) changes only `.github/visual-baseline.json` from `5ea33fcc...` to the tree-equivalent squash merge `b6509aaa...` and preserves the reviewed workflow run, artifact ID, and artifact digest.
- Visual Regression #376 (`33652927999`) then passed baseline resolution and checkout, proving the ancestry defect was fixed, but exposed a second real harness defect during baseline rendering.

### Historical-baseline harness compatibility

Visual Regression #376 used the current visual harness against the reviewed historical application with `--verifyProductChecks false`. The harness correctly excluded dedicated head-only specs, but the shared `deterministic-visual-states.spec.ts` still ran the current PWA install-shell assertion. That assertion required the new `meta[name="theme-color"]` value `#0061fe` from an application version that legitimately predates the PWA refresh, so baseline rendering failed before any pixel comparison.

The repair preserves the gate instead of bypassing it:

- `bea5cdebc34561b26595822134a1a9396e4ba387` (`refactor(visual): expose product check mode to specs`) propagates the existing baseline/head mode into Playwright as `E2E_VERIFY_PRODUCT_CHECKS`.
- `0bb50deb0f5a8b8204c8b57438067ef97bb63d5f` (`fix(visual): isolate head-only pwa product check`) makes only the exact PWA current-product assertion respect that mode.
- Current-head evidence still runs with `verifyProductChecks=true`, so exact PWA shell/theme/icon validation remains mandatory.
- Reviewed historical baselines run with `verifyProductChecks=false`, so they retain shared deterministic layout/state captures without being required to implement product metadata introduced after the baseline was reviewed.
- No ancestry, pixel-equality, stale-head, fork/trust, artifact, or enforcement guard was weakened.

### Exact-head green evidence

Technical head `0bb50deb0f5a8b8204c8b57438067ef97bb63d5f` is green across all required automated gates:

- CI #1488 (`33653701637`) completed successfully: Install dependencies, Test scripts, Deploy pipeline, Lint, Test angular, and required `Check all ok` all passed.
- Visual Evidence #1517 (`33653701609`) completed successfully: quality gates, app startup, populated responsive/a11y states, populated captures, empty states/captures, exact-head ownership, artifact retention, PR publication, and shutdown all passed.
- Visual Evidence artifact `9855988891` has digest `sha256:e0c855bbca9e9e4bde93c6734e209ff5c8152edfe1dcbde44792c96f5d00e73a` and contains 41 PNGs.
- Compared with the previously reviewed `d8e2dacc...` evidence, 37/41 PNGs are byte-identical. The four dynamic captures (`map-data` mobile/desktop, route-search preview desktop, and stop-detail mobile) were manually reviewed; no corruption, overflow, missing map attribution, or regression attributable to this change was found.
- Visual Regression #378 (`33653701638`) completed successfully. Baseline resolution, baseline checkout, deterministic install, baseline render, head render, exact pixel comparison, artifact retention, and enforcement all passed.
- Visual Regression artifact `9856032447` has digest `sha256:694b3a06eb199c7d886633211f0b3a0171dbb3a1fe902fca298f6cf1daac8169`.
- `diff/summary.json` reports `passed: true`, `comparedFiles: 36`, `changedFiles: 0`, and `totalDiffPixels: 0`.

### Review and repository baseline

- Root `AGENTS.md` already requires exact-head deterministic evidence and explicitly forbids weakening stale-head, fork/trust, size-limit, or cleanup guards. The harness correction aligns with that policy and is task-specific, so no duplicate stable-policy entry is added.
- Repository-wide `pnpm run format:check` remains blocked by pre-existing formatting debt and an existing parse error in `docs/api.html`; this PR does not absorb unrelated global cleanup or report that check as green.
- PR #438 remains open, non-draft, and mergeable on `agent/fix-pwa-brand-update` against `main`.
- Human ruleset approval remains external to technical implementation; merge, release, and deploy have not been performed.

## Decisions

1. Keep current theme tokens as the PWA shell source of truth.
2. Keep `public/favicon.svg` as the only repository/browser/install artwork owner and one manifest SVG entry with `sizes: "any"`.
3. Treat the exact user-supplied SVG bytes and their exact Chromium render as canonical visual authority.
4. Preserve LF checkout semantics and permit build optimization only for documented non-rendering wrapper bytes.
5. Require source and optimized output to rasterize at 1254x1254 to exact RGBA SHA-256 `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`.
6. Keep historical `57aeab24...` only as provenance; never use it to override the explicitly selected SVG source.
7. Regenerate and verify `ngsw.json` after any post-build mutation of service-worker-managed assets.
8. Keep one root-owned `SwUpdate` lifecycle, one recovery-key owner, and immediate adoption after successful activation.
9. The reviewed visual baseline must be an immutable ancestor. Squash merges may replace a validated PR head only when exact Git-tree equivalence is demonstrated.
10. Historical baseline rendering uses the current harness for shared deterministic evidence but disables only head-only product assertions via the explicit `verifyProductChecks` mode.
11. Current-head rendering always keeps product assertions enabled; no exact PWA, pixel, ancestry, trust, stale-head, or enforcement gate may be weakened to make CI green.
12. Do not merge, release, deploy, auto-merge, or force-push without explicit authorization.

## Acceptance

- [x] Exact user-supplied SVG is the sole icon owner and its source/blob hashes are pinned.
- [x] Canonical SVG checkout is LF-stable across Git configurations.
- [x] Optimized deployed output is byte-pinned and pixel-identical to the source in Chromium.
- [x] Manifest owns exactly one `any maskable` SVG icon and startup theme metadata is current.
- [x] Final `ngsw.json` represents the optimized favicon bytes and deploy preparation fails on mismatch.
- [x] PWA update lifecycle covers startup, activation, retry, unavailable storage/worker, unrecoverable recovery, reload-loop prevention, idempotence, and both overlap orderings.
- [x] Focused PWA branch coverage remains exact non-zero 100%.
- [x] Reviewed baseline points to the demonstrated tree-equivalent ancestor `b6509aaa214dc932588dc6bb0ed068ef097ce8c5`.
- [x] Historical baseline rendering does not execute head-only PWA metadata assertions.
- [x] Current-head PWA product assertions remain mandatory.
- [x] CI, Visual Evidence, and Visual Regression are green on the same technical head.
- [x] Visual Regression compares 36 files with 0 changed files and 0 differing pixels.
- [x] Final technical-head screenshots are reviewed with no detected regression attributable to this work.
- [ ] Human approval required by the `main` ruleset. This is a review gate, not unfinished implementation.

## Checks

- Static PWA shell tests for theme, canonical icon ownership, LF checkout, exact source/output identities, document metadata, and service-worker asset coverage.
- Real deploy integration verifies optimized output, regenerates `ngsw.json`, and verifies final icon SHA-1.
- Browser PWA helper rasterizes source and served/deployed SVG at the contractual 1254x1254 size.
- Full Angular tests plus focused PWA branch-coverage gate.
- Visual Evidence responsive/a11y and populated/empty state verification.
- Reviewed-baseline render with head-only product assertions disabled.
- Current-head render with product assertions enabled.
- Exact 36-file pixel comparison and fail-closed enforcement.
- Exact-head CI/Visual Evidence/Visual Regression/CodeRabbit review before merge eligibility.

## Risks

- SVG edge pixels are renderer-specific; acceptance is explicitly Chromium at 1254x1254.
- Future SVG optimization that changes path/paint/render semantics can change pixels even if file size improves; exact Chromium equality remains mandatory.
- Future post-build mutation of an `ngsw.json` asset can invalidate the service-worker version unless the manifest is regenerated from final bytes.
- Historical-baseline compatibility must not grow into a generic bypass: only assertions explicitly classified as current-head product checks may honor `verifyProductChecks=false`.
- Installed launchers can retain icon metadata independently of Angular service-worker update adoption.
- Immediate reload can interrupt a future unsaved transactional workflow; changing that policy requires a separate accepted UX design.
- Repository-wide formatting debt remains unrelated to this PR.

## Rollback

Revert the PR commits. No backend, API, database, persistent-data migration, release, or deployment is involved.

## Delivery

- Latest green technical head: `0bb50deb0f5a8b8204c8b57438067ef97bb63d5f`.
- CI: #1488 / `33653701637` — success.
- Visual Evidence: #1517 / `33653701609` — success; artifact `9855988891`, digest `sha256:e0c855bbca9e9e4bde93c6734e209ff5c8152edfe1dcbde44792c96f5d00e73a`.
- Visual Regression: #378 / `33653701638` — success; artifact `9856032447`, digest `sha256:694b3a06eb199c7d886633211f0b3a0171dbb3a1fe902fca298f6cf1daac8169`; 36/36 exact, 0 changed files, 0 diff pixels.
- Human `APPROVED` review: pending.
- Merge/release/deploy: not performed.

# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme, adopts new deployments without requiring reinstall, and uses the exact user-approved bus-stop identity for browser and installed PWA surfaces.

The approved 1254x1254 identity is a single-support bus stop, a front-facing bus, and a clock hanging from the upper stop structure on a dark navy/blue application background. The rejected Andalusia-map concept and Junta de Andalucia identity must not be used.

On 2026-09-02 the user superseded the earlier incomplete-WebP implementation path: the supplied colored SVG is the working source. The file format is not authoritative; the approved Chromium-rendered pixels are.

## Scope

- PWA favicon/install identity and manifest metadata.
- Angular `SwUpdate` adoption lifecycle and unrecoverable-state recovery.
- Exact static/browser verification of the approved artwork.
- Source-preserving build-output optimization for the canonical SVG.
- PWA-specific test and coverage tooling required to make lifecycle and identity acceptance enforceable.
- Review, CI, runtime, and visual evidence needed to deliver this PR safely.

Out of scope:

- Custom service-worker forks, `skipWaiting`, manual cache deletion, polling storms, backend/API/database changes, migrations, release, deploy, or merge.
- Broad repository formatting cleanup unrelated to this PWA change.
- Changing `.github/visual-baseline.json` without explicit user approval.
- Guessing arbitrary SVG geometry or colors from a SHA-256 digest when the target pixels are unavailable.
- Weakening the approved rendered-pixel digest to make the current source pass.

## Evidence

### Product and canonical identity

- Current theme tokens are primary `#0061fe`, strong blue `#0b54d4`, dark surface `#060f2b`, and background `#f6f7f8`.
- `public/favicon.svg` is the sole repository artwork owner. `public/manifest.webmanifest` references it once with `sizes: "any"`, `type: "image/svg+xml"`, and `purpose: "any maskable"`; `public/app-icon-maskable.svg` remains absent.
- Root `AGENTS.md` forbids standalone binary/media files in git, so the canonical repository artwork remains text SVG.
- User commit `7560b1f261aeba68bb2c0bd3ab78726c05b2f796` supplied the colored SVG; commit `2f6a456609c41b05971acb37f66eac90716fae7c` adopted that exact blob at `public/favicon.svg`.
- Canonical source Git blob SHA-1: `69b7f7ddbd0e5cb5e4fccc0a2c6d6b7df2234695`.
- Canonical source UTF-8 SHA-256: `b12a92b917b9d194b7f37ca2e6c031a91c5fc81160c62f5c521fb58eac841e92`.
- Authoritative Chromium 1254x1254 rendered RGBA SHA-256: `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`; zero differing pixels are mandatory.
- Chromium currently renders the supplied source to `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`, so the source is not yet pixel-equivalent to the approved reference.

### Source-preserving delivery optimization

- `scripts/pwa-icon-output.ts` owns the build-output transformation. It removes only the exact XML declaration `<?xml version="1.0" encoding="UTF-8"?>\n` and the final newline from the deployed favicon payload.
- The repository source remains byte-for-byte authoritative and retains both pinned source identities above.
- The deployed optimized SVG is 15,146 bytes and has SHA-256 `fef8eacd36fc0a37a8f17632ac680130ce256a3d2b46496028f62b26db07f514`.
- Chromium renders both the canonical source and the optimized deployed SVG to the same current RGBA digest `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`; the optimization changes delivery bytes, not rendered pixels.
- The optimization therefore does not redefine the approved visual contract. The required rendered digest remains `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.

### Exact artwork investigation

- `tests/playwright/pwa-icon.assert.ts` is the sole browser-side render implementation. It fetches the served SVG, rasterizes it in Chromium to 1254x1254, hashes RGBA bytes, logs the actual digest, and compares against `scripts/pwa-contract.ts`.
- The deterministic visual suite and PWA shell suite reuse that helper rather than duplicating render logic.
- A bounded Chromium investigation exhausted all 72 combinations formed only from the source colors and known product-theme values. All 72 produced distinct hashes and none matched the authoritative digest.
- Changing only the SVG width/height attributes does not change the contractual RGBA digest when the same viewBox is rasterized into the same 1254x1254 canvas.
- SHA-256 proves equality but does not provide a useful pixel-distance gradient. Further arbitrary palette or geometry changes would be guessing.
- Exact artwork adaptation now requires the approved raster/reference pixels or an equivalent exact source so a real per-pixel diff can identify geometry, antialiasing, clipping, opacity, quantization, or color deltas.

### Historical WebP recovery

- The historical WebP was never fully versioned: retained payload chunks were 00, 02, and 03; no `payload-01` commit exists.
- Its RIFF prefix declares a 663,028-byte file, equivalent to 884,040 Base64 characters. The retained fragments total only 58,438 characters, about 6.61%, leaving about 93.39% absent.
- Repository history/search, PR comments/reviews, refs, branches/tags/forks, relevant Actions runs/artifacts, releases, public hash searches, and available conversation attachments did not recover the complete raster.
- The obsolete retained fragments were removed by `f30042f507c3ee8f3a75a874a0179daf9332144d` after the user selected the supplied SVG path.

### Render-contract regression and restoration

- Commit `fbc515e3dcfde32039f8ef3a19c5f18637a48a83` changed `APPROVED_ICON.renderedRgbaSha256` from the approved `57aeab24...` digest to the observed current `7f0680a6...` digest. Head `855fd3f0596577c6781c02e85f72f84aaaed712f` retained that weakened expectation.
- Visual Evidence #1491 (`33630568001`) was therefore a false green for the exact artwork contract: it verified the current output against the current output rather than against the approved reference.
- Commit `1b82a7744eb3abddecc99a7d29cd53d833cac373` (`test(pwa): restore approved render contract`) changes only `scripts/pwa-contract.ts` and restores `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef` as the expected rendered digest.
- CI #1476 (`33634298320`) on `1b82a7744eb3abddecc99a7d29cd53d833cac373` completes successfully.
- Visual Evidence #1493 (`33634298239`) on that same head executes the restored fail-closed contract: 41/42 Playwright tests pass and the sole failure is `renders the exact approved PWA install artwork`. Both source and optimized output log current Chromium RGBA `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`; expected is `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- Because populated-state verification fails first, the current-head visual-evidence run does not capture or publish a screenshot artifact. No manual screenshot review from an older head substitutes for final-head evidence.
- The previous green-head artifact from Visual Evidence #1491 contained 41 PNG screenshots and was manually inspected as diagnostic evidence; no obvious corruption or clear PR-specific regression was identified. That artifact is not acceptance evidence because #1491 used the weakened rendered digest.

### Update lifecycle and verification ownership

- Angular service-worker registration remains `registrationStrategy: "registerWhenStable:30000"`; one root-owned `SwUpdate` lifecycle checks on startup, activates `VERSION_READY`, reloads after successful activation, deduplicates overlapping reload requests, permits retry after false/rejected activation, and bounds unrecoverable recovery with a session marker.
- `src/app/core/services/pwa-update.config.ts` is the single owner of `PWA_RECOVERY_SESSION_KEY`; production and tests consume it.
- Regression coverage includes both overlap orderings: unrecoverable-first/activation-later and activation-first/unrecoverable-later.
- `scripts/dev/run-angular-tests.mjs` runs the full Angular suite plus the focused PWA suite. `scripts/dev/pwa-coverage-gate.mjs` fails closed unless focused branch coverage is exactly non-zero 100%; its parser has dedicated tests.
- CI evidence includes full Angular `542/542`, focused PWA `17/17`, and exact focused branch coverage `100% (11/11)`.
- CodeRabbit findings for child-process `close`, import ordering, and recovery-key ownership were fixed. The snackbar/deferred-update suggestion remains intentionally out of scope because the accepted lifecycle is deterministic immediate adoption after successful activation.

### Formatting baseline

- Repository-wide `pnpm run format:check` remains blocked by pre-existing formatting debt and an existing parse error in `docs/api.html`; this PR does not absorb unrelated global formatting cleanup or report that check as green.

### Visual baseline topology

- Reviewed baseline pointer remains `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`, with workflow run `33433358656`, artifact `9773567292`, and digest `sha256:4bc66b7550b428e276266eb2f241ffe575a0c34dd14fd8585df133652b586095`.
- PR #439 final validated head `f3305fe2cf86be988ab5365534be33c16e42e78c` passed visual regression with 0/36 changed screenshots.
- Its squash merge on `main`, `b6509aaa214dc932588dc6bb0ed068ef097ce8c5`, has the exact same Git tree SHA `7e7651c07c8d9b65faab439dfbdcee1d3e269cbd` as the validated PR #439 head.
- Visual Regression #366 (`33634298231`) on `1b82a7744eb3abddecc99a7d29cd53d833cac373` fails in `Resolve reviewed baseline` with exact GitHub compare status `diverged`: baseline `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5` is not an ancestor of the head. Dependency installation, baseline/head rendering, pixel comparison, and artifact retention are skipped.
- The failure is therefore squash-topology, not a demonstrated tree difference. `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` is the evidence-backed repair candidate.
- `.github/visual-baseline.json` remains unchanged. Changing it requires explicit user approval; a generic `continua` is not approval.

### Review state

- PR #438 is open, non-draft, and mergeable on branch `agent/fix-pwa-brand-update` against `main`.
- CodeRabbit status on `1b82a7744eb3abddecc99a7d29cd53d833cac373` is success with `Review skipped: manual review required for this OSS repository`.
- Existing review submissions are `COMMENTED`; there is no human `APPROVED` review.
- Human approval is intentionally not requested while either visual gate is red.

## Decision

1. Keep current theme tokens as the PWA shell source of truth.
2. Keep `public/favicon.svg` as the only repository favicon/install artwork owner.
3. Preserve the exact supplied SVG source identities; build optimization may alter only the documented non-rendering bytes.
4. Keep `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef` as the immutable authoritative Chromium RGBA contract.
5. Never redefine the approved digest to the current `7f0680a6...` output to obtain a green workflow.
6. Do not continue arbitrary color or geometry brute force. Resume artwork modification only when exact reference pixels or an equivalent exact source are available and a real pixel diff can drive the change.
7. Keep one shared browser render helper and one shared static contract; callers consume those owners rather than recalculating identity.
8. Keep the root-owned Angular `SwUpdate` lifecycle and recovery-key SSOT; no custom worker, `skipWaiting`, cache purge, polling loop, or deferred-snackbar redesign.
9. Keep the visual-baseline ancestry gate intact and change its pointer only with explicit approval.
10. Keep repository-wide formatting debt out of scope.
11. Do not request human approval or merge while known technical gates are red.

## Acceptance

- `public/favicon.svg` represents the approved bus-stop/bus/clock identity and Chromium renders source and deployed output at 1254x1254 with zero differing pixels against the approved reference.
- Rendered RGBA SHA-256 equals `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- Canonical source Git blob SHA-1 and UTF-8 SHA-256 remain pinned and required by static CI.
- The documented output transformation preserves rendered pixels and its deployed byte size/hash remain pinned.
- Manifest has exactly one canonical `favicon.svg` entry for `any maskable`; duplicate maskable artwork remains absent.
- Manifest/browser startup colors match the current theme and the service worker precaches the manifest/canonical icon.
- Update lifecycle covers startup success/failure, ready/non-ready events, duplicate ready events, false/rejected activation, retry, disabled worker, unavailable storage, unrecoverable recovery, reload-loop prevention, initialization idempotence, and both overlap orderings.
- Recovery-storage identity has one scoped owner consumed by production and tests.
- Focused PWA service coverage remains exact non-zero 100% branches and its parser fails closed.
- Lint, scripts, Angular, deploy checks, exact Playwright identity, visual evidence, required GitHub CI, and reviewed visual regression are clean on one final head.
- Visual regression runs against a valid reviewed ancestor; the baseline pointer is never silently advanced.
- Final-head screenshots are manually reviewed for layout, overflow, attribution, responsive behavior, content, keyboard/a11y, and visual regressions.
- One human approval required by the `main` ruleset is obtained only after the technical head is ready.

## Checks

- Static PWA shell tests for theme, one canonical icon, exact source identities, deployed-output identity, document metadata, and service-worker asset coverage.
- Browser PWA helper rasterizes both source and served/deployed SVG at 1254x1254 and hashes RGBA bytes with Web Crypto.
- Deterministic Visual Evidence runs the same exact identity helper before screenshot publication.
- Unit tests cover all `SwUpdate` lifecycle states, both overlap-order regressions, and the shared recovery-storage key.
- Focused branch-coverage gate plus parser unit tests.
- Exact-head CI, Visual Evidence, Visual Regression, CodeRabbit status, human review, and final runtime/UI review before delivery.

## Risks

- The supplied PNG-to-SVG conversion is not pixel-equivalent to the approved raster; the remaining deltas cannot be localized from the target SHA-256 alone.
- Arbitrary fills, strokes, opacity, or geometry changes could reduce fidelity while still producing an unrelated digest.
- SVG rasterization edge pixels are renderer-specific; acceptance is explicitly Chromium at the contractual 1254x1254 canvas.
- Platform launchers can retain installed icon metadata independently of Angular service-worker version adoption.
- Immediate reload on a future ready version can interrupt a future unsaved transactional flow; changing that policy requires a separate accepted UX design.
- The reviewed visual-baseline pointer is topologically stale after PR #439's squash merge and requires explicit approval to repair.
- Repository-wide Prettier has unrelated baseline failures.

## Rollback

Revert this PR. No backend, API, database, persistent-data migration, release, or deployment is involved.

## Delivery status

- Technical head before this documentation consolidation: `1b82a7744eb3abddecc99a7d29cd53d833cac373`.
- Exact source authority: preserved and pinned; Git blob `69b7f7dd...`, UTF-8 SHA-256 `b12a92b9...`.
- Deployed output optimization: implemented and pinned at 15,146 bytes / SHA-256 `fef8eacd...`; source and optimized output both currently render `7f0680a6...`.
- Render-contract regression: detected and corrected. `1b82a774...` restores the approved `57aeab24...` expectation after the false-green `7f0680a6...` expectation on the prior head.
- Required CI: CI #1476 (`33634298320`) is green on `1b82a774...`.
- Exact browser identity: blocked. Visual Evidence #1493 (`33634298239`) reports 41/42 Playwright tests with the sole failure `7f0680a6...` received versus `57aeab24...` required; no current-head screenshot artifact is published.
- Artwork repair: blocked pending exact approved raster/reference pixels or equivalent exact source. No evidence-backed autonomous artwork edit remains.
- Visual baseline regression: blocked. Visual Regression #366 (`33634298231`) reports `compare status: diverged` before installation/render/comparison; baseline remains unchanged pending explicit approval.
- CodeRabbit: success on `1b82a774...`; no human `APPROVED` review exists.
- Final runtime/UI review: not complete because the exact-artwork and reviewed-baseline gates prevent a valid final-head visual artifact/comparison.
- Merge/release/deploy: not performed.

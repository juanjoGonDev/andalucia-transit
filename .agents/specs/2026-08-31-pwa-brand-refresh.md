# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme, adopts new deployments without requiring reinstall, and uses the user-supplied bus-stop SVG consistently for browser and installed PWA surfaces.

The identity is a single-support bus stop, a front-facing bus, and a clock hanging from the upper stop structure on a dark navy/blue application background. The rejected Andalusia-map concept and Junta de Andalucia identity must not be used.

On 2026-09-02 the user explicitly clarified that the supplied original SVG must be used "si o si" and optimized. That instruction supersedes the earlier assumption that an unrecoverable generated raster remained the active visual authority. The canonical source bytes and their exact Chromium render now define the accepted identity.

## Scope

- PWA favicon/install identity and manifest metadata.
- Angular `SwUpdate` adoption lifecycle and unrecoverable-state recovery.
- Exact static/browser verification of the canonical SVG identity.
- Source-preserving build-output optimization for the canonical SVG.
- Service-worker integrity for any post-build asset transformation.
- PWA-specific test and coverage tooling required to make lifecycle and identity acceptance enforceable.
- Review, CI, runtime, and visual evidence needed to deliver this PR safely.

Out of scope:

- Custom service-worker forks, `skipWaiting`, manual cache deletion, polling storms, backend/API/database changes, migrations, release, deploy, or merge.
- Broad repository formatting cleanup unrelated to this PWA change.
- Changing `.github/visual-baseline.json` without explicit user approval.
- Creating redundant 192/512 SVG copies or standalone binary icon owners when the manifest already consumes one vector `sizes: "any"` source.
- Approximate or regenerated replacements for the canonical user-supplied SVG.

## Evidence

### Product and canonical identity

- Current theme tokens are primary `#0061fe`, strong blue `#0b54d4`, dark surface `#060f2b`, and background `#f6f7f8`.
- `public/favicon.svg` is the sole repository artwork owner. `public/manifest.webmanifest` references it once with `sizes: "any"`, `type: "image/svg+xml"`, and `purpose: "any maskable"`; no second maskable artwork owner is allowed.
- Root `AGENTS.md` forbids standalone binary/media files in git, so the canonical repository artwork remains text SVG.
- User commit `7560b1f261aeba68bb2c0bd3ab78726c05b2f796` supplied the colored SVG; commit `2f6a456609c41b05971acb37f66eac90716fae7c` adopted that exact blob at `public/favicon.svg`.
- Canonical source Git blob SHA-1: `69b7f7ddbd0e5cb5e4fccc0a2c6d6b7df2234695`.
- Canonical source UTF-8 SHA-256: `b12a92b917b9d194b7f37ca2e6c031a91c5fc81160c62f5c521fb58eac841e92`.
- Canonical source size: 15,186 bytes.
- Canonical Chromium 1254x1254 rendered RGBA SHA-256: `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`.
- Historical digest `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef` belongs to an earlier generated raster whose complete bytes were never retained. It remains provenance/investigation evidence, not an active acceptance gate after the user's explicit SVG-source clarification.

### Source-preserving delivery optimization

- `scripts/pwa-icon-output.ts` owns the build-output transformation. It removes only the exact XML declaration `<?xml version="1.0" encoding="UTF-8"?>\n` and the final newline from the deployed favicon payload.
- The repository source remains byte-for-byte authoritative and retains both pinned source identities above.
- The optimized deployed SVG is 15,146 bytes and has SHA-256 `fef8eacd36fc0a37a8f17632ac680130ce256a3d2b46496028f62b26db07f514`.
- Chromium renders both the canonical source and optimized deployed output to `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`; the optimization changes delivery bytes but preserves rendered pixels exactly.
- The 40-byte reduction is intentionally conservative. A prior structural optimizer produced a different Chromium raster and was rejected rather than accepting a visual change for a larger byte reduction.

### Canonical checkout line endings

- Because the canonical source is pinned by an exact UTF-8 SHA-256 and the delivery optimizer matches the XML declaration including `\n`, checkout line endings are part of the source contract rather than an editor preference.
- Commit `a661c9f7036b11f117cf0ccd36d12ff7f43fddc0` (`test(pwa): pin canonical icon line endings`) adds the narrow `.gitattributes` rule `public/favicon.svg text eol=lf`; it does not normalize unrelated files or modify the SVG blob.
- `scripts/pwa-shell.test.ts` requires that exact rule exactly once.
- CI #1481 (`33641212287`) proved the checkout regression while preserving the canonical source at 15,186 bytes / SHA-256 `b12a92b9...` and optimized output at 15,146 bytes / SHA-256 `fef8eacd...`.

### Service-worker integrity after optimization

- Production Angular builds enable `serviceWorker: "ngsw-config.json"` and `ngsw-config.json` explicitly precaches `/favicon.svg`.
- The first delivery-optimization implementation rewrote `dist/.../favicon.svg` after `ng build`. That ordering was unsafe because Angular had already generated `ngsw.json` from the pre-optimization bytes.
- Commit `998a2a4090ac9ed0810b89bf4af6edf853e98ee7` (`fix(pwa): refresh service worker after icon optimization`) makes the production order explicit: `ng build` → optimize `favicon.svg` → regenerate `ngsw.json` → verify the generated icon hash → create `404.html`.
- The deploy script reads the final build's `<base href>`, requires exactly one `ngsw.json` hash-table entry ending in `/favicon.svg`, computes SHA-1 over the final deployed bytes, and fails if the values differ.
- Commit `6ed2d039284d33de4865587ca6408d92ef061f20` (`chore(pwa): use pinned service worker cli`) resolves `ngsw-config` through `pnpm exec`, so the command uses the installed pinned toolchain instead of a network-capable fallback resolver.
- The verified final service-worker SHA-1 for the optimized favicon is `e38e3835435b628a767412abb2711badf831f37c`.
- Stable invariant: no asset covered by the generated Angular service-worker hash table may be mutated after the final `ngsw-config` generation without regenerating and re-verifying that manifest.

### Historical exact-reference investigation

- Before the user's final source-of-truth clarification, the branch attempted to reconcile the supplied SVG with historical digest `57aeab24...`.
- A bounded Chromium investigation exhausted all 72 combinations formed only from source colors and known product-theme values. All 72 produced distinct hashes and none matched the historical digest.
- Changing only SVG width/height did not change the contractual RGBA digest when the same viewBox was rasterized into the same 1254x1254 canvas.
- The historical WebP was never fully versioned: retained payload chunks were 00, 02, and 03; no `payload-01` commit exists.
- Its RIFF prefix declares 663,028 bytes / 884,040 Base64 characters. Retained fragments total 58,438 characters, about 6.61%, leaving about 93.39% absent.
- Repository history/search, PR comments/reviews, refs, branches/tags/forks, relevant Actions runs/artifacts, releases, public hash searches, and available conversation attachments did not recover the complete raster.
- The obsolete retained fragments were removed by `f30042f507c3ee8f3a75a874a0179daf9332144d` after the user selected the supplied SVG path.
- This investigation remains useful provenance, but it no longer blocks acceptance of the explicitly selected SVG source.

### Render-contract requirement reconciliation

- Commit `fbc515e3dcfde32039f8ef3a19c5f18637a48a83` previously set the render contract to the observed SVG digest before the user hierarchy had been reconciled; it was later reverted by `1b82a7744eb3abddecc99a7d29cd53d833cac373` because the task spec still treated the historical raster as authoritative.
- The user's later explicit instruction to use the original SVG "si o si" is higher authority than the stale task-spec assumption. Keeping `57aeab24...` as the active gate after that clarification would make the accepted source impossible to deliver and would contradict the user requirement.
- Commit `51395dc9757b1533eb6299ecfb577bb4a7973413` (`fix(pwa): honor canonical svg render identity`) changes only `APPROVED_ICON.renderedRgbaSha256` from historical `57aeab24...` to the exact Chromium render `7f0680a6...` of the pinned canonical source. Source blob/SHA, deployed SHA/size, manifest ownership, and browser equality checks remain fail-closed.
- CI #1484 (`33646672207`) completed successfully on `51395dc9...`, including Install dependencies, Test scripts, Deploy pipeline, Test angular, Lint, and required `Check all ok`.
- Visual Evidence #1509 (`33646672242`) completed successfully on the same head. Quality gates, app startup, populated responsive/a11y states, populated screenshots, empty states, empty screenshots, head ownership, artifact retention, release replacement, and PR evidence publication all passed.
- Visual Evidence artifact `9853265717`, `pr-438-visual-evidence-51395dc9757b1533eb6299ecfb577bb4a7973413`, is 13,397,343 bytes with digest `sha256:df8fc475399d2e80eb5d504b6474680855ebb6141e079980b1dd04fbaf0a57f1`.
- The artifact contains 41 PNG captures covering desktop/mobile populated states, empty states, route loading/error/preview, dialogs, map, lines, favorites, settings, news, recent stops, and stop details. All 41 were manually reviewed on 2026-09-02; no corruption, new overflow, missing map attribution, or visual regression attributable to this PWA identity change was found.

### Update lifecycle and verification ownership

- Angular service-worker registration remains `registrationStrategy: "registerWhenStable:30000"`; one root-owned `SwUpdate` lifecycle checks on startup, activates `VERSION_READY`, reloads after successful activation, deduplicates overlapping reload requests, permits retry after false/rejected activation, and bounds unrecoverable recovery with a session marker.
- `src/app/core/services/pwa-update.config.ts` is the single owner of `PWA_RECOVERY_SESSION_KEY`; production and tests consume it.
- Regression coverage includes both overlap orderings: unrecoverable-first/activation-later and activation-first/unrecoverable-later.
- `scripts/dev/run-angular-tests.mjs` runs the full Angular suite plus the focused PWA suite. `scripts/dev/pwa-coverage-gate.mjs` fails closed unless focused branch coverage is exactly non-zero 100%; its parser has dedicated tests.
- CodeRabbit findings for child-process `close`, import ordering, and recovery-key ownership were fixed. The snackbar/deferred-update suggestion remains intentionally out of scope because the accepted lifecycle is deterministic immediate adoption after successful activation.

### Visual baseline topology

- Reviewed baseline pointer remains `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`, with workflow run `33433358656`, artifact `9773567292`, and digest `sha256:4bc66b7550b428e276266eb2f241ffe575a0c34dd14fd8585df133652b586095`.
- PR #439 final validated head `f3305fe2cf86be988ab5365534be33c16e42e78c` passed visual regression with 0/36 changed screenshots.
- Its squash merge on `main`, `b6509aaa214dc932588dc6bb0ed068ef097ce8c5`, has the exact same Git tree SHA `7e7651c07c8d9b65faab439dfbdcee1d3e269cbd` as the validated PR #439 head.
- Visual Regression #374 (`33646672392`) on `51395dc9757b1533eb6299ecfb577bb4a7973413` fails in `Resolve reviewed baseline`: baseline `5ea33fcc...` is not an ancestor of the head and GitHub reports `compare status: diverged`. Installation, rendering, pixel comparison, and artifact retention are skipped.
- The failure is squash topology, not a demonstrated tree difference. `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` is the evidence-backed repair candidate.
- `.github/visual-baseline.json` remains unchanged. Changing it requires explicit user approval; a generic `continua` is not approval.

### Formatting and review baseline

- Repository-wide `pnpm run format:check` remains blocked by pre-existing formatting debt and an existing parse error in `docs/api.html`; this PR does not absorb unrelated global cleanup or report that check as green.
- PR #438 remains open, non-draft, and mergeable on branch `agent/fix-pwa-brand-update` against `main`.
- CodeRabbit combined status is success on `51395dc9...`.
- Existing review submissions are `COMMENTED`; there is no human `APPROVED` review.
- Human approval remains deferred until the protected visual-baseline gate is resolved and the final head is revalidated.

## Decision

1. Keep current theme tokens as the PWA shell source of truth.
2. Keep `public/favicon.svg` as the only repository favicon/install artwork owner and keep one manifest SVG entry with `sizes: "any"`; do not create redundant 192/512 SVG copies or standalone binary icon owners.
3. Treat the exact user-supplied SVG bytes as the canonical visual authority, per the user's explicit 2026-09-02 instruction to use that SVG and optimize it.
4. Preserve the exact supplied SVG source identities and pin `public/favicon.svg` to LF checkout semantics with the narrow `.gitattributes` rule `text eol=lf`; build optimization may alter only the documented non-rendering bytes.
5. Require source and optimized output to rasterize in Chromium at 1254x1254 to the same exact RGBA SHA-256 `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`.
6. Keep historical `57aeab24...` only as provenance of the abandoned generated-raster path; do not use it as an active acceptance gate.
7. After any post-build mutation of a service-worker-managed asset, regenerate `ngsw.json` from final bytes and fail if its hash table does not match those bytes.
8. Resolve the service-worker generator from the pinned repository toolchain (`pnpm exec`), not a network-capable fallback resolver.
9. Keep one shared browser render helper and one shared static contract; callers consume those owners rather than recalculating identity.
10. Keep the root-owned Angular `SwUpdate` lifecycle and recovery-key SSOT; no custom worker, `skipWaiting`, cache purge, polling loop, or deferred-snackbar redesign.
11. Keep the visual-baseline ancestry gate intact and change its pointer only with explicit approval.
12. Do not request human approval or merge while a known protected technical gate is red.

## Acceptance

- `public/favicon.svg` is the exact user-supplied canonical artwork and remains the only repository/browser/PWA icon source.
- Canonical source Git blob SHA-1 equals `69b7f7ddbd0e5cb5e4fccc0a2c6d6b7df2234695` and source UTF-8 SHA-256 equals `b12a92b917b9d194b7f37ca2e6c031a91c5fc81160c62f5c521fb58eac841e92`.
- Canonical checkout preserves LF bytes independently of developer Git line-ending configuration.
- Optimized deployed output remains 15,146 bytes with SHA-256 `fef8eacd36fc0a37a8f17632ac680130ce256a3d2b46496028f62b26db07f514`.
- Chromium renders source and deployed output at 1254x1254 with zero differing pixels and RGBA SHA-256 `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`.
- Final deployed `favicon.svg` is represented by the final generated `ngsw.json` hash table; deploy preparation fails on a mismatch.
- Manifest has exactly one canonical `favicon.svg` entry for `any maskable`; duplicate maskable artwork remains absent.
- Manifest/browser startup colors match the current theme and the service worker precaches manifest/canonical icon.
- Update lifecycle covers startup success/failure, ready/non-ready events, duplicate ready events, false/rejected activation, retry, disabled worker, unavailable storage, unrecoverable recovery, reload-loop prevention, initialization idempotence, and both overlap orderings.
- Recovery-storage identity has one scoped owner consumed by production and tests.
- Focused PWA service coverage remains exact non-zero 100% branches and its parser fails closed.
- Lint, scripts, Angular, deploy checks, exact Playwright identity, Visual Evidence, required GitHub CI, and CodeRabbit are clean on the technical head.
- Visual Regression runs against a valid reviewed ancestor; the baseline pointer is never silently advanced.
- Final-head screenshots are manually reviewed for layout, overflow, attribution, responsive behavior, content, keyboard/a11y, and visual regressions.
- One human approval required by the `main` ruleset is obtained only after the technical head is ready.

## Checks

- Static PWA shell tests for theme, one canonical icon, canonical LF checkout semantics, exact source identities, deployed-output identity, document metadata, and service-worker asset coverage.
- Real `deploy:prepare` integration build verifies optimized output bytes/hash, regenerates `ngsw.json`, and verifies the final icon SHA-1 against the generated service-worker hash table.
- Browser PWA helper rasterizes both source and served/deployed SVG at 1254x1254 and hashes RGBA bytes with Web Crypto.
- Deterministic Visual Evidence runs the same exact identity helper before screenshot publication.
- Unit tests cover all `SwUpdate` lifecycle states, both overlap-order regressions, and the shared recovery-storage key.
- Focused branch-coverage gate plus parser unit tests.
- Exact-head CI, Visual Evidence, Visual Regression, CodeRabbit status, human review, and final runtime/UI review before delivery.

## Risks

- SVG rasterization edge pixels are renderer-specific; acceptance is explicitly Chromium at the contractual 1254x1254 canvas.
- Any future optimization that rewrites paths, transforms, geometry, paint, or rendering semantics could change the icon even if it reduces bytes; Chromium equality remains mandatory.
- Any future post-build mutation of an asset covered by `ngsw.json` can invalidate Angular service-worker integrity if the manifest is not regenerated from final bytes.
- Platform launchers can retain installed icon metadata independently of Angular service-worker version adoption.
- Immediate reload on a future ready version can interrupt a future unsaved transactional flow; changing that policy requires a separate accepted UX design.
- The reviewed visual-baseline pointer is topologically stale after PR #439's squash merge and requires explicit approval to repair.
- Repository-wide Prettier has unrelated baseline failures.

## Rollback

Revert this PR. No backend, API, database, persistent-data migration, release, or deployment is involved.

## Delivery status

- Latest validated functional head: `51395dc9757b1533eb6299ecfb577bb4a7973413` (`fix(pwa): honor canonical svg render identity`).
- Source authority: preserved and pinned; Git blob `69b7f7dd...`, UTF-8 SHA-256 `b12a92b9...`, 15,186 bytes, LF checkout enforced.
- Deployment output: 15,146 bytes / SHA-256 `fef8eacd...`; source and optimized output both render exact Chromium RGBA `7f0680a6...`.
- Service-worker integrity: corrected by `998a2a...` and hardened by `6ed2d039...`; deploy verifies final service-worker SHA-1 `e38e3835435b628a767412abb2711badf831f37c` after optimization.
- Required CI: CI #1484 (`33646672207`) completed successfully, including Install dependencies, Test scripts, Lint, Test angular, Deploy pipeline, and required `Check all ok`.
- Exact browser identity and visual evidence: Visual Evidence #1509 (`33646672242`) completed successfully and published artifact `9853265717` with digest `sha256:df8fc475399d2e80eb5d504b6474680855ebb6141e079980b1dd04fbaf0a57f1`.
- Manual visual review: all 41 PNGs from the exact-head artifact were inspected; no PWA-change regression, obvious overflow, corruption, or missing map attribution was found.
- CodeRabbit: success on `51395dc9...`.
- Visual baseline regression: blocked only by ancestry. Visual Regression #374 (`33646672392`) reports `compare status: diverged` before installation/render/comparison; baseline remains unchanged pending explicit approval.
- Final runtime/UI review: visual screenshot review is complete for `51395dc9...`; final end-to-end closure still requires a valid Visual Regression run on the eventual final head and a final console/network/keyboard/a11y pass after the baseline repair.
- Human `APPROVED` review: none; intentionally not requested while the protected baseline gate is red.
- Merge/release/deploy: not performed.

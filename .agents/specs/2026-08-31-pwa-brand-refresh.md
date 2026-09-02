# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme, adopts new deployments without requiring reinstall, and uses the exact user-approved bus-stop identity for browser and installed PWA surfaces.

The approved 1254x1254 identity is a single-support bus stop, a front-facing bus, and a clock hanging from the upper stop structure on a dark navy/blue application background. The rejected Andalusia-map concept and Junta de Andalucia identity must not be used.

On 2026-09-02 the user superseded the earlier missing-WebP implementation constraint: use the supplied colored SVG converted from the approved PNG/reference as the working source and adapt that source only when evidence supports the change. The file format is not authoritative; the approved Chromium-rendered pixels are.

## Scope

- PWA favicon/install identity and manifest metadata.
- Angular `SwUpdate` adoption lifecycle and unrecoverable-state recovery.
- Exact static/browser verification of the approved artwork.
- PWA-specific test and coverage tooling required to make lifecycle and identity acceptance enforceable.
- Review, CI, runtime, and visual evidence needed to deliver this PR safely.

Out of scope:

- Custom service-worker forks, `skipWaiting`, manual cache deletion, polling storms, backend/API/database changes, migrations, release, deploy, or merge.
- Broad repository formatting cleanup unrelated to this PWA change.
- Changing the reviewed visual-baseline pointer without explicit approval.
- Guessing arbitrary SVG geometry or colors from a SHA-256 digest when the target pixels are unavailable.

## Evidence

### Product and canonical identity

- Current theme tokens are primary `#0061fe`, strong blue `#0b54d4`, dark surface `#060f2b`, and background `#f6f7f8`.
- `public/favicon.svg` is the sole artwork owner. `public/manifest.webmanifest` references it once with `sizes: "any"`, `type: "image/svg+xml"`, and `purpose: "any maskable"`; `public/app-icon-maskable.svg` remains absent.
- Root `AGENTS.md` forbids standalone binary/media files in git. The canonical text SVG therefore remains the repository artwork owner.
- Historical approved WebP SHA-256 `5fe98391a9eed6de6cc7616a0604978063a270c79e7329cf137f3384ac2107be` is provenance only after the user's SVG-source decision.
- The authoritative Chromium 1254x1254 rendered RGBA SHA-256 remains `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`; zero differing pixels are mandatory.

### Supplied SVG integration

- User commit `7560b1f261aeba68bb2c0bd3ab78726c05b2f796` added `public/ChatGPT Image 31 ago 2026, 12_42_59.svg` as the requested colored source.
- The exact supplied Git blob is `69b7f7ddbd0e5cb5e4fccc0a2c6d6b7df2234695`.
- The supplied SVG declares `1095x1095` with `viewBox="0 0 1095 1095"` and uses four primary paint values: `#02193e`, `#0162f3`, `#fdfdfd`, and `#000`.
- Commit `2f6a456609c41b05971acb37f66eac90716fae7c` adopts that exact blob as `public/favicon.svg` and removes the temporary filename, so production now uses the user's actual SVG rather than a recreation.
- CI measured the exact current SVG UTF-8 SHA-256 as `b12a92b917b9d194b7f37ca2e6c031a91c5fc81160c62f5c521fb58eac841e92`.
- Commit `5d2120da02731f4bfddc05b154413a536cb84da6` adds that UTF-8 SHA-256 to `scripts/pwa-contract.ts` and makes `scripts/pwa-shell.test.ts` assert it, alongside the existing Git blob SHA identity and authoritative rendered digest. The source is not described as final/approved while its rendered pixels still fail the authoritative digest.

### Exact render result and bounded color investigation

- Commit `4b6596a31c08a6061d57b8d202bd02188926fcc1` closes a validation gap by making the visual-evidence Playwright suite execute the exact PWA icon render assertion through one shared helper.
- Chromium consistently renders the supplied SVG to RGBA SHA-256 `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b` at the contractual 1254x1254 canvas, not the target `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- Changing only the SVG `width`/`height` attributes from 1095 to 1254 does not change the rendered RGBA digest when Chromium draws the same viewBox into the same 1254x1254 canvas.
- Diagnostic commit `12ba92909a6181d290d313267ec3be9b27378716` tested the obvious theme substitutions in memory without modifying the served icon. None matched the target.
- Diagnostic commit `73d77897f2dbbc05284b41065dc2adedb2ce729b` exhaustively tested the finite palette formed from known/current values only: navy `{#02193e,#060f2b}`, blue `{#0162f3,#0061fe,#0b54d4}`, white/background `{#fdfdfd,#ffffff,#f6f7f8}`, and corners `{#000,#02193e,#060f2b,transparent}`.
- Visual Evidence #1473 (`33607929909`) reports `no exact match across 72 candidates (72 unique hashes)`. The served artwork remains `7f0680a6...` and the exact test fails only because it differs from `57aeab24...`.
- A cryptographic hash provides equality, not a useful pixel-distance gradient. After all evidence-backed palette candidates failed, further arbitrary color search would be guessing and is rejected.
- Because the working source came from PNG-to-SVG conversion, the remaining mismatch may include geometry, antialiasing, clipping, opacity, quantization, or other rasterization details. Exact adaptation now requires the approved reference pixels or an equivalent exact source so a real per-pixel diff can identify what must change.
- Commit `a0a1f99bd45cf14ae5cbbe8620ede2f3163af49f` removes the temporary palette probes and keeps only the permanent exact Chromium render gate.

### Legacy WebP recovery cleanup

- Historical investigation proved the WebP was never fully versioned: payload chunks 00, 02, and 03 existed while chunk 01 did not.
- The retained RIFF prefix declares a complete WebP size of 663,028 bytes, equivalent to 884,040 Base64 characters. The three retained fragments total 58,438 Base64 characters, only about 6.61% of the payload, leaving about 93.39% missing; they cannot reconstruct the original.
- Git history contains the sequence `payload-00` → `payload-02` → `payload-03`, and repository commit search for `payload chunk 01` returns no commit.
- Recovery covered PR comments/reviews, commit history/comments, refs, branches/tags/forks, Actions logs/artifacts, releases, repository searches, public hash searches, and available conversation attachments. No complete verifiable WebP or exact approved raster was recovered; relevant historical and current workflow runs expose no recoverable visual artifact containing it.
- SHA-256 cannot reconstruct missing bytes.
- The user explicitly selected the supplied SVG path instead. The incomplete chunk files therefore ceased to own any runtime/test behavior and had no references.
- Commit `f30042f507c3ee8f3a75a874a0179daf9332144d` removes `scripts/pwa-icon/payload-00.txt`, `payload-02.txt`, and `payload-03.txt` as obsolete recovery debris.

### Update lifecycle

- Angular service-worker registration remains `registrationStrategy: "registerWhenStable:30000"`; the app now has one root-owned `SwUpdate` lifecycle.
- The lifecycle initializes once, checks on startup, activates `VERSION_READY`, reloads after successful activation, deduplicates overlapping activation/recovery reloads, permits retry after false/rejected activation, and bounds unrecoverable recovery with a session marker.
- `src/app/core/services/pwa-update.config.ts` owns `PWA_RECOVERY_SESSION_KEY`; production and tests consume that single owner.
- Commit `1b6d6fa76b25ff0c0ee9f5b62c3a062ae049a933` fixes the unrecoverable-first overlap by routing navigation through one `reloadRequested` owner and preserving the recovery marker.
- Regression commit `3e1fd550cac7566bcc0707c81c22b19a37ff4514` proved the symmetric activation-first/late-unrecoverable bug in CI #1457 (`33583210534`).
- Fix commit `6dfe5caf9cdb9782cf91b51596ff476ea54807cf` makes activation-first reload ownership reject a later unrecoverable claim before it can persist the marker.
- CI #1458 (`33583372302`) validates full Angular `542/542`, focused PWA `17/17`, and exact PWA branch coverage `100% (11/11)`.

### Verification ownership and CI

- `scripts/pwa-contract.ts` is the verification-contract owner for theme values, contractual 1254x1254 render dimensions, supplied SVG Git blob SHA-1, supplied SVG UTF-8 SHA-256, and the authoritative RGBA digest.
- `scripts/pwa-shell.test.ts` verifies theme, one canonical manifest icon, both exact supplied SVG source identities, document metadata, and service-worker asset coverage.
- `tests/playwright/pwa-icon.assert.ts` is the sole browser-side exact-render implementation. It fetches the served SVG, draws it in Chromium to 1254x1254, hashes RGBA bytes, logs the actual digest, and compares against the authoritative digest.
- Both `tests/playwright/pwa-shell.spec.ts` and the deterministic visual suite reuse that helper rather than recalculating identity separately.
- `scripts/dev/run-angular-tests.mjs` runs the full Angular suite plus the focused PWA suite; `scripts/dev/pwa-coverage-gate.mjs` fails closed unless the focused branch summary is exactly non-zero 100%. Its parser has eight dedicated tests.
- CodeRabbit findings for child-process `close` ownership and import order were fixed by `10dbcf8e5d960d54f6481495e5e46cb8e61a079e` and `0cd7ffcb5772a7aca8f7090e88d103d40201fcf6`.
- CI #1470 (`33623320472`) on head `5d2120da02731f4bfddc05b154413a536cb84da6` completed success: install, lint, script tests, Angular, deploy pipeline, and required `Check all ok` were green. `Test scripts` passed 11/11 suites and the PWA shell test asserted source SHA-256 `b12a92b...`.
- Visual Evidence #1481 (`33623320415`) reached the real browser assertion and failed only on exact icon identity: 41 Playwright tests passed and one PWA identity test failed with received `7f0680a6...` versus expected `57aeab24...`.
- The permanent exact render gate remains intentionally fail-closed; CI success alone is not sufficient task acceptance while visual identity fails.

### Formatting baseline

- Repository-wide `pnpm run format:check` remains blocked by pre-existing formatting debt and an existing parse error in `docs/api.html`; the temporary probe `fec71d071b69324474ca569a6e4e8d5d1e1b4246` proved this and was reverted by `a04aa019171e3495a13d6b1415b75feb227d5e21`.
- This PR does not absorb unrelated global formatting cleanup or falsely report that check as green.

### Visual baseline topology

- Reviewed baseline pointer remains `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`.
- PR #439 final head `f3305fe2cf86be988ab5365534be33c16e42e78c` passed visual regression against that baseline with 0/36 changed screenshots and zero differing pixels.
- Its squash merge on `main`, `b6509aaa214dc932588dc6bb0ed068ef097ce8c5`, has the exact same Git tree SHA `7e7651c07c8d9b65faab439dfbdcee1d3e269cbd` as the validated head.
- Visual Regression #360 (`33623320446`) on head `5d2120da02731f4bfddc05b154413a536cb84da6` still fails at baseline resolution because squash topology made the reviewed pointer diverged, not because the trees differ; no screenshot comparison runs.
- `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` is the evidence-backed ancestry repair candidate. `.github/visual-baseline.json` must not change without explicit approval; a generic continuation command is not approval.

## Decision

1. Keep current theme tokens as the PWA shell source of truth.
2. Keep `public/favicon.svg` as the only favicon/install artwork owner.
3. Keep the exact user-supplied SVG blob as the working source; do not revert to a regenerated approximation or the missing WebP path.
4. Keep `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef` as the immutable authoritative Chromium RGBA contract.
5. Do not claim that the current source SHA or blob is the final approved icon while Chromium renders `7f0680a6...`.
6. Do not continue arbitrary color brute force. The complete known palette search found no exact match, and SHA-256 offers no evidence-directed distance metric.
7. Resume artwork modification only when the exact approved raster/reference pixels or equivalent exact source are available; calculate a real diff first, then change the SVG based on that evidence.
8. Keep one shared browser render helper and one shared static contract; callers consume those owners rather than duplicating calculations.
9. Keep the root-owned Angular `SwUpdate` lifecycle and recovery-key SSOT; no custom worker, `skipWaiting`, cache purge, or polling loop.
10. Keep the exact-render visual gate red until zero-pixel equivalence is proved.
11. Keep the visual-baseline ancestry gate intact and change its pointer only with explicit approval.
12. Keep repository-wide formatting debt out of scope.

## Acceptance

- `public/favicon.svg` represents the approved bus-stop/bus/clock identity and Chromium renders it at 1254x1254 with zero differing pixels against the approved reference.
- Rendered RGBA SHA-256 equals `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- The final accepted SVG source identity is pinned in `scripts/pwa-contract.ts` and required static CI verifies it.
- Manifest has exactly one canonical `favicon.svg` entry for `any maskable`; duplicate maskable artwork remains absent.
- Manifest/browser startup colors match the current theme and the service worker precaches the manifest/canonical icon.
- Update lifecycle covers startup success/failure, ready/non-ready events, duplicate ready events, false/rejected activation, retry, disabled worker, unavailable storage, unrecoverable recovery, reload-loop prevention, initialization idempotence, and both overlap orderings.
- Recovery-storage identity has one scoped owner consumed by production and tests.
- Focused PWA service coverage remains exact non-zero 100% branches and its explicit parser fails closed.
- Lint, scripts, Angular, deploy checks, exact Playwright identity, visual evidence, and required GitHub CI are clean on one final head.
- Repository-wide `format:check` remains explicitly documented as external baseline debt unless separately repaired.
- Visual regression runs against a valid reviewed ancestor before delivery; the baseline pointer is never silently advanced.
- A human approval required by the `main` ruleset is obtained only after the technical head is ready.

## Tests

- Static PWA shell tests for theme, one canonical icon, supplied/final source identity, document metadata, and service-worker asset coverage.
- Browser PWA helper rasterizes the served SVG at 1254x1254 and hashes RGBA bytes with Web Crypto.
- The visual-evidence deterministic Playwright suite executes the same exact identity helper so a mismatch blocks evidence publication.
- Unit tests cover all `SwUpdate` lifecycle states, both overlap-order regressions, and the shared recovery-storage key.
- Focused branch-coverage gate plus parser unit tests.
- Exact-head CI, visual evidence, and reviewed-baseline regression before final delivery.

## Risks

- The supplied PNG-to-SVG conversion is not pixel-equivalent to the approved raster; the exact remaining pixel deltas cannot be localized from the target SHA-256 alone.
- Changing arbitrary fills, strokes, opacity, or geometry without reference pixels could make the artwork less accurate while still producing an unrelated hash.
- SVG rasterization edge pixels are renderer-specific; acceptance uses Chromium at the contractual canvas size.
- Platform launchers can retain installed icon metadata independently of Angular service-worker version adoption.
- Immediate reload on a future ready version can interrupt a future unsaved transactional flow; that would require a separate safe-boundary design.
- The reviewed visual-baseline pointer is topologically stale after PR #439's squash merge and requires explicit approval to repair.
- Repository-wide Prettier has unrelated baseline failures.

## Rollback

Revert this PR. No backend, API, database, persistent-data migration, release, or deployment is involved.

## Delivery status

- Reconnaissance/specification: updated through the supplied-SVG integration, exact Chromium render investigation, and historical payload recovery audit.
- PWA shell colors, manifest ownership, service-worker lifecycle, unavailable-storage hardening, recovery-key SSOT, branch-coverage enforcement, CodeRabbit fixes, and both overlapping reload races: implemented and covered.
- Exact supplied SVG: integrated literally as `public/favicon.svg`; source Git blob `69b7f7dd...` and source UTF-8 SHA-256 `b12a92b9...` are both pinned/asserted by the shared static contract after `5d2120da02731f4bfddc05b154413a536cb84da6`.
- Static required CI: green on head `5d2120da...`; CI #1470 (`33623320472`) is fully successful.
- Exact browser identity: blocked. Visual Evidence #1481 (`33623320415`) passes 41/42 Playwright tests; current Chromium RGBA is `7f0680a6dd26bdd46ae88ba9d4ccb5fc2bfc7b3313e2fd17eb2e8a1d9e0bb77b`, target remains `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- Known palette adjustment: exhausted with 72/72 distinct candidate hashes and no exact match; diagnostic code was removed afterward.
- Historical incomplete WebP payload: unrecoverable from repository evidence; about 93.39% of its Base64 payload is absent and no `payload-01` commit or workflow artifact supplies it. The obsolete retained fragments were removed after the user selected the SVG path.
- Next evidence required for artwork changes: the exact approved PNG/reference pixels or an equivalent exact source so a per-pixel diff can drive changes.
- Visual baseline ancestry repair: evidence complete but unapplied; explicit approval is required. Visual Regression #360 (`33623320446`) stops at ancestry resolution before rendering.
- Human approval: intentionally not requested while either visual gate is red.
- Final visual/runtime review: blocked until the exact artwork can pass and the reviewed baseline can run. No hash, gate, or baseline will be weakened to bypass either blocker.

# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme, adopts new deployments without requiring reinstall, and uses the exact user-approved bus-stop identity for browser and installed PWA surfaces.

The approved 1254x1254 identity is a single-support bus stop, a front-facing bus, and a clock hanging from the upper stop structure on a dark navy/blue application background. The rejected Andalusia-map concept and Junta de Andalucia identity must not be used.

## Scope

- PWA favicon/install identity and manifest metadata.
- Angular `SwUpdate` adoption lifecycle and unrecoverable-state recovery.
- Exact static/browser verification of the approved artwork.
- PWA-specific test and coverage tooling required to make the lifecycle acceptance enforceable.
- Review and CI evidence needed to deliver this PR safely.

Out of scope:

- Custom service-worker forks, `skipWaiting`, manual cache deletion, polling storms, backend/API/database changes, migrations, release, deploy, or merge.
- Broad repository formatting cleanup unrelated to this PWA change.
- Changing the reviewed visual-baseline pointer without explicit approval.

## Evidence

### Product and identity

- The current product theme owns primary `#0061fe`, strong blue `#0b54d4`, dark surface `#060f2b`, and background `#f6f7f8`.
- The original favicon/manifest used the legacy identity and startup colors, and the original document had no explicit mobile `theme-color` metadata.
- Root `AGENTS.md` forbids standalone binary/media files in git. Exact approved pixels therefore need to remain inside a text SVG wrapper rather than a committed PNG/WebP file.
- `public/favicon.svg` is the sole artwork owner. The manifest references that file once with `sizes: "any"`, `type: "image/svg+xml"`, and `purpose: "any maskable"`; `public/app-icon-maskable.svg` is removed.
- The current favicon is still the rejected interim 512x512 vector and does not contain the approved lossless payload.
- Exact approved embedded WebP SHA-256: `5fe98391a9eed6de6cc7616a0604978063a270c79e7329cf137f3384ac2107be`.
- Exact Chromium-rendered RGBA SHA-256 at 1254x1254: `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.

### Missing payload recovery

- PR ancestry proves the payload was never fully versioned: `73d55b0c297d4be7c4c68237f129d341dbaca650` adds `payload-00.txt`; direct successor `56db1a1a4aa428872d5f9fc6a9c1babf995318b9` adds `payload-02.txt`; `49ae5fe8d318a0ecc3f95e27d392fecb4a72bf72` adds `payload-03.txt`. No `payload-01.txt` commit exists.
- The available fragments total only a small fraction of the complete WebP implied by its RIFF length; they cannot reconstruct the canonical bytes.
- Recovery checks covered PR comments/reviews, commit history/comments, PR refs and merge tree, visible branches/tags/forks, retained Actions artifacts/logs, the temporary visual-evidence release, GitHub/public code searches by hash/payload prefix, and available conversation attachments. No verifiable complete source was recovered.
- The pinned digests cannot be inverted to reconstruct missing image bytes. Regenerating visually similar artwork is not an acceptable substitute.

### Update lifecycle

- Angular service-worker registration already existed with `registrationStrategy: "registerWhenStable:30000"`, but the app had no root-owned `SwUpdate` adoption lifecycle.
- The lifecycle now initializes once, checks on startup, activates `VERSION_READY`, reloads after successful activation, ignores duplicate activation while one is in progress, allows retry after false/rejected activation, and handles unrecoverable state with a session-scoped reload-loop guard.
- Browser storage is a fallible boundary. Recovery-marker cleanup failure must not suppress a reload after an already successful activation. Unrecoverable recovery fails closed if its loop-prevention marker cannot be read or persisted.
- Manual CodeRabbit review identified a real overlap risk between `VERSION_READY` activation and `UNRECOVERABLE_STATE` recovery. Regression commit `a60942bbdaf25a468ba7b3f0b6af4c2b30ee7eb8` demonstrated the bug in CI #1452 (`33580681725`): the new test observed two `reloadCurrentVersion` calls and the recovery marker was cleared unexpectedly.
- Fix commit `1b6d6fa76b25ff0c0ee9f5b62c3a062ae049a933` adds one `reloadRequested` owner. The first reload cause wins; if unrecoverable recovery wins, its persisted marker remains intact when a concurrent activation completes.

### Verification ownership and coverage

- `scripts/pwa-contract.ts` is the single verification-contract owner for theme values, exact icon dimensions, MIME type, payload digest, and rendered RGBA digest. Static Node and Playwright tests consume that owner rather than duplicating constants.
- The previous Karma threshold configuration appeared to require 100% but did not enforce it. A first conditional `json-summary` attempt also failed because the Angular builder did not emit the requested file.
- `scripts/dev/run-angular-tests.mjs` therefore runs the complete Angular suite plus the focused PWA service suite and captures the summary Angular actually emits.
- `scripts/dev/pwa-coverage-gate.mjs` fails closed unless it receives exactly one non-empty branch summary with `100%` and `covered === total`; its parser has eight dedicated passing script tests.
- CodeRabbit correctly identified that captured child-process output must wait for `close`, not `exit`, because stdout may remain open after process exit. Commit `10dbcf8e5d960d54f6481495e5e46cb8e61a079e` applies that fix.
- CodeRabbit also identified the source import-order violation in `scripts/pwa-shell.test.ts`; commit `0cd7ffcb5772a7aca8f7090e88d103d40201fcf6` fixes it instead of relying on ESLint's in-place CI mutation.
- On executable head `1b6d6fa76b25ff0c0ee9f5b62c3a062ae049a933`, CI #1453 (`33580814710`) reports full Angular `541/541`, focused PWA `16/16`, and exact PWA branch coverage `100% (9/9)`. Lint and deploy-pipeline jobs also pass.
- `test:scripts` on that head runs 11 suites: 10 pass and only `pwa-shell` fails, specifically `favicon.svg must embed the approved lossless WebP payload`. The other four PWA shell assertions pass.

### Formatting baseline

- Root instructions/spec acceptance mention `pnpm run format:check`, while existing CI does not execute it.
- A temporary isolated CI probe, `fec71d071b69324474ca569a6e4e8d5d1e1b4246`, added a Format matrix job and demonstrated that repository-wide `prettier --check .` is not currently a usable PR gate: it reports broad pre-existing formatting debt and aborts on an existing parse error in `docs/api.html` around line 18408.
- That experimental CI change was immediately reverted by `a04aa019171e3495a13d6b1415b75feb227d5e21`, restoring `.github/workflows/ci.yml` byte-for-byte. This PWA PR must not absorb a repository-wide formatting migration merely to satisfy an unrelated baseline defect.
- Consequently repository-wide `format:check` is recorded as blocked by pre-existing baseline debt, not falsely reported as passing.

### Visual baseline topology

- Reviewed baseline pointer: `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`.
- PR #439 final validated head `f3305fe2cf86be988ab5365534be33c16e42e78c` passed visual-regression run `33530397106` with `0/36` changed screenshots and zero differing pixels against that reviewed baseline.
- PR #439 squash merge on `main`: `b6509aaa214dc932588dc6bb0ed068ef097ce8c5`.
- The validated head and squash merge have the exact same Git tree SHA `7e7651c07c8d9b65faab439dfbdcee1d3e269cbd`.
- The current ancestry failure is therefore caused by squash topology, not by a file-tree difference. `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` is an evidence-backed ancestry-repair candidate, but changing `.github/visual-baseline.json` still requires explicit approval.

## Decision

1. Keep current semantic theme values as the PWA shell source of truth.
2. Keep one canonical `public/favicon.svg` for favicon and install `any maskable` purposes.
3. Embed the exact approved WebP losslessly inside the SVG; do not hand-trace, regenerate, interpolate, or change the pinned digests.
4. Keep static and browser verification on one shared contract in `scripts/pwa-contract.ts`.
5. Keep the root-owned Angular `SwUpdate` lifecycle; no custom worker, `skipWaiting`, manual cache purge, or polling loop.
6. Treat recovery storage as fallible and request navigation through one `reloadRequested` owner so overlapping activation/recovery cannot request duplicate reloads.
7. Keep the exact-icon gate red until the canonical bytes are restored.
8. Keep the visual-baseline ancestry gate intact. Do not change its pointer unless explicitly approved; if approved, use the proven tree-equivalent `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` candidate after rechecking current repository state.
9. Do not add a snackbar/update deferral in this PR: the accepted behavior is deterministic adoption immediately after a ready version is successfully activated. A future transactional unsaved-flow requirement may justify a separate safe-boundary design.
10. Do not add ad-hoc logging or a second frontend telemetry pattern where the repository has no canonical owner.
11. Do not enable repository-wide `format:check` in this PR while its existing baseline is broadly red; fix that baseline separately.

## Acceptance

- Exact 1254x1254 approved pixels are embedded in `public/favicon.svg` and render with zero pixel differences in Chromium.
- Embedded payload SHA-256 equals `5fe98391a9eed6de6cc7616a0604978063a270c79e7329cf137f3384ac2107be`.
- Rendered RGBA SHA-256 equals `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- Artwork uses the approved bus-stop/bus/clock identity, not the Andalusia-map or Junta identity.
- Manifest has exactly one canonical `favicon.svg` entry for `any maskable`; duplicate maskable artwork remains absent.
- Manifest/browser startup colors match the current theme and the service worker precaches the manifest/canonical icon.
- Update lifecycle covers startup success/failure, ready/non-ready events, duplicate ready events, false/rejected activation, retry, disabled worker, unavailable storage, unrecoverable recovery, reload-loop prevention, initialization idempotence, and overlapping activation/unrecoverable recovery.
- Overlapping activation and unrecoverable recovery request at most one reload and do not erase the persisted unrecoverable recovery guard after that recovery path wins.
- Focused PWA service coverage remains non-zero exact 100% branches and the explicit parser fails closed on missing/ambiguous/zero/below-threshold output.
- Lint, script tests other than the intentionally blocked exact-icon assertion, Angular tests, deploy checks, Playwright PWA shell verification, visual evidence, and GitHub CI are clean before delivery.
- Repository-wide `pnpm run format:check` is either made green by a separately scoped baseline cleanup or explicitly remains a documented external blocker; this PR must not misreport it as passing.
- Visual regression runs against a valid reviewed ancestor before delivery; no baseline pointer is silently advanced.

## Tests

- Static PWA shell tests for theme, single canonical icon, exact embedded payload, document metadata, and service-worker asset coverage.
- Browser PWA test rasterizes the served SVG at 1254x1254 and hashes RGBA bytes with Web Crypto.
- Unit tests for all `SwUpdate` lifecycle states, including the overlap regression.
- Focused branch-coverage gate plus parser unit tests.
- Manual CodeRabbit review; valid findings are fixed and resolved, while the exact-payload thread remains open until its prerequisite exists.
- Exact-head CI, visual evidence, and reviewed-baseline regression before final delivery.

## Risks

- The exact source bytes remain unavailable; a generated replacement can look correct while violating both cryptographic contracts.
- The three retained payload chunks are incomplete and must not be deleted until the canonical payload is safely restored.
- The embedded raster makes the SVG materially larger than a hand-authored vector; this is an accepted exact-fidelity trade-off.
- Platform launchers can retain installed icon metadata independently of Angular service-worker version adoption.
- Immediate reload on a future ready version can interrupt a future unsaved transactional flow; such a flow requires a separate safe-boundary design.
- Unavailable browser storage deliberately suppresses automatic unrecoverable-state reload because the loop guard cannot be guaranteed.
- The reviewed visual-baseline pointer is topologically stale after PR #439's squash merge.
- Repository-wide Prettier currently has unrelated baseline failures, including a parser error, and cannot be claimed green from this PR.

## Rollback

Revert this PR. No backend, API, database, persistent-data migration, release, or deployment is involved.

## Delivery status

- Reconnaissance and specification: complete for current known evidence.
- Shell colors, single manifest icon ownership, update lifecycle, unavailable-storage hardening, verification-contract SSOT, explicit branch-coverage enforcement, child-process stream completion, source import order, and overlapping-reload race: implemented.
- Manual CodeRabbit review: valid `close` and import-order threads resolved after CI validation; exact-payload thread intentionally remains unresolved because its prerequisite is absent.
- Executable validation on `1b6d6fa76b25ff0c0ee9f5b62c3a062ae049a933`: CI #1453 has install, lint, Angular, and deploy green; Angular is `541/541`, focused PWA is `16/16`, PWA branches are `100% (9/9)`; script suites are `10/11` with the exact-icon assertion as the only failure.
- Publish PR visual evidence #1447 (`33580814735`) resolves/checks out the immutable head and installs tooling, then fails at the same exact-icon quality gate before application startup; no current-head screenshots are produced.
- Visual regression baseline #343 (`33580814624`) fails at `Resolve reviewed baseline`; rendering and pixel comparison are skipped and no baseline pointer has been changed.
- Repository-wide `format:check`: independently demonstrated blocked by pre-existing formatting/parser debt; the temporary CI probe was reverted and is not part of the final file tree.
- Exact approved identity: blocked until the canonical WebP bytes are provided or recovered.
- Baseline ancestry repair: evidence complete, change not applied; explicit approval is required.
- Final visual/runtime review: blocked until the exact payload is restored and the baseline ancestry gate can run. No digest, gate, or baseline may be weakened to bypass these blockers.

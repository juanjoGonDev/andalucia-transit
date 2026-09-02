# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme, adopts new deployments without requiring reinstall, and uses the exact user-approved bus-stop identity for browser and installed PWA surfaces.

The approved 1254x1254 identity is a single-support bus stop, a front-facing bus, and a clock hanging from the upper stop structure on a dark navy/blue application background. The rejected Andalusia-map concept and Junta de Andalucia identity must not be used.

On 2026-09-02 the user superseded the earlier missing-WebP implementation constraint: use the newly supplied colored SVG converted from the approved PNG/reference as the working source, then adjust that SVG only as needed until Chromium renders exactly zero differing pixels against the approved reference. The format/source representation is not authoritative; the approved rendered pixels are.

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
- Root `AGENTS.md` forbids standalone binary/media files in git. A canonical text SVG is therefore an acceptable single artwork owner without requiring a committed PNG/WebP asset.
- `public/favicon.svg` is the sole artwork owner. The manifest references that file once with `sizes: "any"`, `type: "image/svg+xml"`, and `purpose: "any maskable"`; `public/app-icon-maskable.svg` is removed.
- The current repository favicon is still the rejected interim 512x512 vector and is not the final identity.
- Historical approved embedded WebP SHA-256: `5fe98391a9eed6de6cc7616a0604978063a270c79e7329cf137f3384ac2107be`. This remains recovery evidence for the old raster source but is no longer an acceptance requirement after the user's SVG-source decision.
- Exact Chromium-rendered RGBA SHA-256 at 1254x1254 remains authoritative: `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- The user supplied a newer colored SVG on 2026-09-02 as the preferred implementation source. The product attachment layer advertised `/mnt/data/ChatGPT Image 31 ago 2026, 12_42_59.svg`, but repeated filesystem inspection in the active runtime did not expose that file; therefore its source bytes, dimensions, structure, and SHA-256 have not yet been validated and no production file has been replaced from it.

### Legacy payload recovery and source transition

- PR ancestry proves the historical WebP payload was never fully versioned: `73d55b0c297d4be7c4c68237f129d341dbaca650` adds `payload-00.txt`; direct successor `56db1a1a4aa428872d5f9fc6a9c1babf995318b9` adds `payload-02.txt`; `49ae5fe8d318a0ecc3f95e27d392fecb4a72bf72` adds `payload-03.txt`. No `payload-01.txt` commit exists.
- The available fragments total only a small fraction of the complete WebP implied by its RIFF length; they cannot reconstruct the historical canonical bytes.
- Recovery checks covered PR comments/reviews, commit history/comments, PR refs and merge tree, visible branches/tags/forks, retained Actions artifacts/logs, the temporary visual-evidence release, GitHub/public code searches by hash/payload prefix, and available conversation attachments. No verifiable complete WebP source was recovered.
- The pinned digests cannot be inverted to reconstruct missing image bytes.
- The user-supplied colored SVG replaces recovery of the missing WebP as the intended implementation path. It must not be accepted merely because it looks close: its final served render must match the existing Chromium RGBA digest exactly, and the final SVG source digest must be pinned in the shared PWA contract so required CI remains fail-closed after acceptance.
- Until the supplied SVG bytes are actually accessible and validated, the existing payload assertion remains intentionally red rather than being removed early and allowing the rejected interim icon through required CI.

### Update lifecycle

- Angular service-worker registration already existed with `registrationStrategy: "registerWhenStable:30000"`, but the app had no root-owned `SwUpdate` adoption lifecycle.
- The lifecycle now initializes once, checks on startup, activates `VERSION_READY`, reloads after successful activation, ignores duplicate activation while one is in progress, allows retry after false/rejected activation, and handles unrecoverable state with a session-scoped reload-loop guard.
- Browser storage is a fallible boundary. Recovery-marker cleanup failure must not suppress a reload after an already successful activation. Unrecoverable recovery fails closed if its loop-prevention marker cannot be read or persisted.
- Manual CodeRabbit review identified a real overlap risk between `VERSION_READY` activation and `UNRECOVERABLE_STATE` recovery. Regression commit `a60942bbdaf25a468ba7b3f0b6af4c2b30ee7eb8` demonstrated the bug in CI #1452 (`33580681725`): the new test observed two `reloadCurrentVersion` calls and the recovery marker was cleared unexpectedly.
- Fix commit `1b6d6fa76b25ff0c0ee9f5b62c3a062ae049a933` adds one `reloadRequested` owner. The first reload cause wins; if unrecoverable recovery wins, its persisted marker remains intact when a concurrent activation completes.
- A later manual state-machine audit found the symmetric race: after successful activation had already requested reload, a late `UNRECOVERABLE_STATE` still claimed and persisted the session recovery marker before the duplicate reload was deduplicated. Regression commit `3e1fd550cac7566bcc0707c81c22b19a37ff4514` proved the bug in CI #1457 (`33583210534`): the new test expected no marker but observed `Expected '1' to be null`, with 541 other Angular tests passing.
- Fix commit `6dfe5caf9cdb9782cf91b51596ff476ea54807cf` makes an already-requested reload win before unrecoverable recovery can claim storage. A late unrecoverable event therefore neither requests another reload nor consumes the recovery marker. CI #1458 (`33583372302`) validates this behavior with full Angular `542/542`, focused PWA `17/17`, and exact PWA branch coverage `100% (11/11)`.
- `src/app/core/services/pwa-update.config.ts` owns `PWA_RECOVERY_SESSION_KEY`. Commit `cd637e7510ed810711b9c6078037e24b2d417c8f` removes the duplicated literal from the service and all storage assertions in its spec without changing runtime behavior.

### Verification ownership and coverage

- `scripts/pwa-contract.ts` is the single verification-contract owner for theme values, exact icon dimensions, the current legacy payload digest, and rendered RGBA digest. When the supplied SVG is integrated, this owner must replace the WebP MIME/payload requirement with the final canonical SVG source SHA-256 while retaining the same rendered RGBA SHA-256.
- Static required CI must verify the canonical SVG source digest after integration; browser PWA validation must independently rasterize the served SVG in Chromium at 1254x1254 and verify the authoritative RGBA digest. This prevents required CI from becoming green on visually unverified artwork.
- The previous Karma threshold configuration appeared to require 100% but did not enforce it. A first conditional `json-summary` attempt also failed because the Angular builder did not emit the requested file.
- `scripts/dev/run-angular-tests.mjs` therefore runs the complete Angular suite plus the focused PWA service suite and captures the summary Angular actually emits.
- `scripts/dev/pwa-coverage-gate.mjs` fails closed unless it receives exactly one non-empty branch summary with `100%` and `covered === total`; its parser has eight dedicated passing script tests.
- CodeRabbit correctly identified that captured child-process output must wait for `close`, not `exit`, because stdout may remain open after process exit. Commit `10dbcf8e5d960d54f6481495e5e46cb8e61a079e` applies that fix.
- CodeRabbit also identified the source import-order violation in `scripts/pwa-shell.test.ts`; commit `0cd7ffcb5772a7aca8f7090e88d103d40201fcf6` fixes it instead of relying on ESLint's in-place CI mutation.
- On executable head `6dfe5caf9cdb9782cf91b51596ff476ea54807cf`, CI #1458 (`33583372302`) reports full Angular `542/542`, focused PWA `17/17`, exact PWA branch coverage `100% (11/11)`, lint success, and deploy-pipeline success.
- `test:scripts` on that head runs 11 suites: 10 pass and only `pwa-shell` fails, specifically `favicon.svg must embed the approved lossless WebP payload`. That assertion remains the temporary fail-closed gate until the supplied SVG is integrated together with its source digest and the test is atomically migrated. The other four PWA shell assertions pass, and the coverage-gate parser remains 8/8.

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
3. Use the user's latest colored SVG as the preferred source. Preserve its vector structure where possible and adjust fills/strokes/opacity/geometry only as evidence requires; do not require the historical WebP payload once the SVG source is accepted.
4. Treat the Chromium 1254x1254 rendered RGBA digest `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef` as the authoritative exact-identity contract. Zero pixel differences are mandatory.
5. Once the supplied SVG is accessible and reaches the authoritative render digest, pin its exact UTF-8 source SHA-256 in `scripts/pwa-contract.ts` and make required static CI verify that source digest. Migrate the old WebP payload assertion atomically with the final SVG so there is never an unguarded green interval.
6. Keep static and browser verification on one shared contract in `scripts/pwa-contract.ts`.
7. Keep the root-owned Angular `SwUpdate` lifecycle; no custom worker, `skipWaiting`, manual cache purge, or polling loop.
8. Treat recovery storage as fallible and route navigation through one `reloadRequested` owner: whichever path first requests reload owns that navigation; an unrecoverable-first path preserves its persisted guard, while an activation-first path rejects later unrecoverable recovery before it can claim a marker.
9. Keep `PWA_RECOVERY_SESSION_KEY` in the scoped `pwa-update.config.ts` owner so production and tests cannot drift on the recovery-storage identity.
10. Keep the exact-icon gate red until the supplied SVG is actually accessible, integrated, source-pinned, and proven to produce the authoritative RGBA digest.
11. Keep the visual-baseline ancestry gate intact. Do not change its pointer unless explicitly approved; if approved, use the proven tree-equivalent `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` candidate after rechecking current repository state.
12. Do not add a snackbar/update deferral in this PR: the accepted behavior is deterministic adoption immediately after a ready version is successfully activated. A future transactional unsaved-flow requirement may justify a separate safe-boundary design.
13. Do not add ad-hoc logging or a second frontend telemetry pattern where the repository has no canonical owner.
14. Do not enable repository-wide `format:check` in this PR while its existing baseline is broadly red; fix that baseline separately.

## Acceptance

- `public/favicon.svg` contains the user's accepted colored SVG artwork at the canonical 1254x1254 coordinate/render size and renders with zero pixel differences in Chromium against the approved reference.
- The final canonical SVG UTF-8 source SHA-256 is pinned in `scripts/pwa-contract.ts` and verified by required static CI.
- Rendered RGBA SHA-256 equals `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- Artwork uses the approved bus-stop/bus/clock identity, not the Andalusia-map or Junta identity.
- Manifest has exactly one canonical `favicon.svg` entry for `any maskable`; duplicate maskable artwork remains absent.
- Manifest/browser startup colors match the current theme and the service worker precaches the manifest/canonical icon.
- Update lifecycle covers startup success/failure, ready/non-ready events, duplicate ready events, false/rejected activation, retry, disabled worker, unavailable storage, unrecoverable recovery, reload-loop prevention, initialization idempotence, and both ordering directions of overlapping activation/unrecoverable recovery.
- If unrecoverable recovery requests reload first, concurrent activation does not request a second reload and does not erase the persisted recovery guard.
- If activation requests reload first, a later unrecoverable event neither requests a second reload nor persists/consumes the unrecoverable recovery marker.
- Recovery-storage identity has one scoped owner consumed by production and tests rather than duplicated string literals.
- Focused PWA service coverage remains non-zero exact 100% branches and the explicit parser fails closed on missing/ambiguous/zero/below-threshold output.
- Lint, static icon-source verification, Angular tests, deploy checks, Playwright PWA shell verification, visual evidence, and GitHub CI are clean before delivery.
- Repository-wide `pnpm run format:check` is either made green by a separately scoped baseline cleanup or explicitly remains a documented external blocker; this PR must not misreport it as passing.
- Visual regression runs against a valid reviewed ancestor before delivery; no baseline pointer is silently advanced.

## Tests

- Static PWA shell tests for theme, single canonical icon, exact final SVG source digest, document metadata, and service-worker asset coverage.
- Browser PWA test rasterizes the served SVG at 1254x1254 and hashes RGBA bytes with Web Crypto.
- Unit tests for all `SwUpdate` lifecycle states, including both overlap-order regressions and the shared recovery-storage key.
- Focused branch-coverage gate plus parser unit tests.
- Manual CodeRabbit review; valid findings are fixed and resolved. The legacy exact-payload thread remains open while current code still contains that fail-closed gate; after the final SVG and source-digest gate land and all exact render validation passes, reply with the superseding evidence and resolve it.
- Exact-head CI, visual evidence, and reviewed-baseline regression before final delivery.

## Risks

- The latest user-supplied SVG is not currently exposed in the active filesystem despite being advertised by the attachment layer, so its actual bytes cannot yet be trusted or committed.
- A PNG-to-SVG converter may alter curves, antialiasing, clipping, gradients, opacity, or color quantization. Changing only fills may therefore be insufficient to reach zero pixel differences.
- Different SVG rasterizers can produce different edge pixels. Acceptance must use the existing Chromium 1254x1254 pipeline, not a different renderer that merely looks equivalent.
- The three retained historical WebP payload chunks are incomplete. They may be removed only after the new SVG source contract is fully integrated and validated, because until then they remain provenance/recovery evidence.
- Platform launchers can retain installed icon metadata independently of Angular service-worker version adoption.
- Immediate reload on a future ready version can interrupt a future unsaved transactional flow; such a flow requires a separate safe-boundary design.
- Unavailable browser storage deliberately suppresses automatic unrecoverable-state reload because the loop guard cannot be guaranteed.
- The reviewed visual-baseline pointer is topologically stale after PR #439's squash merge.
- Repository-wide Prettier currently has unrelated baseline failures, including a parser error, and cannot be claimed green from this PR.

## Rollback

Revert this PR. No backend, API, database, persistent-data migration, release, or deployment is involved.

## Delivery status

- Reconnaissance and specification: updated for the user's 2026-09-02 SVG-source decision.
- Shell colors, single manifest icon ownership, update lifecycle, unavailable-storage hardening, verification-contract SSOT, recovery-key SSOT, explicit branch-coverage enforcement, child-process stream completion, source import order, and both overlapping-reload race directions: implemented.
- Manual CodeRabbit review: valid `close` and import-order threads resolved after CI validation; the legacy exact-payload thread intentionally remains unresolved while current code still uses that temporary fail-closed gate. The later delta review request was rate-limited and produced no new review findings.
- Late-unrecoverable regression: `3e1fd550cac7566bcc0707c81c22b19a37ff4514` adds the failing test; CI #1457 (`33583210534`) proves the pre-fix bug with `Expected '1' to be null` while the other 541 Angular tests pass.
- Executable fix `6dfe5caf9cdb9782cf91b51596ff476ea54807cf`: CI #1458 (`33583372302`) has install, lint, Angular, and deploy green; Angular is `542/542`, focused PWA is `17/17`, PWA branches are `100% (11/11)`; script suites are `10/11` with the legacy exact-icon payload assertion as the only failure.
- Publish PR visual evidence #1457 (`33583372296`) resolves/checks out the immutable fix head and installs tooling, then fails at the same exact-icon quality gate before application startup; responsive/accessibility verification, screenshots, artifacts, release replacement, and evidence publication are skipped.
- Visual regression baseline #348 (`33583372273`) fails at `Resolve reviewed baseline`; baseline checkout, rendering, pixel comparison, and enforcement are skipped and no baseline pointer has been changed.
- Repository-wide `format:check`: independently demonstrated blocked by pre-existing formatting/parser debt; the temporary CI probe was reverted and is not part of the final file tree.
- Exact approved identity: implementation path changed from recovering the missing WebP to integrating the user's latest colored SVG, but the advertised attachment is not exposed in the active filesystem, so no source hash or pixel validation is possible yet.
- Baseline ancestry repair: evidence complete, change not applied; explicit approval is required.
- Final visual/runtime review: blocked until the supplied SVG is accessible and exact, and the baseline ancestry gate can run. No digest, gate, or baseline may be weakened to bypass these blockers.

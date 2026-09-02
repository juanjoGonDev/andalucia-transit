# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme, adopts new deployments without requiring reinstall, and uses the user-approved bus-stop identity for both favicon and installed PWA surfaces. The approved reference is the generated 1254×1254 image reviewed in this task: a single-support bus stop, front-facing bus, and clock hanging from the upper stop structure on a dark navy/blue application background.

## Evidence

- The current theme owns `--color-primary: #0061fe`, `--color-primary-strong: #0b54d4`, `--color-secondary: #060f2b`, and `--color-background: #f6f7f8` in `src/styles/theme-rules.css`.
- The original favicon and manifest used the legacy indigo identity and startup colors.
- The original document had no explicit mobile `theme-color` metadata.
- Angular service worker registration existed without an application-owned `SwUpdate` adoption lifecycle.
- Root `AGENTS.md` forbids committing binary files. The exact approved reference therefore cannot be added as a standalone PNG/WebP file.
- The user explicitly requires zero pixel difference between the approved reference and the SVG identity. A hand-traced/vector approximation cannot satisfy that acceptance criterion reliably.
- The current head still contains the rejected 512×512 Andalusia-map vector artwork in `public/favicon.svg`; this is not the approved final identity.
- The complete PR commit ancestry proves the exact payload was never fully versioned. `73d55b0c297d4be7c4c68237f129d341dbaca650` adds `payload-00.txt`, its direct successor `56db1a1a4aa428872d5f9fc6a9c1babf995318b9` adds `payload-02.txt`, and `49ae5fe8d318a0ecc3f95e27d392fecb4a72bf72` adds `payload-03.txt`. There is no intervening or later commit that adds `payload-01.txt`.
- Recovery inspection found no alternate complete payload in PR comments, review threads, commit comments, retained Actions artifacts, Actions logs, PR refs, or the temporary `pr-438-visual-evidence` release assets.
- The PR timeline contains no head force-push that could point to a discarded branch state containing the missing chunk.
- Public searches for the pinned payload/render digests and the approved 1254×1254 composition did not locate a verifiable copy of the source image.
- The original update lifecycle accessed `sessionStorage` directly after successful activation and during unrecoverable-state recovery. Browser storage APIs may throw when storage is unavailable or blocked; an exception while clearing the recovery marker could suppress the reload after an already successful activation, while an exception during unrecoverable recovery could escape the subscription path.
- The reviewed baseline commit `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5` is independently diverged from both current `main` and this PR head; merging current `main` cannot make that commit an ancestor of the PR.
- The baseline divergence is explained by the squash merge of PR #439. Its final head `f3305fe2cf86be988ab5365534be33c16e42e78c` passed visual-regression run `33530397106` with `0/36` changed screenshots and zero differing pixels against reviewed baseline `5ea33fcc4c7befed50cddcf6c588824e19e7ddd5`.
- Squash merge commit `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` and validated PR #439 head `f3305fe2cf86be988ab5365534be33c16e42e78c` have the exact same Git tree SHA, `7e7651c07c8d9b65faab439dfbdcee1d3e269cbd`. The ancestry failure is therefore caused by squash topology, not by a file-tree difference between the validated final PR head and its merged `main` commit.

## Decision

1. Keep the current semantic theme as the shell source of truth: primary `#0061fe`, strong blue `#0b54d4`, dark surface `#060f2b`, background `#f6f7f8`.
2. Use one canonical `public/favicon.svg` for both browser favicon and PWA `any maskable` purposes so there is no second artwork owner that can drift.
3. Preserve the approved reference pixels losslessly inside the SVG as an embedded WebP payload. The repository still stores an SVG/XML text file and no standalone binary asset. This is intentional because exact zero-pixel fidelity is a stronger user acceptance requirement than a hand-authored vector approximation.
4. Pin the embedded payload SHA-256, intrinsic dimensions, and browser-rendered RGBA SHA-256 in tests. CI must fail if any approved pixel changes.
5. Verify the rendered SVG in Chromium at the native 1254×1254 canvas and require the exact reviewed RGBA digest `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
6. Keep the identity independent: no Junta de Andalucia logo, wordmark, or other official-government mark.
7. Keep manifest/browser startup colors aligned with the current theme and retain the root-owned `SwUpdate` lifecycle already implemented in this PR.
8. Do not use `skipWaiting`, custom service-worker forks, cache deletion, polling storms, or uninstall/reinstall as the normal update mechanism.
9. Fail closed while the canonical bytes are unavailable. Do not regenerate, approximate, interpolate, weaken the tests, or replace either pinned digest to make CI pass.
10. Treat recovery-marker storage as a fallible browser boundary. Failure to clear the marker after a successful activation must not block the required reload. Unrecoverable-state auto-recovery must reload only after the loop-prevention marker has been read and persisted successfully; if storage cannot guarantee the guard, remain on the current page rather than risk an unbounded reload loop.
11. Treat the visual-baseline ancestry failure as a separate squash-topology defect. Do not weaken the ancestry gate or rewrite `.github/visual-baseline.json` automatically. If the baseline pointer is explicitly approved for repair, `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` is the evidence-backed candidate because its tree is byte-for-byte identical to the fully validated PR #439 final head that rendered with zero pixel differences against the currently reviewed baseline.

## Acceptance

- `public/favicon.svg` renders exactly the approved 1254×1254 reference at native size with zero differing pixels in Chromium.
- The canonical rendered RGBA SHA-256 is `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
- The embedded lossless payload SHA-256 is `5fe98391a9eed6de6cc7616a0604978063a270c79e7329cf137f3384ac2107be`.
- The manifest uses the same `favicon.svg` for both `any` and `maskable` install purposes; there is no duplicate maskable artwork owner.
- The obsolete `public/app-icon-maskable.svg` is removed.
- The favicon/PWA artwork contains the approved single-support stop, front-facing bus, and upper hanging clock composition and does not use the rejected Andalusia-map concept.
- No Junta de Andalucia logo, wordmark, or official-government identity is introduced.
- Manifest `theme_color`, manifest `background_color`, browser `theme-color`, and startup shell use the current theme palette.
- Production builds include the canonical SVG and Angular service-worker asset matching covers it while the manifest remains precached.
- PWA update lifecycle edge cases remain covered: startup check success/failure, ready/non-ready events, duplicate ready events, false/rejected activation, retry, disabled service worker, unrecoverable recovery, reload-loop guard, unavailable recovery storage, and idempotent initialization.
- Successful version activation still reloads when recovery-marker cleanup storage is unavailable.
- Unrecoverable-state recovery fails closed without reloading when its loop-prevention marker cannot be read or persisted.
- Relevant changed lifecycle logic retains practical 100% branch coverage and repository coverage gates do not regress.
- `pnpm run format:check`, `pnpm run lint`, script tests, Angular tests, production/deploy checks, Playwright PWA shell verification, visual evidence, and GitHub CI are green before delivery.

## Risks

- The exact-fidelity SVG embeds a compressed raster payload, so it is materially larger than a hand-authored vector icon. This is a deliberate trade-off for the explicit zero-pixel-diff requirement; the service worker caches the asset after first retrieval.
- The approved source bytes are currently unavailable. Any generated replacement could look equivalent while violating the exact payload and rendered-pixel contracts.
- The three retained payload chunks are incomplete and must not be treated as a recoverable full image without the missing canonical bytes.
- Some launchers retain old installed icon metadata after a manifest change. Platform launcher cache refresh is distinct from Angular service-worker version adoption.
- Reloading on `VERSION_READY` can interrupt active interaction; if a future transactional unsaved flow is introduced, update activation must defer to a safe boundary.
- If browser storage is unavailable, unrecoverable-state auto-reload is deliberately suppressed because the reload-loop guard cannot be persisted safely; the user may remain on the currently loaded version until storage becomes available or the page is manually revisited.
- The reviewed visual-baseline pointer is topologically stale after squash merge #439. Although `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` is proven tree-equivalent to the fully validated final PR head, changing the reviewed pointer still requires explicit approval.

## Tests

- Static: manifest theme and canonical icon contract, embedded payload MIME/dimensions/SHA, opaque/full-canvas source, absence of duplicate maskable icon owner, mobile browser metadata, and service-worker asset coverage.
- Browser: load the served SVG into a canvas at 1254×1254, hash the rendered RGBA bytes with Web Crypto, and compare against the approved digest. This is the zero-pixel-diff gate.
- Unit: `SwUpdate` lifecycle and root initialization coverage, including blocked/unavailable `sessionStorage` behavior for recovery-marker cleanup and reload-loop protection.
- Visual evidence: exact-head deterministic product screenshots remain required; installed launcher metadata is separately validated by the PWA shell contract.
- Recovery audit: verify PR commit ancestry, refs, comments, retained workflow artifacts/logs, and temporary release assets before accepting any recovered payload as canonical.
- Baseline topology: verify that a proposed ancestry repair preserves the validated file tree and previously reviewed pixel contract before requesting approval to update the pointer.

## Rollback

Revert this PR. No backend, API, database, or persistent-data migration is involved.

## Delivery status

- Reconnaissance: complete, including a full recovery audit of PR ancestry, refs, comments, workflow data, temporary release assets, baseline topology, and update-lifecycle storage boundaries.
- Specification: updated for the final approved exact-fidelity identity, the verified missing-payload blocker, fail-closed recovery-storage behavior, and the proven squash-merge baseline topology.
- Update lifecycle, shell colors, single manifest icon ownership, and unavailable-storage handling: implemented.
- Exact approved identity: blocked because the canonical WebP bytes are incomplete; `payload-01.txt` was never committed and no verifiable alternate source was recovered.
- Baseline ancestry repair: evidence complete but intentionally not applied. `b6509aaa214dc932588dc6bb0ed068ef097ce8c5` is tree-identical to validated PR #439 head `f3305fe2cf86be988ab5365534be33c16e42e78c`, which rendered with zero pixel differences against the reviewed baseline; explicit user approval is still required before changing the baseline pointer.
- CI/final review: incomplete. Exact-icon tests must remain red until the canonical payload is restored; no baseline or digest may be changed to bypass the blocker.

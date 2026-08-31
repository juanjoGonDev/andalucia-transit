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

## Decision

1. Keep the current semantic theme as the shell source of truth: primary `#0061fe`, strong blue `#0b54d4`, dark surface `#060f2b`, background `#f6f7f8`.
2. Use one canonical `public/favicon.svg` for both browser favicon and PWA `any maskable` purposes so there is no second artwork owner that can drift.
3. Preserve the approved reference pixels losslessly inside the SVG as an embedded WebP payload. The repository still stores an SVG/XML text file and no standalone binary asset. This is intentional because exact zero-pixel fidelity is a stronger user acceptance requirement than a hand-authored vector approximation.
4. Pin the embedded payload SHA-256, intrinsic dimensions, and browser-rendered RGBA SHA-256 in tests. CI must fail if any approved pixel changes.
5. Verify the rendered SVG in Chromium at the native 1254×1254 canvas and require the exact reviewed RGBA digest `57aeab249dc0df0f9cb5a9c9b1f654c4af0b5e1f53e69a73a7f46c61451f18ef`.
6. Keep the identity independent: no Junta de Andalucia logo, wordmark, or other official-government mark.
7. Keep manifest/browser startup colors aligned with the current theme and retain the root-owned `SwUpdate` lifecycle already implemented in this PR.
8. Do not use `skipWaiting`, custom service-worker forks, cache deletion, polling storms, or uninstall/reinstall as the normal update mechanism.

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
- PWA update lifecycle edge cases remain covered: startup check success/failure, ready/non-ready events, duplicate ready events, false/rejected activation, retry, disabled service worker, unrecoverable recovery, reload-loop guard, and idempotent initialization.
- Relevant changed lifecycle logic retains practical 100% branch coverage and repository coverage gates do not regress.
- `pnpm run format:check`, `pnpm run lint`, script tests, Angular tests, production/deploy checks, Playwright PWA shell verification, visual evidence, and GitHub CI are green before delivery.

## Risks

- The exact-fidelity SVG embeds a compressed raster payload, so it is materially larger than a hand-authored vector icon. This is a deliberate trade-off for the explicit zero-pixel-diff requirement; the service worker caches the asset after first retrieval.
- Some launchers retain old installed icon metadata after a manifest change. Platform launcher cache refresh is distinct from Angular service-worker version adoption.
- Reloading on `VERSION_READY` can interrupt active interaction; if a future transactional unsaved flow is introduced, update activation must defer to a safe boundary.
- The reviewed visual-baseline pointer is independently topologically diverged from current `main`; do not advance it without explicit approval.

## Tests

- Static: manifest theme and canonical icon contract, embedded payload MIME/dimensions/SHA, opaque/full-canvas source, absence of duplicate maskable icon owner, mobile browser metadata, and service-worker asset coverage.
- Browser: load the served SVG into a canvas at 1254×1254, hash the rendered RGBA bytes with Web Crypto, and compare against the approved digest. This is the zero-pixel-diff gate.
- Unit: existing `SwUpdate` lifecycle and root initialization coverage.
- Visual evidence: exact-head deterministic product screenshots remain required; installed launcher metadata is separately validated by the PWA shell contract.

## Rollback

Revert this PR. No backend, API, database, or persistent-data migration is involved.

## Delivery status

- Reconnaissance: complete.
- Specification: updated for the final approved exact-fidelity identity.
- Implementation: pending exact reference application.
- CI/final review: pending.

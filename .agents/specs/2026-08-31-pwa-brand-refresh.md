# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme instead of the legacy indigo bus identity. Remove the white startup mismatch, align the mobile browser/system chrome with the current theme, and make newly deployed application versions take effect without requiring users to uninstall and reinstall the PWA.

## Evidence

- The current product theme owns `--color-primary: #0061fe`, `--color-primary-strong: #0b54d4`, `--color-secondary: #060f2b`, and `--color-background: #f6f7f8` in `src/styles/theme-rules.css`.
- `public/favicon.svg` still uses legacy `#3f51b5` and renders a generic bus glyph.
- `public/manifest.webmanifest` still uses `theme_color: #3f51b5`, `background_color: #f7f7f7`, and embeds legacy bus PNGs as data URLs.
- `src/index.html` has no `theme-color` metadata, so browser UI is not explicitly aligned with the current theme.
- Angular service worker registration is enabled in production, but no `SwUpdate` lifecycle owner currently activates a ready version or handles unrecoverable cache state.
- `ngsw-config.json` precaches the shell and manifest, so stale clients can remain on an older version until the Angular service worker update lifecycle completes.

## Decision

1. Treat the current semantic theme as source of truth for the install identity: primary blue `#0061fe`, dark brand surface `#060f2b`, and app background `#f6f7f8`.
2. Replace the old bus icon with a small transport-network mark that matches the current visual language. Keep it vector-first and generate install-size PNG assets from that canonical SVG through a repository script; do not commit opaque binary source artwork.
3. Reference concrete install icon files from the manifest instead of base64 data URLs so service-worker hashing and browser asset inspection remain explicit.
4. Add `theme-color` and related shell metadata to the document head and align the manifest startup background with the current app background to avoid a white/legacy startup flash.
5. Introduce one root-level PWA update service using Angular `SwUpdate`. When a new version is ready, activate it and reload once so the loaded document and lazy chunks come from the same version. On unrecoverable service-worker state, perform a bounded recovery reload rather than leaving the installed app broken indefinitely.
6. Do not use `skipWaiting`, custom service-worker forks, cache deletion, polling storms, or uninstall/reinstall instructions as the normal update mechanism.

## Acceptance

- Installed icon no longer uses the legacy indigo bus artwork.
- Manifest `theme_color`, manifest `background_color`, favicon, browser `theme-color`, and startup shell use the current theme palette.
- Manifest provides `192x192` and `512x512` install icons with `any` and `maskable` purposes.
- Production builds include the generated icon files and service-worker manifest hashes them.
- A `VERSION_READY` event activates the update and causes exactly one controlled reload after successful activation.
- Failed activation does not reload or loop.
- An `unrecoverable` service-worker event performs bounded recovery and cannot enter a reload loop.
- Disabled/unavailable service worker is a no-op.
- Unit tests cover ready, failed activation, disabled service worker, unrecoverable recovery, and reload-loop guards.
- Browser/E2E coverage verifies manifest metadata, theme metadata and generated asset availability.
- Relevant changed logic retains 100% practical branch coverage; repository coverage gates do not regress.
- `pnpm run format:check`, `pnpm run lint`, targeted/full tests, production build, deploy preparation where applicable, visual evidence and GitHub CI are green before delivery.

## Risks

- Browser/PWA icon caches may retain an old launcher icon for some platform-specific period even when the manifest changes. The manifest and asset URLs must therefore be version-distinct or content-hashed through changed filenames/content, and installation behavior must be verified from a fresh profile.
- Reloading immediately on `VERSION_READY` can interrupt active user interaction. The current product has no documented transactional unsaved editor flow; if one is discovered during implementation, activation must defer until a safe boundary instead of forcing reload.
- `SwUpdate.activateUpdate()` must be followed by a reload to avoid mixed-version chunk loading.
- Service-worker recovery must be bounded in session storage to prevent repeated reloads when a deployment is genuinely broken.

## Tests

- Unit: PWA update lifecycle service, including `VERSION_READY`, non-ready events, activation rejection, unrecoverable state, session guard and disabled service worker.
- Unit/static: manifest contract and icon-generation output dimensions/purpose references.
- Browser: read manifest and `meta[name="theme-color"]`; request icon URLs from the built app; verify service worker registration/update behavior in production-mode test server if existing harness supports it.
- Visual: fresh installed/startup-equivalent shell at mobile canonical viewport and normal mobile browser surface.

## Rollback

Revert this PR. Existing PWA installs will return to the previous manifest/service-worker behavior on the next version transition; no backend or persistent data migration is involved.

## Delivery status

- Reconnaissance: complete.
- Specification: complete.
- Implementation: pending.
- CI/final review: pending.

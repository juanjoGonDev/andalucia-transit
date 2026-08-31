# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme instead of the legacy indigo bus identity. Remove the white startup mismatch, align the mobile browser/system chrome with the current theme, and make newly deployed application versions take effect without requiring users to uninstall and reinstall the PWA.

## Evidence

- The current product theme owns `--color-primary: #0061fe`, `--color-primary-strong: #0b54d4`, `--color-secondary: #060f2b`, and `--color-background: #f6f7f8` in `src/styles/theme-rules.css`.
- The original `public/favicon.svg` used legacy `#3f51b5` and rendered a generic bus glyph.
- The original `public/manifest.webmanifest` used `theme_color: #3f51b5`, `background_color: #f7f7f7`, and embedded legacy bus PNGs as data URLs.
- The original `src/index.html` had no `theme-color` metadata, so browser UI was not explicitly aligned with the current theme.
- Angular service worker registration was enabled in production, but no `SwUpdate` lifecycle owner activated a ready version, checked immediately at startup, or handled unrecoverable cache state.
- `ngsw-config.json` precaches the shell and manifest and caches SVG assets, so changed PWA metadata/artwork participates in Angular service-worker versioning.
- Repository policy forbids committing binary assets. The install identity therefore remains vector-first: a general-purpose favicon SVG plus a separate full-canvas maskable SVG rather than committed PNG derivatives.

## Decision

1. Treat the current semantic theme as source of truth for the install identity: primary blue `#0061fe`, dark brand surface `#060f2b`, and app background `#f6f7f8`.
2. Replace the old bus icon with a small transport-network mark that matches the current visual language. Keep install artwork as text SVG so the implementation complies with the repository binary-asset prohibition.
3. Use separate icon purposes: `favicon.svg` for general-purpose artwork and `app-icon-maskable.svg` with an opaque full-canvas background for platform maskable rendering. Do not falsely label artwork with transparent rounded corners as maskable-safe.
4. Reference concrete install icon files from the manifest instead of base64 data URLs so service-worker hashing and browser asset inspection remain explicit.
5. Add `theme-color` and related shell metadata to the document head and align the manifest startup background with the current app background to avoid a white/legacy startup flash.
6. Introduce one root-level PWA update service using Angular `SwUpdate`. Subscribe before the first explicit `checkForUpdate()` so a startup-discovered ready version cannot be missed. When a new version is ready, activate it once and reload only after successful activation so the loaded document and lazy chunks come from the same version. Ignore duplicate ready events while activation is pending and allow later retries after failed/empty activation. On unrecoverable service-worker state, perform a bounded recovery reload rather than leaving the installed app broken indefinitely.
7. Do not use `skipWaiting`, custom service-worker forks, cache deletion, polling storms, or uninstall/reinstall instructions as the normal update mechanism.

## Acceptance

- Installed icon no longer uses the legacy indigo bus artwork.
- Manifest `theme_color`, manifest `background_color`, favicon, browser `theme-color`, and startup shell use the current theme palette.
- Manifest provides distinct general-purpose and maskable vector install icons; the maskable artwork owns the complete canvas and has no transparent outer corners.
- Production builds include the icon files and Angular service-worker asset matching covers changed SVG artwork while the manifest remains in the precached app group.
- Initialization performs one immediate update check when the service worker is enabled.
- A `VERSION_READY` event activates the update and causes exactly one controlled reload after successful activation.
- Duplicate ready events cannot start concurrent activations.
- A rejected startup update check keeps the currently loaded application usable.
- Rejected activation or `activateUpdate() === false` does not reload or loop, and a later ready event can retry.
- An `unrecoverable` service-worker event performs bounded recovery and cannot enter a reload loop.
- Disabled/unavailable service worker is a no-op.
- Unit tests cover startup check success/failure, ready/non-ready events, duplicate ready events, empty/failed activation, retry, disabled service worker, unrecoverable recovery, reload-loop guard, and idempotent initialization.
- Static tests verify manifest colors/icon purposes, maskable canvas safety, mobile browser metadata, removal of the legacy color, and service-worker asset coverage.
- Relevant changed lifecycle logic retains 100% practical branch coverage; repository coverage gates do not regress.
- `pnpm run format:check`, `pnpm run lint`, targeted/full tests, production build, deploy preparation where applicable, visual evidence and GitHub CI are green before delivery.

## Risks

- Browser/PWA icon caches may retain an old launcher icon for some platform-specific period even when the manifest changes. Fresh install and normal version adoption must therefore be distinguished from platform launcher-metadata refresh behavior during final review.
- Reloading immediately on `VERSION_READY` can interrupt active user interaction. The current product has no documented transactional unsaved editor flow; if one is discovered during final review, activation must defer until a safe boundary instead of forcing reload.
- `SwUpdate.activateUpdate()` must be followed by a reload to avoid mixed-version chunk loading.
- Service-worker recovery must be bounded in session storage to prevent repeated reloads when a deployment is genuinely broken.
- The reviewed exact-visual baseline currently points to a historical PR commit that is no longer an ancestor of squashed `main`; the visual workflow intentionally rejects that topology. Do not advance the reviewed baseline without explicit approval.

## Tests

- Unit: PWA update lifecycle service, including startup `checkForUpdate`, `VERSION_READY`, non-ready events, concurrent-ready suppression, empty activation, activation rejection/retry, unrecoverable state, session guard and disabled service worker.
- App integration unit: root component initializes the PWA lifecycle through a test double so component tests do not depend on a registered production service worker.
- Static: manifest contract, current theme metadata, general/maskable icon separation, full-canvas maskable artwork and Angular service-worker asset coverage.
- Browser/visual: exact-head PR evidence remains required for rendered product surfaces; installed launcher behavior itself must not be inferred solely from DOM screenshots.

## Rollback

Revert this PR. Existing PWA installs will return to the previous manifest/service-worker behavior on the next version transition; no backend or persistent data migration is involved.

## Delivery status

- Reconnaissance: complete.
- Specification: complete and reconciled with repository binary-asset policy.
- Implementation: complete pending validation.
- CI/final review: pending.

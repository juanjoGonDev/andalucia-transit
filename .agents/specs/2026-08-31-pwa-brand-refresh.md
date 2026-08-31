# PWA brand refresh and deterministic update adoption

## Request

Refresh the installed Andalucia Transit PWA shell so it matches the current product theme instead of the legacy indigo bus identity. Remove the white startup mismatch, align mobile browser chrome with the current theme, make newly deployed versions take effect without requiring reinstall, and use the user-approved bus-over-Andalusia artwork for both the favicon and installed PWA identity without implying official Junta de Andalucia affiliation.

## Evidence

- The current product theme owns `--color-primary: #0061fe`, `--color-primary-strong: #0b54d4`, `--color-secondary: #060f2b`, and `--color-background: #f6f7f8` in `src/styles/theme-rules.css`.
- The original `public/favicon.svg` used legacy `#3f51b5` and rendered a generic bus glyph.
- The original `public/manifest.webmanifest` used `theme_color: #3f51b5`, `background_color: #f7f7f7`, and embedded legacy bus PNGs as data URLs.
- The original `src/index.html` had no `theme-color` metadata.
- Angular service worker registration was enabled in production, but no `SwUpdate` lifecycle owner activated a ready version, checked immediately at startup, or handled unrecoverable cache state.
- `ngsw-config.json` precaches the shell and manifest and caches SVG assets, so changed PWA artwork participates in Angular service-worker versioning.
- Root `AGENTS.md` forbids binary/media assets in git history. The approved raster concept therefore cannot be committed directly; its bus, route stops, dark-blue palette, and stylized Andalusia outline are reproduced as native SVG artwork.
- The approved identity is explicitly independent branding. It must not contain the Junta de Andalucia logo, wordmark, or any other official-government mark.

## Decision

1. Treat the current semantic theme as source of truth: primary blue `#0061fe`, strong blue `#0b54d4`, dark brand surface `#060f2b`, and app background `#f6f7f8`.
2. Use the approved visual concept: a clearly recognizable front-facing bus over a stylized Andalusia map outline with route dots/stops. Keep it simple enough to remain legible at favicon size.
3. Reproduce the approved concept as native SVG rather than committing the generated PNG, preserving the repository binary-asset rule.
4. Keep `favicon.svg` and `app-icon-maskable.svg` visually identical and full-canvas opaque. Static regression coverage enforces equality so the browser favicon and installed PWA cannot drift.
5. Do not include Junta de Andalucia branding or any element that could imply this is an official application.
6. Keep concrete SVG files in the manifest so service-worker hashing and browser asset inspection remain explicit.
7. Add `theme-color` and related shell metadata to the document head and align the manifest startup background with the current app background.
8. Use one root-level Angular `SwUpdate` lifecycle. Subscribe before the first explicit `checkForUpdate()`, activate one ready version at a time, reload only after successful activation, and bound unrecoverable recovery with session storage.
9. Do not use `skipWaiting`, custom service-worker forks, cache deletion, polling storms, or uninstall/reinstall instructions as the normal update mechanism.

## Acceptance

- Favicon and installed PWA icon use the approved bus + Andalusia + route concept and no longer use the legacy indigo bus or interim abstract network mark.
- The bus remains immediately recognizable at small sizes; the Andalusia outline and route markers remain secondary context rather than competing with the bus.
- No Junta de Andalucia logo, wordmark, or official-government identity is present.
- Manifest `theme_color`, manifest `background_color`, browser `theme-color`, and startup shell use the current theme palette.
- Manifest exposes general-purpose and maskable SVG install icons; the maskable asset owns an opaque full canvas.
- Favicon and maskable PWA artwork remain byte-identical as text so identity cannot drift between surfaces.
- Production builds include the icon files and Angular service-worker asset matching covers SVG artwork while the manifest remains precached.
- Initialization performs one immediate update check when the service worker is enabled.
- A `VERSION_READY` event activates the update and causes exactly one controlled reload after successful activation.
- Duplicate ready events cannot start concurrent activations.
- A rejected startup update check keeps the current application usable.
- Rejected activation or `activateUpdate() === false` does not reload or loop, and a later ready event can retry.
- An `unrecoverable` event performs bounded recovery and cannot enter a reload loop.
- Disabled/unavailable service worker is a no-op.
- Unit tests cover startup check success/failure, ready/non-ready events, duplicate ready events, empty/failed activation, retry, disabled service worker, unrecoverable recovery, reload-loop guard, and idempotent initialization.
- Static tests verify manifest colors/icon purposes, approved icon structure, favicon/PWA parity, absence of legacy/Junta branding, mobile browser metadata, and service-worker asset coverage.
- Relevant changed lifecycle logic retains 100% practical branch coverage; repository coverage gates do not regress.
- `pnpm run format:check`, `pnpm run lint`, targeted/full tests, production build, deploy preparation where applicable, visual evidence and GitHub CI are green before delivery.

## Risks

- Browser/PWA launcher metadata may retain an old icon temporarily even after the manifest changes; this is platform cache behavior, distinct from application service-worker version adoption.
- Reloading immediately on `VERSION_READY` can interrupt active interaction. If a transactional unsaved flow is introduced, activation must defer to a safe boundary.
- `SwUpdate.activateUpdate()` must be followed by a reload to avoid mixed-version chunk loading.
- Service-worker recovery must remain bounded to avoid reload loops during a genuinely broken deployment.
- The reviewed exact-visual baseline currently points to a historical PR commit that is no longer an ancestor of squashed `main`; the visual workflow intentionally rejects that topology. Do not advance the reviewed baseline without explicit approval.

## Tests

- Unit: PWA update lifecycle service, including startup `checkForUpdate`, ready/non-ready events, concurrent-ready suppression, empty activation, activation rejection/retry, unrecoverable state, session guard and disabled service worker.
- App integration unit: root component initializes the PWA lifecycle through a test double.
- Static: manifest contract, current-theme metadata, approved bus/map/route structure, favicon-maskable parity, full-canvas safety, absence of legacy/Junta branding, and service-worker asset coverage.
- Browser/visual: exact-head PR evidence remains required for rendered product surfaces; installed launcher behavior itself must not be inferred solely from DOM screenshots.

## Rollback

Revert this PR. Existing PWA installs will return to the previous manifest/service-worker behavior on the next version transition; no backend or persistent data migration is involved.

## Delivery status

- Reconnaissance: complete.
- Specification: updated with approved icon identity and repository media policy.
- Implementation: icon replacement pending exact-head validation.
- CI/final review: pending.

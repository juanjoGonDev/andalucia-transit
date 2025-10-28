# 2025-10-28 Platform Audit

## Scope
This audit reviewed the current production-equivalent build running locally at `http://127.0.0.1:4200` with the bundled CTAN snapshot data. Screenshots were captured with `npm run publish:evidence` for desktop (1280x800) and mobile (414x896) breakpoints per repository policy. The review focused on visual fidelity, accessibility, functional flows, and alignment with the living documentation in `docs/`.

## High-Priority Issues
- **Stop detail metadata contrast fails WCAG 2.1 AA** — the `.stop-detail__meta-label` style uses `var(--color-text-tertiary)` (≈#838795) on a white surface, producing ~3.58:1 contrast for non-large uppercase labels. Update the token or component style to meet 4.5:1 without breaking the shared theme.【F:src/app/features/stop-detail/stop-detail.component.scss†L132-L143】
- **Home tabs missing tabpanel semantics and keyboard navigation** — the home view renders `div` elements with `role="tab"` but the panels lack `role="tabpanel"`, `aria-labelledby`, and `id` links. Arrow key management is also absent, so keyboard users cannot cycle tabs per WAI-ARIA Authoring Practices. Implement structural bindings and key handlers in `HomeComponent` to satisfy accessible tab requirements.【F:src/app/features/home/home.component.html†L23-L88】【F:src/app/features/home/home.component.ts†L96-L156】

## Medium-Priority Issues
- **Tab state routing lacks focus restoration** — when a tab navigation command triggers a route change, focus returns to the document body instead of the tab content. Hook into the layout context or call `focusMainContent()` after navigation to maintain context for assistive tech.【F:src/app/features/home/home.component.ts†L114-L156】【F:src/app/shared/layout/app-layout/app-layout.component.ts†L34-L49】
- **Stop detail progress bar lacks textual duration** — the upcoming departure progress indicator is `aria-hidden="true"`, and no textual equivalent communicates elapsed percentage. Add a visually hidden string or extend the existing relative time labels to cover the same information for screen readers.【F:src/app/features/stop-detail/stop-detail.component.html†L108-L175】

## Functional Observations
- The bundled stop snapshot renders consistent departures, but no automated regression guard confirms live CTAN parity. Add smoke tests against the live API (with snapshot fallback) to detect upstream drift before daily snapshots publish.
- Route search deep links succeed with slugged stop IDs (`/routes/.../to/.../on/...`), but there is no UI affordance to copy or share these links. Consider exposing a share action once validation ensures slugs are stable across locales.【F:src/app/domain/route-search/route-search-url.util.ts†L13-L87】

## Recommended Enhancements
- Introduce automated axe-core scans for each routed page during CI to catch future WCAG regressions before release.
- Extend `appAccessibleButton` with optional roving tabindex helpers so tablists, menus, and switch groups can comply with keyboard interaction patterns out of the box.【F:src/app/shared/a11y/accessible-button.directive.ts†L24-L200】
- Provide a persistent offline indicator tied to the service worker so users understand when data originates from snapshots versus live responses.【F:src/app/features/stop-detail/stop-detail.component.html†L70-L120】

## Documentation Adjustments
- Record the screenshot evidence block (see below) in `docs/features-checklist.md` under a dated heading for traceability.【F:docs/features-checklist.md†L1-L86】
- Add an accessibility section summarizing tab semantics requirements to `docs/components-index/overview.md` to guide future feature work.

## Evidence
- Home – AFTER: desktop `https://filebin.net/07atvutr262mha9g/home-2025-10-28T07-44-06-058Z_es_1280_800_full.png`, mobile `https://filebin.net/07atvutr262mha9g/home-2025-10-28T07-44-06-058Z_es_414_896_full.png`.
- Home (Recents) – AFTER: desktop `https://filebin.net/yt2ohbtio6mha9k9/home-recents-2025-10-28T07-47-09-748Z_es_1280_800_full.png`, mobile `https://filebin.net/yt2ohbtio6mha9k9/home-recents-2025-10-28T07-47-09-748Z_es_414_896_full.png`.
- Home (Favorites tab) – AFTER: desktop `https://filebin.net/39m1ne8wefwmha9k/home-favorites-2025-10-28T07-47-21-945Z_es_1280_800_full.png`, mobile `https://filebin.net/39m1ne8wefwmha9k/home-favorites-2025-10-28T07-47-21-945Z_es_414_896_full.png`.
- Route Search – AFTER: desktop `https://filebin.net/7e5wl15klgemha9i/route-search-2025-10-28T07-45-29-789Z_es_1280_800_full.png`, mobile `https://filebin.net/7e5wl15klgemha9i/route-search-2025-10-28T07-45-29-789Z_es_414_896_full.png`.
- Route Search Results – AFTER: desktop `https://filebin.net/onjhjm36ixbmha9i/route-search-results-2025-10-28T07-45-43-566Z_es_1280_800_full.png`, mobile `https://filebin.net/onjhjm36ixbmha9i/route-search-results-2025-10-28T07-45-43-566Z_es_414_896_full.png`.
- Favorites – AFTER: desktop `https://filebin.net/xv36cyxa4lcmha9i/favorites-2025-10-28T07-45-58-434Z_es_1280_800_full.png`, mobile `https://filebin.net/xv36cyxa4lcmha9i/favorites-2025-10-28T07-45-58-434Z_es_414_896_full.png`.
- Map – AFTER: desktop `https://filebin.net/pcddcanb31mha9iy/map-2025-10-28T07-46-08-582Z_es_1280_800_full.png`, mobile `https://filebin.net/pcddcanb31mha9iy/map-2025-10-28T07-46-08-582Z_es_414_896_full.png`.
- Settings – AFTER: desktop `https://filebin.net/r7lvk4nl3ymha9j8/settings-2025-10-28T07-46-20-819Z_es_1280_800_full.png`, mobile `https://filebin.net/r7lvk4nl3ymha9j8/settings-2025-10-28T07-46-20-819Z_es_414_896_full.png`.
- News – AFTER: desktop `https://filebin.net/fvlfqtx2uxvmha9j/news-2025-10-28T07-46-31-144Z_es_1280_800_full.png`, mobile `https://filebin.net/fvlfqtx2uxvmha9j/news-2025-10-28T07-46-31-144Z_es_414_896_full.png`.
- Stop Detail – AFTER: desktop `https://filebin.net/vs5uq8atdvmha9jr/stop-detail-2025-10-28T07-46-42-450Z_es_1280_800_full.png`, mobile `https://filebin.net/vs5uq8atdvmha9jr/stop-detail-2025-10-28T07-46-42-450Z_es_414_896_full.png`.
- Stop Info – AFTER: desktop `https://filebin.net/jael0fllbcmha9k0/stop-info-2025-10-28T07-46-56-764Z_es_1280_800_full.png`, mobile `https://filebin.net/jael0fllbcmha9k0/stop-info-2025-10-28T07-46-56-764Z_es_414_896_full.png`.

(Refer to the feature checklist update for the full markdown block with per-breakpoint URLs.)

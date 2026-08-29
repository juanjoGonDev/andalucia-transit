# Map navigation overlay and Lines pagination contrast

## Request

Correct two visual regressions reported against PR #36:

1. The Map page must keep the shared bottom navigation floating over the map canvas instead of reserving a white strip underneath the map.
2. Lines pagination must visibly render the `Anterior` / `Siguiente` labels and icons against the hero gradient on narrow layouts.

## Evidence

- User-provided desktop Map capture shows the Leaflet workspace ending above the fixed navigation. The remaining viewport area is the plain shell background, so the navigation appears to sit on a white footer rather than on the map.
- Current `src/app/features/map/map.component.scss` sets `.map__workspace` to `height: calc(100dvh - var(--map-nav-clearance))`. The shared navigation is already `position: fixed`, so subtracting the navigation clearance creates the visible strip instead of an overlay.
- Exact current-head visual evidence artifact `9711144329` reproduces the same Map strip in `map-data_es_1440_900_full.png`.
- User-provided mobile Lines capture shows blank pagination pills around `Página 1 de 10`.
- Exact current-head visual evidence artifact `9711144329` reproduces blank pagination actions in `lines-data_es_390_844_full.png`.
- The pagination is rendered directly on the hero gradient. `app-outline-button` defaults to `--color-text-strong`, while hero-aware inverse outline variables are only configured for `.app-hero__actions`; the pagination therefore lacks a surface-specific contrast contract.

## Decision

1. Keep the shared navigation owner unchanged. The Map feature will fill the viewport because the fixed navigation already overlays routed content.
2. Preserve `--map-nav-clearance` as interaction clearance for map panels; do not use it to shorten the map canvas.
3. Keep Map inspectors above the fixed navigation so extending the canvas does not make panel actions unreachable.
4. Make Lines pagination explicitly consume the existing hero inverse text/border variables rather than introducing new hard-coded colors.
5. Add browser regression assertions for Map viewport coverage/overlay and visible pagination action content.
6. Do not advance `.github/visual-baseline.json` without explicit user approval.

## Acceptance

- [ ] Desktop and mobile Map workspace reaches the viewport bottom while the shared navigation overlaps the map area.
- [ ] Open Map inspector panels remain above the navigation and scroll internally when required.
- [ ] Mobile Lines pagination exposes readable `Anterior` and `Siguiente` labels/icons on the hero surface.
- [ ] Pagination remains usable without horizontal overflow at 390 px and 320 px widths.
- [ ] Core CI and exact-head PR visual evidence pass.
- [ ] Reviewed-baseline comparison retains zero tolerance and is not advanced without explicit approval.

## Checks

- Targeted Playwright: Map immersive layout and Lines directory layout.
- Repository CI: lint, Angular tests, script checks, build/deploy checks through the PR workflow.
- Exact-head deterministic visual evidence for Map and Lines at 390×844 and 1440×900.
- Reviewed-baseline exact comparison for the final head.

## Delivery

Continue on PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use Conventional atomic commits. Do not force-push, merge, release, deploy, or advance the reviewed visual baseline without explicit approval.

## Status

Reproduced from both user captures and the current exact-head visual evidence. Implementation and validation are pending.

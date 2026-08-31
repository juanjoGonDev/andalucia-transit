# Map navigation overlay and Lines pagination contrast

## Request

Correct two visual regressions reported against PR #36:

1. The Map page must keep the shared bottom navigation floating over the map canvas instead of reserving a white strip underneath the map.
2. Lines pagination must visibly render the `Anterior` / `Siguiente` labels and icons against the hero gradient on narrow layouts.

## Evidence

- User-provided desktop Map capture showed the Leaflet workspace ending above the fixed navigation. The remaining viewport area was the plain shell background, so the navigation appeared to sit on a white footer rather than on the map.
- `src/app/features/map/map.component.scss` shortened `.map__workspace` with navigation clearance even though the shared navigation is already fixed. The clearance therefore reduced the canvas instead of protecting only interactive overlays.
- User-provided Lines capture showed pagination labels effectively disappearing against the dark end of the hero gradient.
- `app-outline-button` defaults to strong dark text while the pagination is rendered directly on the hero gradient. The component previously had no hero-specific foreground/border contract.
- The first exact-regression validation after adding product assertions exposed a harness defect: the current-head Playwright product assertions were executed against the old reviewed baseline application. This correctly failed on the two intended product differences before pixel comparison could run.
- A first harness split that skipped all product checks was also insufficient because several Playwright specs generate required deterministic screenshots. Baseline capture then failed closed on a missing `route-search-loading_es_390_844_full.png` asset.
- The final harness separates only head-only behavior checks (`map-exploration.spec.ts` and `theme.contrast.spec.ts`) from evidence-producing specs. The reviewed baseline still renders every required screenshot, while the pull-request head still runs the complete current product harness.

## Decision

1. Keep the shared navigation owner unchanged. The Map feature fills the viewport because the fixed navigation already overlays routed content.
2. Preserve `--map-nav-clearance` as interaction clearance for map panels; do not use it to shorten the map canvas.
3. Keep Map inspectors above the fixed navigation so extending the canvas does not make panel actions unreachable.
4. Make Lines pagination consume existing hero inverse text/border variables rather than introducing hard-coded colors.
5. Keep the pagination contrast regression locale-independent: translation identity belongs to i18n tests, while this test verifies localized text is present and WCAG AA contrast is maintained.
6. Freeze deterministic visual-evidence time so route-search evidence cannot change according to the wall clock.
7. Keep reviewed-baseline comparison at zero tolerance. Baseline capture may skip head-only product assertions, but it must still generate and validate every canonical evidence asset.
8. Do not advance `.github/visual-baseline.json` without explicit user approval.

## Acceptance

- [x] Desktop and mobile Map workspace reaches the viewport bottom while the shared navigation overlaps the map area.
- [x] Open Map inspector panels remain above the navigation and scroll internally when required.
- [x] Lines pagination exposes readable localized previous/next labels and icons on the hero surface.
- [x] Pagination remains usable without horizontal overflow at 390 px and 320 px widths.
- [x] Core CI and exact-head PR visual evidence pass on product head `002033c48b5240d615842a84bdc469924af88c5e`.
- [x] Reviewed-baseline comparison retains zero tolerance and successfully renders both reviewed baseline and current head before comparing every required pixel.
- [ ] Advance the reviewed visual baseline only after explicit review and user approval. Not authorized.

## Checks

### Product head `002033c48b5240d615842a84bdc469924af88c5e`

- CI #1175 (`33273940400`): success.
- Publish PR visual evidence #862 (`33273940408`): success. All UI quality gates, populated responsive/accessibility scenarios, populated captures, empty-state verification, final-head verification and artifact publication completed successfully.
- Visual evidence artifact `9720961302`: `pr-36-visual-evidence-002033c48b5240d615842a84bdc469924af88c5e`, digest `sha256:0bbfcf41a5c4d290f8e36b4f5c825835f828d8c85a01412cf9bba1aec927d083`.
- Manual artifact review:
  - `lines-data_es_390_844_full.png` and `lines-data_es_1440_900_full.png` visibly render `Anterior` and `Siguiente` with icons against the dark hero gradient.
  - `map-data_es_390_844_full.png` and `map-data_es_1440_900_full.png` show the shared bottom navigation floating over the Leaflet canvas with no reserved shell strip below the map.
- Visual regression baseline #66 (`33273940417`): reviewed baseline render success, pull-request head render success, pixel comparison success, evidence upload success, enforcement failure only because the reviewed baseline intentionally has not been advanced.
- Visual regression artifact `9720983218`: `pr-36-visual-regression-002033c48b5240d615842a84bdc469924af88c5e`, digest `sha256:591df7c157fd7102942e7dd255aa81fd517d75e923850d2bac23435d5a45b66b`.
- Exact comparison: 36 files compared, 4 changed, 32 exact, 805,930 differing pixels total. Only the intended Map and Lines evidence changed:
  - `map-data_es_390_844_full.png`: 61,673 pixels, dimensions unchanged at 390×844.
  - `map-data_es_1440_900_full.png`: 249,939 pixels, dimensions unchanged at 1440×900.
  - `lines-data_es_390_844_full.png`: 482,596 pixels; expected 390×2536, actual 390×2620. This also contains the previously reviewed Province/filter-flow expansion.
  - `lines-data_es_1440_900_full.png`: 11,722 pixels, dimensions unchanged at 1440×1594.
- All 32 unrelated visual evidence files match the reviewed baseline pixel-for-pixel.

## Delivery

Continue on PR #36 and branch `codex/refactorizar-vista-segun-diseno-proporcionado`. Use Conventional atomic commits. Do not force-push, merge, release, deploy, or advance the reviewed visual baseline without explicit approval.

## Status

Product implementation, deterministic browser coverage, CI, current-head visual evidence and exact baseline comparison are complete. The only product-specific delivery gate is explicit approval to advance the reviewed visual baseline after reviewing the intentional Map and Lines differences.

# Favorites add-mode regression

## Request

Fix the Favorites regression reported from the browser on 2026-09-01: activating **Añadir a favoritos** rendered an empty white panel instead of a usable stop-discovery control. Preserve the existing favorites filter and the broader stop/line favorites behavior from `2026-08-31-stop-favorites-management.md`.

## Evidence

- User browser evidence on local head `94a16f2df8b323ff340682a67983185b0a4b3731` showed `/favorites` inserting a blank white add panel after activating **Añadir a favoritos**.
- The component used the hero `searchControl` both to filter already-saved favorites and to drive stop-directory discovery. With an empty query, add mode entered the `idle` result state and rendered no child content inside the already-visible panel.
- Test-only head `6eb2b749bb7e102c7f48e5d5c4048c353e77b4d3` reproduced the defect. CI `33501717564`, Angular job `99836422624`, reported exactly `1 FAILED, 521 SUCCESS` because `.favorites__add-search-field` did not exist after add mode opened.
- The first executable fix `f8b82f153ad9050542fd4e732f1fb5a6e5f6a665` separated the two controls and passed CI `33502340494` with `TOTAL: 523 SUCCESS`; Legal browser QA `33502340563` also passed.
- Moving the interaction regression into the canonical visual-interaction suite exposed a second integration defect on head `74b692735ac621c536fab372eb94556a90d4fbc4`: visual run `33503238475`, job `99841258115`, showed the shared `AccessibleButtonDirective` removed the raw `aria-expanded` binding because that directive owns the host attribute.
- `414b82857625ac2b860196ab2b03c6a039e9127a` fixed disclosure semantics by binding `appAccessibleButtonExpanded`. Its current-head product interaction passed, while reviewed-baseline run `33503777496` correctly exposed that the new current-head behavior could not be asserted against the older approved baseline application.
- `84b612e0db29fc46a3b7db3200ce32f42882ddb2` isolated only this new current-head product assertion from historical exact-baseline rendering. CI `33504321973`, Legal `33504321890`, visual evidence `33504321887`, and visual regression `33504321881` all passed.
- `89979211ef04954bc0181e4484122f07ca618af5` adds explicit mobile and desktop evidence captures for the opened panel. CI `33504960451`, Legal `33504960425`, visual evidence `33504960420`, and visual regression `33504960437` all pass. Visual artifact `9799337252` has digest `sha256:5344d6e9be00c876969d0fd678f565071d8fa32b29ac29eb898f9ca99153611d` and contains 41 PNGs, including the two new add-panel states.
- Documentation head `2bafe93ce853e9a84fe39ac54cc0ebf98b079ea1` passed CI `33505635010`, Legal browser QA `33505634965`, visual evidence `33505635002`, and visual regression baseline `33505634983`. Angular job `99848974049` reports `TOTAL: 523 SUCCESS`.

## Decision

1. Keep the hero `searchControl` as the single owner of filtering already-saved favorites.
2. Use a dedicated `addSearchControl` as the single owner of stop-directory discovery while add mode is open.
3. Opening add mode must always render useful content immediately: a translated section heading and a dedicated search field, even before the user enters a query.
4. Keep result/error announcements in the results region rather than making the input container itself `aria-live`.
5. Use `AccessibleButtonDirective` inputs for attributes owned by that directive. The add-mode control binds `appAccessibleButtonPressed` and `appAccessibleButtonExpanded`; it does not compete with the directive through a raw `attr.aria-expanded` binding.
6. The add-mode browser regression is a current-head product contract. Run it in the PR visual-evidence workflow, but skip that single assertion when the current harness renders the older immutable reviewed baseline with `E2E_EXACT_VISUAL_REGRESSION=true`.
7. Capture the opened add panel at 390×844 and 1440×900 so final review evaluates the affected state rather than only the resting Favorites page.
8. Record final external review metadata in the PR discussion/body rather than creating another specification-only commit after the implementation and documentation evidence is green.

## Acceptance

- Activating **Añadir a favoritos** never renders an empty surface.
- The opened panel immediately exposes a visible **Añadir a favoritos** heading and an accessible **Buscar** searchbox.
- The hero filter continues to filter existing favorites and does not initiate directory discovery.
- The dedicated add search drives directory discovery without changing the saved-favorites filter.
- The add trigger exposes `aria-expanded="false"` while closed and `aria-expanded="true"` while open.
- Existing retryable add-search error behavior remains intact.
- Mobile 390×844 and desktop 1440×900 add-panel states have no horizontal overflow.
- Historical reviewed-baseline rendering remains compatible with the older baseline application.
- Resting Favorites behavior and aggregate stop/line favorites remain unchanged outside this regression scope.

## Tests

- Component regression: opening add mode renders `.favorites__add-search-field`.
- Component separation regression: changing the normal favorites filter does not issue a stop-directory search; `addSearchControl` owns that operation.
- Playwright product regression: open Favorites, assert disclosure state, activate add mode, assert panel/heading/searchbox, and assert no horizontal overflow.
- Playwright evidence: capture the opened add panel at 390×844 and 1440×900.
- Historical visual regression: skip only the new add-mode product assertion during exact rendering of the older reviewed baseline; retain the rest of `visual-interaction-states.spec.ts` in baseline rendering.

## Checks

Executable head `89979211ef04954bc0181e4484122f07ca618af5`:

- CI `33504960451`: pass.
- Legal browser QA `33504960425`: pass.
- Publish PR visual evidence `33504960420`: pass; the populated interaction step executes the add-mode regression successfully.
- Visual regression baseline `33504960437`: pass.
- Artifact `9799337252`: `pr-439-visual-evidence-89979211ef04954bc0181e4484122f07ca618af5`.
- Artifact digest: `sha256:5344d6e9be00c876969d0fd678f565071d8fa32b29ac29eb898f9ca99153611d`.
- Artifact inventory: 41 PNGs, including `favorites-add-panel_es_390_844_full.png` and `favorites-add-panel_es_1440_900_full.png`.
- Both add-panel captures were manually inspected. The heading and dedicated search field are visible, spacing/hierarchy remain coherent, and no horizontal overflow or blank add surface is present at either target.

Validated documentation head `2bafe93ce853e9a84fe39ac54cc0ebf98b079ea1`:

- CI `33505635010`: pass; install, lint, script tests, deploy-pipeline validation, Angular tests, and aggregate gate all pass.
- Angular job `99848974049`: `TOTAL: 523 SUCCESS`; statements 82.25%, branches 63.34%, functions 81.34%, lines 82.43%.
- Legal browser QA `33505634965`: pass.
- Publish PR visual evidence `33505635002`: pass.
- Visual regression baseline `33505634983`: pass.
- Artifact `9799616897`: `pr-439-visual-evidence-2bafe93ce853e9a84fe39ac54cc0ebf98b079ea1`.
- Artifact digest: `sha256:c5b93983be02e6fab83a3fde3e7d5ef4f430bbd5691d4d56e2def2f3eeb51ce3`.
- Artifact inventory remains 41 PNGs. All 41 were re-inspected. Thirty-six are pixel-identical to the fully inspected executable artifact `89979211`; the remaining five differences are limited to live map tiles and known full-page fixed-navigation/scroll composition. No material application UI, content, attribution, layout, responsive, or control regression was observed.

## Risks

- Reusing one form control for both filtering and discovery would reintroduce coupling and ambiguous UX.
- Binding a host attribute directly when a shared directive owns that same attribute can silently remove or override the component binding.
- Running a newly introduced current-head behavior assertion against an older immutable baseline app creates a false regression failure; isolation must be narrowly scoped to the new product assertion rather than excluding the whole interaction suite.
- The fixed bottom navigation is composited over intermediate content in full-page screenshots; this is existing capture behavior and is separate from the add-mode regression.
- This status-only documentation commit moves the branch head and therefore must pass the same exact-head gates before delivery; it does not change executable or test behavior.

## Rollback

Revert the add-mode regression commits back to `94a16f2df8b323ff340682a67983185b0a4b3731`. No persistence schema or data migration is involved. The broader stop/line favorites implementation remains independently revertible under the parent specification.

## Delivery status

- Root cause: confirmed.
- TDD reproduction: complete.
- Component fix: complete.
- Accessible disclosure integration: complete.
- Current-head Playwright regression: complete.
- Historical-baseline compatibility: complete.
- Mobile/desktop affected-state evidence: captured and inspected.
- Documentation-head validation through `2bafe93c`: complete and green across CI, Legal QA, visual evidence, and reviewed visual baseline.
- Final external CodeRabbit review and PR-body synchronization: tracked in the PR after this status commit to avoid another documentation-only review loop.
- Final review: requires exact-head gates for this status-only commit plus the PR/external-review checks above.
- Merge/release/deploy: not performed.

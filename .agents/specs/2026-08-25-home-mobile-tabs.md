# Home mobile tabs layout

## Request

Fix the Home route-planner tablist on narrow mobile viewports. The first and last labels are clipped around 390 px because the current horizontally scrollable layout cannot fit three tabs.

## Evidence

- `src/app/features/home/home.component.html` owns the three-tab `role="tablist"` and preserves roving tabindex via `appAccessibleButton`.
- `src/app/features/home/home.component.scss` currently uses `inline-flex`, horizontal scrolling, per-tab `min-width: clamp(7rem, 20vw, 9.5rem)`, and additional responsive inline padding. Three tabs therefore exceed the available card width on narrow screens.
- Existing `tests/playwright/home-tabs.keyboard.spec.ts` covers keyboard semantics but not responsive bounds.
- PR visual evidence already captures Home at 390×844 and 1440×900 from the exact head SHA.

## Decision

Keep Home as the single layout owner. Replace the scrollable tab row with three equal fluid columns, keep each tab shrinkable with `min-width: 0`, preserve the existing active/focus styling, and retain a comfortable minimum interaction height. Do not change tab state, routing, roving tabindex, or accessible-button behavior.

Add a Playwright layout regression covering 320, 360, 390, and 430 px. Assert that the tablist stays within its parent, all tabs stay within the tablist, cells do not overlap, widths remain balanced, labels do not overflow their cells, the active tab stays contained after switching, and the document does not gain horizontal overflow.

Run that focused layout test inside the canonical visual-evidence workflow after the deterministic mock app starts so this PR receives executable responsive validation even though its non-default base branch does not trigger the general PR CI workflow.

## Acceptance

- All three Spanish tab labels are fully visible at 320, 360, 390, and 430 px.
- No tab or active background crosses the tablist bounds.
- No horizontal page or tablist scrolling is required.
- The three cells are visually balanced and remain usable touch targets.
- Existing keyboard, focus, routing, and `aria-selected` behavior remains unchanged.
- Desktop rendering remains unchanged in intent.
- Final 390×844 and 1440×900 Home screenshots are generated from the exact final PR head and inspected.

## Checks

- Focused Playwright mobile layout regression through PR visual-evidence workflow.
- Existing deterministic screenshot generation and stale-head verification.
- Relevant repository CI/check status on the final head.

## Delivery

Atomic commits: specification, failing regression coverage, minimum CSS fix. No force-push, merge, base retarget, new dependency, or committed binary evidence.

## Status

In progress.

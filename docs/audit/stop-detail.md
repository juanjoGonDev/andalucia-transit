# Stop Detail Accessibility Audit – Timeline Narration

## Observation Date
2025-10-30

## Viewports Reviewed
- Desktop: 1280×800 (ES locale)
- Mobile: 414×896 (ES locale)

## Behaviour Summary
- Upcoming departures panel now emits polite live-region updates describing the highlighted service progress.
- Messages include line code, destination, localized status phrase, and bounded percentage.
- Live region only renders when there is an announcement, avoiding duplicate narration while data is static.

## Regression Checks
- VoiceOver reads a single announcement when progress changes and does not re-announce static labels.
- No duplicate live regions detected by axe-core (`aria-live="polite"` count = 1).
- Upcoming progress bar remains purely visual (`aria-hidden="true"`).

## Manual Verification Steps
1. Load `/stop-detail/sevilla:001` in ES locale.
2. Tab to the upcoming departures list and wait for refresh tick.
3. Confirm the screen reader announces a single concise summary.
4. Switch to EN locale and repeat to verify translation output.

## Automated Coverage
- `stop-detail.component.spec.ts` → Validates live-region existence and content.
- `tests/playwright/stop-detail.accessibility.spec.ts` → Asserts exactly one polite live region with populated narration.

## Evidence
- Viewports: Desktop 1280×800, Mobile 414×896 (ES locale).
- Observed: Single polite announcement on progress changes, no duplicate reads of static labels.
- Expected: Live region updates once per data change with concise, localized summary.

---

# Layout Verification – Upcoming Timeline Spacing

## Observation Date
2025-10-30

## Viewports Reviewed
- Tablet: 1024×768 (ES locale)
- Desktop: 1280×800 (ES locale)
- Mobile: 414×896 (ES locale)

## Behaviour Summary
- Pre-fix measurements at 1024×768 showed 8px inner padding and 12px card gap, forcing metadata to wrap and misalign with the baseline rhythm defined in `AGENTS.md`.
- Spacing tokens now provide 16px internal padding (`var(--space-md)`) and 24px vertical separation (`var(--space-lg)`) from 48rem upwards, retaining mobile density at smaller widths.
- Card backgrounds and borders rely exclusively on design tokens, removing ad-hoc rgba mixes.

## Regression Checks
- Verified via Chrome devtools rulers at 1024×768 and 1280×800; padding and gap measurements match the expected 16px / 24px scale.
- Confirmed no truncation or overflow at 90% zoom and standard text scaling.
- Upcoming and highlighted rows preserve hover/focus styles after the SCSS refactor.

## Manual Verification Steps
1. Load `/stop-detail/2565` with the dev server, switch devtools to 1024×768 responsive mode.
2. Inspect `.stop-detail__list-item` padding and `.stop-detail__list` gap; ensure they resolve to `var(--space-md)` and `var(--space-lg)` respectively.
3. Repeat at 1280×800 and 414×896 to confirm desktop/mobile regressions have not been introduced.

## Evidence
- Viewports: Tablet 1024×768, Desktop 1280×800, Mobile 414×896 (ES locale).
- Observed (pre-fix): 8px card padding, 12px list gap, metadata wrapped.
- Observed (post-fix): 16px padding via `var(--space-md)`, 24px gap via `var(--space-lg)`, no wrapping at 90% zoom.
- Expected: Tablet spacing matches design rhythm and scales consistently with desktop while preserving mobile density.

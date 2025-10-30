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
- Desktop: https://filebin.net/stop-timeline-live-region/stop-detail-timeline-2025-10-30T00-13-07-821Z_es_1280_800_full.png
- Mobile: https://filebin.net/stop-timeline-live-region/stop-detail-timeline-2025-10-30T00-13-07-821Z_es_414_896_full.png

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

## Evidence (Before)
- Desktop: https://filebin.net/m8fd24w991mhdytp/stop-detail-timeline-2025-10-30T21-57-33-292Z_es_1280_800_full.png
- Tablet: https://filebin.net/j475ach25komhdyu/stop-detail-timeline-tablet-2025-10-30T21-58-19-940Z_es_1024_768_full.png
- Mobile: https://filebin.net/m8fd24w991mhdytp/stop-detail-timeline-2025-10-30T21-57-33-292Z_es_414_896_full.png

## Evidence (After)
- Desktop: https://filebin.net/lc4vmt0ky9mhdywz/stop-detail-timeline-2025-10-30T22-00-08-645Z_es_1280_800_full.png
- Tablet: https://filebin.net/4ikg3dm0akrmhdyx/stop-detail-timeline-tablet-2025-10-30T22-00-34-058Z_es_1024_768_full.png
- Mobile: https://filebin.net/lc4vmt0ky9mhdywz/stop-detail-timeline-2025-10-30T22-00-08-645Z_es_414_896_full.png

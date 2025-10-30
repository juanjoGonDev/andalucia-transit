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

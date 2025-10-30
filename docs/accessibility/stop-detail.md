# Stop Detail Accessibility Notes

## Live Timeline Announcements
- **Scope:** Upcoming departures timeline on Stop Detail view.
- **Purpose:** Provide polite, concise narration for progress updates so screen reader users perceive approaching services without duplicate static content.
- **Implementation Summary:**
  - `StopDetailComponent` emits a localized summary through a hidden aria-live element whenever the highlighted upcoming service changes its minutes-to-arrival or progress percentage.
  - Announcements reuse translation tokens for status strings and expose line code, destination, and bounded progress percentage.
  - The live region only renders when a message exists, preventing redundant announcements while services remain unchanged.
- **Manual QA:**
  1. View `/stop-detail/<stop>` in ES and EN locales on desktop (1280×800) and mobile (414×896).
  2. Enable VoiceOver or NVDA, focus the upcoming departures list, and wait for the next update window.
  3. Confirm a single announcement similar to “Service M-112 toward Centro. Arrives in 5 min. Progress 83% complete.”
  4. Ensure static labels (line code, destination, status badges) are not reread when progress updates fire.
- **Automated QA:**
  - Unit: `stop-detail.component.spec.ts` – verifies live-region existence, aria-live politeness, and message content.
  - E2E: `tests/playwright/stop-detail.accessibility.spec.ts` – asserts a single polite live region is present and populated.
- **Evidence:**
  - Desktop: https://filebin.net/stop-timeline-live-region/stop-detail-timeline-2025-10-30T00-13-07-821Z_es_1280_800_full.png
  - Mobile: https://filebin.net/stop-timeline-live-region/stop-detail-timeline-2025-10-30T00-13-07-821Z_es_414_896_full.png

# Contrast Verification Log

## 2025-10-31 – Tertiary Metadata
- **Viewports:** Desktop 1440×900, Mobile 414×896, Tablet 1024×768.
- **Surfaces Reviewed:** Stop detail metadata labels (`.stop-detail__meta-label`), favorites card subtitles (`.favorites-card__meta`), timetable footnotes.
- **Observed:** Previous rgba tertiary token (#060f2b at 50% opacity) measured between 3.2:1 and 3.4:1 against `#f6f7f8` backgrounds, failing WCAG 2.1 AA.
- **Adjustment:** Raised `--color-text-tertiary` to `#5a627b` via `src/styles/theme-rules.css`.
- **Verification Steps:**
  1. Reloaded surfaces in listed viewports, inspected computed styles with dev tools, and confirmed background remained `#f6f7f8`.
  2. Calculated contrast using the APCA inspector plugin and manual WCAG formula (ratio 5.65:1).
  3. Confirmed `getComputedStyle` returns the updated hex value across locales.
  4. Ran unit spec `src/styles/theme-rules.spec.ts` and Playwright suite `tests/playwright/theme.contrast.spec.ts` to enforce ≥4.5:1 threshold.
- **Outcome:** All tertiary metadata instances meet contrast requirements without introducing per-component overrides.

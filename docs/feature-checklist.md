# Feature Checklist

## 1. Overview
This checklist records the current audit baseline for the Andalusia Transit platform. Maintain it as a living roadmap that highlights validated experiences, outstanding remediation work, and the standards every update must satisfy.

## 2. Verified Features (✅)
- Screenshot publishing pipeline – `npm run publish:evidence` captures deterministic desktop and mobile states, uploads them to Filebin, and returns the markdown block used for documentation and PR evidence.
- Home dashboard tabs – Accessible button directive drives activation for each tab, maintaining baseline layout parity on desktop and mobile without custom roving-focus handlers.
- Stop detail timeline – Presents upcoming departures through the visual progress bar with translation-driven status text while matching the documented baseline layout.
- Global theme tokens – Shared color, typography, and spacing tokens in `src/styles.scss` and feature styles keep core surfaces visually consistent across breakpoints.
- Route search workflow – Form submission returns consolidated departures, preserves query inputs, and respects the holiday-aware timetable logic described in AGENTS.md.

## 3. Pending or Incomplete Features (🚧)
- Home tab keyboard model – Re-evaluate roving-focus semantics with regression coverage so screen reader and keyboard users gain predictable arrow, Home, and End support without breaking the accessible button baseline.
- Stop timeline narration – Design a narration strategy that summarizes progress updates for assistive technology while avoiding duplicate announcements and ensuring translation coverage.
- Metadata contrast audit – Revisit tertiary text tokens to guarantee WCAG AA compliance for stop detail metadata and other subdued labels after recent palette rollbacks.
- Evidence rotation – Refresh historical screenshot bins for favorites, route search, and settings views to confirm the current visuals remain aligned with the published baseline.
- Documentation drift – Sync component-level specs and audit backlogs with the latest implementation choices so new contributors inherit accurate expectations.

## 4. Accessibility and UX Standards (🧩)
- **Color Contrast:** Maintain WCAG 2.1 AA contrast ratios (4.5:1 for body text, 3:1 for UI controls). Update shared tokens before applying ad-hoc overrides.
- **Keyboard Navigation:** Default tab order must follow DOM flow. Composite controls (tabs, carousels) require arrow key support, logical wrapping, and Escape handling when applicable.
- **Focus Management:** Focus states must be visible, high contrast, and restored after dynamic updates (e.g., tab switches or dialog closures). Never trap focus without a deliberate escape.
- **Screen Reader Narration:** Announce context changes through ARIA live regions or inert narration blocks that avoid repetition. Provide meaningful labels and descriptions for every interactive element.
- **Responsive Behavior:** Validate layouts at standard breakpoints (≥1280px desktop, 768–1024px tablet, ≤414px mobile). Ensure content adapts without clipping, horizontal scrolling, or readability regressions.
- **Evidence Capture:** Every visual change must include `publish:evidence` screenshots (desktop + mobile) uploaded to Filebin and referenced within this checklist.

## 5. New Tasks / Next Steps (📋)
- Reintroduce tab roving focus with automated unit and integration tests to guarantee ARIA compliance (accessibility + functional).
- Prototype a stop timeline live-region summary and validate narration with Spanish and English screen readers (accessibility + documentation).
- Audit tertiary and subdued text colors across stop detail, favorites, and route cards to confirm AA contrast (visual).
- Refresh screenshot evidence for favorites list, route search timeline, and settings toggles using the latest `publish:evidence` runs (visual + documentation).
- Extend documentation in `docs/ui-theme.md` with guidance for color token evolution and contrast verification steps (documentation).

This checklist is maintained automatically after each audit cycle.    
All verified features must be validated visually and functionally via `snap-and-publish` before being marked as complete.
